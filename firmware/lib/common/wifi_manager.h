#ifndef XONGKET_WIFI_MANAGER_H
#define XONGKET_WIFI_MANAGER_H

#include <Arduino.h>
#include <ESP8266WiFi.h>

class WiFiManager {
public:
    WiFiManager(const char* ssid, const char* password);
    void begin();
    void update();
    bool isConnected();
    String getIP();
    int getRSSI();
    const char* getStatusString();

private:
    const char* _ssid;
    const char* _password;
    unsigned long _lastReconnectAttempt;
    static const unsigned long RECONNECT_INTERVAL_MS = 5000;
};

#endif // XONGKET_WIFI_MANAGER_H
