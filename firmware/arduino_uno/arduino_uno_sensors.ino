/**
 * XONGKET - Integrated Rural Disaster Management System
 * Master Hardware Controller (Arduino Uno)
 * 
 * Hardware Connections on Arduino Uno:
 *  - HC-SR04: TRIG -> Pin 9, ECHO -> Pin 10, VCC -> 5V, GND -> GND
 *  - 5V Buzzer: Positive (+) -> Pin 8, Negative (-) -> GND (Full 5V!)
 *  - Capacitive Soil Sensor: AOUT -> Pin A0, VCC -> 5V, GND -> GND
 *  - DHT11 Sensor: DATA -> Pin 4, VCC -> 5V, GND -> GND
 *  - SSD1306 OLED: SDA -> A4, SCL -> A5, VCC -> 5V/3.3V, GND -> GND
 *  - ESP8266 Serial Link: Pin 2 (RX) <- ESP D5 (TX), Pin 3 (TX) -> ESP D6 (RX), Common GND
 */

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <DHT.h>
#include <SoftwareSerial.h>

// ── Pin Assignments ─────────────────────────────────────────
#define PIN_SOIL_ANALOG   A0
#define PIN_ESP_RX        2   // Arduino RX (connects to ESP TX / D6)
#define PIN_ESP_TX        3   // Arduino TX (connects to ESP RX / D5)
#define PIN_DHT           4   // DHT11 Data
#define PIN_BUZZER        8   // 5V Active Buzzer (+)
#define PIN_TRIG          9   // HC-SR04 Trigger
#define PIN_ECHO          10  // HC-SR04 Echo

#define SCREEN_WIDTH      128
#define SCREEN_HEIGHT     64
#define OLED_RESET        -1

// ── Objects ─────────────────────────────────────────────────
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
DHT dht(PIN_DHT, DHT11);
SoftwareSerial espSerial(PIN_ESP_RX, PIN_ESP_TX); // RX, TX

// ── Calibration Constants ───────────────────────────────────
const float MOUNT_HEIGHT_CM = 200.0;
const float DANGER_LEVEL_CM = 140.0;
const float WARN_LEVEL_CM   = 110.0;

const int SOIL_RAW_DRY = 780;
const int SOIL_RAW_WET = 380;

// ── State Variables ─────────────────────────────────────────
float waterLevel = 0.0;
float waterDist = 0.0;
float soilMoisture = 0.0;
int rawSoilADC = 0;
float tempC = 0.0;
float humPct = 0.0;

bool remoteDanger = false;
bool localDanger = false;
unsigned long lastSampleTime = 0;
const unsigned long SAMPLE_INTERVAL_MS = 3000; // Sample & send every 3 seconds

unsigned long buzzerTimer = 0;
bool buzzerState = false;

// ── Ultrasonic Acquisition ──────────────────────────────────
float readWaterDistance() {
  digitalWrite(PIN_TRIG, LOW);
  delayMicroseconds(4);
  digitalWrite(PIN_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);

  long duration = pulseIn(PIN_ECHO, HIGH, 35000); // 35ms timeout (~6m)
  if (duration > 0) {
    float d = duration * 0.0343 / 2.0;
    if (d >= 2.0 && d <= 400.0) {
      return d;
    }
  }
  return -1.0;
}

// ── Soil Moisture Acquisition ───────────────────────────────
void readSoil() {
  long sum = 0;
  for (int i = 0; i < 8; i++) {
    sum += analogRead(PIN_SOIL_ANALOG);
    delay(5);
  }
  rawSoilADC = sum / 8;
  float pct = ((float)(SOIL_RAW_DRY - rawSoilADC) / (float)(SOIL_RAW_DRY - SOIL_RAW_WET)) * 100.0;
  if (pct < 0.0) pct = 0.0;
  if (pct > 100.0) pct = 100.0;
  soilMoisture = pct;
}

