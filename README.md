# MeDAKit

## Youtube Link
https://youtu.be/y5A6JmYnLIM

## Setup and Running

The project consists of a Python FastAPI backend and a Vite + React frontend.

### 1. Backend

The backend contains the API server and uses the Qwen 3.5 model for medical responses.

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

**Qwen Model Setup:**

Make sure you have [Ollama](https://ollama.com/) installed, then pull the base model:
```bash
ollama pull qwen3.5:4b
```

**Running the API Server:**
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
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

*To pre-compute the vector database from scratch:*
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

Generating the vector database was performed locally on the following system:

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
- **[SentenceTransformers](https://sbert.net/)**: Python framework for state-of-the-art text and image embeddings. *Created by Nils Reimers and UKPLab.*
- **[SentencePiece](https://github.com/google/sentencepiece)**: Unsupervised text tokenizer for neural network-based text generation. *Created by Taku Kudo and John Richardson (Google).*

## Models and Datasets Acknowledgments

The sophisticated local processing of this application is only possible thanks to the open-sourcing of several state-of-the-art models and datasets:

- **[Qwen](https://github.com/QwenLM/Qwen)**: The open-weights foundation model that powers the medical emergency reasoning pipeline. *Created by Alibaba Cloud.*
- **[CLIP](https://openai.com/research/clip)** (`sentence-transformers/clip-ViT-B-32`): Multimodal image-text embedding model used in the image tower of our RAG engine. *Created by OpenAI.*
- **[PubMedBERT](https://pubmed.ncbi.nlm.nih.gov/34448356/)** (`pritamdeka/S-PubMedBert-MS-MARCO`): Clinical text embedding model used in the text tower of our RAG engine. *Original architecture created by Yu Gu et al. (Microsoft Research); fine-tuned MS-MARCO version uploaded by Pritam Deka.*
- **[MedRescue Dataset](https://huggingface.co/datasets/ericrisco/medrescue)**: Clinical emergency response dataset used to feed medical facts into our RAG store. *Curated and published by Eric Risco.*
- **Data Pipeline Integrations**: Sourced datasets and tooling are integrated through platforms provided by **[Kaggle](https://www.kaggle.com/)** *(Google)* and **[Roboflow](https://roboflow.com/)** *(Roboflow Inc.)*.

## Technologies We Made but Did Not Get to Utilize

- **RAG System with Two Embedding Models**: We built a Retrieval-Augmented Generation pipeline using two specialized embedding models (SigLIP for images and PubMedBERT for text) to ground the LLM's responses in real medical data. While the vector database and retrieval logic were fully implemented, we were unable to integrate the RAG system into the final product within the hackathon timeframe.
- **Fine-Tuned Gemma 4 Model**: We fine-tuned Google's Gemma 4 model on medical emergency data using QLoRA (4-bit quantization with LoRA adapters). However, Gemma 4 is too new to have stable LoRA support — the adapter export and inference pipeline broke due to incomplete upstream tooling, making the fine-tuned model unusable in production.
