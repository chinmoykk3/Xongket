#ifndef XONGKET_HTTP_CLIENT_H
#define XONGKET_HTTP_CLIENT_H

#include <Arduino.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>

class XongketHttpClient {
public:
    static int postWithRetry(
        const char* host,
        int port,
        const char* endpoint,
        const char* apiKey,
        const String& payload,
        int maxRetries = 3
    );

    static int getStatus(
        const char* host,
        int port,
        const char* endpoint,
        String& responseBody
    );
};

#endif // XONGKET_HTTP_CLIENT_H
