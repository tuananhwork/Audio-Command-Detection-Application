# Smart Home System - ESP32 MCU

Hệ thống điều khiển nhà thông minh sử dụng ESP32, cho phép điều khiển các thiết bị thông qua API và cập nhật firmware qua OTA.

## Tính năng

- 🔌 Điều khiển thiết bị qua API
- 🔄 Cập nhật firmware qua OTA
- 📡 Tự động kết nối lại WiFi
- 📝 Hệ thống logging chi tiết
- 🔒 Bảo mật OTA với mật khẩu
- 🔄 Khả năng rollback firmware

## Yêu cầu

### Phần cứng

- ESP32 Development Board
- Các thiết bị điều khiển (đèn, quạt, TV, điều hòa, rèm)
- Cảm biến nhiệt độ và độ ẩm

### Phần mềm

- Arduino IDE 2.0 trở lên
- ESP32 Board Support Package
- Các thư viện:
  - WiFi
  - WebServer
  - ArduinoJson
  - ArduinoOTA
  - Update

## Cài đặt

1. Cài đặt Arduino IDE từ [arduino.cc](https://www.arduino.cc/en/software)
2. Thêm ESP32 Board Support Package:

   - Mở Arduino IDE
   - Vào File > Preferences
   - Thêm URL: `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
   - Vào Tools > Board > Boards Manager
   - Tìm và cài đặt "ESP32"

3. Cài đặt các thư viện cần thiết:

   - Vào Tools > Manage Libraries
   - Tìm và cài đặt:
     - ArduinoJson
     - ArduinoOTA

4. Upload code:
   - Chọn board: Tools > Board > ESP32 Arduino > ESP32 Dev Module
   - Chọn port: Tools > Port > (port của ESP32)
   - Nhấn nút Upload

## Cấu hình

Các thông số cấu hình được đặt trong code:

```cpp
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
```

## API Endpoints

### 1. Điều khiển thiết bị

```
POST /command
Content-Type: application/json

{
    "cmd": "bat_den" | "tat_den" | "bat_quat" | "tat_quat" |
           "bat_tv" | "tat_tv" | "bat_dieu_hoa" | "tat_dieu_hoa" |
           "mo_rem" | "dong_rem" | "nhiet_do" | "do_am"
}
```

### 2. Kiểm tra phiên bản

```
GET /version
Response: {
    "version": "1.0.0",
    "enableRollback": true
}
```

## Cập nhật OTA

### Phương pháp 1: Sử dụng Arduino IDE

1. Kết nối ESP32 với WiFi
2. Mở Serial Monitor để xem IP và URL OTA
3. Trong Arduino IDE:
   - Tools > Port > Network Ports > smart-home-mcu
   - Nhấn nút Upload

### Phương pháp 2: Sử dụng ESP OTA Updater

1. Tải ESP OTA Updater từ [GitHub](https://github.com/esp8266/Arduino/tree/master/libraries/ArduinoOTA/examples/ESP_OTA_Updater)
2. Nhập IP của ESP32
3. Chọn file firmware (.bin)
4. Nhập mật khẩu OTA
5. Nhấn Upload

### Phương pháp 3: Sử dụng curl

```bash
curl -F "image=@firmware.bin" -F "password=anh.cbt20212671" http://<ESP32_IP>:3232/update
```

## Xử lý sự cố

### Không thấy Network Ports trong Arduino IDE

1. Kiểm tra Serial Monitor xem ESP32 đã kết nối WiFi chưa
2. Kiểm tra IP và URL OTA trong Serial Monitor
3. Thử khởi động lại Arduino IDE
4. Thử phương pháp OTA khác

### Lỗi kết nối WiFi

1. Kiểm tra SSID và mật khẩu WiFi
2. Đảm bảo ESP32 trong tầm phủ sóng
3. Kiểm tra Serial Monitor để xem thông báo lỗi

### Lỗi OTA Update

1. Kiểm tra mật khẩu OTA
2. Đảm bảo ESP32 và máy tính trong cùng mạng LAN
3. Kiểm tra Serial Monitor để xem thông báo lỗi chi tiết

## Logging

Hệ thống sử dụng 4 mức độ logging:

- 🔍 DEBUG (0): Thông tin chi tiết cho debug
- ℹ️ INFO (1): Thông tin hoạt động bình thường
- ⚠️ WARNING (2): Cảnh báo
- ❌ ERROR (3): Lỗi

Điều chỉnh mức độ logging bằng cách thay đổi `LOG_LEVEL` trong code.

## Bảo mật

- OTA update được bảo vệ bằng mật khẩu
- Có thể thêm xác thực cho API endpoints
- Khả năng rollback firmware nếu cập nhật thất bại

## Đóng góp

Mọi đóng góp đều được hoan nghênh! Vui lòng:

1. Fork repository
2. Tạo branch mới
3. Commit thay đổi
4. Push lên branch
5. Tạo Pull Request

## Giấy phép

MIT License - Xem file [LICENSE](LICENSE) để biết thêm chi tiết.
