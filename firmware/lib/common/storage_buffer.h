#ifndef XONGKET_STORAGE_BUFFER_H
#define XONGKET_STORAGE_BUFFER_H

#include <Arduino.h>
#include <LittleFS.h>

class StorageBuffer {
public:
    static bool begin();
    static bool bufferReading(const String& readingJson);
    static bool hasBufferedReadings();
    static size_t getBufferedCount();
    static bool flushBatch(const char* host, int port, const char* endpoint, const char* apiKey);

private:
    static const char* BUFFER_FILE;
    static const size_t MAX_BUFFERED_READINGS = 50;
};

#endif // XONGKET_STORAGE_BUFFER_H
