#ifndef WIFI_MANAGER_H
#define WIFI_MANAGER_H

#include <WiFi.h>
#include "config.h"
#include "logger.h"

class WiFiManager {
private:
    const char* ssid;
    const char* password;
    int reconnectAttempts;
    static const int MAX_RECONNECT_ATTEMPTS = 20;

public:
    WiFiManager(const char* ssid, const char* password) 
        : ssid(ssid), password(password), reconnectAttempts(0) {}

    bool begin() {
        Logger::info("Connecting to WiFi...");
        WiFi.begin(ssid, password);
        
        while (WiFi.status() != WL_CONNECTED && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            delay(500);
            Serial.print(".");
            reconnectAttempts++;
        }

        if (WiFi.status() == WL_CONNECTED) {
            Logger::info("WiFi Connected");
            Logger::info("ESP32 IP: " + WiFi.localIP().toString());
            return true;
        } else {
            Logger::error("WiFi connection failed");
            return false;
        }
    }

    void checkConnection() {
        if (WiFi.status() != WL_CONNECTED) {
            Logger::warning("WiFi connection lost! Reconnecting...");
            WiFi.disconnect();
            WiFi.begin(ssid, password);
            
            reconnectAttempts = 0;
            while (WiFi.status() != WL_CONNECTED && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                delay(500);
                Serial.print(".");
                reconnectAttempts++;
            }
            
            if (WiFi.status() == WL_CONNECTED) {
                Logger::info("WiFi Reconnected");
                Logger::info("ESP32 IP: " + WiFi.localIP().toString());
            } else {
                Logger::error("WiFi reconnection failed");
            }
        }
    }

    bool isConnected() {
        return WiFi.status() == WL_CONNECTED;
    }

    String getIP() {
        return WiFi.localIP().toString();
    }
};

#endif // WIFI_MANAGER_H 