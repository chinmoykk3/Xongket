#ifndef XONGKET_WIFI_MANAGER_H
#define XONGKET_WIFI_MANAGER_H

#include <Arduino.h>
#include <ESP8266WiFi.h>

class WiFiManager {
public:
    WiFiManager(const char* ssid, const char* password, const char* ssid2 = nullptr, const char* password2 = nullptr);
    void begin();
    void update();
    bool isConnected();
    String getIP();
    int getRSSI();
    const char* getStatusString();

private:
    const char* _ssid;
    const char* _password;
    const char* _ssid2;
    const char* _password2;
    unsigned long _lastReconnectAttempt;
    static const unsigned long RECONNECT_INTERVAL_MS = 5000;
};

#endif // XONGKET_WIFI_MANAGER_H
