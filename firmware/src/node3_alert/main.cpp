/**
 * Xongket — Node 3 Firmware: Community Village Alert Unit & Audio Siren
 * Hardware:
 *   - NodeMCU ESP8266 (ESP-12E)
 *   - Active Piezo Buzzer / Siren Relay:
 *       SIGNAL -> D7 (GPIO13)
 *       VCC    -> 3.3V or 5V
 *       GND    -> GND
 *   - SSD1306 0.96" I2C OLED (128x64):
 *       SCL    -> D1 (GPIO5)
 *       SDA    -> D2 (GPIO4)
 */

#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <ArduinoJson.h>

#include "config.h"
#include "wifi_manager.h"
#include "http_client.h"
#include "alert_logic.h"

// ── Pin Configuration ───────────────────────────────────────
#define PIN_BUZZER          D7  // GPIO13
#define PIN_OLED_SCL        D1  // GPIO5
#define PIN_OLED_SDA        D2  // GPIO4

#define SCREEN_WIDTH        128
#define SCREEN_HEIGHT       64

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);
WiFiManager wifiMgr(WIFI_SSID, WIFI_PASSWORD);

// ── State Variables ─────────────────────────────────────────
AlertSeverity currentSeverity = ALERT_SEV_SAFE;
String alertMessage = "All normal in village";
String villageName = "Village";
int activeAlertsCount = 0;

unsigned long lastPollTime = 0;
const unsigned long POLL_INTERVAL_MS = 15000; // Poll every 15 seconds

unsigned long lastSuccessfulPollTime = 0;
const unsigned long LINK_TIMEOUT_MS = 60000;  // 60-second connection watchdog
bool isLinkLostState = false;

// ── Buzzer Pattern State Machine ────────────────────────────
unsigned long buzzerCycleStartTime = 0;
bool buzzerPinState = false;

void updateBuzzer(unsigned long now) {
    BuzzerCadence cadence = get_buzzer_cadence(currentSeverity);

    if (cadence.beep_count == 0 || cadence.beep_duration_ms == 0) {
        if (buzzerPinState) {
            digitalWrite(PIN_BUZZER, LOW);
            buzzerPinState = false;
        }
        return;
    }

    unsigned long cycleElapsed = (now - buzzerCycleStartTime) % cadence.cycle_period_ms;

    bool shouldBeOn = false;
    if (cadence.beep_count == 1) {
        if (cycleElapsed < (unsigned long)cadence.beep_duration_ms) {
            shouldBeOn = true;
        }
    } else if (cadence.beep_count == 2) {
        // First beep
        if (cycleElapsed < (unsigned long)cadence.beep_duration_ms) {
            shouldBeOn = true;
        }
        // Second beep
        unsigned long secondBeepStart = cadence.beep_duration_ms + cadence.pause_duration_ms;
        unsigned long secondBeepEnd = secondBeepStart + cadence.beep_duration_ms;
        if (cycleElapsed >= secondBeepStart && cycleElapsed < secondBeepEnd) {
            shouldBeOn = true;
        }
    }

    if (shouldBeOn != buzzerPinState) {
        buzzerPinState = shouldBeOn;
        digitalWrite(PIN_BUZZER, buzzerPinState ? HIGH : LOW);
    }
}

