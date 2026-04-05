"""
Gemma 4 E4B QLoRA Fine-Tuning Script
Optimized for: Windows, 32GB RAM, RTX 5070 Ti (16GB VRAM)

Usage:
    1. Set HF_TOKEN environment variable (or pass --hf_token)
    2. pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu128
    3. pip install "transformers @ git+https://github.com/huggingface/transformers.git"
    4. pip install "peft @ git+https://github.com/huggingface/peft.git"
    5. pip install "trl @ git+https://github.com/huggingface/trl.git"
    6. pip install "accelerate>=1.5.0" datasets scipy bitsandbytes>=0.45.0 huggingface_hub
    7. python finetune.py
"""

import argparse
import gc
import json
import os
import time
from datetime import datetime
from pathlib import Path

import torch
from datasets import load_dataset
from huggingface_hub import login
from peft import AutoPeftModelForCausalLM, LoraConfig, get_peft_model
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from trl import SFTConfig, SFTTrainer


def parse_args():
    parser = argparse.ArgumentParser(description="Fine-tune Gemma 4 E4B with QLoRA")
    parser.add_argument("--hf_token", type=str, default=None, help="HuggingFace token (or set HF_TOKEN env var)")
    parser.add_argument("--model_id", type=str, default="google/gemma-3n-E4B-it")
    parser.add_argument("--train_data", type=str, default="data/medical_train.jsonl")
    parser.add_argument("--val_data", type=str, default="data/medical_val.jsonl")
    parser.add_argument("--output_dir", type=str, default="outputs")
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--extended_epochs", type=int, default=6, help="Extended training epochs (v2)")
    parser.add_argument("--batch_size", type=int, default=1)
    parser.add_argument("--grad_accum", type=int, default=8)
    parser.add_argument("--lr", type=float, default=2e-4)
    parser.add_argument("--max_seq_length", type=int, default=1024)
    parser.add_argument("--lora_r", type=int, default=16)
    parser.add_argument("--lora_alpha", type=int, default=32)
    parser.add_argument("--skip_base_eval", action="store_true", help="Skip base model evaluation")
    parser.add_argument("--skip_extended", action="store_true", help="Skip extended v2 training")
    parser.add_argument("--skip_merge", action="store_true", help="Skip adapter merge + export")
    return parser.parse_args()


SYSTEM_PROMPT = "You are an expert emergency medical dispatcher. Provide a concise, direct diagnosis and immediate action steps with no filler."

TEST_PROMPT = "Adult male, 55, clutching chest, sweating profusely, pain radiating to left arm. Started 10 minutes ago."

TEST_SCENARIOS = [
    "Person having a seizure, shaking on the ground for 2 minutes.",
    "Deep cut on the leg, heavy bleeding, remote location.",
    "Child choking on food, turning blue, cannot cough.",
    "Person collapsed after marathon, confused, hot skin, not sweating.",
    "Elderly person fell, hip pain, cannot stand or move leg.",
]


def flush_memory():
    """Free up GPU and system memory."""
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()


def generate_response(model, tokenizer, prompt, system_prompt=None, max_new_tokens=512):
    """Generate a response using chat template."""
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    input_text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = tokenizer(input_text, return_tensors="pt").to(model.device)

    start = time.time()
    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            do_sample=True,
            temperature=0.3,
            top_p=0.9,
        )
    elapsed = time.time() - start

    new_tokens = outputs[0][inputs["input_ids"].shape[1]:]
    response = tokenizer.decode(new_tokens, skip_special_tokens=True)

    tokens_generated = len(new_tokens)
    print(f"  [{tokens_generated} tokens in {elapsed:.1f}s = {tokens_generated / elapsed:.1f} tok/s]")
    return response


