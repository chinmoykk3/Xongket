/*
 * Xongket — ESP32 Sensor Node Firmware (placeholder)
 *
 * Will read water-level, rainfall, soil-moisture, and vibration
 * sensors and publish readings over MQTT / HTTP.
 */

#include <Arduino.h>

void setup() {
    Serial.begin(115200);
    Serial.println("Xongket sensor node — firmware placeholder");
}

void loop() {
    // TODO: read sensors, transmit data
    delay(1000);
}

