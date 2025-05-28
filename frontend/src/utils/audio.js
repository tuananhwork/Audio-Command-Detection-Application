import { AUDIO_CONFIG, AUDIO_FORMAT } from '../constants/audio';

export const createAudioContext = () => {
  return new (window.AudioContext || window.webkitAudioContext)({
    sampleRate: AUDIO_CONFIG.SAMPLE_RATE,
  });
};

export const convertToWav = (audioData) => {
  const { NUM_CHANNELS, FORMAT, BIT_DEPTH } = AUDIO_FORMAT;
  const { SAMPLE_RATE } = AUDIO_CONFIG;

  const bytesPerSample = BIT_DEPTH / 8;
  const blockAlign = NUM_CHANNELS * bytesPerSample;
  const numSamples = audioData.length;

  const buffer = new ArrayBuffer(44 + numSamples * bytesPerSample);
  const view = new DataView(buffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // RIFF chunk length
  view.setUint32(4, 36 + numSamples * bytesPerSample, true);
  // RIFF type
  writeString(view, 8, 'WAVE');
  // format chunk identifier
  writeString(view, 12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (raw)
  view.setUint16(20, FORMAT, true);
  // channel count
  view.setUint16(22, NUM_CHANNELS, true);
  // sample rate
  view.setUint32(24, SAMPLE_RATE, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, SAMPLE_RATE * blockAlign, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, blockAlign, true);
  // bits per sample
  view.setUint16(34, BIT_DEPTH, true);
  // data chunk identifier
  writeString(view, 36, 'data');
  // data chunk length
  view.setUint32(40, numSamples * bytesPerSample, true);

  // Write the PCM samples
  const offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const sample = Math.max(-1, Math.min(1, audioData[i]));
    const value = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    view.setInt16(offset + i * bytesPerSample, value, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
};

export const writeString = (view, offset, string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};
