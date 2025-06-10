#ifndef CONFIG_H
#define CONFIG_H

// Pin Configuration
#define PIN_QUAT 25
#define PIN_DEN 33
#define PIN_TV 32
#define PIN_DIEUHOA 14
#define PIN_REM 13
#define PIN_DHT 12

// DHT22 Configuration
#define DHT_TYPE DHT22

// WiFi Configuration
#define WIFI_SSID "SmartHomeNet"
#define WIFI_PASSWORD "12345678"

// OTA Configuration
#define OTA_PASSWORD "anh.cbt20212671"
#define OTA_HOSTNAME "smart-home-mcu"
#define FIRMWARE_VERSION "1.0.0"
#define ENABLE_ROLLBACK true

// Logging Configuration
#define LOG_LEVEL 0  // 0: DEBUG, 1: INFO, 2: WARNING, 3: ERROR

// Server Configuration
#define SERVER_PORT 80

#endif // CONFIG_H 