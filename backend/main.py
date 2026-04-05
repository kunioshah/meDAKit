import re
import subprocess
import platform
import os
import json
import random
import uuid
import requests
from datetime import datetime, timezone
from typing import Optional, Dict, Any

from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_hotspot_ip() -> str:
    system = platform.system()
    try:
        if system == "Windows":
            result = subprocess.run(["ipconfig"], capture_output=True, text=True)
            lines = result.stdout.split("\n")
            in_hotspot = False
            for line in lines:
                if "Local Area Connection*" in line:
                    in_hotspot = True
                if in_hotspot and "IPv4 Address" in line:
                    match = re.search(r"(\d+\.\d+\.\d+\.\d+)", line)
                    if match:
                        return match.group(1)
        else:
            # macOS / Linux fallback — use the primary interface IP
            result = subprocess.run(
                ["ipconfig", "getifaddr", "en0"], capture_output=True, text=True
            )
            ip = result.stdout.strip()
            if ip:
                return ip
    except Exception:
        pass
    return "192.168.137.1"  # Windows hotspot default


@app.get("/api/ip")
def get_ip():
    ip = get_hotspot_ip()
    return {
        "ip": ip,
        "app_url": f"http://{ip}:5173/mobile",
    }


# ── Analyze ──────────────────────────────────────────────────────────────────

try:
    from rag import rag_service
except ImportError:
    rag_service = None

class AnalyzeRequest(BaseModel):
    image: str  # base64-encoded
    patient_context: Optional[str] = None


@app.post("/api/analyze")
async def analyze(request: AnalyzeRequest):
    # Retrieve context from Two-Tower RAG
    text_context = ""
    image_context = ""
    
    if rag_service and request.patient_context:
        try:
            # Query both databases simultaneously
            hybrid_results = rag_service.retrieve_hybrid(query_text=request.patient_context, n_text=2, n_images=1)
            
            # Extract Text Facts
            text_facts = hybrid_results.get("text_facts")
            if text_facts and 'documents' in text_facts and len(text_facts['documents']) > 0:
                text_context = "\n".join(text_facts['documents'][0])
                
            # Extract Image References
            img_refs = hybrid_results.get("reference_images")
            if img_refs and 'metadatas' in img_refs and len(img_refs['metadatas']) > 0:
                # Get the path of the most similar image to the text query
                image_metadata = img_refs['metadatas'][0]
                if image_metadata:
                    image_context = image_metadata[0].get("image_path", "")
                    
        except Exception as e:
            print(f"RAG Retrieval failed: {e}")

    # Forward request.image and text_context to Ollama
    
    # 1. Construct the RAG-augmented prompt
    has_image = bool(request.image)
    prompt = f"""You are an expert medical AI assistant. Analyze the patient's symptoms.

{"An image has been provided. Carefully examine the image for any visible medical symptoms, injuries, skin conditions, or other clinically relevant observations." if has_image else "No image was provided."}

Patient Symptoms/Context:
{request.patient_context if request.patient_context else "None provided."}

Relevant Clinical Facts (Retrieved from Medical Database):
{text_context if text_context else "None retrieved."}

Please provide a structured analysis including your observations{", incorporating what you see in the image," if has_image else ""} a preliminary severity assessment (low, medium, high), and actionable recommendations. Keep your response clear and clinical.
"""

    # 2. Call local Ollama API (multimodal — sends image + text to the model)
    ollama_url = "http://localhost:11434/api/generate"
    payload = {
        "model": "gemma-medical",
        "prompt": prompt,
        "stream": False,
    }

    # Pass the patient image to the vision-capable model
    if request.image:
        # Strip data URL prefix if present (e.g., "data:image/png;base64,...")
        img_data = request.image
        if "," in img_data:
            img_data = img_data.split(",", 1)[1]
        payload["images"] = [img_data]
    
    analysis_result = "Failed to reach Ollama. Please ensure Ollama is running and the model is pulled."
    severity = "medium"
    recommendation = "Consult a healthcare provider."
    
    try:
        response = requests.post(ollama_url, json=payload, timeout=60)
        if response.status_code == 200:
            data = response.json()
            analysis_result = data.get("response", "No response text.")
            
            # Simple heuristic to extract severity from the unstructured LLM text
            lower_analysis = analysis_result.lower()
            if "severity: high" in lower_analysis or "high severity" in lower_analysis:
                severity = "high"
            elif "severity: low" in lower_analysis or "low severity" in lower_analysis:
                severity = "low"
    except Exception as e:
        print(f"Ollama API error: {e}")

    return {
        "analysis": analysis_result,
        "severity": severity,
        "recommendation": recommendation,
        "retrieved_context": text_context,
        "reference_image": image_context
    }


# ── Phone data store ──────────────────────────────────────────────────────────

_latest_phone_data: dict = {}


class PhoneData(BaseModel):
    text: Optional[str] = None
    images: Optional[list[str]] = None  # base64 data URLs


@app.get("/api/phone-data")
def get_phone_data():
    return _latest_phone_data


@app.post("/api/phone-data")
def post_phone_data(data: PhoneData):
    global _latest_phone_data
    _latest_phone_data = data.model_dump(exclude_none=True)
    return {"status": "ok"}


# ── Patient Database ──────────────────────────────────────────────────────────

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "patients")

def ensure_data_dir():
    os.makedirs(DATA_DIR, exist_ok=True)

def generate_patient_id() -> str:
    """Generate a random max 4-digit hex number, e.g., '1A3F'"""
    # 0 to 65535 in hex is 0x0 to 0xFFFF
    return format(random.randint(0, 0xFFFF), 'x').upper().zfill(4)

class PatientLoginRequest(BaseModel):
    patient_id: str

