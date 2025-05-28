import React, { useRef, useState, useEffect } from 'react';
import axios from 'axios';
import WaveSurfer from 'wavesurfer.js';
import './App.css';

// Command mapping from no-diacritics to full Vietnamese
const commandMapping = {
  bat_den: 'Bật đèn',
  bat_dieu_hoa: 'Bật điều hòa',
  bat_quat: 'Bật quạt',
  bat_tv: 'Bật TV',
  do_am: 'Độ ẩm',
  dong_rem: 'Đóng rèm',
  mo_rem: 'Mở rèm',
  nhiet_do: 'Nhiệt độ',
  tat_den: 'Tắt đèn',
  tat_dieu_hoa: 'Tắt điều hòa',
  tat_quat: 'Tắt quạt',
  tat_tv: 'Tắt TV',
  unknown: 'Unknown',
};

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
  const [showKeyboardHint, setShowKeyboardHint] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Thêm refs cho waveform
  const originalWaveformRef = useRef(null);
  const wavesurferRef = useRef(null);

  // Toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.body.classList.toggle('dark-mode');
  };

  // Keyboard event listener
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.code === 'Space' && !recording && !loading) {
        e.preventDefault(); // Prevent page scroll
        startRecording();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [recording, loading]);

  // Hide keyboard hint after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowKeyboardHint(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

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
      setResult({ status: 'error', message: 'Cannot access microphone' });
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
      // Gửi file âm thanh để dự đoán và gửi lệnh
      const res = await axios.post('http://localhost:8000/predict', formData, {
        timeout: 30000,
      });
      console.log('✅ Received result from server:', res.data);
      setResult(res.data);
    } catch (err) {
      console.error('❌ Error processing audio:', err);
      let errorMessage = 'An error occurred while processing audio';
      if (err.code === 'ERR_NETWORK') {
        errorMessage = 'Cannot connect to server. Please check your connection or try again later.';
      } else if (err.response) {
        errorMessage = err.response.data?.detail || err.response.data?.message || err.message;
      }
      setResult({
        status: 'error',
        message: errorMessage,
        data: {
          predicted_class: 'error',
          confidence: 0,
          top3_predictions: [],
          command_status: 'error',
          command_error: errorMessage,
        },
      });
    }
    setLoading(false);
  };

  const getConfidenceClass = (confidence) => {
    if (confidence >= 0.8) return 'confidence--high';
    if (confidence >= 0.6) return 'confidence--medium';
    return 'confidence--low';
  };

  // Thêm hàm để xác định class cho prediction command
  const getPredictionClass = (predictedClass, confidence) => {
    if (predictedClass === 'unknown') return 'prediction__command--unknown';
    return getConfidenceClass(confidence);
  };

  // Thêm hàm để hiển thị trạng thái gửi lệnh
  const getCommandStatusText = (result) => {
    if (!result?.data?.command_status) return null;
    switch (result.data.command_status) {
      case 'sent':
        return '✅ Command sent successfully';
      case 'error':
        return `❌ Error: ${result.data.command_error || 'Unable to send command to ESP32'}`;
      case 'not_sent':
        return `⚠️ ${result.data.command_reason || 'Command not sent'}`;
      default:
        return null;
    }
  };

  return (
    <div className={`app ${isDarkMode ? 'dark-mode' : ''}`}>
      <div className="header">
        <h1 className="app__title">Audio Command Detector</h1>
        <button
          className="theme-toggle"
          onClick={toggleDarkMode}
          aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDarkMode ? '☀️' : '🌙'}
        </button>
      </div>

      <div className="control-panel">
        <button
          className={`btn btn--record ${loading ? 'disabled' : ''} ${recording ? 'recording' : ''}`}
          onClick={recording ? stopRecording : startRecording}
          disabled={loading || recording}
        >
          {recording ? `Recording... (${countdown}s)` : 'Record (3s)'}
          {showKeyboardHint && !recording && <span className="keyboard-hint">Press Space to record</span>}
        </button>

        {audioUrl && (
          <div className="audio-container animate-in">
            <div className="visualization-section">
              <h3 className="visualization-title">Original Audio</h3>
              <div ref={originalWaveformRef} className="waveform" />
            </div>
            <audio src={audioUrl} controls className="audio-player" />
          </div>
        )}
      </div>

      <div className="results animate-in">
        {result && (
          <>
            <div className="results__section">
              <h2 className="results__title">Predicted Command</h2>
              <div className="prediction">
                <div
                  className={`prediction__command ${getPredictionClass(
                    result.data.predicted_class,
                    result.data.confidence
                  )} animate-in`}
                >
                  {result.data.predicted_class === 'unknown' ? (
                    <>
                      <span className="unknown-icon">❓</span>
                      {commandMapping[result.data.predicted_class]}
                    </>
                  ) : (
                    commandMapping[result.data.predicted_class] || result.data.predicted_class
                  )}
                  <span className="prediction__confidence">{(result.data.confidence * 100).toFixed(2)}%</span>
                </div>
                {getCommandStatusText(result) && (
                  <div className={`prediction__status ${result.data.command_status}`}>
                    {getCommandStatusText(result)}
                  </div>
                )}
              </div>
            </div>

            <div className="results__section">
              <h2 className="results__title">Top 3 Predictions</h2>
              <ul className="top-predictions">
                {result.data.top3_predictions.map(([command, confidence], index) => (
                  <li
                    key={index}
                    className="top-predictions__item animate-in"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <span className="top-predictions__command">{commandMapping[command] || command}</span>
                    <span className="top-predictions__confidence">{(confidence * 100).toFixed(2)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        <div className="results__section">
          <h2 className="results__title">Supported Commands</h2>
          <div className="command-list">
            {Object.entries(commandMapping)
              .filter(([key]) => key !== 'unknown')
              .map(([key, command], index) => (
                <div key={key} className="command-item animate-in" style={{ animationDelay: `${index * 0.05}s` }}>
                  <span className="command-number">{index + 1}.</span>
                  <span className="command-text">{command}</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {loading && (
        <div className="loading-container animate-in">
          <div className="loading-spinner"></div>
          <p>Processing...</p>
        </div>
      )}
    </div>
  );
}

export default App;
