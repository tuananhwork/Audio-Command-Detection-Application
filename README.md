# Audio Command Detector

Ứng dụng nhận diện lệnh thoại sử dụng React và FastAPI.

## Pipeline Tổng Quan

### 1. Frontend (React + Vite)

#### A. Cấu trúc UI

- Giao diện chính với các thành phần:
  - Nút ghi âm (3 giây)
  - Input upload file audio
  - Audio player để nghe lại
  - Nút gửi lên server
  - Khu vực hiển thị kết quả dự đoán

#### B. Pipeline xử lý âm thanh

1. **Ghi âm:**

   ```javascript
   - Khởi tạo AudioContext với sampleRate 16kHz
   - Lấy stream từ microphone với cấu hình:
     + channelCount: 1 (mono)
     + sampleRate: 16kHz
     + sampleSize: 16-bit
   - Sử dụng ScriptProcessor để xử lý audio data
   - Ghi âm chính xác 3 giây
   ```

2. **Xử lý audio data:**

   ```javascript
   - Thu thập audio chunks
   - Kết hợp các chunks thành Float32Array
   - Chuyển đổi sang WAV format với:
     + RIFF header
     + PCM format
     + Mono channel
     + 16kHz sample rate
     + 16-bit depth
   ```

3. **Upload lên server:**
   ```javascript
   - Tạo FormData với audio file
   - Gửi POST request đến endpoint /predict
   - Xử lý response và hiển thị kết quả
   ```

### 2. Backend (FastAPI + Python)

#### A. API Endpoints

```python
- POST /predict
  + Input: audio file (WAV format)
  + Output: JSON với kết quả dự đoán
```

#### B. Pipeline xử lý âm thanh

1. **Tiền xử lý audio:**

   ```python
   - Đọc file WAV
   - Kiểm tra format (16kHz, mono, 16-bit)
   - Tìm đoạn có năng lượng cao nhất trong 1.7s
   - Cắt 0.2s từ đầu hoặc cuối
   - Lấy đoạn 1s có năng lượng cao nhất
   ```

2. **Trích xuất đặc trưng:**

   ```python
   - Chuyển đổi sang mel spectrogram
   - Chuẩn hóa dữ liệu
   - Reshape để phù hợp với model
   ```

3. **Dự đoán:**
   ```python
   - Load model đã train
   - Thực hiện dự đoán
   - Trả về top 3 kết quả với độ tin cậy
   ```

### 3. Luồng dữ liệu tổng thể

```
[Frontend]
1. User ghi âm 3s
   ↓
2. Chuyển đổi sang WAV
   ↓
3. Upload lên server
   ↓
[Backend]
4. Tiền xử lý audio
   ↓
5. Trích xuất đặc trưng
   ↓
6. Dự đoán với model
   ↓
7. Trả về kết quả
   ↓
[Frontend]
8. Hiển thị kết quả
   - Lệnh dự đoán (highlighted)
   - Độ tin cậy
   - Top 3 dự đoán
```

### 4. Các yêu cầu kỹ thuật

#### A. Audio Format

- Format: WAV
- Channels: Mono (1)
- Sample Rate: 16kHz
- Bit Depth: 16-bit
- Duration: 3 seconds

#### B. API Communication

- Method: POST
- Content-Type: multipart/form-data
- Endpoint: http://localhost:8000/predict
- Response: JSON với status và data

#### C. Error Handling

- Frontend: Xử lý lỗi microphone, upload, và hiển thị thông báo
- Backend: Xử lý lỗi format audio, xử lý dữ liệu, và dự đoán

### 5. Cải tiến đã thực hiện

1. **UI/UX:**

   - Giao diện hiện đại với CSS
   - Highlight kết quả dự đoán
   - Hiển thị countdown khi ghi âm
   - Cải thiện hiển thị Top 3 predictions

2. **Audio Processing:**

   - Ghi âm chính xác 3s
   - Chuyển đổi WAV format chuẩn
   - Tự động upload sau khi ghi âm

3. **Error Handling:**
   - Xử lý lỗi microphone
   - Xử lý lỗi upload
   - Hiển thị thông báo lỗi rõ ràng

## Cài đặt và Chạy

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn api.server:app --reload
```

## Công nghệ sử dụng

### Frontend

- React
- Vite
- Axios
- Web Audio API

### Backend

- FastAPI
- Python
- NumPy
- Librosa
- TensorFlow/PyTorch (cho model)
