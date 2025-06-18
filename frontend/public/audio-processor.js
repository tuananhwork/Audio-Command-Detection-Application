class AudioRecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._bufferSize = 4096;
    this._buffer = new Float32Array(this._bufferSize);
    this._initBuffer();
  }

  _initBuffer() {
    this._bytesWritten = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input.length > 0) {
      const channel = input[0];
      if (channel.length > 0) {
        // Copy input data to buffer
        for (let i = 0; i < channel.length; i++) {
          this._buffer[this._bytesWritten++] = channel[i];
        }

        // If buffer is full, send it to main thread
        if (this._bytesWritten >= this._bufferSize) {
          this.port.postMessage(this._buffer.slice(0, this._bytesWritten));
          this._initBuffer();
        }
      }
    }
    return true;
  }
}

registerProcessor('audio-recorder', AudioRecorderProcessor);
