import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import Header from './components/Header';
import ControlPanel from './components/ControlPanel';
import Results from './components/Results';
import WakewordListener from './components/WakewordListener';
import { AUDIO_CONFIG } from './constants/audio';
import { createAudioContext, convertToWav } from './utils/audio';
import { getErrorMessage } from './utils/helpers';
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
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode ? JSON.parse(savedMode) : false;
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const mediaRecorderRef = useRef(null);
  const countdownTimerRef = useRef(null);
  const startTimeRef = useRef(null);

  const handleUpload = async (blob = audioState.blob) => {
    if (!blob) return;
    setLoading(true);
    setIsProcessing(true);
    setResult(null);
    const formData = new FormData();
    formData.append('audio_file', blob, 'audio.wav');
    try {
      const res = await axios.post('http://localhost:8000/predict', formData, {
        timeout: AUDIO_CONFIG.API_TIMEOUT,
      });
      console.log('✅ Command result:', res.data);
      setResult(res.data);
    } catch (err) {
      console.error('❌ Command error:', getErrorMessage(err));
      setResult({
        status: 'error',
        message: getErrorMessage(err),
        data: {
          predicted_class: 'error',
          confidence: 0,
          top3_predictions: [],
          command_status: 'error',
          command_error: getErrorMessage(err),
        },
      });
    }
    setLoading(false);
    setIsProcessing(false);
  };

  const stopRecording = async () => {
    if (!mediaRecorderRef.current) return;

    // Clear countdown timer
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }

    setRecording(false);
    const { stream, source, workletNode, chunks } = mediaRecorderRef.current;

    // Disconnect audio nodes
    source.disconnect();
    workletNode.disconnect();
    stream.getTracks().forEach((track) => track.stop());

    // Combine audio chunks
    const audioData = new Float32Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
    let offset = 0;
    for (const chunk of chunks) {
      audioData.set(chunk, offset);
      offset += chunk.length;
    }

    // Convert to WAV and update state
    const wavBlob = convertToWav(audioData);
    setAudioState({
      url: URL.createObjectURL(wavBlob),
      blob: wavBlob,
    });

    // Upload audio
    await handleUpload(wavBlob);

    // Cleanup
    mediaRecorderRef.current = null;
    startTimeRef.current = null;
  };

  const startRecording = useCallback(async () => {
    // Reset states
    setResult(null);
    setAudioState({ url: null, blob: null });
    setRecording(true);
    setCountdown(AUDIO_CONFIG.RECORDING_DURATION);

    try {
      // Get audio stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: AUDIO_CONFIG.CHANNEL_COUNT,
          sampleRate: AUDIO_CONFIG.SAMPLE_RATE,
          sampleSize: AUDIO_CONFIG.SAMPLE_SIZE,
        },
      });

      // Setup audio context and nodes
      const audioContext = createAudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      await audioContext.audioWorklet.addModule('audio-processor.js');
      const workletNode = new AudioWorkletNode(audioContext, 'audio-recorder');

      // Initialize recording
      const chunks = [];
      const totalSamples = AUDIO_CONFIG.SAMPLE_RATE * AUDIO_CONFIG.RECORDING_DURATION;
      let recordedSamples = 0;

      // Handle audio data
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

      // Connect audio nodes
      source.connect(workletNode);
      workletNode.connect(audioContext.destination);

      // Store references
      mediaRecorderRef.current = {
        stream,
        source,
        workletNode,
        chunks,
      };

      // Start countdown timer
      startTimeRef.current = Date.now();
      countdownTimerRef.current = setInterval(() => {
        const elapsedTime = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const remainingTime = Math.max(0, AUDIO_CONFIG.RECORDING_DURATION - elapsedTime);
        setCountdown(remainingTime);

        if (remainingTime === 0) {
          stopRecording();
        }
      }, 100); // Update every 100ms for smoother countdown
    } catch (err) {
      console.error('❌ Microphone error:', err);
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
  }, []);

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', JSON.stringify(newMode));
  };

  // Initialize dark mode on mount
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [isDarkMode]);

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
  }, [recording, loading, startRecording]);

  // Hide keyboard hint after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowKeyboardHint(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
      if (mediaRecorderRef.current) {
        stopRecording();
      }
    };
  }, []);

  return (
    <div className={`app ${isDarkMode ? 'dark-mode' : ''}`}>
      <Header isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />
      <div>
        <WakewordListener onWakewordDetected={startRecording} isRecording={recording} isProcessing={isProcessing} />
      </div>
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
