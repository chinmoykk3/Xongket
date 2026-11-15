#ifndef XONGKET_WATER_SENSOR_H
#define XONGKET_WATER_SENSOR_H

#ifdef __cplusplus
extern "C" {
#endif

/**
 * Filter 5 raw distance measurements by returning the median value.
 * Out-of-range values should be rejected before or filtered via median.
 */
float filter_median_5(float samples[5]);

/**
 * Check if measured ultrasonic distance is within physical sensor bounds.
 * HC-SR04 typical valid range: 2.0 cm to 400.0 cm.
 */
bool is_valid_distance(float distance_cm, float min_cm, float max_cm);

/**
 * Compute derived water level from mounting height and ultrasonic distance.
 * water_level_cm = mount_height_cm - distance_cm.
 * Result clamped to >= 0.0 cm.
 */
float calculate_water_level(float mount_height_cm, float distance_cm);

/**
 * Check if the calculated water level meets or exceeds the danger threshold.
 */
bool is_danger_level(float water_level_cm, float danger_threshold_cm);

#ifdef __cplusplus
}
#endif

#endif // XONGKET_WATER_SENSOR_H
