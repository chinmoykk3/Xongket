/*
 * Xongket — NodeMCU ESP8266 Sensor Node Firmware (scaffold)
 *
 * Hardware:
 *   - NodeMCU ESP8266
 *   - HC-SR04 Ultrasonic Sensor (water level distance)
 *   - Capacitive Soil Moisture Sensor v2.0 (Analog A0)
 *   - DHT11 (Temperature & Humidity)
 *   - SSD1306 0.96" I2C OLED Display (D1=SCL, D2=SDA)
 */

#include <Arduino.h>

void setup() {
    Serial.begin(115200);
    Serial.println("Xongket ESP8266 sensor node — firmware scaffold");
}

void loop() {
    // TODO: read HC-SR04, Soil Moisture A0, DHT11, display on SSD1306 OLED, transmit to backend
    delay(1000);
}
