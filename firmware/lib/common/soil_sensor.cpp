#include "soil_sensor.h"

float average_samples_10(const int samples[10]) {
    long sum = 0;
    for (int i = 0; i < 10; i++) {
        sum += samples[i];
    }
    return (float)sum / 10.0f;
}

float raw_to_percent(int raw_adc, int raw_dry, int raw_wet) {
    if (raw_dry == raw_wet) {
        return 0.0f; // Invalid calibration safeguard
    }

    // In capacitive sensor v2.0: raw_dry > raw_wet
    float span = (float)(raw_dry - raw_wet);
    float diff = (float)(raw_dry - raw_adc);
    float pct = (diff / span) * 100.0f;

    if (pct < 0.0f) pct = 0.0f;
    if (pct > 100.0f) pct = 100.0f;

    return pct;
}
