#include "time_sync.h"

void TimeSync::begin(long gmtOffsetSec, int daylightOffsetSec, const char* server1, const char* server2) {
    configTime(gmtOffsetSec, daylightOffsetSec, server1, server2);
    Serial.println("[NTP] Initializing time synchronization...");
}

bool TimeSync::isSynced() {
    time_t now = time(nullptr);
    return now > 1700000000; // Check year > 2023
}

time_t TimeSync::getEpoch() {
    return time(nullptr);
}

String TimeSync::getIsoTimestamp() {
    time_t now = time(nullptr);
    struct tm* timeinfo = gmtime(&now); // Format in UTC for backend
    if (!timeinfo || now < 1700000000) {
        // Fallback before NTP sync
        return "1970-01-01T00:00:00Z";
    }

    char buf[30];
    strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", timeinfo);
    return String(buf);
}
