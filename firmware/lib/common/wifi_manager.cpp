#include "wifi_manager.h"

WiFiManager::WiFiManager(const char* ssid, const char* password)
    : _ssid(ssid), _password(password), _lastReconnectAttempt(0) {}

void WiFiManager::begin() {
    WiFi.mode(WIFI_STA);
    WiFi.setAutoReconnect(true);
    Serial.printf("[WiFi] Connecting to %s...\n", _ssid);
    WiFi.begin(_ssid, _password);
}

void WiFiManager::update() {
    if (WiFi.status() != WL_CONNECTED) {
        unsigned long now = millis();
        if (now - _lastReconnectAttempt > RECONNECT_INTERVAL_MS) {
            _lastReconnectAttempt = now;
            Serial.println("[WiFi] Lost link. Reconnecting...");
            WiFi.disconnect();
            WiFi.begin(_ssid, _password);
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
