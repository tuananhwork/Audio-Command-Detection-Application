#include "config.h"
#include "logger.h"
#include "device_control.h"
#include "wifi_manager.h"
#include "ota_manager.h"
#include "api_handler.h"

// Global instances
DeviceController deviceController;
WiFiManager wifiManager(WIFI_SSID, WIFI_PASSWORD);
OTAManager otaManager(OTA_HOSTNAME, OTA_PASSWORD, FIRMWARE_VERSION, ENABLE_ROLLBACK);
APIHandler apiHandler(deviceController, otaManager);

void setup() {
    Serial.begin(115200);
    delay(1000);

    // Initialize device controller
    deviceController.begin();

    // Connect to WiFi
    if (!wifiManager.begin()) {
        Logger::error("Failed to connect to WiFi. Restarting...");
        ESP.restart();
    }

    // Initialize OTA
    otaManager.begin();

    // Initialize API server
    apiHandler.begin();
}

void loop() {
    // Check WiFi connection
    wifiManager.checkConnection();

    // Handle OTA updates
    otaManager.handle();

    // Handle API requests
    apiHandler.handle();
}
