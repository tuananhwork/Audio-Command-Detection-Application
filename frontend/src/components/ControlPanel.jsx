import React from 'react';
import PropTypes from 'prop-types';
import useWaveSurfer from '../hooks/useWaveSurfer';

const ControlPanel = ({ onRecord, recording, countdown, loading, audioUrl, showKeyboardHint }) => {
  const originalWaveformRef = useWaveSurfer(audioUrl);

  return (
    <div className="control-panel">
      <button
        className={`btn btn--record ${loading ? 'disabled' : ''} ${recording ? 'recording' : ''}`}
        onClick={onRecord}
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
  );
};

ControlPanel.propTypes = {
  onRecord: PropTypes.func.isRequired,
  recording: PropTypes.bool.isRequired,
  countdown: PropTypes.number.isRequired,
  loading: PropTypes.bool.isRequired,
  audioUrl: PropTypes.string,
  showKeyboardHint: PropTypes.bool.isRequired,
};

export default ControlPanel;