class ConversationEntryRequest(BaseModel):
    text: Optional[str] = None
    images: Optional[list[str]] = None  # base64 data URLs
    response: Optional[str] = None


@app.get("/api/patients")
def list_patients():
    ensure_data_dir()
    patients = []
    if os.path.exists(DATA_DIR):
        for patient_id in os.listdir(DATA_DIR):
            info_path = os.path.join(DATA_DIR, patient_id, "info.json")
            if os.path.exists(info_path):
                with open(info_path, "r") as f:
                    info = json.load(f)
                patients.append(info)
    patients.sort(key=lambda p: p.get("last_updated", p.get("created_at", "")), reverse=True)
    return {"patients": patients}


@app.post("/api/patients/signup")
def patient_signup(info: Dict[str, Any] = Body(...)):
    ensure_data_dir()
    
    # Generate unique ID
    attempts = 0
    while True:
        patient_id = generate_patient_id()
        patient_dir = os.path.join(DATA_DIR, patient_id)
        if not os.path.exists(patient_dir):
            break
        attempts += 1
        if attempts > 1000:
            raise HTTPException(status_code=500, detail="Database full or error generating ID")
            
    os.makedirs(patient_dir)
    
    # Save info
    info["id"] = patient_id
    info["created_at"] = datetime.now(timezone.utc).isoformat()
    
    info_path = os.path.join(patient_dir, "info.json")
    with open(info_path, "w") as f:
        json.dump(info, f, indent=2)
        
    # Start blank conversations index
    conv_path = os.path.join(patient_dir, "conversations.json")
    with open(conv_path, "w") as f:
        json.dump({"conversations": []}, f, indent=2)
        
    return {"patient_id": patient_id}


@app.patch("/api/patients/{patient_id}")
def update_patient(patient_id: str, info: Dict[str, Any] = Body(...)):
    patient_id = patient_id.upper()
    info_path = os.path.join(DATA_DIR, patient_id, "info.json")
    if not os.path.exists(info_path):
        raise HTTPException(status_code=404, detail="Patient not found")
    with open(info_path, "r") as f:
        existing = json.load(f)
    existing.update({k: v for k, v in info.items() if k not in ("id", "created_at")})
    existing["last_updated"] = datetime.now(timezone.utc).isoformat()
    with open(info_path, "w") as f:
        json.dump(existing, f, indent=2)
    return {"status": "ok", "patient": existing}


@app.delete("/api/patients/{patient_id}")
def delete_patient(patient_id: str):
    import shutil
    patient_id = patient_id.upper()
    patient_dir = os.path.join(DATA_DIR, patient_id)
    if not os.path.exists(patient_dir):
        raise HTTPException(status_code=404, detail="Patient not found")
    shutil.rmtree(patient_dir)
    return {"status": "ok"}


@app.post("/api/patients/login")
def patient_login(req: PatientLoginRequest):
    patient_id = req.patient_id.upper()
    patient_dir = os.path.join(DATA_DIR, patient_id)
    info_path = os.path.join(patient_dir, "info.json")
    
    if not os.path.exists(info_path):
        raise HTTPException(status_code=404, detail="Patient not found")
        
    with open(info_path, "r") as f:
        info = json.load(f)
        
    return {"status": "ok", "patient_info": info}


@app.get("/api/patients/{patient_id}/conversations")
def get_conversations(patient_id: str):
    patient_id = patient_id.upper()
    conv_path = os.path.join(DATA_DIR, patient_id, "conversations.json")
    if not os.path.exists(conv_path):
        raise HTTPException(status_code=404, detail="Patient not found")
    with open(conv_path, "r") as f:
        data = json.load(f)
    convs = sorted(data.get("conversations", []), key=lambda c: c.get("timestamp", ""), reverse=True)
    return {"conversations": convs}


@app.post("/api/patients/{patient_id}/conversations")
def add_conversation_entry(patient_id: str, req: ConversationEntryRequest):
    """Record a single exchange: timestamp, text, images, response."""
    patient_id = patient_id.upper()
    conv_path = os.path.join(DATA_DIR, patient_id, "conversations.json")
    if not os.path.exists(conv_path):
        raise HTTPException(status_code=404, detail="Patient not found")
    with open(conv_path, "r") as f:
        data = json.load(f)
    entry = {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "text": req.text or "",
        "images": req.images or [],
        "response": req.response or "",
    }
    data.setdefault("conversations", []).append(entry)
    with open(conv_path, "w") as f:
        json.dump(data, f, indent=2)
    return entry


@app.get("/api/patients/{patient_id}/conversations/{entry_id}")
def get_conversation_entry(patient_id: str, entry_id: str):
    patient_id = patient_id.upper()
    conv_path = os.path.join(DATA_DIR, patient_id, "conversations.json")
    if not os.path.exists(conv_path):
        raise HTTPException(status_code=404, detail="Patient not found")
    with open(conv_path, "r") as f:
        data = json.load(f)
    for entry in data.get("conversations", []):
        if entry["id"] == entry_id:
            return entry
    raise HTTPException(status_code=404, detail="Entry not found")


@app.delete("/api/patients/{patient_id}/conversations/{entry_id}")
def delete_conversation_entry(patient_id: str, entry_id: str):
    patient_id = patient_id.upper()
    conv_path = os.path.join(DATA_DIR, patient_id, "conversations.json")
    if not os.path.exists(conv_path):
        raise HTTPException(status_code=404, detail="Patient not found")
    with open(conv_path, "r") as f:
        data = json.load(f)
    original = data.get("conversations", [])
    data["conversations"] = [e for e in original if e["id"] != entry_id]
    if len(data["conversations"]) == len(original):
        raise HTTPException(status_code=404, detail="Entry not found")
    with open(conv_path, "w") as f:
        json.dump(data, f, indent=2)
    return {"status": "ok"}
