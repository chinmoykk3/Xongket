#include "http_client.h"

int XongketHttpClient::postWithRetry(
    const char* host,
    int port,
    const char* endpoint,
    const char* apiKey,
    const String& payload,
    int maxRetries
) {
    WiFiClient client;
    HTTPClient http;

    String url = "http://" + String(host) + ":" + String(port) + String(endpoint);

    int httpCode = -1;
    unsigned long backoffMs = 500;

    for (int attempt = 1; attempt <= maxRetries; attempt++) {
        if (!http.begin(client, url)) {
            Serial.printf("[HTTP] Failed to connect to %s\n", url.c_str());
            delay(backoffMs);
            backoffMs *= 2;
            continue;
        }

        http.addHeader("Content-Type", "application/json");
        http.addHeader("X-API-Key", apiKey);
        http.addHeader("X-Node-API-Key", apiKey);
        http.setTimeout(5000);

        httpCode = http.POST(payload);

        if (httpCode == HTTP_CODE_OK || httpCode == HTTP_CODE_CREATED) {
            String resp = http.getString();
            Serial.printf("[HTTP POST OK] %d (attempt %d)\n", httpCode, attempt);
            http.end();
            return httpCode;
        } else {
            Serial.printf("[HTTP POST ERR] Code: %d, err: %s (attempt %d)\n",
                          httpCode, http.errorToString(httpCode).c_str(), attempt);
        }

        http.end();

        if (attempt < maxRetries) {
            delay(backoffMs);
            backoffMs *= 2; // Exponential backoff
        }
    }

    return httpCode;
}

int XongketHttpClient::getStatus(
    const char* host,
    int port,
    const char* endpoint,
    String& responseBody
) {
    WiFiClient client;
    HTTPClient http;

    String url = "http://" + String(host) + ":" + String(port) + String(endpoint);

    if (!http.begin(client, url)) {
        return -1;
    }

    http.setTimeout(4000);
    int httpCode = http.GET();

    if (httpCode == HTTP_CODE_OK) {
        responseBody = http.getString();
    } else {
        Serial.printf("[HTTP GET] %s failed: %d\n", endpoint, httpCode);
    }

    http.end();
    return httpCode;
}
