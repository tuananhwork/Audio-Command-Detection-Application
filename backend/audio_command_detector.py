import os
import numpy as np
import webrtcvad
import noisereduce as nr
from scipy.io import wavfile
from pydub import AudioSegment
import librosa
import torch
import torch.nn as nn
import tensorflow as tf
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

class AudioPreprocessor:
    def __init__(self):
        self.vad = webrtcvad.Vad(2)
        self.target_sr = 16000
        self.frame_duration_ms = 30
        
    def load_audio(self, input_path):
        """Load and convert audio to mono 16kHz"""
        audio = AudioSegment.from_wav(input_path).set_channels(1).set_frame_rate(self.target_sr)
        raw_audio = np.array(audio.get_array_of_samples())
        rate = audio.frame_rate
        return raw_audio, rate
        
    def denoise(self, audio, sr):
        """Apply noise reduction"""
        denoised = nr.reduce_noise(y=audio.astype(np.float32), sr=sr)
        if sr != self.target_sr:
            denoised = librosa.resample(denoised, orig_sr=sr, target_sr=self.target_sr)
        return denoised, self.target_sr
        
    def apply_vad(self, audio, sr):
        """Apply Voice Activity Detection"""
        frame_length = int(sr * self.frame_duration_ms / 1000)
        frames = [audio[i:i+frame_length] for i in range(0, len(audio) - frame_length, frame_length)]

        def is_speech(frame):
            int16_frame = (frame * 32768).astype(np.int16)
            return self.vad.is_speech(int16_frame.tobytes(), sr)

        flags = [is_speech(frame) for frame in frames]
        speech_mask = np.repeat(flags, frame_length)
        speech_mask = np.pad(speech_mask, (0, len(audio) - len(speech_mask)), mode='constant')
        return audio * speech_mask
        
    def extract_high_energy_segment(self, audio, sr, window_sec=1.5, stride_ratio=0.2):
        """Extract segment with highest energy"""
        window_len = int(window_sec * sr)
        stride = int(stride_ratio * sr)

        max_energy = 0
        best_segment = None
        for i in range(0, len(audio) - window_len, stride):
            window = audio[i:i+window_len]
            energy = np.sum(window.astype(np.float32)**2)
            if energy > max_energy:
                max_energy = energy
                best_segment = window
                
        return best_segment
        
    def extract_one_second(self, audio, sr):
        """Extract 1 second with highest energy"""
        segment_len = int(1.0 * sr)
        stride = int(0.02 * sr)

        max_energy = 0
        best_start = 0
        for i in range(0, len(audio) - segment_len + 1, stride):
            window = audio[i:i + segment_len]
            energy = np.sum(window.astype(np.float32) ** 2)
            if energy > max_energy:
                max_energy = energy
                best_start = i

        return audio[best_start:best_start + segment_len]
        
    def normalize_audio(self, audio):
        """Apply peak normalization"""
        max_val = np.max(np.abs(audio))
        if max_val > 0:
            audio = audio / max_val * 0.99
        return (audio * 32767).astype(np.int16)
        
    def process_audio_file(self, input_path, output_path=None):
        """Main processing pipeline"""
        # Load audio
        raw_audio, rate = self.load_audio(input_path)
        
        # Denoise
        denoised_audio, rate = self.denoise(raw_audio, rate)
        
        # VAD
        speech_audio = self.apply_vad(denoised_audio, rate)
        
        # Extract high energy segment
        best_segment = self.extract_high_energy_segment(speech_audio, rate)
        
        # Get 1 second segment
        one_sec_segment = self.extract_one_second(best_segment, rate)
        
        # Normalize
        final_output = self.normalize_audio(one_sec_segment)
        
        # Save if output path is provided
        if output_path:
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            wavfile.write(output_path, rate, final_output)
        
        return final_output, rate

