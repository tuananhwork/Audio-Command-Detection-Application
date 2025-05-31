#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <SPIFFS.h>
#include <ArduinoOTA.h>
#include <Update.h>
#include <ESP32Servo.h>
#include <DHT.h>


// ================== CONSTANTS ======================
#define PIN_QUAT 25
#define PIN_DEN 33
#define PIN_TV 32
#define PIN_DIEUHOA 14
#define PIN_REM 13
#define PIN_DHT 12

// DHT22 configuration
#define DHT_TYPE DHT22
DHT dht(PIN_DHT, DHT_TYPE);

// ================== Configuration ==================
// WiFi config
const char* WIFI_SSID = "SmartHomeNet";
const char* WIFI_PASSWORD = "12345678";

// OTA config
const char* OTA_PASSWORD = "anh.cbt20212671";
const char* OTA_HOSTNAME = "smart-home-mcu";
const char* FIRMWARE_VERSION = "1.0.0";
const bool ENABLE_ROLLBACK = true;

// Log level (0: DEBUG, 1: INFO, 2: WARNING, 3: ERROR)
const int LOG_LEVEL = 0;

// Web server
WebServer server(80);

// Servo
Servo servoRem;

// ================== Logging ==================
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARNING = 2,
  ERROR = 3
};

void log(LogLevel level, const String& message) {
  if (level < LOG_LEVEL) return;
  
  String prefix;
  switch(level) {
    case DEBUG:   prefix = "🔍 [DEBUG] "; break;
    case INFO:    prefix = "ℹ️ [INFO] "; break;
    case WARNING: prefix = "⚠️ [WARN] "; break;
    case ERROR:   prefix = "❌ [ERROR] "; break;
  }
  
  Serial.println(prefix + message);
}

// ================== Device Control ==================
void batDen() {
    log(INFO, "💡 Bật đèn");
    digitalWrite(PIN_DEN, LOW);
}
void tatDen() {
    log(INFO, "💡 Tắt đèn");
    digitalWrite(PIN_DEN, HIGH);
}

void batQuat() {
    log(INFO, "🌀 Bật quạt");
    digitalWrite(PIN_QUAT, LOW);
}
void tatQuat() {
    log(INFO, "🌀 Tắt quạt");
    digitalWrite(PIN_QUAT, HIGH);
}

void batTV() {
    log(INFO, "📺 Bật TV");
    digitalWrite(PIN_TV, LOW);
}
void tatTV() {
    log(INFO, "📺 Tắt TV");
    digitalWrite(PIN_TV, HIGH);
}

void batDieuHoa() {
    log(INFO, "❄️ Bật điều hòa");
    digitalWrite(PIN_DIEUHOA, LOW);
}
void tatDieuHoa() {
    log(INFO, "❄️ Tắt điều hòa");
    digitalWrite(PIN_DIEUHOA, HIGH);
}

void moRem() { 
    log(INFO, "🪟 Mở rèm");
    servoRem.write(90);
    delay(1000);
}

void dongRem() {
    log(INFO, "🪟 Đóng rèm");
    servoRem.write(0);
    delay(1000);
}

void docNhietDo() {
    float nhietDo = dht.readTemperature();
    if (isnan(nhietDo)) {
        log(ERROR, "🌡️ Lỗi đọc nhiệt độ!");
        return;
    }
    log(INFO, "🌡️ Nhiệt độ: " + String(nhietDo, 1) + "°C");
}

void docDoAm() {
    float doAm = dht.readHumidity();
    if (isnan(doAm)) {
        log(ERROR, "💧 Lỗi đọc độ ẩm!");
        return;
    }
    log(INFO, "💧 Độ ẩm: " + String(doAm, 1) + "%");
}

// ================== Command Processing ==================
void xuLyLenh(const String& cmd) {
  if      (cmd == "bat_den")       batDen();
  else if (cmd == "tat_den")       tatDen();
  else if (cmd == "bat_quat")      batQuat();
  else if (cmd == "tat_quat")      tatQuat();
  else if (cmd == "bat_tv")        batTV();
  else if (cmd == "tat_tv")        tatTV();
  else if (cmd == "bat_dieu_hoa")  batDieuHoa();
  else if (cmd == "tat_dieu_hoa")  tatDieuHoa();
  else if (cmd == "mo_rem")        moRem();
  else if (cmd == "dong_rem")      dongRem();
  else if (cmd == "nhiet_do")      docNhietDo();
  else if (cmd == "do_am")         docDoAm();
}

