"""
FastAPI application server for the medical diagnostic platform.
Handles API endpoints for patient data management, real-time image analysis using Ollama, 
and session persistence.
"""
import re
import base64
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
from fastapi.staticfiles import StaticFiles
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
    
    system_prompt = f"""You are an emergency medical assistant. Analyze symptoms and give direct, calm, actionable guidance.

{"An image has been provided. Examine it carefully for visible injuries, conditions, or symptoms and factor your observations into your response." if has_image else "No image provided. Use only the text description."}

Rules:
- No markdown formatting, no asterisks, no bullet points, no headers.
- Write in plain prose as if speaking calmly over the phone.
- Be concise. Do not repeat yourself or add disclaimers.
- State severity (Low, Medium, or High) and the most important action in the first sentence.
- Follow with 2-3 brief, specific steps the patient should take right now."""

    user_prompt = f"""Patient Symptoms/Context:
{request.patient_context if request.patient_context else "None provided."}

Relevant Clinical Facts (Retrieved from Medical Database):
{text_context if text_context else "None retrieved."}
"""
    if has_image:
        user_prompt = "[IMAGE PROVIDED] Please analyze the attached image of the patient's condition.\n\n" + user_prompt

    # 2. Call local Ollama API (multimodal — sends image + text to the model)
    ollama_url = "http://localhost:11434/api/generate"
    payload = {
        "model": "qwen3.5:4b",
        "system": system_prompt,
        "prompt": user_prompt,
        "stream": False,
    }

    # Pass the patient image to the vision-capable model
    if request.image:
        payload["images"] = [request.image]
    
    analysis_result = "Failed to reach Ollama. Please ensure Ollama is running and the model is pulled."
    severity = "medium"
    recommendation = "Consult a healthcare provider."
    
    try:
        response = requests.post(ollama_url, json=payload, timeout=300)
        if response.status_code == 200:
            data = response.json()
            analysis_result = data.get("response", "No response text.")
            
            # Simple heuristic to extract severity from the unstructured LLM text
            lower_analysis = analysis_result.lower()
            if "severity: high" in lower_analysis or "high severity" in lower_analysis:
                severity = "high"
            elif "severity: low" in lower_analysis or "low severity" in lower_analysis:
                severity = "low"
        else:
            analysis_result = f"Ollama API returned an error: {response.status_code} - {response.text}"
    except Exception as e:
        print(f"Ollama API error: {e}")
        analysis_result = f"Failed to reach Ollama. Error: {str(e)}"

    return {
        "analysis": analysis_result,
        "severity": severity,
        "recommendation": recommendation,
        "retrieved_context": text_context,
        "reference_image": image_context
    }


# ── Phone data store ──────────────────────────────────────────────────────────

_latest_phone_data: dict = {}


# ── Arduino sensor store ──────────────────────────────────────────────────────

_latest_sensor_data: dict = {"heart_rate": None, "spo2": None, "temperature": None, "last_seen": None}


class SensorData(BaseModel):
    heart_rate: Optional[float] = None
    spo2: Optional[float] = None
    temperature: Optional[float] = None
    # Serial-provisioned WiFi credentials (sent by Arduino on connect)
    ssid: Optional[str] = None
    password: Optional[str] = None


@app.get("/api/sensor-data")
def get_sensor_data():
    return _latest_sensor_data


@app.post("/api/sensor-data")
def post_sensor_data(data: SensorData):
    global _latest_sensor_data
    _latest_sensor_data = {
        "heart_rate": data.heart_rate,
        "spo2": data.spo2,
        "temperature": data.temperature,
        "last_seen": datetime.now(timezone.utc).isoformat(),
    }
    return {"status": "ok"}


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

# Serve patient images as static files at /data/patients/<id>/images/<file>
_data_root = os.path.join(os.path.dirname(__file__), "..", "data")
os.makedirs(_data_root, exist_ok=True)
app.mount("/data", StaticFiles(directory=_data_root), name="data")

