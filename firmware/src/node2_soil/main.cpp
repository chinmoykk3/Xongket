/**
 * Xongket — Node 2 Firmware: Geotechnical Soil Saturation & Landslide Station
 * Hardware:
 *   - NodeMCU ESP8266 (ESP-12E)
 *   - Capacitive Soil Moisture Sensor v2.0:
 *       AOUT -> A0 (Analog ADC0, 0-1.0V or 0-3.3V with onboard voltage divider)
 *       VCC  -> 3.3V
 *       GND  -> GND
 *   - Optional DHT11:
 *       DATA -> D4 (GPIO2)
 *   - Optional SSD1306 0.96" I2C OLED (128x64):
 *       SCL  -> D1 (GPIO5)
 *       SDA  -> D2 (GPIO4)
 */

#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <DHT.h>
#include <ArduinoJson.h>

#include "config.h"
#include "wifi_manager.h"
#include "time_sync.h"
#include "http_client.h"
#include "storage_buffer.h"
#include "soil_sensor.h"

// ── Pin Configuration ───────────────────────────────────────
#define PIN_SOIL_ANALOG     A0
#define PIN_DHT             D4  // GPIO2
#define PIN_OLED_SCL        D1  // GPIO5
#define PIN_OLED_SDA        D2  // GPIO4

#define SCREEN_WIDTH        128
#define SCREEN_HEIGHT       64

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);
DHT dht(PIN_DHT, DHT11);
WiFiManager wifiMgr(WIFI_SSID, WIFI_PASSWORD);

bool oledAvailable = false;
unsigned long lastSampleTime = 0;
const unsigned long SAMPLE_INTERVAL_MS = 15000; // Sample every 15s

float lastSoilPct = 0.0f;
float lastRawAvg = 0.0f;
float lastTemp = 0.0f;
float lastHum = 0.0f;

// ── Soil Moisture Sampling & Calibration ────────────────────
void sampleSoilMoisture(float& outRawAvg, float& outPercent) {
    int samples[10];
    for (int i = 0; i < 10; i++) {
        samples[i] = analogRead(PIN_SOIL_ANALOG);
        delay(15);
    }

    outRawAvg = average_samples_10(samples);
    outPercent = raw_to_percent((int)outRawAvg, NODE2_RAW_DRY, NODE2_RAW_WET);

    Serial.printf("[SOIL] 10-sample Avg: %.1f (Dry: %d, Wet: %d) -> Moisture: %.1f%%\n",
                  outRawAvg, NODE2_RAW_DRY, NODE2_RAW_WET, outPercent);
}

// ── OLED Display Rendering ──────────────────────────────────
void updateDisplay() {
    if (!oledAvailable) return;

    display.clearDisplay();
    display.setTextColor(SSD1306_WHITE);
    display.setTextSize(1);

    display.setCursor(0, 0);
    display.print("XONGKET - SOIL NODE");

    display.setCursor(80, 0);
    display.print(wifiMgr.isConnected() ? "[LINK]" : "[OFF]");

    // Large Soil Moisture Display
    display.setCursor(0, 14);
    display.setTextSize(2);
    display.printf("%.1f%%", lastSoilPct);

    display.setTextSize(1);
    display.setCursor(0, 34);
    display.printf("ADC: %.0f (D:%d W:%d)", lastRawAvg, NODE2_RAW_DRY, NODE2_RAW_WET);

    display.setCursor(0, 46);
    display.printf("T:%.1fC  H:%.0f%%", lastTemp, lastHum);

    display.setCursor(0, 56);
    if (wifiMgr.isConnected()) {
        display.printf("IP: %s", wifiMgr.getIP().c_str());
    } else {
        display.printf("BUFFER: %d queued", StorageBuffer::getBufferedCount());
    }

    display.display();
}

// ── Telemetry Transmission ──────────────────────────────────
void transmitReading(const char* unit, float val) {
    JsonDocument doc;
    doc["node_id"] = NODE2_ID;
    doc["ts"] = TimeSync::getIsoTimestamp();
    doc["value"] = round(val * 10.0f) / 10.0f;
    doc["unit"] = unit;

    String jsonStr;
    serializeJson(doc, jsonStr);

    if (wifiMgr.isConnected()) {
        int code = XongketHttpClient::postWithRetry(
            BACKEND_HOST,
            BACKEND_PORT,
            INGEST_ENDPOINT,
            NODE2_API_KEY,
            jsonStr,
            2
        );

        if (code == 200 || code == 201) {
            if (StorageBuffer::hasBufferedReadings()) {
                StorageBuffer::flushBatch(BACKEND_HOST, BACKEND_PORT, INGEST_ENDPOINT, NODE2_API_KEY);
            }
            return;
        }
    }

    Serial.printf("[Buffer] Offline. Queuing soil %s reading to LittleFS\n", unit);
    StorageBuffer::bufferReading(jsonStr);
}

// ── Setup & Loop ────────────────────────────────────────────
void setup() {
    Serial.begin(115200);
    delay(200);
    Serial.println("\n=== Xongket Node 2 (Soil Moisture) Initializing ===");

    Wire.begin(PIN_OLED_SDA, PIN_OLED_SCL);
    if (display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
        oledAvailable = true;
        display.clearDisplay();
        display.setTextColor(SSD1306_WHITE);
        display.setTextSize(1);
        display.setCursor(0, 20);
        display.println("XONGKET SOIL NODE");
        display.println("Calibrating ADC...");
        display.display();
    } else {
        Serial.println("[OLED] Display not detected (continuing in headless mode)");
    }

    dht.begin();
    StorageBuffer::begin();
    wifiMgr.begin();
    TimeSync::begin(GMT_OFFSET_SEC, DAYLIGHT_OFFSET_SEC, NTP_SERVER_1, NTP_SERVER_2);

    Serial.println("Node 2 initialization complete.");
}

void loop() {
    wifiMgr.update();

    unsigned long now = millis();
    if (now - lastSampleTime >= SAMPLE_INTERVAL_MS || lastSampleTime == 0) {
        lastSampleTime = now;

        // 1. Read calibrated capacitive soil moisture
        sampleSoilMoisture(lastRawAvg, lastSoilPct);
        transmitReading("%", lastSoilPct);

        // Also transmit raw ADC value for server calibration analysis
        transmitReading("raw", lastRawAvg);

        // 2. Read optional ambient weather
        float t = dht.readTemperature();
        float h = dht.readHumidity();
        if (!isnan(t) && !isnan(h)) {
            lastTemp = t;
            lastHum = h;
            transmitReading("degC", lastTemp);
            transmitReading("%", lastHum);
        }

        // 3. Render OLED
        updateDisplay();
    }

    delay(20);
}
