import numpy as np
import librosa
import soundfile as sf

def process_audio_file(audio_path, target_sr=16000):
    """
    Process audio file: load, resample, and normalize
    """
    try:
        # Load audio file
        audio, sr = librosa.load(audio_path, sr=target_sr, mono=True)
        
        # Ensure audio is 1D array
        if len(audio.shape) > 1:
            audio = audio.mean(axis=1)
        
        # Normalize audio
        audio = librosa.util.normalize(audio)
        
        # Ensure minimum length (1.5 seconds)
        min_length = int(1.5 * target_sr)
        if len(audio) < min_length:
            # Pad with zeros if too short
            audio = np.pad(audio, (0, min_length - len(audio)))
        else:
            # Trim to 3 seconds if too long
            audio = audio[:int(3 * target_sr)]
        
        return audio
    except Exception as e:
        print(f"Error processing audio file: {str(e)}")
        raise

def extract_mel_spectrogram(audio, sr=16000, n_mels=128, n_fft=2048, hop_length=512):
    """
    Extract mel spectrogram from audio
    """
    try:
        # Ensure audio is 1D array
        if len(audio.shape) > 1:
            audio = audio.mean(axis=1)
        
        # Compute mel spectrogram
        mel_spec = librosa.feature.melspectrogram(
            y=audio,
            sr=sr,
            n_mels=n_mels,
            n_fft=n_fft,
            hop_length=hop_length,
            fmin=20,
            fmax=8000
        )
        
        # Convert to log scale
        mel_spec_db = librosa.power_to_db(mel_spec, ref=np.max)
        
        # Normalize to [0, 1]
        mel_spec_norm = (mel_spec_db - mel_spec_db.min()) / (mel_spec_db.max() - mel_spec_db.min() + 1e-8)
        
        return mel_spec_norm
    except Exception as e:
        print(f"Error extracting mel spectrogram: {str(e)}")
        raise 