# MeDAKit

## Setup and Running

The project consists of a Python FastAPI backend (which also contains the LLM fine-tuning scripts) and a Vite + React frontend.

### 1. Backend

The backend contains the API server as well as scripts to fine-tune the Gemma 4 model for medical responses.

**Prerequisites:** Python 3.10+

**Setup:**
1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment (recommended):
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install the unified dependencies from the root directory:
   ```bash
   pip install -r ../requirements.txt
   ```
4. If you plan to run the fine-tuning script, you will need a `.env` file in the root with your Hugging Face token (since Gemma is a gated model):
   ```env
   HF_TOKEN=your_huggingface_token
   ```

**Gemma Medical Model & Vector DB Setup (Required):**

The fine-tuned LoRA adapter and the pre-computed Vector DB (`chroma_db`) are too large for GitHub, so they are hosted on Google Drive. You **must** download them before running the backend.

1. Download the model adapter and database from the Google Drive folder:
   - 📁 **[Google Drive – Gemma Medical Model & Chroma DB](https://drive.google.com/drive/folders/1ncAt94fa6tCLrPJiKRmfrpn4JqV1z98F?usp=sharing)**
2. Place the downloaded `gemma4-medical-adapter.gguf` file in the **root** of the repository (next to the `Modelfile`).
3. Place the downloaded `chroma_db` folder inside the `backend/` directory (`backend/chroma_db`).
4. Make sure you have [Ollama](https://ollama.com/) installed, then pull the base model and create the fine-tuned model:
   ```bash
   ollama pull gemma4:e4b
   ollama create gemma4-medical -f Modelfile
   ```
5. Verify the model is available:
   ```bash
   ollama list
   ```
   You should see `gemma4-medical` in the output.

**Running the API Server:**
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Running Fine-Tuning:**
1. Ensure your system meets the requirements (e.g., CUDA-compatible NVIDIA GPU with sufficient VRAM for 4-bit quantization).
2. Run the finetuning script:
   ```bash
   python finetune.py
   ```

**Data Pipeline:**
The project includes a standalone data extraction pipeline to download Kaggle, Roboflow, and Hugging Face image datasets.
1. Navigate to the data pipeline directory:
   ```bash
   cd backend/data_pipeline
   ```
2. The script will automatically load the required API keys (KAGGLE_DATASETS, ROBOFLOW_DATASETS, etc.) from the `.env` file at the root of the project.
3. The dependencies are already included in the unified root `requirements.txt`.

4. Run the stream & purge pipeline script:
   ```bash
   python pipeline.py
   ```

**Two-Tower RAG Engine (Local & Multimodal):**
The project features a custom RAG engine built on ChromaDB designed to run smoothly on both heavy GPUs (RTX 5070 Ti) and power-efficient NPU architectures (Snapdragon X Elite). 
Instead of relying on external services or massive embedding models, it splits the vectorization into two lightweight, highly specialized towers:
- **`SigLIP` (Image Tower):** A multimodal model that embeds the 2k+ medical images from the pipeline, allowing retrieval of reference images via text symptoms.
- **`PubMedBERT` (Text Tower):** A tiny but clinically accurate model that embeds the HuggingFace medical facts dataset.

*To pre-compute the vector database from scratch (Skip this if you downloaded `chroma_db` from Google Drive):*
Requires `pipeline.py` to be run completely first.
```bash
cd backend
python rag.py --ingest-images --ingest-hf
```
This generates the `chroma_db` folder locally. You can commit/share this folder so other machines (like a Snapdragon laptop) can run the RAG instantly without needing to calculate embeddings.

### 2. Frontend

The frontend is a web app built using React and Vite.

**Prerequisites:** Node.js (v18+)

**Setup and Run:**
1. Navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies (you can use `npm`, `yarn`, or `pnpm`):
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```

## Hardware Used

Fine-tuning the model and generating the vector database were performed locally on the following system:

| Component | Specification |
|-----------|---------------|
| CPU | Intel Core i7-265KF |
| RAM | 32 GB |
| GPU | NVIDIA GeForce RTX 5070 Ti (16 GB VRAM) |

## Tools, Frameworks, and Authors

- **[FastAPI](https://fastapi.tiangolo.com/)**: Fast, high-performance web framework used for the backend API. *Created by Sebastián Ramírez (tiangolo).*
- **[Uvicorn](https://www.uvicorn.org/)**: ASGI web server implementation for Python. *Created by Tom Christie / Encode OSS.*
- **[React](https://react.dev/)**: JavaScript library for building the frontend user interfaces. *Created by Meta / Facebook.*
- **[Vite](https://vitejs.dev/)**: Next-generation frontend tooling used for fast compilation and serving. *Created by Evan You.*
- **[Tailwind CSS](https://tailwindcss.com/)**: Utility-first CSS framework for styling the frontend. *Created by Adam Wathan.*
- **[Radix UI](https://www.radix-ui.com/)**: Unstyled, accessible UI components used in the frontend. *Created by Modulz / WorkOS.*
- **[Hugging Face Ecosystem](https://huggingface.co/)**: Includes Transformers, PEFT, TRL, and Datasets used to load and fine-tune models. *Created by the Hugging Face Team.*
- **[BitsAndBytes](https://github.com/TimDettmers/bitsandbytes)**: Aggressive 4-bit quantization library (NF4). *Created by Tim Dettmers.*
- **[SentenceTransformers](https://sbert.net/)**: Python framework for state-of-the-art text and image embeddings. *Created by Nils Reimers and UKPLab.*
- **[SentencePiece](https://github.com/google/sentencepiece)**: Unsupervised text tokenizer for neural network-based text generation. *Created by Taku Kudo and John Richardson (Google).*

## Models and Datasets Acknowledgments

The sophisticated local processing of this application is only possible thanks to the open-sourcing of several state-of-the-art models and datasets:

- **[Gemma](https://github.com/google/gemma)**: The open-weights foundation model that powers the medical emergency reasoning pipeline. *Created by Google DeepMind.*
- **[CLIP](https://openai.com/research/clip)** (`sentence-transformers/clip-ViT-B-32`): Multimodal image-text embedding model used in the image tower of our RAG engine. *Created by OpenAI.*
- **[PubMedBERT](https://pubmed.ncbi.nlm.nih.gov/34448356/)** (`pritamdeka/S-PubMedBert-MS-MARCO`): Clinical text embedding model used in the text tower of our RAG engine. *Original architecture created by Yu Gu et al. (Microsoft Research); fine-tuned MS-MARCO version uploaded by Pritam Deka.*
- **[MedRescue Dataset](https://huggingface.co/datasets/ericrisco/medrescue)**: Clinical emergency response dataset used to feed medical facts into our RAG store. *Curated and published by Eric Risco.*
- **Data Pipeline Integrations**: Sourced datasets and tooling are integrated through platforms provided by **[Kaggle](https://www.kaggle.com/)** *(Google)* and **[Roboflow](https://roboflow.com/)** *(Roboflow Inc.)*.
