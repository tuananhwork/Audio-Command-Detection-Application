from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import tempfile
import os
import sys
import shutil

# Thêm đường dẫn để import từ thư mục core
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, parent_dir)  # Thêm vào đầu danh sách path

from core.audio_command_detector import AudioCommandDetector

app = FastAPI(title="Audio Command Detection API")

# Cấu hình CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Trong môi trường production nên giới hạn origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Khởi tạo detector
detector = AudioCommandDetector()

@app.post("/predict")
async def predict(audio_file: UploadFile = File(...)):
    # Create a temporary file
    temp_file_path = f"temp_{audio_file.filename}"
    try:
        # Save uploaded file temporarily
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(audio_file.file, buffer)
        
        # Check file size (minimum 1.5 seconds)
        if os.path.getsize(temp_file_path) < 16000 * 2 * 1.5:  # 1.5s * 16kHz * 2 bytes
            raise ValueError("File âm thanh quá ngắn. Yêu cầu tối thiểu 1.5 giây.")
        
        # Get prediction
        result = detector.predict(temp_file_path)
        
        return {
            "status": "success",
            "data": {
                "predicted_class": result["data"]["predicted_class"],
                "confidence": float(result["data"]["confidence"]),
                "top3_predictions": result["data"]["top3_predictions"]
            }
        }
    except Exception as e:
        print(f"Error in predict endpoint: {str(e)}")
        return {"status": "error", "message": str(e)}
    finally:
        # Clean up temporary file
        if 'temp_file_path' in locals():
            try:
                os.unlink(temp_file_path)
            except:
                pass

@app.get("/health")
async def health_check():
    """
    Kiểm tra trạng thái server
    """
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000) 