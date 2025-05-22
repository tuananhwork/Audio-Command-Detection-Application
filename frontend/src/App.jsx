import React, { useRef, useState, useEffect } from 'react';
import axios from 'axios';
import WaveSurfer from 'wavesurfer.js';
import './App.css';

// Audio recording utilities
const createAudioContext = () => {
  return new (window.AudioContext || window.webkitAudioContext)({
    sampleRate: 16000,
  });
};

const convertToWav = (audioData) => {
  const numChannels = 1;
  const sampleRate = 16000;
  const format = 1; // PCM
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const numSamples = audioData.length;

  const buffer = new ArrayBuffer(44 + numSamples * bytesPerSample);
  const view = new DataView(buffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // RIFF chunk length
  view.setUint32(4, 36 + numSamples * bytesPerSample, true);
  // RIFF type
  writeString(view, 8, 'WAVE');
  // format chunk identifier
  writeString(view, 12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (raw)
  view.setUint16(20, format, true);
  // channel count
  view.setUint16(22, numChannels, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * blockAlign, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, blockAlign, true);
  // bits per sample
  view.setUint16(34, bitDepth, true);
  // data chunk identifier
  writeString(view, 36, 'data');
  // data chunk length
  view.setUint32(40, numSamples * bytesPerSample, true);

  // Write the PCM samples
  const offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const sample = Math.max(-1, Math.min(1, audioData[i]));
    const value = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    view.setInt16(offset + i * bytesPerSample, value, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
};

const writeString = (view, offset, string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

function App() {
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const mediaRecorderRef = useRef(null);
  const [recording, setRecording] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Thêm refs cho waveform
  const originalWaveformRef = useRef(null);
  const wavesurferRef = useRef(null);

  // Khởi tạo WaveSurfer khi component mount
  useEffect(() => {
    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
      }
    };
  }, []);

  // Khởi tạo WaveSurfer cho original audio
  useEffect(() => {
    if (audioUrl && originalWaveformRef.current) {
      // Destroy existing instance if any
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
      }

      wavesurferRef.current = WaveSurfer.create({
        container: originalWaveformRef.current,
        waveColor: '#4a9eff',
        progressColor: '#2c3e50',
        cursorColor: '#2c3e50',
        barWidth: 2,
        barRadius: 3,
        responsive: true,
        height: 100,
        normalize: true,
      });

      wavesurferRef.current.load(audioUrl);
    }
  }, [audioUrl]);

  const startRecording = async () => {
    setResult(null);
    setAudioUrl(null);
    setAudioBlob(null);
    setRecording(true);
    setCountdown(3);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          sampleSize: 16,
        },
      });

      const audioContext = createAudioContext();
      const source = audioContext.createMediaStreamSource(stream);

      // Create audio worklet
      await audioContext.audioWorklet.addModule('audio-processor.js');
      const workletNode = new AudioWorkletNode(audioContext, 'audio-recorder');

      const chunks = [];
      const duration = 3; // 3 seconds
      const totalSamples = 16000 * duration;
      let recordedSamples = 0;

      workletNode.port.onmessage = (e) => {
        if (recordedSamples < totalSamples) {
          const inputData = e.data;
          const samplesToRecord = Math.min(inputData.length, totalSamples - recordedSamples);
          chunks.push(inputData.slice(0, samplesToRecord));
          recordedSamples += samplesToRecord;

          if (recordedSamples >= totalSamples) {
            stopRecording();
          }
        }
      };

      source.connect(workletNode);
      workletNode.connect(audioContext.destination);

      mediaRecorderRef.current = {
        stream,
        source,
        workletNode,
        chunks,
      };

      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setRecording(false);
      setResult({ status: 'error', message: 'Không thể truy cập microphone' });
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current) return;

    setRecording(false);
    const { stream, source, workletNode, chunks } = mediaRecorderRef.current;

    source.disconnect();
    workletNode.disconnect();
    stream.getTracks().forEach((track) => track.stop());

    const audioData = new Float32Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
    let offset = 0;
    for (const chunk of chunks) {
      audioData.set(chunk, offset);
      offset += chunk.length;
    }

    const wavBlob = convertToWav(audioData);
    setAudioBlob(wavBlob);
    setAudioUrl(URL.createObjectURL(wavBlob));

    handleUpload(wavBlob);

    mediaRecorderRef.current = null;
  };

  const handleUpload = async (blob = audioBlob) => {
    if (!blob) return;
    setLoading(true);
    setResult(null);
    const formData = new FormData();
    formData.append('audio_file', blob, 'audio.wav');
    try {
      const res = await axios.post('http://localhost:8000/predict', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);
    } catch (err) {
      setResult({ status: 'error', message: err.message });
    }
    setLoading(false);
  };

  const getConfidenceClass = (confidence) => {
    if (confidence >= 0.8) return 'confidence--high';
    if (confidence >= 0.6) return 'confidence--medium';
    return 'confidence--low';
  };

  return (
    <div className="app">
      <h1 className="app__title">Audio Command Detector</h1>

      <div className="control-panel">
        <button
          className={`btn btn--record ${loading ? 'disabled' : ''}`}
          onClick={recording ? stopRecording : startRecording}
          disabled={loading}
        >
          {recording ? `Đang ghi... (${countdown}s)` : 'Ghi âm (3s)'}
        </button>

        {audioUrl && (
          <div className="audio-container">
            <div className="visualization-section">
              <h3 className="visualization-title">Original Audio</h3>
              <div ref={originalWaveformRef} className="waveform" />
            </div>
            <audio src={audioUrl} controls className="audio-player" />
          </div>
        )}
      </div>

      {result && (
        <div className="results">
          {result.status === 'success' ? (
            <>
              <div className="results__section">
                <h2 className="results__title">Lệnh dự đoán</h2>
                <div className="prediction">
                  <div className={`prediction__command ${getConfidenceClass(result.data.confidence)}`}>
                    {result.data.predicted_class}
                    <span className="prediction__confidence">{(result.data.confidence * 100).toFixed(2)}%</span>
                  </div>
                </div>
              </div>

              <div className="results__section">
                <h2 className="results__title">Top 3 dự đoán</h2>
                <ul className="top-predictions">
                  {result.data.top3_predictions.map(([command, confidence], index) => (
                    <li key={index} className="top-predictions__item">
                      <span className="top-predictions__command">{command}</span>
                      <span className="top-predictions__confidence">{(confidence * 100).toFixed(2)}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <div className="error">Lỗi: {result.message}</div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
