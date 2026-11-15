# ⚡ Xongket ESP8266 Firmware Suite

PlatformIO embedded firmware for the 3 field units powering the Xongket Disaster Management System.

- **Microcontroller**: NodeMCU ESP8266 (ESP-12E Module)
- **Framework**: Arduino
- **Build System**: PlatformIO Core
- **Shared Architecture**: Common library in `firmware/lib/common/`

---

## 📋 Hardware Matrix & Wiring Tables

### Node 1: Water Level & Ambient Weather Station
Derives river/stream water level from ultrasonic distance measurements (`water_level_cm = mount_height_cm - distance_cm`) and reads ambient temperature and humidity.

| Sensor / Module | Sensor Pin | NodeMCU Pin | GPIO | Wire / Notes |
|:----------------|:-----------|:------------|:-----|:-------------|
| **HC-SR04 Ultrasonic** | VCC | Vin (5V) | — | 5V Power from USB |
| | GND | GND | — | Common Ground |
| | TRIG | **D5** | GPIO14 | 3.3V Logic Output |
| | ECHO | **D6** | GPIO12 | **Must use voltage divider!** (5V to 3.3V) |
| **DHT11 Weather** | VCC | 3V3 (3.3V) | — | 3.3V Power |
| | GND | GND | — | Common Ground |
| | DATA | **D4** | GPIO2 | Pull-up resistor (10kΩ to 3.3V) |
| **SSD1306 0.96" OLED** | VCC | 3V3 (3.3V) | — | 3.3V Power |
| | GND | GND | — | Common Ground |
| | SCL | **D1** | GPIO5 | I2C Clock |
| | SDA | **D2** | GPIO4 | I2C Data |

#### ⚠️ HC-SR04 Voltage Divider Circuit
The HC-SR04 ECHO pin outputs 5V logic pulses, but ESP8266 GPIO pins are 3.3V max. Connect a simple resistor voltage divider:
```
HC-SR04 ECHO (5V) ──────[ 1kΩ Resistor ]──────┬────── ESP8266 Pin D6 (GPIO12, 3.3V)
                                              │
                                       [ 2kΩ Resistor ]
                                              │
                                             GND
```
Formula: $V_{out} = 5V \times \frac{2k\Omega}{1k\Omega + 2k\Omega} = 3.33V$ (Safe for ESP8266).

---

### Node 2: Soil Saturation & Landslide Station
Measures analog soil dielectric permittivity using a corrosion-resistant capacitive probe, calibrated to 0–100% saturation.

| Sensor / Module | Sensor Pin | NodeMCU Pin | GPIO | Notes |
|:----------------|:-----------|:------------|:-----|:------|
| **Capacitive Soil v2.0** | VCC | 3V3 (3.3V) | — | Connect to 3.3V rail |
| | GND | GND | — | Ground |
| | AOUT | **A0** | ADC0 | Analog voltage (0–1.0V internal / 0–3.3V board) |
| **DHT11 (Optional)** | DATA | **D4** | GPIO2 | Ambient temperature & humidity |
| **SSD1306 (Optional)** | SCL / SDA | **D1 / D2** | GPIO5/4 | Local diagnostics display |

---

### Node 3: Community Village Alert Unit & Audio Siren
Disaster early-warning receiver installed at the Gram Panchayat hall or village center. Polls `/village/{id}/status` every 15s and sounds distinct audio buzzer patterns.

| Component | Pin | NodeMCU Pin | GPIO | Notes |
|:----------|:----|:------------|:-----|:------|
| **Active Buzzer / Relay** | Positive (+) | **D7** | GPIO13 | Driven by transistor or directly (active buzzer) |
| | Negative (-) | GND | — | Ground |
| **SSD1306 0.96" OLED** | SCL | **D1** | GPIO5 | I2C Clock |
| | SDA | **D2** | GPIO4 | I2C Data |
| | VCC / GND | 3V3 / GND | — | Display Power |

---

## ⚙️ Sensor Calibration Procedures

### 1. Water Level Ultrasonic Calibration (Node 1)
1. Mount the HC-SR04 sensor rigidly facing perpendicular to the water surface.
2. Measure the exact vertical distance from the sensor face to the dry riverbed/datum ($H_{mount}$).
3. In `firmware/lib/common/config.h`:
   ```c
   #define NODE1_MOUNT_HEIGHT_CM   200.0f  // Measured mount height (e.g. 200 cm)
   #define NODE1_WARN_LEVEL_CM     110.0f  // Warning threshold
   #define NODE1_DANGER_LEVEL_CM   140.0f  // Critical flood evacuation threshold
   ```
