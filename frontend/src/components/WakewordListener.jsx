import React, { useEffect, useRef, useState } from 'react';

// Use local model files instead of remote URLs
const MODEL_URL = window.location.origin + '/models/wakeword/';

export default function WakewordListener({ onWakewordDetected, isRecording, isProcessing }) {
  const recognizerRef = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);

  const startListening = async () => {
    if (!recognizerRef.current || isListening || !isModelLoaded) return;

    try {
      await recognizerRef.current.listen(
        (result) => {
          const scores = result.scores;
          const labels = recognizerRef.current.wordLabels();
          const maxScore = Math.max(...scores);
          const maxIndex = scores.indexOf(maxScore);
          const predictedLabel = labels[maxIndex];

          console.log(`Detected: ${predictedLabel} (${maxScore})`);

          if (predictedLabel === 'Hey home' && maxScore > 0.9) {
            // Stop listening immediately when wake word is detected
            stopListening();
            onWakewordDetected();
          }
        },
        {
          probabilityThreshold: 0.75,
          overlapFactor: 0.5,
          invokeCallbackOnNoiseAndUnknown: false,
        }
      );
      setIsListening(true);
    } catch (error) {
      console.error('Error starting wake word detection:', error);
    }
  };

  const stopListening = async () => {
    const recognizer = recognizerRef.current;
    if (!recognizer || !recognizer.isListening()) return;

    try {
      await recognizer.stopListening();
      setIsListening(false);
    } catch (error) {
      console.error('Error stopping wake word detection:', error);
    }
  };

  useEffect(() => {
    async function loadModel() {
      const speechCommands = window.speechCommands;
      if (!speechCommands) {
        console.error('speechCommands not loaded!');
        return;
      }

      try {
        const recognizer = speechCommands.create(
          'BROWSER_FFT',
          undefined,
          MODEL_URL + 'model.json',
          MODEL_URL + 'metadata.json'
        );

        await recognizer.ensureModelLoaded();
        recognizerRef.current = recognizer;
        setIsModelLoaded(true);
        await startListening();
      } catch (error) {
        console.error('Error loading model:', error);
      }
    }

    loadModel();

    return () => {
      stopListening();
    };
  }, [onWakewordDetected]);

  // Handle recording and processing state changes
  useEffect(() => {
    if (isRecording || isProcessing) {
      stopListening();
    } else if (isModelLoaded && !isListening) {
      startListening();
    }
  }, [isRecording, isProcessing, isModelLoaded, isListening]);

  return <div>Listening for wakeword: "hey home"</div>;
}
