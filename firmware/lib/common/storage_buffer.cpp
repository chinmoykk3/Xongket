#include "storage_buffer.h"
#include "http_client.h"

const char* StorageBuffer::BUFFER_FILE = "/offline_readings.jsonl";

bool StorageBuffer::begin() {
    if (!LittleFS.begin()) {
        Serial.println("[LittleFS] Mount failed. Formatting...");
        LittleFS.format();
        return LittleFS.begin();
    }
    Serial.println("[LittleFS] Storage mounted successfully");
    return true;
}

bool StorageBuffer::bufferReading(const String& readingJson) {
    if (getBufferedCount() >= MAX_BUFFERED_READINGS) {
        Serial.println("[LittleFS] Buffer full! Dropping oldest reading.");
        // If file gets too large, can truncate or append
    }

    File f = LittleFS.open(BUFFER_FILE, "a");
    if (!f) {
        Serial.println("[LittleFS] Failed to open buffer file for append");
        return false;
    }

    f.println(readingJson);
    f.close();
    Serial.println("[LittleFS] Stored reading in offline flash buffer");
    return true;
}

bool StorageBuffer::hasBufferedReadings() {
    return LittleFS.exists(BUFFER_FILE);
}

size_t StorageBuffer::getBufferedCount() {
    if (!LittleFS.exists(BUFFER_FILE)) return 0;
    File f = LittleFS.open(BUFFER_FILE, "r");
    if (!f) return 0;

    size_t count = 0;
    while (f.available()) {
        String line = f.readStringUntil('\n');
        line.trim();
        if (line.length() > 0) count++;
    }
    f.close();
    return count;
}

bool StorageBuffer::flushBatch(const char* host, int port, const char* endpoint, const char* apiKey) {
    if (!LittleFS.exists(BUFFER_FILE)) return true;

    File f = LittleFS.open(BUFFER_FILE, "r");
    if (!f) return false;

    // Build JSON array batch: [ line1, line2, ... ]
    String batchJson = "[";
    bool first = true;
    size_t count = 0;

    while (f.available()) {
        String line = f.readStringUntil('\n');
        line.trim();
        if (line.length() > 0) {
            if (!first) {
                batchJson += ",";
            }
            batchJson += line;
            first = false;
            count++;
        }
    }
    batchJson += "]";
    f.close();

    if (count == 0) {
        LittleFS.remove(BUFFER_FILE);
        return true;
    }

    Serial.printf("[LittleFS] Uploading %d buffered readings in batch to backend...\n", count);
    int httpCode = XongketHttpClient::postWithRetry(host, port, endpoint, apiKey, batchJson, 3);

    if (httpCode == 200 || httpCode == 201) {
        Serial.println("[LittleFS] Batch upload successful! Clearing offline buffer.");
        LittleFS.remove(BUFFER_FILE);
        return true;
    } else {
        Serial.printf("[LittleFS] Batch upload failed with code %d. Retaining buffer.\n", httpCode);
        return false;
    }
}
