/** AudioNode's MP3 encoder-padding scan. The original adds 50 ms to loop start. */
export function mp3LoopBounds(buffer: AudioBuffer) {
  let first: number | null = null;
  let last: number | null = null;
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < data.length; i++) {
      if (Math.abs(data[i]) > 0.01) {
        if (i < (first || Infinity)) first = i;
        break;
      }
    }
    for (let i = data.length - 1; i >= 0; i--) {
      if (Math.abs(data[i]) > 0.01) {
        if (i > (last || -1)) last = i;
        break;
      }
    }
  }
  return {
    start: (first ?? 0) / buffer.sampleRate + 0.05,
    end: (last ?? 0) / buffer.sampleRate,
  };
}
