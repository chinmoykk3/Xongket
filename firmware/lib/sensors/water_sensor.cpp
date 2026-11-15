#include "water_sensor.h"
#include <stdbool.h>

float filter_median_5(float samples[5]) {
    // Bubble sort a copy of the 5 elements
    float sorted[5];
    for (int i = 0; i < 5; i++) {
        sorted[i] = samples[i];
    }

    for (int i = 0; i < 4; i++) {
        for (int j = 0; j < 4 - i; j++) {
            if (sorted[j] > sorted[j + 1]) {
                float tmp = sorted[j];
                sorted[j] = sorted[j + 1];
                sorted[j + 1] = tmp;
            }
        }
    }

    // Median of 5 items is at index 2
    return sorted[2];
}

bool is_valid_distance(float distance_cm, float min_cm, float max_cm) {
    if (distance_cm < min_cm || distance_cm > max_cm) {
        return false;
    }
    return true;
}

float calculate_water_level(float mount_height_cm, float distance_cm) {
    if (distance_cm > mount_height_cm) {
        return 0.0f; // River bed / below dry zero datum
    }
    float level = mount_height_cm - distance_cm;
    return (level < 0.0f) ? 0.0f : level;
}

bool is_danger_level(float water_level_cm, float danger_threshold_cm) {
    return water_level_cm >= danger_threshold_cm;
}