4. Water level is derived mathematically:
   $$\text{Water Level (cm)} = \text{NODE1\_MOUNT\_HEIGHT\_CM} - \text{Measured Distance (cm)}$$
5. The ultrasonic driver automatically takes **5 samples** per reading, rejects acoustic reflections outside physical boundaries (2.0 cm – 400.0 cm), and computes the **median** value to eliminate surface ripple noise.

---

### 2. Capacitive Soil Moisture v2.0 Calibration (Node 2)
Because analog ADC characteristics vary slightly across manufacturing batches, perform a two-point calibration:
1. **Dry Air Calibration**:
   - Hold the clean capacitive probe in dry air (do not touch sensor traces).
   - Read the raw ADC value printed on Serial: e.g. `Raw ADC: 785`.
   - Record this as `NODE2_RAW_DRY`.
2. **100% Water Saturation Calibration**:
   - Submerge the probe in a cup of water up to the white coating line (do not submerge the top circuitry).
   - Read the raw ADC value printed on Serial: e.g. `Raw ADC: 382`.
   - Record this as `NODE2_RAW_WET`.
3. In `firmware/lib/common/config.h`:
   ```c
   #define NODE2_RAW_DRY   780  // Typical in dry air (0% moisture)
   #define NODE2_RAW_WET   380  // Typical in water (100% moisture)
   ```
4. Conversion formula:
   $$\text{Moisture \%} = \frac{\text{raw\_dry} - \text{raw\_adc}}{\text{raw\_dry} - \text{raw\_wet}} \times 100\%$$

---

## 🔔 Village Alert Unit Cadence & Fail-Safe (Node 3)

The alert unit drives the D7 buzzer with audible patterns matched to disaster severity:

| Severity Level | OLED Display | Buzzer Cadence on D7 | Intended Community Response |
|:---------------|:-------------|:---------------------|:----------------------------|
| **SAFE** | `[ SAFE ]` | **Silent** (No beep) | Normal day-to-day conditions. |
| **ADVISORY** | `[ ADVISORY ]` | **1 Short Beep** (100ms) every 10 seconds | Monitor local streams & weather. |
| **WARNING** | `[ WARNING ]` | **2 Beeps** (200ms ON / 150ms OFF / 200ms ON) every 4 seconds | Prepare essential documents & food. |
| **DANGER** | `*** DANGER ***` (Inverted) | **Continuous Rapid Alarm** (250ms ON / 150ms OFF) | **Evacuate immediately** to shelter. |

#### 🛡️ 60-Second Link Loss Watchdog
If the backend is unreachable for more than 60 seconds (e.g. mobile cell tower outage during heavy storm):
- The OLED displays `[NO LINK]` in the header.
- Subtext shows: `"WARN: NO BACKEND LINK - Retaining last state"`.
- **The unit retains the last known severity and continues sounding the buzzer cadence** so villagers remain warned even during communication failure.

---

## 🪣 Bench Demo Checklist: "Bucket of Water" Test

Follow this checklist to demonstrate the system end-to-end on a test bench:

### Equipment Needed
- 1× Bucket / tall container (~40–60 cm depth)
- Pitcher of tap water
- 1× NodeMCU Node 1 (HC-SR04 + OLED)
- 1× NodeMCU Node 2 (Capacitive Soil Sensor)
- 1× NodeMCU Node 3 (OLED + Buzzer on D7)
- 1× Laptop running backend (`uvicorn`) and dashboard (`localhost:3000`)

### Verification Steps

- [ ] **Step 1: Mount Height Setup**
  Position Node 1's HC-SR04 facing down into the empty bucket. Measure the distance to the bottom (e.g., 50.0 cm). Set `NODE1_MOUNT_HEIGHT_CM 50.0f` and `NODE1_DANGER_LEVEL_CM 30.0f`.
- [ ] **Step 2: Dry Baseline Verification**
  Power Node 1. The OLED should display:
  - `0.0 cm` Water Level
  - `Dist: 50.0 cm`
  - `[LINK]` (when connected to Wi-Fi)
