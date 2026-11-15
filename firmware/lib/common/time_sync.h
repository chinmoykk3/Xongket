#ifndef XONGKET_TIME_SYNC_H
#define XONGKET_TIME_SYNC_H

#include <Arduino.h>
#include <time.h>

class TimeSync {
public:
    static void begin(long gmtOffsetSec, int daylightOffsetSec, const char* server1, const char* server2 = nullptr);
    static bool isSynced();
    static String getIsoTimestamp();
    static time_t getEpoch();
};

#endif // XONGKET_TIME_SYNC_H
