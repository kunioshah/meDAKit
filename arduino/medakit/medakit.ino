/**
 * medakit.ino — Arduino UNO Q (serial sensor node)
 *
 * No WiFi needed. Sends dummy vitals over USB Serial every 2 seconds.
 * The laptop reads this via serial_sensor.py and forwards to the backend.
 */

const float HEART_RATE  = 72.0;
const float SPO2        = 98.0;
const float TEMPERATURE = 36.6;

void setup() {
  Serial.begin(115200);
  while (!Serial);
}

void loop() {
  Serial.print("{\"heart_rate\":");
  Serial.print(HEART_RATE, 1);
  Serial.print(",\"spo2\":");
  Serial.print(SPO2, 1);
  Serial.print(",\"temperature\":");
  Serial.print(TEMPERATURE, 1);
  Serial.println("}");

  delay(2000);
}
