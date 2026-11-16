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
#include "soil_sensor.h"
#include "alert_logic.h"

// ── Pin Configuration for All-in-One NodeMCU ESP8266 ────────
#define PIN_OLED_SDA        D2  // GPIO 4  (I2C SDA)
#define PIN_OLED_SCL        D1  // GPIO 5  (I2C SCL)
#define PIN_TRIG            D5  // GPIO 14 (HC-SR04 Trigger)
#define PIN_ECHO            D6  // GPIO 12 (HC-SR04 Echo)
#define PIN_SOIL_ANALOG     A0  // ADC 0   (Capacitive Soil Sensor Analog Out)
#define PIN_DHT             D4  // GPIO 2  (DHT11 Data)
#define PIN_BUZZER          D7  // GPIO 13 (5V Active Buzzer / Siren)
#define PIN_LED_GREEN       D3  // GPIO 0  (Green LED: Safe / Normal Status)
#define PIN_LED_RED         D8  // GPIO 15 (Red LED: Danger / Alarm Hazard Status)

#define SCREEN_WIDTH        128
#define SCREEN_HEIGHT       64
#define OLED_RESET          -1

// ── Peripherals ─────────────────────────────────────────────
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
DHT dht(PIN_DHT, DHT11);
WiFiManager wifiMgr(WIFI_SSID, WIFI_PASSWORD, WIFI_SSID_2, WIFI_PASSWORD_2);

// ── State Variables ─────────────────────────────────────────
float lastWaterLevel = 0.0f;
float lastWaterDist = 0.0f;
int lastRawSoilADC = 0;
float lastSoilMoisture = 0.0f;
float lastTemp = 0.0f;
float lastHum = 0.0f;

AlertSeverity remoteSeverity = ALERT_SEV_SAFE;
String remoteAlertMessage = "All normal in sector";
String villageName = "Jonai";
int activeAlertsCount = 0;

AlertSeverity masterSeverity = ALERT_SEV_SAFE;
bool waterDanger = false;
bool soilDanger = false;

// ── Timers ──────────────────────────────────────────────────
unsigned long lastSampleTime = 0;
const unsigned long SAMPLE_INTERVAL_MS = 8000;  // Ingest sample every 8s

unsigned long lastPollTime = 0;
const unsigned long POLL_INTERVAL_MS = 12000;   // Poll village alert status every 12s
unsigned long lastSuccessfulPollTime = 0;

unsigned long lastDisplayRotateTime = 0;
int currentScreenIndex = 0;
const int TOTAL_SCREENS = 4;

// ── Buzzer Non-blocking Cadence ─────────────────────────────
unsigned long buzzerCycleStartTime = 0;
bool buzzerPinState = false;

void updateBuzzer(unsigned long now) {
    // Siren MUST ONLY go on when physical sensor values are in dangerous condition!
    // Danger Thresholds: Water Level >= 140.0 cm OR Soil Moisture >= 85.0%
    bool inDangerousCondition = (lastWaterLevel >= NODE1_DANGER_LEVEL_CM) || (lastSoilMoisture >= 85.0f);

    if (!inDangerousCondition) {
        if (buzzerPinState) {
            digitalWrite(PIN_BUZZER, LOW);
            buzzerPinState = false;
        }
        return;
    }

    // Dangerous Condition: Loud rapid pulsing (200ms ON, 200ms OFF)
    unsigned long cycleElapsed = (now - buzzerCycleStartTime) % 400;
    bool shouldBeOn = (cycleElapsed < 200);

    if (shouldBeOn != buzzerPinState) {
        buzzerPinState = shouldBeOn;
        digitalWrite(PIN_BUZZER, buzzerPinState ? HIGH : LOW);
    }
}

// ── Status Indicator LEDs (Green = Safe, Red = Danger) ──────
void updateLEDs(unsigned long now) {
    bool inDangerousCondition = (lastWaterLevel >= NODE1_DANGER_LEVEL_CM) || (lastSoilMoisture >= 85.0f);

    if (inDangerousCondition) {
        digitalWrite(PIN_LED_GREEN, LOW);  // Turn off Green safe LED
        // Pulse Red LED in sync with alarm buzzer
        digitalWrite(PIN_LED_RED, buzzerPinState ? HIGH : LOW);
    } else {
        digitalWrite(PIN_LED_GREEN, HIGH); // Steady bright Green (Safe)
        digitalWrite(PIN_LED_RED, LOW);    // Red OFF
    }
}

