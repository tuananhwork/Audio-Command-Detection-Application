import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Header from './components/Header';
import ControlPanel from './components/ControlPanel';
import Results from './components/Results';
import WakeWordListener from './components/WakeWordListener';
import { AUDIO_CONFIG } from './constants/audio';
import { createAudioContext, convertToWav } from './utils/audio';
import './App.css';

function App() {
  const [audioState, setAudioState] = useState({
    url: null,
    blob: null,
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [showKeyboardHint, setShowKeyboardHint] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const mediaRecorderRef = React.useRef(null);

  // Toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.body.classList.toggle('dark-mode');
  };

  // Keyboard event listener
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.code === 'Space' && !recording && !loading) {
        e.preventDefault();
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

  const startRecording = async () => {
    setResult(null);
    setAudioState({ url: null, blob: null });
    setRecording(true);
    setCountdown(AUDIO_CONFIG.RECORDING_DURATION);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: AUDIO_CONFIG.CHANNEL_COUNT,
          sampleRate: AUDIO_CONFIG.SAMPLE_RATE,
          sampleSize: AUDIO_CONFIG.SAMPLE_SIZE,
        },
      });

      const audioContext = createAudioContext();
      const source = audioContext.createMediaStreamSource(stream);

      await audioContext.audioWorklet.addModule('audio-processor.js');
      const workletNode = new AudioWorkletNode(audioContext, 'audio-recorder');

      const chunks = [];
      const totalSamples = AUDIO_CONFIG.SAMPLE_RATE * AUDIO_CONFIG.RECORDING_DURATION;
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
      setResult({
        status: 'error',
        message: 'Cannot access microphone',
        data: {
          predicted_class: 'error',
          confidence: 0,
          top3_predictions: [],
          command_status: 'error',
          command_error: 'Cannot access microphone',
        },
      });
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
    setAudioState({
      url: URL.createObjectURL(wavBlob),
      blob: wavBlob,
    });

    handleUpload(wavBlob);

    mediaRecorderRef.current = null;
  };

  const handleUpload = async (blob = audioState.blob) => {
    if (!blob) return;
    setLoading(true);
    setResult(null);
    const formData = new FormData();
    formData.append('audio_file', blob, 'audio.wav');
    try {
      const res = await axios.post('http://localhost:8000/predict', formData, {
        timeout: AUDIO_CONFIG.API_TIMEOUT,
      });
      console.log('✅ Received result from server:', res.data);
      setResult(res.data);
    } catch (err) {
      console.error('❌ Error processing audio:', err);
      let errorMessage = 'An error occurred while processing audio';

      if (err.code === 'ERR_NETWORK') {
        errorMessage = 'Cannot connect to server. Please check your connection or try again later.';
      } else if (err.response) {
        if (err.response.data?.command_error) {
          if (
            err.response.data.command_error.includes('Connection to') &&
            err.response.data.command_error.includes('timed out')
          ) {
            errorMessage =
              'Cannot connect to device. Please check:\n' +
              '1. Is the device powered on?\n' +
              '2. Is the device IP address correct?\n' +
              '3. Is there network connectivity between computer and device?';
          } else {
            errorMessage = err.response.data.command_error;
          }
        } else {
          errorMessage = err.response.data?.detail || err.response.data?.message || err.message;
        }
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

  const handleWakeWordDetected = useCallback(() => {
    if (!recording && !loading) {
      console.log('Wake word detected! Starting recording...');
      startRecording();
    }
  }, [recording, loading, startRecording]);

  return (
    <div className={`app ${isDarkMode ? 'dark-mode' : ''}`}>
      <Header isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />
      <WakeWordListener onWakeWordDetected={handleWakeWordDetected} />
      <ControlPanel
        onRecord={recording ? stopRecording : startRecording}
        recording={recording}
        countdown={countdown}
        loading={loading}
        audioUrl={audioState.url}
        showKeyboardHint={showKeyboardHint}
      />
      <Results result={result} loading={loading} />
    </div>
  );
}

export default App;
