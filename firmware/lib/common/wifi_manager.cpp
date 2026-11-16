#include "wifi_manager.h"
#include <ESP8266WiFiMulti.h>

static ESP8266WiFiMulti wifiMulti;

WiFiManager::WiFiManager(const char* ssid, const char* password, const char* ssid2, const char* password2)
    : _ssid(ssid), _password(password), _ssid2(ssid2), _password2(password2), _lastReconnectAttempt(0) {}

void WiFiManager::begin() {
    WiFi.mode(WIFI_STA);
    WiFi.setAutoReconnect(true);

    if (_ssid && strlen(_ssid) > 0) {
        Serial.printf("[WiFi] Adding AP: %s\n", _ssid);
        wifiMulti.addAP(_ssid, _password);
    }
    if (_ssid2 && strlen(_ssid2) > 0) {
        Serial.printf("[WiFi] Adding Fallback AP: %s\n", _ssid2);
        wifiMulti.addAP(_ssid2, _password2);
    }

    Serial.println("[WiFi] Searching and connecting...");
    wifiMulti.run();
}

void WiFiManager::update() {
    if (WiFi.status() != WL_CONNECTED) {
        unsigned long now = millis();
        if (now - _lastReconnectAttempt > RECONNECT_INTERVAL_MS) {
            _lastReconnectAttempt = now;
            Serial.println("[WiFi] Link searching...");
            wifiMulti.run();
        }
    }
}

bool WiFiManager::isConnected() {
    return WiFi.status() == WL_CONNECTED;
}

String WiFiManager::getIP() {
    return isConnected() ? WiFi.localIP().toString() : "0.0.0.0";
}

int WiFiManager::getRSSI() {
    return isConnected() ? WiFi.RSSI() : -100;
}

const char* WiFiManager::getStatusString() {
    switch (WiFi.status()) {
        case WL_CONNECTED: return "ONLINE";
        case WL_NO_SSID_AVAIL: return "NO SSID";
        case WL_CONNECT_FAILED: return "AUTH FAIL";
        case WL_CONNECTION_LOST: return "LINK LOST";
        case WL_DISCONNECTED: return "OFFLINE";
        default: return "SEARCHING";
    }
}