// ── Ultrasonic HC-SR04 Acquisition (with Auto-Wiring Detection) ──
int trigPin = PIN_TRIG; // Defaults: D5 = TRIG, D6 = ECHO
int echoPin = PIN_ECHO;

float singleUltrasonicPing(int tPin, int ePin) {
    pinMode(tPin, OUTPUT);
    pinMode(ePin, INPUT);
    digitalWrite(tPin, LOW);
    delayMicroseconds(4);
    digitalWrite(tPin, HIGH);
    delayMicroseconds(10);
    digitalWrite(tPin, LOW);

    long duration = pulseIn(ePin, HIGH, 40000); // 40ms timeout (~6.8m)
    if (duration > 0) {
        return (duration * 0.0343f / 2.0f);
    }
    return -1.0f;
}

float readUltrasonicWaterLevel() {
    float samples[5];
    int validCount = 0;

    // 1. Try currently configured pins
    for (int i = 0; i < 5; i++) {
        float d = singleUltrasonicPing(trigPin, echoPin);
        if (d >= 2.0f && d <= 400.0f) {
            samples[validCount++] = d;
        }
        delay(25);
    }

    // 2. If 0 echo pulses, test if user swapped TRIG and ECHO wires!
    if (validCount == 0) {
        int alternateTrig = (trigPin == PIN_TRIG) ? PIN_ECHO : PIN_TRIG;
        int alternateEcho = (echoPin == PIN_ECHO) ? PIN_TRIG : PIN_ECHO;

        for (int i = 0; i < 3; i++) {
            float d = singleUltrasonicPing(alternateTrig, alternateEcho);
            if (d >= 2.0f && d <= 400.0f) {
                samples[validCount++] = d;
            }
            delay(25);
        }

        if (validCount > 0) {
            Serial.printf("[HC-SR04] Auto-detected swapped wires! Switching TRIG -> GPIO%d, ECHO -> GPIO%d\n",
                          alternateTrig, alternateEcho);
            trigPin = alternateTrig;
            echoPin = alternateEcho;
        }
    }

    if (validCount == 0) {
        Serial.println("[HC-SR04 WARN] Zero echo received! Check: 1) VCC connected to VIN (5V)? 2) TRIG/ECHO wires plugged in?");
        lastWaterDist = 0.0f;
        return 0.0f;
    }

    for (int i = validCount; i < 5; i++) {
        samples[i] = samples[validCount - 1];
    }

    float medianDist = filter_median_5(samples);
    lastWaterDist = medianDist;
    float level = calculate_water_level(NODE1_MOUNT_HEIGHT_CM, medianDist);

    Serial.printf("[HC-SR04 OK] Echo Dist: %.1f cm -> Water Level: %.1f cm (Mount: %.1f cm)\n",
                  medianDist, level, NODE1_MOUNT_HEIGHT_CM);
    return level;
}

// ── Capacitive Soil Moisture Acquisition ───────────────────
void readSoilMoistureSensor() {
    int samples[10];
    for (int i = 0; i < 10; i++) {
        samples[i] = analogRead(PIN_SOIL_ANALOG);
        delay(5);
    }

    float avgRaw = average_samples_10(samples);
    lastRawSoilADC = (int)avgRaw;
    lastSoilMoisture = raw_to_percent(lastRawSoilADC, NODE2_RAW_DRY, NODE2_RAW_WET);

    Serial.printf("[Soil] Raw ADC: %d -> Moisture: %.1f%%\n", lastRawSoilADC, lastSoilMoisture);
}

// ── Telemetry Transmission ──────────────────────────────────
void transmitSingleReading(int nodeId, const char* apiKey, const char* unit, float val) {
    JsonDocument doc;
    doc["node_id"] = nodeId;
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
            apiKey,
            jsonStr,
            1
        );

        if (code == 200 || code == 201) {
            if (StorageBuffer::hasBufferedReadings()) {
                StorageBuffer::flushBatch(BACKEND_HOST, BACKEND_PORT, INGEST_ENDPOINT, apiKey);
            }
            return;
        }
    }

    // Buffer offline if backend unreachable
    StorageBuffer::bufferReading(jsonStr);
}

