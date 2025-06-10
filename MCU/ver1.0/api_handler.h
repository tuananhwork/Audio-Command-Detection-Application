#ifndef API_HANDLER_H
#define API_HANDLER_H

#include <WebServer.h>
#include <ArduinoJson.h>
#include "config.h"
#include "logger.h"
#include "device_control.h"

class APIHandler {
private:
    WebServer server;
    DeviceController& deviceController;
    OTAManager& otaManager;

public:
    APIHandler(DeviceController& dc, OTAManager& ota) 
        : server(SERVER_PORT), deviceController(dc), otaManager(ota) {}

    void begin() {
        server.on("/command", HTTP_POST, [this]() {
            handleCommand();
        });

        server.on("/version", HTTP_GET, [this]() {
            handleVersion();
        });

        server.begin();
        Logger::info("WebServer started successfully");
    }

    void handle() {
        server.handleClient();
    }

private:
    void handleCommand() {
        Logger::info("✅ New request received");

        if (server.method() != HTTP_POST) {
            server.send(405, "text/plain", "Method Not Allowed");
            return;
        }

        String body = server.arg("plain");
        Logger::info("📦 Payload: " + body);

        JsonDocument doc;
        DeserializationError error = deserializeJson(doc, body);
        if (error) {
            Logger::error("❌ JSON error: " + String(error.c_str()));
            server.send(400, "text/plain", "Invalid JSON");
            return;
        }

        String cmd = doc["cmd"];
        if (cmd.length() > 0) {
            Logger::info("🎯 Command received: " + cmd);
            deviceController.processCommand(cmd);
            server.send(200, "text/plain", "Command processed: " + cmd);
        } else {
            Logger::error("⚠️ Invalid or missing command");
            server.send(400, "text/plain", "Invalid command");
        }
    }

    void handleVersion() {
        JsonDocument doc;
        doc["version"] = otaManager.getVersion();
        doc["enableRollback"] = otaManager.isRollbackEnabled();
        
        String response;
        serializeJson(doc, response);
        server.send(200, "application/json", response);
    }
};

#endif // API_HANDLER_H 