- [ ] **Step 3: Inflow & Water Rise Simulation**
  Slowly pour water into the bucket until depth reaches 15 cm.
  - The OLED water level increases: `15.0 cm` (`Dist: 35.0 cm`).
  - Open Dashboard (`http://localhost:3000/villages/1`): Telemetry graph updates with new water level reading.
- [ ] **Step 4: Local Failsafe Test (No Network)**
  Turn off Wi-Fi on your laptop / phone hotspot.
  Pour additional water until depth exceeds the 30 cm danger mark (e.g. 35 cm water level).
  - **Verify**: Node 1 OLED immediately flashes a giant inverted `! DANGER !` warning banner **locally on the microcontroller without needing network access**!
- [ ] **Step 5: Offline LittleFS Buffer Recovery**
  Keep Wi-Fi disabled for 1 minute while taking readings.
  - The OLED footer displays: `BUFFER: 6 queued`.
  - Reconnect Wi-Fi. Observe Serial log: Node uploads all buffered readings in batch to `POST /ingest`. The buffer count returns to 0.
- [ ] **Step 6: Soil Moisture Saturation Test**
  Hold Node 2 capacitive probe in air -> OLED shows `0.0%`.
  Dip probe into a glass of water -> OLED immediately jumps to `98.0% - 100.0%`.
- [ ] **Step 7: Village Alert Unit Auditory Demo**
  Power Node 3.
  - Default status: `[ SAFE ]`, buzzer is silent.
  - In Authority Dashboard (`/alerts`), dispatch a **Manual Warning** for Village 1.
  - Within 15 seconds, Node 3 polls backend: OLED updates to `[ WARNING ]`, and the D7 buzzer begins double-beeping every 4 seconds.
  - Dispatch a **Manual Danger** alert: OLED transitions to inverted `! DANGER !`, and the buzzer sounds a rapid continuous alarm.
  - Disconnect backend for 60 seconds: Verify OLED shows `[NO LINK]` while buzzer **continues sounding the danger cadence**.

---

## 🛠️ Compilation & Testing Instructions

### 1. Compile All Firmware Targets
```bash
cd firmware

# Compile all 3 projects concurrently:
pio run

# Or compile individual targets:
pio run -e node1_water
pio run -e node2_soil
pio run -e node3_alert
```

### 2. Run PC Unit Tests (No Microcontroller Required)
The core sensor algorithms, median filters, ADC calibration, and buzzer state machines are isolated in pure C/C++ files:
```bash
cd firmware

# Compile with MinGW g++:
g++ -o test_sensors_pc.exe test/test_sensors_pc.cpp lib/common/water_sensor.cpp lib/common/soil_sensor.cpp lib/common/alert_logic.cpp

# Run test suite:
./test_sensors_pc.exe
```

All 14 unit test assertions will run and report:
```
===========================================
 Running PC Unit Tests for Xongket Sensor Logic
===========================================
[TEST 1] filter_median_5: expected 121.0, got 121.0
[TEST 2] filter_median_5: expected 50.0, got 50.0
[TEST 3] is_valid_distance: PASSED
[TEST 4] calculate_water_level (mount=200, dist=150): expected 50.0, got 50.0
[TEST 5] calculate_water_level (clamping to 0): PASSED
[TEST 6] is_danger_level: PASSED
[TEST 7] average_samples_10: expected 650.7, got 650.7
[TEST 8] raw_to_percent (800 in air): expected 0.0%, got 0.0%
[TEST 9] raw_to_percent (400 in water): expected 100.0%, got 100.0%
[TEST 10] raw_to_percent (600 mid): expected 50.0%, got 50.0%
[TEST 11] raw_to_percent clamping: PASSED
[TEST 12] parse_severity: PASSED
[TEST 13] get_buzzer_cadence: PASSED
[TEST 14] is_link_lost: PASSED

All 14 PC unit tests for sensor and alert logic PASSED successfully!
```

---

## 🔌 Flash to Physical NodeMCU Hardware

Connect your NodeMCU ESP8266 board via USB and run:
```bash
# Upload Node 1:
pio run -e node1_water -t upload

# Upload Node 2:
pio run -e node2_soil -t upload

# Upload Node 3:
pio run -e node3_alert -t upload
```
Monitor Serial output at 115200 baud:
```bash
pio device monitor -b 115200
```