// ── Poll Village Status from Backend ────────────────────────
void pollVillageStatus() {
    String endpoint = "/village/" + String(NODE3_VILLAGE_ID) + "/status";
    String responseBody;

    int httpCode = XongketHttpClient::getStatus(
        BACKEND_HOST,
        BACKEND_PORT,
        endpoint.c_str(),
        responseBody
    );

    if (httpCode == 200) {
        JsonDocument doc;
        DeserializationError err = deserializeJson(doc, responseBody);
        if (!err) {
            const char* sevStr = doc["severity"] | "SAFE";
            const char* msgStr = doc["message"] | "";
            const char* nameStr = doc["village_name"] | "Jonai";

            remoteSeverity = parse_severity(sevStr);
            remoteAlertMessage = String(msgStr);
            villageName = String(nameStr);
            activeAlertsCount = doc["active_alerts_count"] | 0;

            lastSuccessfulPollTime = millis();
            Serial.printf("[POLL OK] Village: %s | Remote Severity: %s | Alerts: %d\n",
                          villageName.c_str(), sevStr, activeAlertsCount);
        }
    }
}

// ── Master Risk Evaluation ──────────────────────────────────
void evaluateMasterRisk() {
    waterDanger = (lastWaterLevel >= NODE1_DANGER_LEVEL_CM);
    soilDanger = (lastSoilMoisture >= 85.0f);

    if (waterDanger || soilDanger) {
        masterSeverity = ALERT_SEV_DANGER;
    } else if (lastWaterLevel >= NODE1_WARN_LEVEL_CM || lastSoilMoisture >= 75.0f) {
        masterSeverity = ALERT_SEV_WARNING;
    } else {
        masterSeverity = ALERT_SEV_SAFE;
    }
}

// ── OLED Display Rendering ──────────────────────────────────
void renderDisplay() {
    display.clearDisplay();

    bool inDangerousCondition = (lastWaterLevel >= NODE1_DANGER_LEVEL_CM) || (lastSoilMoisture >= 85.0f);

    // ── 1. EMERGENCY DANGER DISPLAY ──────────────────────────────
    if (inDangerousCondition) {
        // High-contrast inverted top banner
        display.fillRect(0, 0, 128, 16, SSD1306_WHITE);
        display.setTextColor(SSD1306_BLACK, SSD1306_WHITE);
        display.setTextSize(2);
        display.setCursor(8, 1);
        display.print("! DANGER !");

        display.setTextColor(SSD1306_WHITE);
        display.setTextSize(1);

        display.setCursor(0, 20);
        if (lastWaterLevel >= NODE1_DANGER_LEVEL_CM) {
            display.printf("WATER: %.1fcm [FLOOD]", lastWaterLevel);
        } else {
            display.printf("WATER: %.1fcm [SAFE]", lastWaterLevel);
        }

        display.setCursor(0, 32);
        if (lastSoilMoisture >= 85.0f) {
            display.printf("SOIL : %.1f%% [SLIP]", lastSoilMoisture);
        } else {
            display.printf("SOIL : %.1f%% [SAFE]", lastSoilMoisture);
        }

        display.setCursor(0, 44);
        display.print("SIREN: ACTIVE (85dB)");

        display.drawLine(0, 54, 127, 54, SSD1306_WHITE);
        display.setCursor(0, 56);
        display.print("EVACUATE IMMEDIATELY");

        display.display();
        return;
    }

    // ── 2. NORMAL MONITORING DASHBOARD (Clean & Legible) ──────────
    display.setTextColor(SSD1306_WHITE);

    // Header with clean line
    display.setTextSize(1);
    display.setCursor(0, 0);
    display.print("XONGKET DISASTER SYS");
    display.drawLine(0, 10, 127, 10, SSD1306_WHITE);

    // Water level
    display.setCursor(0, 14);
    display.printf("WATER: %.1f cm", lastWaterLevel);
    display.setCursor(94, 14);
    display.print(lastWaterLevel >= NODE1_WARN_LEVEL_CM ? "[WARN]" : "[OK]");

    // Soil moisture
    display.setCursor(0, 26);
    display.printf("SOIL : %.1f %%", lastSoilMoisture);
    display.setCursor(94, 26);
    display.print(lastSoilMoisture >= 75.0f ? "[WARN]" : "[OK]");

    // Weather
    display.setCursor(0, 38);
    display.printf("TEMP : %.1fC  H:%.0f%%", lastTemp, lastHum);

    // Status bar with clean line
    display.drawLine(0, 49, 127, 49, SSD1306_WHITE);
    display.setCursor(0, 54);
    display.print("STATUS: SAFE / NORMAL");

    display.display();
}

