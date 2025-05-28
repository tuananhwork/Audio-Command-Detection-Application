from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import tempfile
import os
import shutil
import logging
import requests
from audio_command_detector import AudioCommandDetector

# ESP32 IP CONFIG
ESP32_IP = "10.42.0.120"

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Audio Command Detection API",
    description="API for detecting voice commands using machine learning",
    version="1.0.0"
)

# CORS configuration
origins = [
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize detector
detector = AudioCommandDetector()


def send_command_to_esp32(command: str):
    """
    Send JSON POST command to ESP32
    """
    try:
        url = f"http://{ESP32_IP}/command"
        payload = {"cmd": command}
        res = requests.post(url, json=payload, timeout=3)

        if res.status_code == 200:
            logger.info(f"✅ Successfully sent command '{command}' to ESP32.")
        else:
            logger.warning(f"⚠️ ESP32 returned error {res.status_code}: {res.text}")
    except requests.exceptions.RequestException as e:
        logger.error(f"❌ Error sending command to ESP32: {e}")


@app.get("/")
def read_root():
    return {"message": "Hello from FastAPI"}


@app.post("/predict")
async def predict(audio_file: UploadFile = File(...)):
    try:
        # Save temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            shutil.copyfileobj(audio_file.file, tmp)
            temp_file_path = tmp.name

        # Check minimum length
        if os.path.getsize(temp_file_path) < 16000 * 2 * 1.5:
            raise ValueError("Audio file too short. Minimum 1.5 seconds required.")

        # Predict
        result = detector.predict(temp_file_path)
        predicted_class = result["data"]["predicted_class"]
        confidence = float(result["data"]["confidence"])

        logger.info(f"🎧 Prediction: {predicted_class} (confidence: {confidence:.2f})")

        # Only send if model is confident
        if confidence >= 0.85:
            send_command_to_esp32(predicted_class)
        else:
            logger.warning("🤔 Low confidence, not sending command to ESP32.")

        return {
            "status": "success",
            "data": {
                "predicted_class": predicted_class,
                "confidence": confidence,
                "top3_predictions": result["data"]["top3_predictions"],
                "waveform": result["data"]["waveform"]
            }
        }

    except Exception as e:
        logger.error(f"❌ Error in predict endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        if 'temp_file_path' in locals() and os.path.exists(temp_file_path):
            os.unlink(temp_file_path)


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
