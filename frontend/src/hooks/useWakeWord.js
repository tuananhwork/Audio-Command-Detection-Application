import { usePorcupine } from '@picovoice/porcupine-react';
import { useEffect, useState } from 'react';

export const useWakeWord = (onWakeWordDetected) => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState(null);

  const { keywordDetection, isLoaded, isListening, init, start, stop, release } = usePorcupine();

  // Initialize Porcupine
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        setIsInitializing(true);
        setError(null);

        const keyword = {
          publicPath: '/hey-home_en_wasm_v3_0_0.ppn',
          label: 'hey Home',
        };

        const model = {
          publicPath: '/porcupine_params.pv',
        };

        console.log('Initializing with config:', {
          keyword,
          model,
          accessKey: '3F2xSue0Oq9ZqZWYybzbhM8yzXRSNkCufJyB5/SaOmYWjw0l+aq6AA==',
        });

        await init('3F2xSue0Oq9ZqZWYybzbhM8yzXRSNkCufJyB5/SaOmYWjw0l+aq6AA==', keyword, model);

        if (mounted) {
          setIsInitializing(false);
        }
      } catch (err) {
        console.error('Failed to initialize Porcupine:', err);
        if (mounted) {
          setError(err.message || 'Failed to initialize wake word detection');
          setIsInitializing(false);
        }
      }
    };

    initialize();

    return () => {
      mounted = false;
      release();
    };
  }, [init, release]);

  // Handle wake word detection
  useEffect(() => {
    if (keywordDetection !== null) {
      onWakeWordDetected();
    }
  }, [keywordDetection, onWakeWordDetected]);

  const handleStart = async () => {
    try {
      await start();
    } catch (err) {
      console.error('Failed to start listening:', err);
      setError(err.message || 'Failed to start listening');
    }
  };

  const handleStop = async () => {
    try {
      await stop();
    } catch (err) {
      console.error('Failed to stop listening:', err);
      setError(err.message || 'Failed to stop listening');
    }
  };

  return {
    isLoaded,
    isListening,
    error,
    start: handleStart,
    stop: handleStop,
    isInitializing,
  };
};
