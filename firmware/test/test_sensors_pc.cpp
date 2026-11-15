/**
 * PC Unit Test for Xongket sensor math & alert logic.
 * Compile natively with: g++ -o test_sensors_pc.exe test_sensors_pc.cpp ../lib/sensors/water_sensor.cpp ../lib/sensors/soil_sensor.cpp ../lib/alerts/alert_logic.cpp
 */

#include <stdio.h>
#include <stdlib.h>
#include <math.h>
#include <assert.h>

#include "../lib/sensors/water_sensor.h"
#include "../lib/sensors/soil_sensor.h"
#include "../lib/alerts/alert_logic.h"

int main() {
    printf("===========================================\n");
    printf(" Running PC Unit Tests for Xongket Sensor Logic\n");
    printf("===========================================\n\n");

    // 1. Water Sensor: Median of 5
    {
        float samples1[5] = {120.0f, 122.5f, 400.0f, 121.0f, 119.5f}; // 400 is an outlier
        float med = filter_median_5(samples1);
        printf("[TEST 1] filter_median_5: expected 121.0, got %.1f\n", med);
        assert(fabs(med - 121.0f) < 0.001f);

        float samples2[5] = {50.0f, 10.0f, 90.0f, 30.0f, 70.0f}; // sorted: 10, 30, 50, 70, 90
        med = filter_median_5(samples2);
        printf("[TEST 2] filter_median_5: expected 50.0, got %.1f\n", med);
        assert(fabs(med - 50.0f) < 0.001f);
    }

    // 2. Water Sensor: Physical range bounds
    {
        assert(is_valid_distance(2.0f, 2.0f, 400.0f) == true);
        assert(is_valid_distance(150.0f, 2.0f, 400.0f) == true);
        assert(is_valid_distance(400.0f, 2.0f, 400.0f) == true);
        assert(is_valid_distance(1.5f, 2.0f, 400.0f) == false);  // too close (< 2cm blind zone)
        assert(is_valid_distance(450.0f, 2.0f, 400.0f) == false); // out of acoustic echo range
        printf("[TEST 3] is_valid_distance: PASSED\n");
    }

    // 3. Water Sensor: Derived water level
    {
        float mount_height = 200.0f; // 200cm mount above riverbed
        float distance = 150.0f;     // water is 150cm away from sensor
        float water_lvl = calculate_water_level(mount_height, distance);
        printf("[TEST 4] calculate_water_level (mount=200, dist=150): expected 50.0, got %.1f\n", water_lvl);
        assert(fabs(water_lvl - 50.0f) < 0.001f);

        // Dry riverbed / distance > mount height -> clamps to 0
        water_lvl = calculate_water_level(200.0f, 210.0f);
        assert(fabs(water_lvl - 0.0f) < 0.001f);
        printf("[TEST 5] calculate_water_level (clamping to 0): PASSED\n");

        // Danger threshold check
        assert(is_danger_level(120.0f, 100.0f) == true);
        assert(is_danger_level(95.0f, 100.0f) == false);
        printf("[TEST 6] is_danger_level: PASSED\n");
    }

    // 4. Soil Moisture Sensor: 10-sample average
    {
        int adc_samples[10] = {650, 652, 649, 655, 650, 648, 651, 653, 649, 650};
        float avg = average_samples_10(adc_samples);
        printf("[TEST 7] average_samples_10: expected 650.7, got %.1f\n", avg);
        assert(fabs(avg - 650.7f) < 0.05f);
    }

    // 5. Soil Moisture Sensor: raw_dry / raw_wet calibration
    {
        int raw_dry = 800; // air
        int raw_wet = 400; // water

        // Completely dry
        float pct_dry = raw_to_percent(800, raw_dry, raw_wet);
        printf("[TEST 8] raw_to_percent (800 in air): expected 0.0%%, got %.1f%%\n", pct_dry);
        assert(fabs(pct_dry - 0.0f) < 0.001f);

        // Completely saturated
        float pct_wet = raw_to_percent(400, raw_dry, raw_wet);
        printf("[TEST 9] raw_to_percent (400 in water): expected 100.0%%, got %.1f%%\n", pct_wet);
        assert(fabs(pct_wet - 100.0f) < 0.001f);

        // Mid-point
        float pct_mid = raw_to_percent(600, raw_dry, raw_wet);
        printf("[TEST 10] raw_to_percent (600 mid): expected 50.0%%, got %.1f%%\n", pct_mid);
        assert(fabs(pct_mid - 50.0f) < 0.001f);

        // Out of calibration bounds (clamping)
        float pct_over = raw_to_percent(350, raw_dry, raw_wet); // > 100%
        assert(fabs(pct_over - 100.0f) < 0.001f);
        float pct_under = raw_to_percent(850, raw_dry, raw_wet); // < 0%
        assert(fabs(pct_under - 0.0f) < 0.001f);
        printf("[TEST 11] raw_to_percent clamping: PASSED\n");
    }

    // 6. Alert Unit Logic: Severity parsing & buzzer cadence
    {
        assert(parse_severity("SAFE") == ALERT_SEV_SAFE);
        assert(parse_severity("advisory") == ALERT_SEV_ADVISORY);
        assert(parse_severity("WARNING") == ALERT_SEV_WARNING);
        assert(parse_severity("Danger") == ALERT_SEV_DANGER);
        assert(parse_severity("unknown_xyz") == ALERT_SEV_UNKNOWN);
        printf("[TEST 12] parse_severity: PASSED\n");

        BuzzerCadence c_safe = get_buzzer_cadence(ALERT_SEV_SAFE);
        assert(c_safe.beep_count == 0); // silent

        BuzzerCadence c_danger = get_buzzer_cadence(ALERT_SEV_DANGER);
        assert(c_danger.beep_duration_ms > 0);
        assert(c_danger.cycle_period_ms <= 500); // rapid alarm

        printf("[TEST 13] get_buzzer_cadence: PASSED\n");

        // Link loss timeout check (60 seconds)
        assert(is_link_lost(100000, 30000, 60000) == true);  // 70s elapsed > 60s
        assert(is_link_lost(100000, 50000, 60000) == false); // 50s elapsed < 60s
        printf("[TEST 14] is_link_lost: PASSED\n");
    }

    printf("\nAll 14 PC unit tests for sensor and alert logic PASSED successfully!\n");
    return 0;
}