// ── Update OLED Display ─────────────────────────────────────
void updateOLED() {
  display.clearDisplay();

  if (localDanger || remoteDanger) {
    // Inverted Danger Screen
    display.fillRect(0, 0, 128, 16, SSD1306_WHITE);
    display.setTextColor(SSD1306_BLACK, SSD1306_WHITE);
    display.setTextSize(2);
    display.setCursor(4, 1);
    display.print("! DANGER !");

    display.setTextColor(SSD1306_WHITE);
    display.setTextSize(1);
    display.setCursor(0, 20);
    display.print("WATER: "); display.print(waterLevel, 1); display.println(" cm");

    display.setCursor(0, 32);
    display.print("SOIL : "); display.print(soilMoisture, 1); display.println(" %");

    display.setCursor(0, 44);
    display.println("5V SIREN ACTIVE!");

    display.setCursor(0, 56);
    display.println("ASDMA Sector: Jonai");
  } else {
    // Normal Dashboard View
    display.setTextColor(SSD1306_WHITE);
    display.setTextSize(1);
    display.setCursor(0, 0);
    display.println("XONGKET - ARDUINO+ESP");

    display.setCursor(0, 14);
    display.print("WATER: "); display.print(waterLevel, 1); display.print(" cm ");
    display.println(waterLevel >= WARN_LEVEL_CM ? "[WARN]" : "[OK]");

    display.setCursor(0, 26);
    display.print("SOIL : "); display.print(soilMoisture, 1); display.println(" %");

    display.setCursor(0, 38);
    display.print("TEMP : "); display.print(tempC, 1); display.print("C  H:"); display.print((int)humPct); display.println("%");

    display.setCursor(0, 52);
    display.println("STATUS: NORMAL / SAFE");
  }

  display.display();
}

// ── Setup ───────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);     // USB Monitor
  espSerial.begin(9600);    // Communication link to ESP8266

  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_BUZZER, LOW);

  Wire.begin();
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println(F("[OLED] Display init failed"));
  } else {
    display.clearDisplay();
    display.setTextColor(SSD1306_WHITE);
    display.setTextSize(1);
    display.setCursor(10, 20);
    display.println(F("XONGKET ARDUINO"));
    display.setCursor(10, 35);
    display.println(F("Initializing 5V Hub..."));
    display.display();
  }

  dht.begin();
  Serial.println(F("=== Xongket Arduino Uno Master Initialized ==="));
}

// ── Main Loop ───────────────────────────────────────────────
void loop() {
  unsigned long now = millis();

  // 1. Read commands from ESP8266 (e.g. "ALARM:1" or "ALARM:0")
  while (espSerial.available() > 0) {
    String msg = espSerial.readStringUntil('\n');
    msg.trim();
    if (msg == "ALARM:1") {
      remoteDanger = true;
      Serial.println(F("[ESP Link] Received Remote DANGER Alert!"));
    } else if (msg == "ALARM:0") {
      remoteDanger = false;
    }
  }

  // 2. Periodic Sensor Sampling & Transmission to ESP8266
  if (now - lastSampleTime >= SAMPLE_INTERVAL_MS) {
    lastSampleTime = now;

    // Read Ultrasonic
    float d = readWaterDistance();
    if (d > 0) {
      waterDist = d;
      waterLevel = MOUNT_HEIGHT_CM - d;
      if (waterLevel < 0) waterLevel = 0;
    }

    // Read Soil
    readSoil();

    // Read DHT11
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    if (!isnan(t)) tempC = t;
    if (!isnan(h)) humPct = h;

    // Danger Evaluation
    localDanger = (waterLevel >= DANGER_LEVEL_CM) || (soilMoisture >= 85.0);

    // Send formatted telemetry to ESP8266 over SoftwareSerial
    // Format: H:152.4,S:45.0,T:28.5,U:72
    espSerial.print("H:"); espSerial.print(waterLevel, 1);
    espSerial.print(",S:"); espSerial.print(soilMoisture, 1);
    espSerial.print(",T:"); espSerial.print(tempC, 1);
    espSerial.print(",U:"); espSerial.println(humPct, 1);

    Serial.print(F("[Data] Water: ")); Serial.print(waterLevel);
    Serial.print(F(" cm | Soil: ")); Serial.print(soilMoisture);
    Serial.print(F("% | Temp: ")); Serial.print(tempC);
    Serial.print(F("C | Hum: ")); Serial.println(humPct);

    updateOLED();
  }

  // 3. 5V Active Buzzer Control (Non-blocking loud emergency pulsing)
  if (localDanger || remoteDanger) {
    if (now - buzzerTimer >= 200) {
      buzzerTimer = now;
      buzzerState = !buzzerState;
      digitalWrite(PIN_BUZZER, buzzerState ? HIGH : LOW);
    }
  } else {
    digitalWrite(PIN_BUZZER, LOW);
  }
}