// ── Setup ───────────────────────────────────────────────────
void setup() {
    Serial.begin(115200);
    delay(200);
    Serial.println("\n=======================================================");
    Serial.println("  XONGKET INTEGRATED DISASTER MANAGEMENT SYSTEM");
    Serial.println("  Unified Hardware Bench Node (ESP8266 + All Sensors)");
    Serial.println("=======================================================");

    // Pin Modes
    pinMode(PIN_TRIG, OUTPUT);
    pinMode(PIN_ECHO, INPUT);
    pinMode(PIN_BUZZER, OUTPUT);
    digitalWrite(PIN_BUZZER, LOW);
    buzzerPinState = false;

    // LED Status Pins
    pinMode(PIN_LED_GREEN, OUTPUT);
    pinMode(PIN_LED_RED, OUTPUT);
    digitalWrite(PIN_LED_GREEN, HIGH);  // System starts in SAFE status (Green ON)
    digitalWrite(PIN_LED_RED, LOW);    // Red OFF

    // I2C OLED Initialization
    Wire.begin(PIN_OLED_SDA, PIN_OLED_SCL);
    if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
        Serial.println("[OLED] Display allocation failed at 0x3C");
    } else {
        display.clearDisplay();
        display.setTextColor(SSD1306_WHITE);
        display.setTextSize(1);
        display.setCursor(10, 10);
        display.println("XONGKET BENCH NODE");
        display.setCursor(10, 25);
        display.println("Assam SDMA Operations");
        display.setCursor(10, 42);
        display.println("Connecting Wi-Fi...");
        display.display();
    }

    // DHT11 Sensor
    dht.begin();

    // LittleFS Offline Flash Buffer
    StorageBuffer::begin();

    // Wi-Fi Connection
    wifiMgr.begin();

    // NTP Time Synchronization
    TimeSync::begin(GMT_OFFSET_SEC, DAYLIGHT_OFFSET_SEC, NTP_SERVER_1, NTP_SERVER_2);

    Serial.println("[Setup] Hardware initialization complete. Starting loop.");
}

// ── Main Loop ───────────────────────────────────────────────
void loop() {
    unsigned long now = millis();

    // 1. Maintain Wi-Fi Connection
    wifiMgr.update();

    // 2. Ultrasonic & Soil Sampling + Telemetry Upload
    if (now - lastSampleTime >= SAMPLE_INTERVAL_MS) {
        lastSampleTime = now;

        // Sample HC-SR04 Water Level
        lastWaterLevel = readUltrasonicWaterLevel();

        // Sample Capacitive Soil Sensor
        readSoilMoistureSensor();

        // Sample DHT11
        float t = dht.readTemperature();
        float h = dht.readHumidity();
        if (!isnan(t)) lastTemp = t;
        if (!isnan(h)) lastHum = h;

        // Evaluate Master Risk
        evaluateMasterRisk();

        // Ingest telemetry to backend
        Serial.println("[Ingest] Sending sensor telemetry to backend...");
        transmitSingleReading(NODE1_ID, NODE1_API_KEY, "cm", lastWaterLevel);
        transmitSingleReading(NODE2_ID, NODE2_API_KEY, "percent", lastSoilMoisture);
        if (lastTemp > 0.0f) {
            transmitSingleReading(NODE_TEMP_ID, NODE_TEMP_KEY, "C", lastTemp);
        }
        if (lastHum > 0.0f) {
            transmitSingleReading(NODE_HUM_ID, NODE_HUM_KEY, "percent", lastHum);
        }
    }

    // 3. Poll Village Alert Status from Backend
    if (now - lastPollTime >= POLL_INTERVAL_MS) {
        lastPollTime = now;
        pollVillageStatus();
        evaluateMasterRisk();
    }

    // 4. Update Siren & Status LEDs
    updateBuzzer(now);
    updateLEDs(now);

    // 5. Rotate Display Screen every 4 seconds (if not in emergency danger)
    if (masterSeverity != ALERT_SEV_DANGER) {
        if (now - lastDisplayRotateTime >= 4000) {
            lastDisplayRotateTime = now;
            currentScreenIndex = (currentScreenIndex + 1) % TOTAL_SCREENS;
        }
    }

    // 6. Update OLED Display
    renderDisplay();

    delay(20);
}
