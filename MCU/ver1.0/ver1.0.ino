#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>

// WiFi config
const char* ssid = "SmartHomeNet";
const char* password = "12345678";

// Web server
WebServer server(80);

// ================== Các hàm điều khiển thiết bị ==================

void batDen()       { Serial.println("💡 [stub] Bật đèn");     /* digitalWrite(...) */ }
void tatDen()       { Serial.println("💡 [stub] Tắt đèn");     /* digitalWrite(...) */ }

void batQuat()      { Serial.println("🌀 [stub] Bật quạt");    /* digitalWrite(...) */ }
void tatQuat()      { Serial.println("🌀 [stub] Tắt quạt");    /* digitalWrite(...) */ }

void batTV()        { Serial.println("📺 [stub] Bật TV");      /* digitalWrite(...) */ }
void tatTV()        { Serial.println("📺 [stub] Tắt TV");      /* digitalWrite(...) */ }

void batDieuHoa()   { Serial.println("❄️ [stub] Bật điều hòa"); /* digitalWrite(...) */ }
void tatDieuHoa()   { Serial.println("❄️ [stub] Tắt điều hòa"); /* digitalWrite(...) */ }

void moRem()        { Serial.println("🪟 [stub] Mở rèm");      /* servo.write(...) */ }
void dongRem()      { Serial.println("🪟 [stub] Đóng rèm");    /* servo.write(...) */ }

void docNhietDo()   { Serial.println("🌡️ [stub] Đọc nhiệt độ"); /* return dht.readTemperature() */ }
void docDoAm()      { Serial.println("💧 [stub] Đọc độ ẩm");    /* return dht.readHumidity() */ }

// ================== Xử lý lệnh ==================

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

// ================== Webserver handler ==================

void handleCommand() {
  Serial.println("✅ New request received");

  if (server.method() != HTTP_POST) {
    server.send(405, "text/plain", "Method Not Allowed");
    return;
  }

  String body = server.arg("plain");
  Serial.println("📦 Payload: " + body);

  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, body);
  if (error) {
    Serial.println("❌ JSON error: " + String(error.c_str()));
    server.send(400, "text/plain", "Invalid JSON");
    return;
  }

  String cmd = doc["cmd"];
  if (cmd.length() > 0) {
    Serial.println("🎯 Valid command received: " + cmd);
    xuLyLenh(cmd);  // Process command
    server.send(200, "text/plain", "Command processed: " + cmd);
  } else {
    Serial.println("⚠️ Invalid or missing command");
    server.send(400, "text/plain", "Invalid command");
  }
}

// ================== Setup ==================

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("🔌 Connecting to WiFi...");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n📶 WiFi Connected");
  Serial.println("🌐 ESP32 IP: " + WiFi.localIP().toString());

  server.on("/command", HTTP_POST, handleCommand);
  server.begin();
  Serial.println("🚀 WebServer started successfully");

  // Add pinMode(...) here later
}

// ================== Loop ==================

void loop() {
  server.handleClient();
}
