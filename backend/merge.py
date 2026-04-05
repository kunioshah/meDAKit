import os
import gc
from pathlib import Path

def _load_env(path=".env"):
    """Load .env file without requiring python-dotenv."""
    env_file = Path(path)
    if not env_file.is_file():
        env_file = Path("..") / path
    if env_file.is_file():
        for line in env_file.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, value = line.partition("=")
                os.environ.setdefault(key.strip(), value.strip())

_load_env()

import torch
from peft import AutoPeftModelForCausalLM
from transformers import AutoTokenizer
from huggingface_hub import login

def flush_memory():
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()

def main():
    token = os.environ.get("HF_TOKEN")
    if token:
        login(token=token)

    root = Path(__file__).resolve().parent.parent
    
    # Pointing exactly to the adapter path from your last terminal output
    adapter_path = root / "outputs/gemma4-medical-qlora/20260405_001227_final_adapter_v2"
    merged_path = root / "outputs/gemma4-medical-merged"

    print("\n============================================================")
    print("  FAST MERGE SCRIPT")
    print("============================================================")

    if not adapter_path.exists():
        print(f"ERROR: Cannot find adapter at {adapter_path}")
        return

    print(f"Loading from: {adapter_path}")

    # Load PEFT model
    # Note the included offload_folder parameter to prevent the crash!
    merged_model = AutoPeftModelForCausalLM.from_pretrained(
        str(adapter_path),
        torch_dtype=torch.bfloat16,
        device_map="auto",
        offload_folder="offload",
    )

    tokenizer = AutoTokenizer.from_pretrained(str(adapter_path))

    print("\nMerging adapter into base model (this requires RAM)...")
    merged_model = merged_model.merge_and_unload()

    print(f"\nSaving merged model to: {merged_path}")
    merged_path.mkdir(parents=True, exist_ok=True)
    merged_model.save_pretrained(str(merged_path))
    tokenizer.save_pretrained(str(merged_path))

    # Free up memory just in case
    del merged_model
    flush_memory()

    print("\nMerge complete! Ready for optional GGUF conversion.")

if __name__ == "__main__":
    main()
