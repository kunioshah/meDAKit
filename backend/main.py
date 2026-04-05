import re
import subprocess
import platform
from typing import Optional

from fastapi import FastAPI, HTTPException
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


@app.get("/api/phone-data")
def get_phone_data():
    return _latest_phone_data
