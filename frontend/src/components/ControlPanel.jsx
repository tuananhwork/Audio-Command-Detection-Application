import React, { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import WaveSurfer from 'wavesurfer.js';

const ControlPanel = ({ onRecord, recording, countdown, loading, audioUrl, showKeyboardHint }) => {
  const originalWaveformRef = useRef(null);
  const wavesurferRef = useRef(null);

  useEffect(() => {
    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
    if (audioUrl && originalWaveformRef.current) {
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
