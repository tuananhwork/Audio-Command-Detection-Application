import { useEffect, useRef, useState } from 'react';

const MODEL_URL = window.location.origin + '/models/wakeword/';

export function useWakewordDetection(onWakewordDetected) {
  const recognizerRef = useRef(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const isActiveRef = useRef(true);
  const initPromiseRef = useRef(null);
  const isListeningRef = useRef(false);
  const isRecordingRef = useRef(false);

  // Initialize model and recognizer
  useEffect(() => {
    isActiveRef.current = true;

    async function initModel() {
      if (initPromiseRef.current) {
        return initPromiseRef.current;
      }

      initPromiseRef.current = (async () => {
        try {
          const speechCommands = window.speechCommands;
          if (!speechCommands) {
            throw new Error('speechCommands not loaded!');
          }

          if (recognizerRef.current) {
            return recognizerRef.current;
          }

          const recognizer = speechCommands.create(
            'BROWSER_FFT',
            undefined,
            MODEL_URL + 'model.json',
            MODEL_URL + 'metadata.json'
          );

          await recognizer.ensureModelLoaded();
          console.log('🎯 Wake word ready');

          recognizerRef.current = recognizer;
          setIsModelLoaded(true);

          return recognizer;
        } catch (error) {
          console.error('❌ Wake word error:', error);
          throw error;
        } finally {
          initPromiseRef.current = null;
        }
      })();

      return initPromiseRef.current;
    }

    initModel()
      .then(async (recognizer) => {
        if (!recognizer || !isActiveRef.current) return;

        try {
          await recognizer.listen(
            (result) => {
              if (!isActiveRef.current || isRecordingRef.current) return;

              const scores = result.scores;
              const labels = recognizer.wordLabels();
              const maxScore = Math.max(...scores);
              const maxIndex = scores.indexOf(maxScore);
              const predictedLabel = labels[maxIndex];

              if (predictedLabel === 'Hey home' && maxScore > 0.9) {
                console.log('🎯 Hey home detected!');
                if (isListeningRef.current) {
                  recognizer.stopListening();
                  isListeningRef.current = false;
                  setIsListening(false);
                }
                isRecordingRef.current = true;
                onWakewordDetected();
              }
            },
            {
              probabilityThreshold: 0.75,
              overlapFactor: 0.5,
              invokeCallbackOnNoiseAndUnknown: false,
            }
          );
          isListeningRef.current = true;
          setIsListening(true);
        } catch (error) {
          console.error('❌ Wake word error:', error);
        }
      })
      .catch((error) => {
        console.error('❌ Wake word error:', error);
      });

    return () => {
      isActiveRef.current = false;
      if (isListeningRef.current && recognizerRef.current?.isListening()) {
        recognizerRef.current.stopListening();
        isListeningRef.current = false;
      }
    };
  }, [onWakewordDetected]);

  // Start listening after recording/processing
  const startListening = async () => {
    if (!recognizerRef.current || isListeningRef.current || !isModelLoaded || isRecordingRef.current) {
      return;
    }

    try {
      await recognizerRef.current.listen(
        (result) => {
          if (!isActiveRef.current || isRecordingRef.current) return;

          const scores = result.scores;
          const labels = recognizerRef.current.wordLabels();
          const maxScore = Math.max(...scores);
          const maxIndex = scores.indexOf(maxScore);
          const predictedLabel = labels[maxIndex];

          if (predictedLabel === 'Hey home' && maxScore > 0.9) {
            console.log('🎯 Hey home detected!');
            if (isListeningRef.current) {
              recognizerRef.current.stopListening();
              isListeningRef.current = false;
              setIsListening(false);
            }
            isRecordingRef.current = true;
            onWakewordDetected();
          }
        },
        {
          probabilityThreshold: 0.75,
          overlapFactor: 0.5,
          invokeCallbackOnNoiseAndUnknown: false,
        }
      );
      isListeningRef.current = true;
      setIsListening(true);
    } catch (error) {
      console.error('❌ Wake word error:', error);
    }
  };

  // Stop listening
  const stopListening = () => {
    if (isListeningRef.current && recognizerRef.current?.isListening()) {
      recognizerRef.current.stopListening();
      isListeningRef.current = false;
      setIsListening(false);
    }
  };

  // Reset recording state
  const resetRecordingState = () => {
    isRecordingRef.current = false;
  };

  return {
    isModelLoaded,
    isListening,
    startListening,
    stopListening,
    resetRecordingState,
  };
}
