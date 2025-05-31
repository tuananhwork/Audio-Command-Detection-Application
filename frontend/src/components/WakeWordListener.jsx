import { useState, useCallback, useRef } from 'react';
import { useWakeWord } from '../hooks/useWakeWord';
import PropTypes from 'prop-types';

const WakeWordListener = ({ onWakeWordDetected }) => {
  const [showDebug, setShowDebug] = useState(false);
  const lastDetectionTime = useRef(0);
  const COOLDOWN_PERIOD = 3000; // 3 seconds cooldown

  const handleWakeWord = useCallback(() => {
    const now = Date.now();
    if (now - lastDetectionTime.current >= COOLDOWN_PERIOD) {
      console.log('Wake word detected!');
      lastDetectionTime.current = now;
      if (onWakeWordDetected) {
        onWakeWordDetected();
      }
    }
  }, [onWakeWordDetected]);

  const { isLoaded, isListening, error, start, stop, isInitializing } = useWakeWord(handleWakeWord);

  const handleToggle = async () => {
    if (isListening) {
      await stop();
    } else {
      await start();
    }
  };

  if (isInitializing) {
    return (
      <div className="wake-word-container">
        <div className="wake-word-spinner"></div>
        <span className="wake-word-text">Initializing wake word detection...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="wake-word-error">
        <div className="wake-word-error-message">Error: {error}</div>
        <button onClick={() => setShowDebug(!showDebug)} className="wake-word-debug-toggle">
          {showDebug ? 'Hide Debug Info' : 'Show Debug Info'}
        </button>
        {showDebug && (
          <div className="wake-word-debug-info">
            <p>Browser: {navigator.userAgent}</p>
            <p>WebAssembly: {typeof WebAssembly !== 'undefined' ? 'Supported' : 'Not supported'}</p>
            <p>Microphone: {navigator.mediaDevices ? 'Available' : 'Not available'}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="wake-word-container">
      <button onClick={handleToggle} className={`wake-word-button ${isListening ? 'wake-word-button--listening' : ''}`}>
        {isListening ? 'Stop Listening' : 'Start Listening'}
      </button>

      <div className="wake-word-status">
        {isListening ? (
          <div className="wake-word-status-listening">
            <div className="wake-word-indicator"></div>
            Listening for "Hey Home"...
          </div>
        ) : (
          <div>Click to start listening for "Hey Home"</div>
        )}
      </div>

      <button onClick={() => setShowDebug(!showDebug)} className="wake-word-debug-toggle">
        {showDebug ? 'Hide Debug Info' : 'Show Debug Info'}
      </button>

      {showDebug && (
        <div className="wake-word-debug-info">
          <p>Status: {isLoaded ? 'Ready' : 'Not ready'}</p>
          <p>Listening: {isListening ? 'Yes' : 'No'}</p>
          <p>Browser: {navigator.userAgent}</p>
          <p>WebAssembly: {typeof WebAssembly !== 'undefined' ? 'Supported' : 'Not supported'}</p>
          <p>Microphone: {navigator.mediaDevices ? 'Available' : 'Not available'}</p>
        </div>
      )}
    </div>
  );
};

WakeWordListener.propTypes = {
  onWakeWordDetected: PropTypes.func,
};

export default WakeWordListener;
