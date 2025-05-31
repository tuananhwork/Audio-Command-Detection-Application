from fastapi import FastAPI, UploadFile, File, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import tempfile
import os
import shutil
import logging
import requests
from audio_command_detector import AudioCommandDetector
from pydantic import BaseModel

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

class CommandRequest(BaseModel):
    command: str

def send_command_to_esp32(command: str):
    """
    Send JSON POST command to ESP32
    """
    try:
        url = f"http://{ESP32_IP}/command"
        payload = {"cmd": command}
        res = requests.post(url, json=payload, timeout=1.5)
        res.raise_for_status()  # Raise exception for bad status codes
        logger.info(f"✅ Successfully sent command '{command}' to ESP32.")
        return True
    except requests.exceptions.RequestException as e:
        logger.error(f"❌ Error sending command to ESP32: {e}")
        raise  # Re-raise the exception to be handled by the caller


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

        # Gửi lệnh đến ESP32 nếu độ tin cậy cao và không phải unknown
        command_status = "not_sent"
        command_error = None
        command_reason = None
        if predicted_class == "unknown":
            command_status = "not_sent"
            command_reason = "Command not recognized"
            logger.warning("⚠️ Unknown command detected, not sending to ESP32")
        elif confidence < 0.8:
            command_status = "not_sent" 
            command_reason = f"Low confidence ({confidence:.2f})"
            logger.warning(f"⚠️ Low confidence ({confidence:.2f}), not sending command to ESP32")
        else:
            try:
                send_command_to_esp32(predicted_class)
                command_status = "sent"
                logger.info(f"✅ Command '{predicted_class}' sent to ESP32")
            except Exception as e:
                command_status = "error"
                command_error = str(e)
                logger.error(f"❌ Error sending command to ESP32: {e}")

        return {
            "status": "success",
            "data": {
                "predicted_class": predicted_class,
                "confidence": confidence,
                "top3_predictions": result["data"]["top3_predictions"],
                "waveform": result["data"]["waveform"],
                "command_status": command_status,
                "command_error": command_error,
                "command_reason": command_reason
            }
        }

    except Exception as e:
        logger.error(f"❌ Error in predict endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        if 'temp_file_path' in locals() and os.path.exists(temp_file_path):
            os.unlink(temp_file_path)


@app.post("/send-command")
async def send_command(command_request: CommandRequest):
    try:
        send_command_to_esp32(command_request.command)
        return {"status": "success", "message": f"Command '{command_request.command}' sent successfully"}
    except Exception as e:
        logger.error(f"❌ Error sending command: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