// ================== OTA Update ==================
void setupOTA() {
  ArduinoOTA.setHostname(OTA_HOSTNAME);
  ArduinoOTA.setPassword(OTA_PASSWORD);
  
  ArduinoOTA.onStart([]() {
    String type = (ArduinoOTA.getCommand() == U_FLASH) ? "sketch" : "filesystem";
    log(INFO, "Start updating " + type);
  });
  
  ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
    int percent = (progress / (total / 100));
    if (percent % 10 == 0) {  // Log every 10%
      log(INFO, "Update Progress: " + String(percent) + "%");
    }
  });
  
  ArduinoOTA.onEnd([]() {
    log(INFO, "Update completed");
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
    log(ERROR, "Update failed: " + errorMsg);
  });
  
  ArduinoOTA.begin();
  log(INFO, "OTA Update service started");
  log(INFO, "OTA Update URL: http://" + WiFi.localIP().toString() + ":3232");
}

// ================== API Endpoints ==================
void handleCommand() {
  log(INFO, "✅ New request received");

  if (server.method() != HTTP_POST) {
    server.send(405, "text/plain", "Method Not Allowed");
    return;
  }

  String body = server.arg("plain");
  log(INFO, "📦 Payload: " + body);

  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, body);
  if (error) {
    log(ERROR, "❌ JSON error: " + String(error.c_str()));
    server.send(400, "text/plain", "Invalid JSON");
    return;
  }

  String cmd = doc["cmd"];
  if (cmd.length() > 0) {
    log(INFO, "🎯 Command received: " + cmd);
    xuLyLenh(cmd);  // Process command
    server.send(200, "text/plain", "Command processed: " + cmd);
  } else {
    log(ERROR, "⚠️ Invalid or missing command");
    server.send(400, "text/plain", "Invalid command");
  }
}

void handleVersion() {
  StaticJsonDocument<256> doc;
  doc["version"] = FIRMWARE_VERSION;
  doc["enableRollback"] = ENABLE_ROLLBACK;
  
  String response;
  serializeJson(doc, response);
  server.send(200, "application/json", response);
}

// ================== WiFi Connection ==================
void checkWiFiConnection() {
  if (WiFi.status() != WL_CONNECTED) {
    log(WARNING, "WiFi connection lost! Reconnecting...");
    WiFi.disconnect();
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
      delay(500);
      Serial.print(".");
      attempts++;
    }
    
    if (WiFi.status() == WL_CONNECTED) {
      log(INFO, "WiFi Reconnected");
      log(INFO, "ESP32 IP: " + WiFi.localIP().toString());
    } else {
      log(ERROR, "WiFi reconnection failed");
    }
  }
}

// ================== Setup ==================
void setup() {
  Serial.begin(115200);
  delay(1000);

  // Khởi tạo các chân
  pinMode(PIN_DEN, OUTPUT);
  pinMode(PIN_QUAT, OUTPUT);
  pinMode(PIN_TV, OUTPUT);
  pinMode(PIN_DIEUHOA, OUTPUT);

  digitalWrite(PIN_DEN, HIGH);
  digitalWrite(PIN_QUAT, HIGH);
  digitalWrite(PIN_TV, HIGH);
  digitalWrite(PIN_DIEUHOA, HIGH);

  // Khởi tạo servo
  servoRem.attach(PIN_REM);
  servoRem.write(0);  // Đặt về vị trí đóng
  delay(1000);

  // Khởi tạo DHT22
  dht.begin();
  log(INFO, "Đã khởi tạo cảm biến DHT22");

  // Kết nối WiFi
  log(INFO, "Connecting to WiFi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  log(INFO, "WiFi Connected");
  log(INFO, "ESP32 IP: " + WiFi.localIP().toString());

  // Khởi tạo server
  server.on("/command", HTTP_POST, handleCommand);
  server.on("/version", HTTP_GET, handleVersion);
  server.begin();
  log(INFO, "WebServer started successfully");

  setupOTA();
}

// ================== Loop ==================
void loop() {
  checkWiFiConnection();  // Check and reconnect WiFi if needed
  ArduinoOTA.handle();    // Handle OTA update requests
  server.handleClient();
}
