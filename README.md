# Audio Command Detection

Ứng dụng nhận diện lệnh thoại sử dụng deep learning.

## Pipeline

### Frontend (React)

1. **Ghi âm**

   - Sử dụng Web Audio API (AudioWorkletNode) để ghi âm
   - Ghi âm trong 3 giây với sample rate 16kHz
   - Chuyển đổi audio data thành WAV format

2. **Hiển thị**
   - Sử dụng WaveSurfer.js để hiển thị waveform
   - Hiển thị kết quả dự đoán với màu sắc tương ứng:
     - Xanh lá: confidence >= 80%
     - Vàng: confidence >= 60%
     - Đỏ: confidence < 60%

### Backend (FastAPI)

1. **Xử lý Audio**

   - Nhận file WAV từ frontend
   - Tiền xử lý audio (normalize, resample)

2. **Dự đoán**
   - Sử dụng model deep learning để dự đoán lệnh
   - Trả về top 3 dự đoán với confidence

## Luồng xử lý dữ liệu chi tiết

### 1. Thu âm (Frontend)

```javascript
// 1. Khởi tạo AudioContext
const audioContext = new AudioContext({ sampleRate: 16000 });

// 2. Lấy stream từ microphone
const stream = await navigator.mediaDevices.getUserMedia({
  audio: {
    channelCount: 1, // Mono
    sampleRate: 16000,
    sampleSize: 16,
  },
});

// 3. Xử lý audio qua AudioWorklet
const workletNode = new AudioWorkletNode(audioContext, 'audio-recorder');
workletNode.port.onmessage = (e) => {
  // Thu thập audio chunks
  chunks.push(e.data);
};
```

### 2. Chuyển đổi và gửi dữ liệu

```javascript
// 1. Kết hợp audio chunks
const audioData = new Float32Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));

// 2. Chuyển đổi sang WAV format
const wavBlob = convertToWav(audioData); // RIFF header + PCM data

// 3. Gửi lên server
const formData = new FormData();
formData.append('audio_file', wavBlob, 'audio.wav');
const response = await axios.post('http://localhost:8000/predict', formData);
```

### 3. Xử lý server (Backend)

```python
# 1. Nhận và kiểm tra file
@app.post("/predict")
async def predict(audio_file: UploadFile):
    # Kiểm tra độ dài tối thiểu (1.5s)
    if file_size < 16000 * 2 * 1.5:
        raise ValueError("File quá ngắn")

# 2. Tiền xử lý audio
audio, sr = librosa.load(audio_path, sr=16000)
audio = librosa.util.normalize(audio)

# 3. Dự đoán với model
predictions = model.predict(audio)
```

### 4. Phản hồi và hiển thị

```javascript
// 1. Nhận kết quả từ server
const result = {
  predicted_class: 'command_name',
  confidence: 0.95,
  top3_predictions: [
    ['command1', 0.95],
    ['command2', 0.03],
    ['command3', 0.02],
  ],
};

// 2. Hiển thị waveform
wavesurfer.load(audioUrl);

// 3. Hiển thị kết quả với màu sắc tương ứng
<div className={`prediction__command ${getConfidenceClass(confidence)}`}>
  {predicted_class}
  <span className="prediction__confidence">{(confidence * 100).toFixed(2)}%</span>
</div>;
```

## Cài đặt

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
cd api
python server.py
```

## Cấu trúc thư mục

```
.
├── frontend/
│   ├── public/
│   │   └── audio-processor.js    # Audio worklet processor
│   ├── src/
│   │   ├── App.jsx              # Main React component
│   │   └── App.css              # Styles
│   └── package.json
│
└── backend/
    ├── api/
    │   └── server.py            # FastAPI server
    ├── core/
    │   └── audio_command_detector.py  # Model và xử lý audio
    └── requirements.txt
```

## Công nghệ sử dụng

- Frontend: React, WaveSurfer.js, Web Audio API
- Backend: FastAPI, TensorFlow
- Audio Processing: librosa, soundfile