def generate_patient_id() -> str:
    """Generate a random max 4-digit hex number, e.g., '1A3F'"""
    # 0 to 65535 in hex is 0x0 to 0xFFFF
    return format(random.randint(0, 0xFFFF), 'x').upper().zfill(4)

class PatientLoginRequest(BaseModel):
    patient_id: str

class ArduinoData(BaseModel):
    heart_rate: Optional[float] = None
    spo2: Optional[float] = None
    temperature: Optional[float] = None

class ConversationEntryRequest(BaseModel):
    role: Optional[str] = "user"
    text: Optional[str] = None
    images: Optional[list[str]] = None  # base64 data URLs
    response: Optional[str] = None
    arduino: Optional[ArduinoData] = None


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
    os.makedirs(os.path.join(patient_dir, "images"))

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
async def add_conversation_entry(patient_id: str, req: ConversationEntryRequest):
    """Record a single exchange: timestamp, text, images (saved to disk), response."""
    patient_id = patient_id.upper()
    patient_dir = os.path.join(DATA_DIR, patient_id)
    conv_path = os.path.join(patient_dir, "conversations.json")
    if not os.path.exists(conv_path):
        raise HTTPException(status_code=404, detail="Patient not found")

    # Save each base64 image to patients/<id>/images/ and collect relative URLs
    images_dir = os.path.join(patient_dir, "images")
    os.makedirs(images_dir, exist_ok=True)
    image_paths: list[str] = []
    for img_data_url in (req.images or []):
        # Parse "data:<mime>;base64,<data>" or raw base64
        if "," in img_data_url:
            header, b64 = img_data_url.split(",", 1)
            ext = "jpg"
            if "png" in header:
                ext = "png"
            elif "gif" in header:
                ext = "gif"
            elif "webp" in header:
                ext = "webp"
        else:
            b64, ext = img_data_url, "jpg"
        filename = f"{uuid.uuid4()}.{ext}"
        filepath = os.path.join(images_dir, filename)
        with open(filepath, "wb") as f:
            f.write(base64.b64decode(b64))
        # Store as a URL path served by the static mount
        image_paths.append(f"/data/patients/{patient_id}/images/{filename}")

    with open(conv_path, "r") as f:
        data = json.load(f)
    
    user_entry = {
        "id": str(uuid.uuid4()),
        "role": req.role or "user",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "text": req.text or "",
        "images": image_paths,
        "response": "",
        "arduino": req.arduino.model_dump() if req.arduino else {"heart_rate": None, "spo2": None, "temperature": None},
    }
    data.setdefault("conversations", []).append(user_entry)
    with open(conv_path, "w") as f:
        json.dump(data, f, indent=2)

    if user_entry["role"] == "user":
        # Call analyze internally to generate an AI response
        image_b64 = req.images[0] if req.images and len(req.images) > 0 else ""
        text_ctx = req.text or ""
        
        analyze_req = AnalyzeRequest(image=image_b64, patient_context=text_ctx)
        try:
            analyze_res = await analyze(analyze_req)
            ai_text = analyze_res.get("analysis", "Failed to get AI response.")
            severity = analyze_res.get("severity", "")
            recommendation = analyze_res.get("recommendation", "")
        except Exception as e:
            ai_text = f"Failed to get AI response: {e}"
            severity = "unknown"
            recommendation = ""

        ai_entry = {
            "id": str(uuid.uuid4()),
            "role": "ai",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "text": ai_text,
            "images": [],
            "severity": severity,
            "recommendation": recommendation,
            "arduino": {"heart_rate": None, "spo2": None, "temperature": None},
        }
        
        # Read again just in case (though it shouldn't have changed in this async block)
        with open(conv_path, "r") as f:
            data = json.load(f)
        data.setdefault("conversations", []).append(ai_entry)
        with open(conv_path, "w") as f:
            json.dump(data, f, indent=2)
            
        return {"user_entry": user_entry, "ai_entry": ai_entry}

    return {"user_entry": user_entry}


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