def run_eval(model, tokenizer, label="MODEL"):
    """Run evaluation on test prompt + scenarios."""
    print(f"\n{'=' * 60}")
    print(f"  {label} EVALUATION")
    print(f"{'=' * 60}")

    print(f"\nTest prompt: {TEST_PROMPT}")
    print("-" * 40)
    response = generate_response(model, tokenizer, TEST_PROMPT, system_prompt=SYSTEM_PROMPT)
    print(response)

    for i, scenario in enumerate(TEST_SCENARIOS):
        print(f"\nScenario {i + 1}: {scenario}")
        print("-" * 40)
        resp = generate_response(model, tokenizer, scenario, system_prompt=SYSTEM_PROMPT)
        print(resp)


def main():
    args = parse_args()
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    root = Path.cwd()
    output_dir = root / args.output_dir
    output_dir.mkdir(exist_ok=True)

    # ── Auth ──────────────────────────────────────────────────────────
    token = args.hf_token or os.environ.get("HF_TOKEN")
    if token:
        login(token=token)
    else:
        print("WARNING: No HF_TOKEN set. Gemma is a gated model — you may need to authenticate.")

    # ── Device check ──────────────────────────────────────────────────
    if not torch.cuda.is_available():
        raise RuntimeError("CUDA not available. 4-bit quantization requires an NVIDIA GPU.")

    print(f"GPU: {torch.cuda.get_device_name(0)}")
    print(f"VRAM: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")
    print(f"CUDA: {torch.version.cuda}")

    use_bf16 = torch.cuda.is_bf16_supported()
    compute_dtype = torch.bfloat16 if use_bf16 else torch.float16
    print(f"Compute dtype: {compute_dtype}")

    # ── Dataset ───────────────────────────────────────────────────────
    train_path = root / args.train_data
    val_path = root / args.val_data
    assert train_path.is_file(), f"Training data not found: {train_path}"
    assert val_path.is_file(), f"Validation data not found: {val_path}"

    train_dataset = load_dataset("json", data_files=str(train_path), split="train")
    val_dataset = load_dataset("json", data_files=str(val_path), split="train")
    print(f"Train: {len(train_dataset)} examples | Val: {len(val_dataset)} examples")

    # ── Load model (4-bit quantized) ──────────────────────────────────
    print(f"\nLoading {args.model_id} with 4-bit quantization...")
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=compute_dtype,
        bnb_4bit_use_double_quant=True,
    )

    tokenizer = AutoTokenizer.from_pretrained(args.model_id)
    model = AutoModelForCausalLM.from_pretrained(
        args.model_id,
        quantization_config=bnb_config,
        device_map="auto",
        torch_dtype=compute_dtype,
    )
    print(f"Model loaded. GPU memory: {torch.cuda.memory_allocated() / 1e9:.2f} GB")

    # ── Base model eval ───────────────────────────────────────────────
    if not args.skip_base_eval:
        run_eval(model, tokenizer, label="BASE MODEL (before fine-tuning)")
        flush_memory()

    # ── Format dataset ────────────────────────────────────────────────
    def format_example(example):
        text = tokenizer.apply_chat_template(example["messages"], tokenize=False, add_generation_prompt=False)
        return {"text": text}

    train_dataset = train_dataset.map(format_example)
    val_dataset = val_dataset.map(format_example)

    # ── QLoRA setup ───────────────────────────────────────────────────
    model.gradient_checkpointing_enable(gradient_checkpointing_kwargs={"use_reentrant": False})
    model.enable_input_require_grads()

    peft_config = LoraConfig(
        r=args.lora_r,
        lora_alpha=args.lora_alpha,
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
    )

    model = get_peft_model(model, peft_config)
    model.print_trainable_parameters()

    # ── Training args ─────────────────────────────────────────────────
    adapter_dir = output_dir / "gemma4-medical-qlora"

    training_args = SFTConfig(
        output_dir=str(adapter_dir),
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        gradient_accumulation_steps=args.grad_accum,
        num_train_epochs=args.epochs,
        learning_rate=args.lr,
        lr_scheduler_type="cosine",
        warmup_ratio=0.1,
        logging_steps=1,
        eval_strategy="epoch",
        save_strategy="epoch",
        report_to="none",
        remove_unused_columns=False,
        dataset_text_field="text",
        max_seq_length=args.max_seq_length,
        bf16=use_bf16,
        fp16=not use_bf16,
        optim="paged_adamw_8bit",
        gradient_checkpointing=False,  # already enabled manually above
        dataloader_pin_memory=False,   # reduce host RAM pressure on Windows
    )

    # ── Train v1 ──────────────────────────────────────────────────────
    print(f"\n{'=' * 60}")
    print(f"  TRAINING v1 — {args.epochs} epochs")
    print(f"{'=' * 60}")

    trainer = SFTTrainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
        processing_class=tokenizer,
    )
    trainer.train()

    v1_path = adapter_dir / f"{ts}_final_adapter_v1"
    trainer.model.save_pretrained(str(v1_path))
    tokenizer.save_pretrained(str(v1_path))
    print(f"Adapter v1 saved: {v1_path}")

    # Print loss summary
    train_losses = [x["loss"] for x in trainer.state.log_history if "loss" in x]
    eval_losses = [x["eval_loss"] for x in trainer.state.log_history if "eval_loss" in x]
    if train_losses:
        print(f"Final train loss: {train_losses[-1]:.4f}")
    if eval_losses:
        print(f"Final eval loss:  {eval_losses[-1]:.4f}")

    run_eval(model, tokenizer, label=f"FINE-TUNED v1 ({args.epochs} epochs)")
    flush_memory()

    # ── Train v2 (extended) ───────────────────────────────────────────
    if not args.skip_extended:
        print(f"\n{'=' * 60}")
        print(f"  TRAINING v2 — extending to {args.extended_epochs} epochs")
        print(f"{'=' * 60}")

        trainer.args.num_train_epochs = args.extended_epochs
        trainer.train()

        v2_path = adapter_dir / f"{ts}_final_adapter_v2"
        trainer.model.save_pretrained(str(v2_path))
        tokenizer.save_pretrained(str(v2_path))
        print(f"Adapter v2 saved: {v2_path}")

        train_losses = [x["loss"] for x in trainer.state.log_history if "loss" in x]
        eval_losses = [x["eval_loss"] for x in trainer.state.log_history if "eval_loss" in x]
        if train_losses:
            print(f"Final train loss: {train_losses[-1]:.4f}")
        if eval_losses:
            print(f"Final eval loss:  {eval_losses[-1]:.4f}")

        run_eval(model, tokenizer, label=f"FINE-TUNED v2 ({args.extended_epochs} epochs)")
        flush_memory()

    # ── Merge adapter + export ────────────────────────────────────────
    if not args.skip_merge:
        print(f"\n{'=' * 60}")
        print("  MERGING ADAPTER INTO BASE MODEL")
        print(f"{'=' * 60}")

        # Free the training model first to reclaim VRAM
        del model, trainer
        flush_memory()

        best_adapter = v2_path if not args.skip_extended else v1_path
        print(f"Merging from: {best_adapter}")

        merged_model = AutoPeftModelForCausalLM.from_pretrained(
            str(best_adapter),
            torch_dtype=torch.bfloat16,
            device_map="auto",
        )
        merged_model = merged_model.merge_and_unload()

        merged_path = output_dir / "gemma4-medical-merged"
        merged_model.save_pretrained(str(merged_path))
        tokenizer.save_pretrained(str(merged_path))
        print(f"Merged model saved: {merged_path}")

        del merged_model
        flush_memory()

        print("\n--- GGUF conversion (for llama.cpp deployment) ---")
        print(f"  1. git clone https://github.com/ggml-org/llama.cpp && cd llama.cpp")
        print(f"  2. pip install -r requirements.txt")
        print(f"  3. python convert_hf_to_gguf.py {merged_path} --outtype q4_K_M --outfile gemma4-medical-q4km.gguf")
        print(f"  4. ./llama-server -m gemma4-medical-q4km.gguf -c 1024 --port 8080")

    print("\nDone.")


if __name__ == "__main__":
    main()
