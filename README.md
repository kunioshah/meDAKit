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

## Tools and Frameworks Used

- **[FastAPI](https://fastapi.tiangolo.com/)**: Fast, high-performance web framework used for the backend API.
- **[Uvicorn](https://www.uvicorn.org/)**: ASGI web server implementation for Python.
- **[React](https://react.dev/)**: JavaScript library for building the frontend user interfaces.
- **[Vite](https://vitejs.dev/)**: Next-generation frontend tooling used for fast compilation and serving.
- **[Tailwind CSS](https://tailwindcss.com/)**: Utility-first CSS framework for styling the frontend.
- **[Radix UI](https://www.radix-ui.com/)**: Unstyled, accessible UI components used in the frontend.
- **[Hugging Face Transformers](https://huggingface.co/docs/transformers/index)**: Used to load and format the model pipeline.
- **[PEFT (Parameter-Efficient Fine-Tuning)](https://huggingface.co/docs/peft/index)**: Used for setting up the LoRA adapters for efficient fine-tuning.
- **[TRL (Transformer Reinforcement Learning)](https://huggingface.co/docs/trl/index)**: Library containing the robust `SFTTrainer` used for Supervised Fine-Tuning.
- **[BitsAndBytes](https://github.com/TimDettmers/bitsandbytes)**: Used for aggressive 4-bit quantization (NF4) to make local fine-tuning possible on consumer hardware.
- **[Gemma](https://github.com/google/gemma)**: The open-weights foundation model from Google that powers the medical emergency reasoning pipeline.