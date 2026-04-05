"""
serial_sensor.py
Reads JSON vitals from the Arduino over USB Serial and forwards them to the
backend. Run this instead of dummy_sensor.py once the sketch is flashed.

Usage:
  python serial_sensor.py
  python serial_sensor.py --port COM3   # override auto-detect

Requires: pyserial  (pip install pyserial)
"""
import argparse
import json
import sys
import time
import urllib.request
import serial
import serial.tools.list_ports

URL      = "http://localhost:8000/api/sensor-data"
KEYWORDS = ("arduino", "ch340", "cp210", "usb serial", "qualcomm")


def find_port() -> str:
    for port in serial.tools.list_ports.comports():
        desc = (port.description or "").lower()
        mfr  = (port.manufacturer or "").lower()
        if any(k in desc or k in mfr for k in KEYWORDS):
            return port.device
    ports = serial.tools.list_ports.comports()
    if ports:
        return ports[0].device
    raise RuntimeError("No serial port found.")


def post(payload: bytes):
    req = urllib.request.Request(URL, data=payload,
                                 headers={"Content-Type": "application/json"})
    urllib.request.urlopen(req, timeout=3)


def run(port: str | None):
    if port is None:
        port = find_port()
    print(f"Connecting to Arduino on {port}…")

    with serial.Serial(port, 115200, timeout=5) as ser:
        print("Connected. Forwarding sensor data. Press Ctrl+C to stop.")
        while True:
            line = ser.readline().decode(errors="replace").strip()
            if not line:
                continue
            try:
                data = json.loads(line)
                post(json.dumps(data).encode())
            except Exception:
                pass   # ignore malformed lines


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", default=None)
    args = parser.parse_args()
    while True:
        try:
            run(args.port)
        except RuntimeError as e:
            print(f"{e} Retrying in 3s…")
            time.sleep(3)
        except serial.SerialException as e:
            print(f"Serial error: {e}. Retrying in 3s…")
            time.sleep(3)
        except KeyboardInterrupt:
            print("Stopped.")
            sys.exit(0)
