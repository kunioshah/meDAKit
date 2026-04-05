"""
provision_arduino.py
Sends WiFi credentials to an Arduino over USB serial so it can connect to the
Windows Mobile Hotspot without hardcoded values.

Usage:
  python provision_arduino.py --ssid "MyHotspot" --password "abc123"
  python provision_arduino.py --ssid "MyHotspot" --password "abc123" --port COM3

If --port is omitted the script auto-detects the first Arduino COM port.
The script writes  SSID:<ssid>\nPASS:<password>\n  then waits for "OK\n".
"""
import argparse
import sys
import time
import serial
import serial.tools.list_ports


def find_arduino_port() -> str:
    """Return the first COM port whose description mentions Arduino or CH340/CP210."""
    keywords = ("arduino", "ch340", "cp210", "usb serial")
    for port in serial.tools.list_ports.comports():
        desc = (port.description or "").lower()
        if any(k in desc for k in keywords):
            return port.device
    # fallback: return first available port
    ports = serial.tools.list_ports.comports()
    if ports:
        return ports[0].device
    raise RuntimeError("No serial port found. Plug in the Arduino and try again.")


def provision(ssid: str, password: str, port: str | None, baud: int = 115200):
    if port is None:
        port = find_arduino_port()
        print(f"Auto-detected port: {port}")

    print(f"Connecting to {port} at {baud} baud…")
    with serial.Serial(port, baud, timeout=10) as ser:
        # Arduino resets on serial open; give it time to boot
        time.sleep(2)
        ser.reset_input_buffer()

        payload = f"SSID:{ssid}\nPASS:{password}\n"
        ser.write(payload.encode())
        print(f"Sent credentials for SSID '{ssid}'")

        # Wait for acknowledgement
        deadline = time.time() + 15
        while time.time() < deadline:
            line = ser.readline().decode(errors="replace").strip()
            if line:
                print(f"Arduino: {line}")
            if line == "OK":
                print("Arduino acknowledged — provisioning complete.")
                return
        print("Warning: no OK received within 15 s. Check Arduino serial output.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Provision Arduino WiFi credentials over USB serial.")
    parser.add_argument("--ssid", required=True, help="Mobile Hotspot SSID")
    parser.add_argument("--password", required=True, help="Mobile Hotspot password")
    parser.add_argument("--port", default=None, help="COM port (e.g. COM3). Auto-detected if omitted.")
    parser.add_argument("--baud", type=int, default=115200)
    args = parser.parse_args()
    try:
        provision(args.ssid, args.password, args.port, args.baud)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
