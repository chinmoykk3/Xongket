#include "alert_logic.h"
#include <string.h>
#include <strings.h>

AlertSeverity parse_severity(const char* severity_str) {
    if (!severity_str) return ALERT_SEV_UNKNOWN;

    if (strcasecmp(severity_str, "SAFE") == 0) return ALERT_SEV_SAFE;
    if (strcasecmp(severity_str, "ADVISORY") == 0) return ALERT_SEV_ADVISORY;
    if (strcasecmp(severity_str, "WARNING") == 0) return ALERT_SEV_WARNING;
    if (strcasecmp(severity_str, "DANGER") == 0) return ALERT_SEV_DANGER;

    return ALERT_SEV_UNKNOWN;
}

const char* severity_to_string(AlertSeverity sev) {
    switch (sev) {
        case ALERT_SEV_SAFE: return "SAFE";
        case ALERT_SEV_ADVISORY: return "ADVISORY";
        case ALERT_SEV_WARNING: return "WARNING";
        case ALERT_SEV_DANGER: return "DANGER";
        default: return "UNKNOWN";
    }
}

BuzzerCadence get_buzzer_cadence(AlertSeverity sev) {
    BuzzerCadence c;
    switch (sev) {
        case ALERT_SEV_SAFE:
            c.beep_duration_ms = 0;
            c.pause_duration_ms = 0;
            c.beep_count = 0;
            c.cycle_period_ms = 1000;
            break;
        case ALERT_SEV_ADVISORY:
            c.beep_duration_ms = 100;
            c.pause_duration_ms = 0;
            c.beep_count = 1;
            c.cycle_period_ms = 10000; // 1 beep every 10s
            break;
        case ALERT_SEV_WARNING:
            c.beep_duration_ms = 200;
            c.pause_duration_ms = 150;
            c.beep_count = 2;
            c.cycle_period_ms = 4000;  // 2 beeps every 4s
            break;
        case ALERT_SEV_DANGER:
            c.beep_duration_ms = 250;
            c.pause_duration_ms = 150;
            c.beep_count = 1;
            c.cycle_period_ms = 400;   // Rapid continuous alarm
            break;
        default:
            c.beep_duration_ms = 0;
            c.pause_duration_ms = 0;
            c.beep_count = 0;
            c.cycle_period_ms = 1000;
            break;
    }
    return c;
}

bool is_link_lost(unsigned long now_ms, unsigned long last_success_ms, unsigned long timeout_ms) {
    if (last_success_ms == 0) return true;
    return (now_ms - last_success_ms) >= timeout_ms;
}
