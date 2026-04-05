/**
 * medakit.ino — Arduino UNO R4 WiFi (dummy sensor node)
 *
 * Boot sequence:
 *   1. Wait for credentials over USB Serial:
 *        SSID:<network>\n
 *        PASS:<password>\n
 *   2. Connect to WiFi.
 *   3. Every 2 seconds POST dummy vitals to keep the backend "Arduino connected"
 *      badge green and attach realistic readings to conversations.
 *
 * SERVER_IP: IPv4 of the laptop on the hotspot.
 *   Windows: run `ipconfig`, look for "Mobile Hotspot" adapter → usually 192.168.137.1
 *
 * Libraries (install via Arduino Library Manager):
 *   WiFiS3          (built-in for UNO R4 WiFi)
 *   ArduinoHttpClient
 */

#include <WiFi.h>
#include <ArduinoHttpClient.h>

// ── Configuration ─────────────────────────────────────────────────────────────
const char* SERVER_IP   = "192.168.137.1";
const int   SERVER_PORT = 8000;
const char* ENDPOINT    = "/api/sensor-data";
const int   POST_INTERVAL_MS = 2000;

// ── Dummy vitals ──────────────────────────────────────────────────────────────
const float HEART_RATE  = 72.0;
const float SPO2        = 98.0;
const float TEMPERATURE = 36.6;

// ── Globals ───────────────────────────────────────────────────────────────────
char ssid[64]     = {0};
char password[64] = {0};

WiFiClient wifiClient;
HttpClient http(wifiClient, SERVER_IP, SERVER_PORT);

unsigned long lastPost = 0;


// ── Serial credential provisioning ───────────────────────────────────────────
void waitForCredentials() {
  Serial.println("Waiting for WiFi credentials...");
  bool gotSSID = false, gotPASS = false;

  while (!gotSSID || !gotPASS) {
    if (Serial.available()) {
      String line = Serial.readStringUntil('\n');
      line.trim();
      if (line.startsWith("SSID:")) {
        line.substring(5).toCharArray(ssid, sizeof(ssid));
        gotSSID = true;
      } else if (line.startsWith("PASS:")) {
        line.substring(5).toCharArray(password, sizeof(password));
        gotPASS = true;
      }
    }
  }
}


// ── WiFi connection ───────────────────────────────────────────────────────────
void connectWiFi() {
  Serial.print("Connecting to ");
  Serial.println(ssid);

  int attempts = 0;
  while (WiFi.begin(ssid, password) != WL_CONNECTED && attempts < 10) {
    delay(1500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nConnected!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
    Serial.println("OK");   // provision_arduino.py waits for this
  } else {
    Serial.println("\nFailed. Restarting...");
    delay(3000);
    NVIC_SystemReset();
  }
}


// ── HTTP POST ─────────────────────────────────────────────────────────────────
void postSensorData() {
  String body = "{\"heart_rate\":";
  body += String(HEART_RATE, 1);
  body += ",\"spo2\":";
  body += String(SPO2, 1);
  body += ",\"temperature\":";
  body += String(TEMPERATURE, 1);
  body += "}";

  http.beginRequest();
  http.post(ENDPOINT);
  http.sendHeader("Content-Type", "application/json");
  http.sendHeader("Content-Length", body.length());
  http.beginBody();
  http.print(body);
  http.endRequest();

  http.responseStatusCode();
  http.responseBody();
}


// ── Arduino lifecycle ─────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  while (!Serial);

  waitForCredentials();
  connectWiFi();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi dropped, reconnecting...");
    connectWiFi();
  }

  if (millis() - lastPost >= POST_INTERVAL_MS) {
    lastPost = millis();
    postSensorData();
  }
}