class AudioCommandDetector:
    def __init__(self):
        # Load the model
        model_path = Path(__file__).parent / "audio_classifier_best.pth"
        self.model = self._init_model()
        self.model.load_state_dict(torch.load(model_path, map_location='cpu'))
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model = self.model.to(self.device)
        self.model.eval()
        
        # Định nghĩa classes
        self.classes = ['bat_den', 'bat_dieu_hoa', 'bat_quat', 'bat_tv',
                        'do_am', 'dong_rem', 'mo_rem', 'nhiet_do',
                        'tat_den', 'tat_dieu_hoa', 'tat_quat', 'tat_tv', 
                        'unknown']
        
        # Khởi tạo AudioPreprocessor
        self.audio_processor = AudioPreprocessor()

    def _init_model(self):
        """Khởi tạo model ConvMixer"""
        class Residual(nn.Module):
            def __init__(self, fn):
                super().__init__()
                self.fn = fn
            def forward(self, x):
                return self.fn(x) + x

        def ConvMixer(dim, depth, kernel_size=9, patch_size=7, n_classes=13):
            return nn.Sequential(
                nn.Conv2d(1, dim, kernel_size=patch_size, stride=patch_size),
                nn.GELU(),
                nn.BatchNorm2d(dim),
                *[nn.Sequential(
                    Residual(nn.Sequential(
                        nn.Conv2d(dim, dim, kernel_size=kernel_size, groups=dim, padding="same"),
                        nn.GELU(),
                        nn.BatchNorm2d(dim)
                    )),
                    nn.Conv2d(dim, dim, kernel_size=1),
                    nn.GELU(),
                    nn.BatchNorm2d(dim)
                ) for i in range(depth)],
                nn.AdaptiveAvgPool2d((1, 1)),
                nn.Flatten(),
                nn.Linear(dim, n_classes)
            )
        
        return ConvMixer(dim=256, depth=8, n_classes=13)

    def preprocess_audio(self, input_path, output_path=None):
        """Tiền xử lý âm thanh sử dụng AudioPreprocessor"""
        return self.audio_processor.process_audio_file(input_path, output_path)

    def extract_mel_spectrogram(self, audio_data, sr=16000, n_mels=128, n_fft=2048, hop_length=128):
        mel_spec = librosa.feature.melspectrogram(
            y=audio_data.astype(np.float32), 
            sr=sr,
            n_mels=n_mels,
            n_fft=n_fft,
            hop_length=hop_length,
            fmin=20,
            fmax=sr/2,
            power=2.0
        )
        mel_spec_db = librosa.power_to_db(mel_spec, ref=np.max)
        mel_spec_norm = (mel_spec_db - mel_spec_db.min()) / (mel_spec_db.max() - mel_spec_db.min())
        mel_spec_norm = tf.image.resize(mel_spec_norm[..., np.newaxis], (128, 32))
        mel_spec_norm = mel_spec_norm.numpy()
        mel_spec_norm = mel_spec_norm[..., 0]
        return mel_spec_norm

    def predict(self, audio_file_path):
        try:
            preprocessed_audio, sr = self.preprocess_audio(audio_file_path)
            mel_spec = self.extract_mel_spectrogram(preprocessed_audio, sr)
            features = torch.FloatTensor(mel_spec).unsqueeze(0).unsqueeze(0).to(self.device)
            with torch.no_grad():
                outputs = self.model(features)
                probabilities = torch.softmax(outputs, dim=1)
                predicted_class = torch.argmax(outputs, dim=1).item()
                confidence = probabilities[0][predicted_class].item()
            top3_prob, top3_indices = torch.topk(probabilities[0], 3)
            top3_predictions = [(self.classes[idx], prob.item()) for idx, prob in zip(top3_indices, top3_prob)]
            waveform_data = preprocessed_audio.tolist()
            return {
                'status': 'success',
                'data': {
                    'predicted_class': self.classes[predicted_class],
                    'confidence': confidence,
                    'top3_predictions': top3_predictions,
                    'waveform': waveform_data
                }
            }
        except Exception as e:
            logger.error(f"Error in prediction: {str(e)}")
            raise e
