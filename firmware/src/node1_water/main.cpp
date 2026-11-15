/**
 * Xongket — Node 1 Firmware: Ultrasonic Water Level & Ambient Weather Station
 * Hardware:
 *   - NodeMCU ESP8266 (ESP-12E)
 *   - HC-SR04 Ultrasonic Distance Sensor:
 *       TRIG -> D5 (GPIO14)
 *       ECHO -> D6 (GPIO12) via voltage divider (1k / 2k resistors for 5V -> 3.3V safe logic)
 *   - DHT11 Temperature & Humidity Sensor:
 *       DATA -> D4 (GPIO2)
 *   - SSD1306 0.96" I2C OLED (128x64):
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
#include "water_sensor.h"

// ── Pin Configuration ───────────────────────────────────────
#define PIN_OLED_SDA        D2  // GPIO4
#define PIN_OLED_SCL        D1  // GPIO5
#define PIN_DHT             D4  // GPIO2
#define PIN_TRIG            D5  // GPIO14
#define PIN_ECHO            D6  // GPIO12

#define SCREEN_WIDTH        128
#define SCREEN_HEIGHT       64
#define OLED_RESET          -1

// ── Peripherals ─────────────────────────────────────────────
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
DHT dht(PIN_DHT, DHT11);
WiFiManager wifiMgr(WIFI_SSID, WIFI_PASSWORD);

// ── State Variables ─────────────────────────────────────────
unsigned long lastSampleTime = 0;
const unsigned long SAMPLE_INTERVAL_MS = 10000; // Sample every 10 seconds

float lastWaterLevel = 0.0f;
float lastTemp = 0.0f;
float lastHum = 0.0f;
bool isDangerActive = false;

// ── Sensor Reading Functions ────────────────────────────────
float readSingleDistanceCm() {
    digitalWrite(PIN_TRIG, LOW);
    delayMicroseconds(2);
    digitalWrite(PIN_TRIG, HIGH);
    delayMicroseconds(10);
    digitalWrite(PIN_TRIG, LOW);

    // 30,000 microseconds timeout = ~5.1 meters max range
    long duration = pulseIn(PIN_ECHO, HIGH, 30000);
    if (duration == 0) {
        return -1.0f; // Timeout or sensor disconnected
    }

    // Speed of sound in air: 0.0343 cm/us
    float distanceCm = (float)duration * 0.0343f / 2.0f;
    return distanceCm;
}

float sampleWaterLevelMedian() {
    float samples[5];
    int validCount = 0;

    for (int i = 0; i < 5; i++) {
        float d = readSingleDistanceCm();
        if (is_valid_distance(d, 2.0f, 400.0f)) {
            samples[validCount++] = d;
        }
        delay(35); // Allow acoustic echoes to dissipate
    }

    if (validCount < 3) {
        Serial.println("[HC-SR04] Warning: Too few valid echo pulses (< 3)");
        return -1.0f;
    }

    // Pad remaining with the last valid sample if slightly noisy
    for (int i = validCount; i < 5; i++) {
        samples[i] = samples[validCount - 1];
    }

    float medianDistance = filter_median_5(samples);
    float waterLevel = calculate_water_level(NODE1_MOUNT_HEIGHT_CM, medianDistance);

    Serial.printf("[HC-SR04] Median Dist: %.1f cm -> Water Level: %.1f cm (Mount: %.1f cm)\n",
                  medianDistance, waterLevel, NODE1_MOUNT_HEIGHT_CM);
    return waterLevel;
}

// ── OLED Display Rendering ──────────────────────────────────
void updateDisplay() {
    display.clearDisplay();

    // 1. LOCAL FAILSAFE: Danger Warning banner
    if (isDangerActive) {
        display.fillRect(0, 0, 128, 16, SSD1306_WHITE);
        display.setTextColor(SSD1306_BLACK, SSD1306_WHITE);
        display.setTextSize(2);
        display.setCursor(4, 1);
        display.print("! DANGER !");

        display.setTextColor(SSD1306_WHITE);
        display.setTextSize(1);
        display.setCursor(0, 20);
        display.printf("LEVEL: %.1f cm", lastWaterLevel);
        display.setCursor(0, 32);
        display.printf("DANGER LIMIT: %.0f cm", NODE1_DANGER_LEVEL_CM);
        display.setCursor(0, 44);
        display.print("LOCAL ALARM ACTIVE");
    } else {
        // Normal / Advisory display
        display.setTextColor(SSD1306_WHITE);
        display.setTextSize(1);
        display.setCursor(0, 0);
        display.print("XONGKET - NODE 1");

        // Wi-Fi Status badge
        display.setCursor(80, 0);
        display.print(wifiMgr.isConnected() ? "[LINK]" : "[OFF]");

        // Water level primary readout
        display.setCursor(0, 14);
        display.setTextSize(2);
        display.printf("%.1f cm", lastWaterLevel);

        display.setTextSize(1);
        display.setCursor(0, 34);
        display.printf("Dist: %.1f cm", NODE1_MOUNT_HEIGHT_CM - lastWaterLevel);

        // Ambient temperature and humidity
        display.setCursor(0, 46);
        display.printf("T:%.1fC  H:%.0f%%", lastTemp, lastHum);
    }

    // Bottom status bar
    display.setCursor(0, 56);
    display.setTextSize(1);
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
    doc["node_id"] = NODE1_ID;
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
            NODE1_API_KEY,
            jsonStr,
            2
        );

        if (code == 200 || code == 201) {
            // Upload successful, flush any buffered offline readings
            if (StorageBuffer::hasBufferedReadings()) {
                StorageBuffer::flushBatch(BACKEND_HOST, BACKEND_PORT, INGEST_ENDPOINT, NODE1_API_KEY);
            }
            return;
        }
    }

    // Backend unreachable or offline -> Buffer in LittleFS
    Serial.printf("[Buffer] Offline. Queuing %s reading to LittleFS\n", unit);
    StorageBuffer::bufferReading(jsonStr);
}

// ── Setup & Main Loop ───────────────────────────────────────
void setup() {
    Serial.begin(115200);
    delay(200);
    Serial.println("\n=== Xongket Node 1 (Water Level) Initializing ===");

    pinMode(PIN_TRIG, OUTPUT);
    pinMode(PIN_ECHO, INPUT);
    digitalWrite(PIN_TRIG, LOW);

    // OLED display
    Wire.begin(PIN_OLED_SDA, PIN_OLED_SCL);
    if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
        Serial.println("[OLED] SSD1306 allocation failed");
    } else {
        display.clearDisplay();
        display.setTextColor(SSD1306_WHITE);
        display.setTextSize(1);
        display.setCursor(0, 20);
        display.println("XONGKET WATER NODE");
        display.println("Booting sensors...");
        display.display();
    }

    dht.begin();
    StorageBuffer::begin();
    wifiMgr.begin();
    TimeSync::begin(GMT_OFFSET_SEC, DAYLIGHT_OFFSET_SEC, NTP_SERVER_1, NTP_SERVER_2);

    Serial.println("Node 1 initialization complete.");
}

void loop() {
    wifiMgr.update();

    unsigned long now = millis();
    if (now - lastSampleTime >= SAMPLE_INTERVAL_MS || lastSampleTime == 0) {
        lastSampleTime = now;

        // 1. Water Level Sample
        float waterLvl = sampleWaterLevelMedian();
        if (waterLvl >= 0.0f) {
            lastWaterLevel = waterLvl;
            // Local failsafe check: triggers regardless of network link
            isDangerActive = is_danger_level(waterLvl, NODE1_DANGER_LEVEL_CM);
            transmitReading("cm", lastWaterLevel);
        }

        // 2. Ambient DHT11 Sample
        float t = dht.readTemperature();
        float h = dht.readHumidity();
        if (!isnan(t) && !isnan(h)) {
            lastTemp = t;
            lastHum = h;
            transmitReading("degC", lastTemp);
            transmitReading("%", lastHum);
        }

        // 3. Refresh OLED
        updateDisplay();
    }

    delay(20);
}
