#ifndef XONGKET_SOIL_SENSOR_H
#define XONGKET_SOIL_SENSOR_H

#ifdef __cplusplus
extern "C" {
#endif

/**
 * Average 10 raw ADC samples from capacitive soil moisture sensor on A0.
 */
float average_samples_10(const int samples[10]);

/**
 * Convert raw analog reading to calibrated 0.0 - 100.0% moisture.
 * Capacitive sensor v2.0:
 *   - Dry air = high voltage / high ADC value (e.g., ~780)
 *   - Pure water = low voltage / low ADC value (e.g., ~380)
 * Percent = ((raw_dry - raw_adc) / (raw_dry - raw_wet)) * 100.0%
 * Result is clamped to [0.0, 100.0]%.
 */
float raw_to_percent(int raw_adc, int raw_dry, int raw_wet);

#ifdef __cplusplus
}
#endif

#endif // XONGKET_SOIL_SENSOR_H
