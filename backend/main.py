import re
import subprocess
import platform
import os
import json
import random
import uuid
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

class AnalyzeRequest(BaseModel):
    image: str  # base64-encoded
    patient_context: Optional[str] = None


@app.post("/api/analyze")
async def analyze(request: AnalyzeRequest):
    # TODO: forward to AnythingLLM RAG + Ollama (gemma3:4b)
    return {
        "analysis": "Analysis placeholder — wire up AnythingLLM here.",
        "severity": "low",
        "recommendation": "Consult a healthcare provider.",
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

class ConversationCreateRequest(BaseModel):
    topic: str

class MessageCreateRequest(BaseModel):
    role: str
    content: str


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
    patient_dir = os.path.join(DATA_DIR, patient_id)
    conv_path = os.path.join(patient_dir, "conversations.json")
    
    if not os.path.exists(conv_path):
        raise HTTPException(status_code=404, detail="Patient not found")
        
    with open(conv_path, "r") as f:
        data = json.load(f)
        
    # Sort by timestamp descending
    convs = sorted(data.get("conversations", []), key=lambda c: c.get("last_updated", ""), reverse=True)
    return {"conversations": convs}


@app.post("/api/patients/{patient_id}/conversations")
def start_conversation(patient_id: str, req: ConversationCreateRequest):
    patient_id = patient_id.upper()
    patient_dir = os.path.join(DATA_DIR, patient_id)
    conv_path = os.path.join(patient_dir, "conversations.json")
    
    if not os.path.exists(conv_path):
        raise HTTPException(status_code=404, detail="Patient not found")
        
    with open(conv_path, "r") as f:
        data = json.load(f)
        
    now = datetime.now(timezone.utc).isoformat()
    conv_id = str(uuid.uuid4())
    
    new_conv = {
        "id": conv_id,
        "topic": req.topic,
        "created_at": now,
        "last_updated": now,
        "messages": []
    }
    
    data["conversations"].append(new_conv)
    
    with open(conv_path, "w") as f:
        json.dump(data, f, indent=2)
        
    return new_conv


@app.get("/api/patients/{patient_id}/conversations/{conversation_id}")
def get_conversation(patient_id: str, conversation_id: str):
    patient_id = patient_id.upper()
    patient_dir = os.path.join(DATA_DIR, patient_id)
    conv_path = os.path.join(patient_dir, "conversations.json")
    
    if not os.path.exists(conv_path):
        raise HTTPException(status_code=404, detail="Patient not found")
        
    with open(conv_path, "r") as f:
        data = json.load(f)
        
    for conv in data.get("conversations", []):
        if conv["id"] == conversation_id:
            return conv
            
    raise HTTPException(status_code=404, detail="Conversation not found")


@app.post("/api/patients/{patient_id}/conversations/{conversation_id}/messages")
def add_message(patient_id: str, conversation_id: str, req: MessageCreateRequest):
    patient_id = patient_id.upper()
    patient_dir = os.path.join(DATA_DIR, patient_id)
    conv_path = os.path.join(patient_dir, "conversations.json")
    
    if not os.path.exists(conv_path):
        raise HTTPException(status_code=404, detail="Patient not found")
        
    # Read everything and lock logic implicitly by single thread request - good enough for simple local system
    with open(conv_path, "r") as f:
        data = json.load(f)
        
    found = False
    now = datetime.now(timezone.utc).isoformat()
    for conv in data.get("conversations", []):
        if conv["id"] == conversation_id:
            msg = {
                "role": req.role,
                "content": req.content,
                "timestamp": now
            }
            if "messages" not in conv:
                conv["messages"] = []
            conv["messages"].append(msg)
            conv["last_updated"] = now
            found = True
            break
            
    if not found:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    with open(conv_path, "w") as f:
        json.dump(data, f, indent=2)
        
    return {"status": "ok", "message": msg}
