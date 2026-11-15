#ifndef XONGKET_ALERT_LOGIC_H
#define XONGKET_ALERT_LOGIC_H

#ifdef __cplusplus
extern "C" {
#endif

#include <stdbool.h>

typedef enum {
    ALERT_SEV_SAFE = 0,
    ALERT_SEV_ADVISORY = 1,
    ALERT_SEV_WARNING = 2,
    ALERT_SEV_DANGER = 3,
    ALERT_SEV_UNKNOWN = 4
} AlertSeverity;

/**
 * Parse string to AlertSeverity enum.
 */
AlertSeverity parse_severity(const char* severity_str);

/**
 * Return display text for severity.
 */
const char* severity_to_string(AlertSeverity sev);

/**
 * Buzzer cadence state for non-blocking loop execution.
 */
typedef struct {
    int beep_duration_ms;   // Duration buzzer is ON
    int pause_duration_ms;  // Pause between beeps in same cycle
    int beep_count;         // Number of beeps per cycle
    int cycle_period_ms;    // Total cycle repeat period
} BuzzerCadence;

/**
 * Get the buzzer cadence timing for a given alert severity.
 * - SAFE: Silent
 * - ADVISORY: 1 short 100ms beep every 10 seconds
 * - WARNING: 2 beeps (200ms on, 150ms pause, 200ms on) every 4 seconds
 * - DANGER: Rapid continuous alarm (250ms on, 150ms off)
 */
BuzzerCadence get_buzzer_cadence(AlertSeverity sev);

/**
 * Check if the backend connection is timed out (> 60,000ms).
 */
bool is_link_lost(unsigned long now_ms, unsigned long last_success_ms, unsigned long timeout_ms);

#ifdef __cplusplus
}
#endif

#endif // XONGKET_ALERT_LOGIC_H
