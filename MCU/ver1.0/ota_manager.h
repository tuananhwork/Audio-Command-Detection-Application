#ifndef OTA_MANAGER_H
#define OTA_MANAGER_H

#include <ArduinoOTA.h>
#include "config.h"
#include "logger.h"

class OTAManager {
private:
    const char* hostname;
    const char* password;
    const char* version;
    const bool enableRollback;

public:
    OTAManager(const char* hostname, const char* password, const char* version, bool enableRollback)
        : hostname(hostname), password(password), version(version), enableRollback(enableRollback) {}

    void begin() {
        ArduinoOTA.setHostname(hostname);
        ArduinoOTA.setPassword(password);
        
        ArduinoOTA.onStart([]() {
            String type = (ArduinoOTA.getCommand() == U_FLASH) ? "sketch" : "filesystem";
            Logger::info("Start updating " + type);
        });
        
        ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
            int percent = (progress / (total / 100));
            if (percent % 10 == 0) {  // Log every 10%
                Logger::info("Update Progress: " + String(percent) + "%");
            }
        });
        
        ArduinoOTA.onEnd([]() {
            Logger::info("Update completed");
        });
        
        ArduinoOTA.onError([](ota_error_t error) {
            String errorMsg;
            switch (error) {
                case OTA_AUTH_ERROR:    errorMsg = "Auth Failed"; break;
                case OTA_BEGIN_ERROR:   errorMsg = "Begin Failed"; break;
                case OTA_CONNECT_ERROR: errorMsg = "Connect Failed"; break;
                case OTA_RECEIVE_ERROR: errorMsg = "Receive Failed"; break;
                case OTA_END_ERROR:     errorMsg = "End Failed"; break;
            }
            Logger::error("Update failed: " + errorMsg);
        });
        
        ArduinoOTA.begin();
        Logger::info("OTA Update service started");
        Logger::info("OTA Update URL: http://" + WiFi.localIP().toString() + ":3232");
    }

    void handle() {
        ArduinoOTA.handle();
    }

    String getVersion() {
        return version;
    }

    bool isRollbackEnabled() {
        return enableRollback;
    }
};

#endif // OTA_MANAGER_H 