// ── OLED Display Rendering ──────────────────────────────────
void updateDisplay() {
    display.clearDisplay();

    // 1. Header with Link status
    display.setTextSize(1);
    display.setCursor(0, 0);
    display.print("VILLAGE ALERT UNIT");

    display.setCursor(80, 0);
    if (isLinkLostState) {
        display.print("[NO LINK]");
    } else {
        display.print("[ONLINE]");
    }

    // 2. Giant Severity Badge
    if (currentSeverity == ALERT_SEV_DANGER) {
        // High-contrast inverted block for critical emergency
        display.fillRect(0, 12, 128, 22, SSD1306_WHITE);
        display.setTextColor(SSD1306_BLACK, SSD1306_WHITE);
        display.setTextSize(2);
        display.setCursor(16, 15);
        display.print("! DANGER !");
    } else if (currentSeverity == ALERT_SEV_WARNING) {
        display.drawRect(0, 12, 128, 22, SSD1306_WHITE);
        display.setTextColor(SSD1306_WHITE);
        display.setTextSize(2);
        display.setCursor(12, 15);
        display.print("WARNING");
    } else if (currentSeverity == ALERT_SEV_ADVISORY) {
        display.drawRect(0, 12, 128, 22, SSD1306_WHITE);
        display.setTextColor(SSD1306_WHITE);
        display.setTextSize(2);
        display.setCursor(8, 15);
        display.print("ADVISORY");
    } else {
        display.drawRect(0, 12, 128, 22, SSD1306_WHITE);
        display.setTextColor(SSD1306_WHITE);
        display.setTextSize(2);
        display.setCursor(34, 15);
        display.print("SAFE");
    }

    // 3. Message Area
    display.setTextColor(SSD1306_WHITE);
    display.setTextSize(1);
    display.setCursor(0, 38);

    if (isLinkLostState) {
        display.println("WARN: NO BACKEND LINK");
        display.printf("Retaining last state (%s)\n", severity_to_string(currentSeverity));
    } else {
        // Display up to 2 lines of alert text
        display.println(alertMessage.substring(0, 42));
    }

    // 4. Footer
    display.setCursor(0, 56);
    unsigned long secondsAgo = (millis() - lastSuccessfulPollTime) / 1000;
    if (lastSuccessfulPollTime == 0) {
        display.printf("Village #%d | Connecting...", NODE3_VILLAGE_ID);
    } else {
        display.printf("V#%d | Sync: %lus ago", NODE3_VILLAGE_ID, secondsAgo);
    }

    display.display();
}

// ── Backend Polling ─────────────────────────────────────────
void pollVillageStatus() {
    String endpoint = "/village/" + String(NODE3_VILLAGE_ID) + "/status";
    String responseBody;

    Serial.printf("[POLL] Querying %s...\n", endpoint.c_str());
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
            const char* nameStr = doc["village_name"] | "Village";

            currentSeverity = parse_severity(sevStr);
            alertMessage = String(msgStr);
            villageName = String(nameStr);
            activeAlertsCount = doc["active_alerts_count"] | 0;

            lastSuccessfulPollTime = millis();
            isLinkLostState = false;

            Serial.printf("[POLL OK] Village: %s | Severity: %s | Active Alerts: %d\n",
                          villageName.c_str(), sevStr, activeAlertsCount);
            return;
        } else {
            Serial.printf("[POLL] JSON parse error: %s\n", err.c_str());
        }
    } else {
        Serial.printf("[POLL ERR] HTTP code: %d\n", httpCode);
    }
}

// ── Setup & Loop ────────────────────────────────────────────
void setup() {
    Serial.begin(115200);
    delay(200);
    Serial.println("\n=== Xongket Node 3 (Village Alert Unit) Initializing ===");

    pinMode(PIN_BUZZER, OUTPUT);
    digitalWrite(PIN_BUZZER, LOW);

    Wire.begin(PIN_OLED_SDA, PIN_OLED_SCL);
    if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
        Serial.println("[OLED] Display allocation failed");
    } else {
        display.clearDisplay();
        display.setTextColor(SSD1306_WHITE);
        display.setTextSize(1);
        display.setCursor(0, 20);
        display.println("XONGKET ALERT UNIT");
        display.println("Connecting link...");
        display.display();
    }

    wifiMgr.begin();

    // Initial chime
    digitalWrite(PIN_BUZZER, HIGH);
    delay(100);
    digitalWrite(PIN_BUZZER, LOW);

    Serial.println("Node 3 initialization complete.");
}

void loop() {
    wifiMgr.update();
    unsigned long now = millis();

    // 1. Backend poll interval (every 15 seconds)
    if (now - lastPollTime >= POLL_INTERVAL_MS || lastPollTime == 0) {
        lastPollTime = now;
        if (wifiMgr.isConnected()) {
            pollVillageStatus();
        }
    }

    // 2. Link watchdog: check if > 60 seconds without successful backend poll
    isLinkLostState = is_link_lost(now, lastSuccessfulPollTime, LINK_TIMEOUT_MS);

    // 3. Update active buzzer cadence
    updateBuzzer(now);

    // 4. Update OLED display
    static unsigned long lastOledRefresh = 0;
    if (now - lastOledRefresh >= 250) { // refresh OLED 4 times a second
        lastOledRefresh = now;
        updateDisplay();
    }

    delay(10);
}
