#ifndef DEVICE_CONTROL_H
#define DEVICE_CONTROL_H

#include <Arduino.h>
#include <ESP32Servo.h>
#include <DHT.h>
#include "config.h"
#include "logger.h"

class DeviceController {
private:
    Servo servoRem;
    DHT dht;

public:
    DeviceController() : dht(PIN_DHT, DHT_TYPE) {}

    void begin() {
        // Initialize pins
        pinMode(PIN_DEN, OUTPUT);
        pinMode(PIN_QUAT, OUTPUT);
        pinMode(PIN_TV, OUTPUT);
        pinMode(PIN_DIEUHOA, OUTPUT);

        // Set initial states
        digitalWrite(PIN_DEN, HIGH);
        digitalWrite(PIN_QUAT, HIGH);
        digitalWrite(PIN_TV, HIGH);
        digitalWrite(PIN_DIEUHOA, HIGH);

        // Initialize servo
        servoRem.attach(PIN_REM);
        servoRem.write(0);  // Set to closed position
        delay(1000);

        // Initialize DHT22
        dht.begin();
        Logger::info("Đã khởi tạo cảm biến DHT22");
    }

    // Light control
    void turnOnLight() {
        Logger::info("💡 Bật đèn");
        digitalWrite(PIN_DEN, LOW);
    }

    void turnOffLight() {
        Logger::info("💡 Tắt đèn");
        digitalWrite(PIN_DEN, HIGH);
    }

    // Fan control
    void turnOnFan() {
        Logger::info("🌀 Bật quạt");
        digitalWrite(PIN_QUAT, LOW);
    }

    void turnOffFan() {
        Logger::info("🌀 Tắt quạt");
        digitalWrite(PIN_QUAT, HIGH);
    }

    // TV control
    void turnOnTV() {
        Logger::info("📺 Bật TV");
        digitalWrite(PIN_TV, LOW);
    }

    void turnOffTV() {
        Logger::info("📺 Tắt TV");
        digitalWrite(PIN_TV, HIGH);
    }

    // AC control
    void turnOnAC() {
        Logger::info("❄️ Bật điều hòa");
        digitalWrite(PIN_DIEUHOA, LOW);
    }

    void turnOffAC() {
        Logger::info("❄️ Tắt điều hòa");
        digitalWrite(PIN_DIEUHOA, HIGH);
    }

    // Curtain control
    void openCurtain() {
        Logger::info("🪟 Mở rèm");
        servoRem.write(90);
        delay(1000);
    }

    void closeCurtain() {
        Logger::info("🪟 Đóng rèm");
        servoRem.write(0);
        delay(1000);
    }

    // Sensor readings
    float readTemperature() {
        float temp = dht.readTemperature();
        if (isnan(temp)) {
            Logger::error("🌡️ Lỗi đọc nhiệt độ!");
            return -999.0;
        }
        Logger::info("🌡️ Nhiệt độ: " + String(temp, 1) + "°C");
        return temp;
    }

    float readHumidity() {
        float humidity = dht.readHumidity();
        if (isnan(humidity)) {
            Logger::error("💧 Lỗi đọc độ ẩm!");
            return -999.0;
        }
        Logger::info("💧 Độ ẩm: " + String(humidity, 1) + "%");
        return humidity;
    }

    // Command processing
    void processCommand(const String& cmd) {
        if      (cmd == "bat_den")       turnOnLight();
        else if (cmd == "tat_den")       turnOffLight();
        else if (cmd == "bat_quat")      turnOnFan();
        else if (cmd == "tat_quat")      turnOffFan();
        else if (cmd == "bat_tv")        turnOnTV();
        else if (cmd == "tat_tv")        turnOffTV();
        else if (cmd == "bat_dieu_hoa")  turnOnAC();
        else if (cmd == "tat_dieu_hoa")  turnOffAC();
        else if (cmd == "mo_rem")        openCurtain();
        else if (cmd == "dong_rem")      closeCurtain();
        else if (cmd == "nhiet_do")      readTemperature();
        else if (cmd == "do_am")         readHumidity();
    }
};

#endif // DEVICE_CONTROL_H 