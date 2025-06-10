import { useEffect, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';

const useWaveSurfer = (audioUrl) => {
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

  return originalWaveformRef;
};

export default useWaveSurfer;
