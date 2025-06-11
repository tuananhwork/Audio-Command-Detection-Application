import React, { useEffect } from 'react';
import { useWakewordDetection } from '../hooks/useWakewordDetection';
import ListeningLoader from './ListeningLoader';

const MODEL_URL = window.location.origin + '/models/wakeword/';

export default function WakewordListener({ onWakewordDetected, isRecording, isProcessing }) {
  const { isModelLoaded, isListening, startListening, stopListening, resetRecordingState } =
    useWakewordDetection(onWakewordDetected);

  // Stop listening when recording or processing starts
  useEffect(() => {
    if (isRecording || isProcessing) {
      stopListening();
    }
  }, [isRecording, isProcessing, stopListening]);

  // Start listening after recording and processing
  useEffect(() => {
    let timeoutId = null;

    if (isModelLoaded && !isRecording && !isProcessing && !isListening) {
      // Wait 1 second before starting to listen again
      timeoutId = setTimeout(() => {
        resetRecordingState();
        startListening();
      }, 1000);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isModelLoaded, isRecording, isProcessing, isListening, startListening, resetRecordingState]);

  return (
    <div className={`wakeword-status ${isRecording ? 'recording' : ''}`}>
      {isRecording ? (
        'Recording command...'
      ) : isProcessing ? (
        'Processing command...'
      ) : (
        <>
          Listening: "Hey home"
          <ListeningLoader />
        </>
      )}
    </div>
  );
}
