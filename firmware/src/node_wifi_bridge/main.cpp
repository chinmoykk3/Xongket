#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <SoftwareSerial.h>
#include <ArduinoJson.h>

#include "config.h"
#include "wifi_manager.h"
#include "time_sync.h"
#include "http_client.h"

// ── SoftwareSerial Pins connected to Arduino Uno ────────────
#define PIN_UNO_RX      D6  // ESP8266 RX (connects to Arduino Pin 3 TX)
#define PIN_UNO_TX      D5  // ESP8266 TX (connects to Arduino Pin 2 RX)

SoftwareSerial unoSerial(PIN_UNO_RX, PIN_UNO_TX);
WiFiManager wifiMgr(WIFI_SSID, WIFI_PASSWORD, WIFI_SSID_2, WIFI_PASSWORD_2);

// ── State Variables ─────────────────────────────────────────
float waterLevel = 0.0f;
float soilMoisture = 0.0f;
float tempC = 0.0f;
float humPct = 0.0f;

unsigned long lastPollTime = 0;
const unsigned long POLL_INTERVAL_MS = 8000;

// ── Ingest Reading to Backend ────────────────────────────────
void sendReading(int nodeId, const char* apiKey, const char* unit, float val) {
    if (!wifiMgr.isConnected()) return;

    JsonDocument doc;
    doc["node_id"] = nodeId;
    doc["ts"] = TimeSync::getIsoTimestamp();
    doc["value"] = round(val * 10.0f) / 10.0f;
    doc["unit"] = unit;

    String jsonStr;
    serializeJson(doc, jsonStr);

    XongketHttpClient::postWithRetry(
        BACKEND_HOST,
        BACKEND_PORT,
        INGEST_ENDPOINT,
        apiKey,
        jsonStr,
        1
    );
}

// ── Poll Village Status & Inform Arduino Uno ────────────────
void pollVillageAndNotifyUno() {
    if (!wifiMgr.isConnected()) return;

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
        if (!deserializeJson(doc, responseBody)) {
            const char* sevStr = doc["severity"] | "SAFE";
            if (strcasecmp(sevStr, "DANGER") == 0) {
                unoSerial.println("ALARM:1");
                Serial.println("[Bridge] Cloud DANGER active! Sent ALARM:1 to Arduino Uno.");
            } else {
                unoSerial.println("ALARM:0");
            }
        }
    }
}

// ── Setup ───────────────────────────────────────────────────
void setup() {
    Serial.begin(115200);
    unoSerial.begin(9600);
    delay(200);

    Serial.println("\n=======================================================");
    Serial.println("  XONGKET ESP8266 WI-FI & CLOUD BRIDGE FOR ARDUINO");
    Serial.println("=======================================================");

    wifiMgr.begin();
    TimeSync::begin(GMT_OFFSET_SEC, DAYLIGHT_OFFSET_SEC, NTP_SERVER_1, NTP_SERVER_2);
    Serial.println("[Setup] Bridge operational. Listening to Arduino on D6/D5...");
}

// ── Main Loop ───────────────────────────────────────────────
void loop() {
    unsigned long now = millis();
    wifiMgr.update();

    // 1. Read serial packets from Arduino Uno: "H:152.4,S:45.0,T:28.5,U:72.0"
    while (unoSerial.available() > 0) {
        String line = unoSerial.readStringUntil('\n');
        line.trim();

        if (line.startsWith("H:") && line.indexOf(",S:") != -1) {
            Serial.printf("[Uno Packet] %s\n", line.c_str());

            // Parse formatted values
            int idxH = line.indexOf("H:");
            int idxS = line.indexOf(",S:");
            int idxT = line.indexOf(",T:");
            int idxU = line.indexOf(",U:");

            if (idxH != -1 && idxS != -1) {
                waterLevel = line.substring(idxH + 2, idxS).toFloat();
            }
            if (idxS != -1 && idxT != -1) {
                soilMoisture = line.substring(idxS + 3, idxT).toFloat();
            }
            if (idxT != -1 && idxU != -1) {
                tempC = line.substring(idxT + 3, idxU).toFloat();
            }
            if (idxU != -1) {
                humPct = line.substring(idxU + 3).toFloat();
            }

            // Ingest all 4 sensors to FastAPI backend
            sendReading(NODE1_ID, NODE1_API_KEY, "cm", waterLevel);
            sendReading(NODE2_ID, NODE2_API_KEY, "percent", soilMoisture);
            if (tempC > 0.0f) {
                sendReading(NODE_TEMP_ID, NODE_TEMP_KEY, "C", tempC);
            }
            if (humPct > 0.0f) {
                sendReading(NODE_HUM_ID, NODE_HUM_KEY, "percent", humPct);
            }
        }
    }

    // 2. Poll village status periodically to sync cloud siren with Arduino
    if (now - lastPollTime >= POLL_INTERVAL_MS) {
        lastPollTime = now;
        pollVillageAndNotifyUno();
    }

    delay(20);
}
