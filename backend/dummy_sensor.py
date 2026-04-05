"""
dummy_sensor.py
Posts dummy vitals to the backend every 2 seconds — but ONLY while the
Arduino is physically plugged in via USB. Detects the Arduino by scanning
for a matching COM port (Arduino, CH340, CP210, or any USB Serial device).

Usage:
  python dummy_sensor.py

Requires: pyserial  (pip install pyserial)
"""
import time
import urllib.request
import json
import serial.tools.list_ports

URL = "http://localhost:8000/api/sensor-data"
PAYLOAD = json.dumps({
    "heart_rate": 72.0,
    "spo2": 98.0,
    "temperature": 36.6,
}).encode()

KEYWORDS = ("arduino", "ch340", "cp210", "usb serial", "qualcomm")


def arduino_connected() -> bool:
    for port in serial.tools.list_ports.comports():
        desc = (port.description or "").lower()
        mfr  = (port.manufacturer or "").lower()
        if any(k in desc or k in mfr for k in KEYWORDS):
            return True
    return False


def post_data():
    req = urllib.request.Request(URL, data=PAYLOAD,
                                 headers={"Content-Type": "application/json"})
    urllib.request.urlopen(req, timeout=3)


print("Watching for Arduino. Press Ctrl+C to stop.")
was_connected = False

while True:
    connected = arduino_connected()

    if connected and not was_connected:
        print("Arduino detected — sending sensor data.")
    elif not connected and was_connected:
        print("Arduino unplugged — pausing sensor data.")

    was_connected = connected

    if connected:
        try:
            post_data()
        except Exception as e:
            print(f"Warning: {e}")

    time.sleep(2)
