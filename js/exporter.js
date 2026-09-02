/**
 * Exporter Module - Render audio offline with applied EQ, pitch shift and therapy tones
 * Exports to WAV (16-bit PCM) and MP3 (via lamejs)
 */
class AudioExporter {
  /**
   * Renders the processed audio offline using OfflineAudioContext
   */
  static async renderOfflineAudio(audioBuffer, settings) {
    const {
      masterGain = 1.0,
      bassGain = 0,
      midGain = 0,
      trebleGain = 0,
      detuneCents = 0,
      therapyFreq = 0,
      therapyGain = 0
    } = settings;

    const channels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length;

    const offlineCtx = new OfflineAudioContext(channels, length, sampleRate);

    // Create Source
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.detune.value = detuneCents;

    // Filters
    const masterNode = offlineCtx.createGain();
    masterNode.gain.value = masterGain;

    const bassFilter = offlineCtx.createBiquadFilter();
    bassFilter.type = 'lowshelf';
    bassFilter.frequency.value = 250;
    bassFilter.gain.value = bassGain;

    const midFilter = offlineCtx.createBiquadFilter();
    midFilter.type = 'peaking';
    midFilter.frequency.value = 1000;
    midFilter.Q.value = 1.0;
    midFilter.gain.value = midGain;

    const trebleFilter = offlineCtx.createBiquadFilter();
    trebleFilter.type = 'highshelf';
    trebleFilter.frequency.value = 4000;
    trebleFilter.gain.value = trebleGain;

    // Connect graph
    source.connect(bassFilter);
    bassFilter.connect(midFilter);
    midFilter.connect(trebleFilter);
    trebleFilter.connect(masterNode);
    masterNode.connect(offlineCtx.destination);

    // Optional Therapy Tone Overlay
    if (therapyFreq > 0 && therapyGain > 0) {
      const osc = offlineCtx.createOscillator();
      const oscGain = offlineCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = therapyFreq;
      oscGain.gain.value = therapyGain;

      osc.connect(oscGain);
      oscGain.connect(offlineCtx.destination);
      osc.start(0);
    }

    source.start(0);

    // Render AudioBuffer
    return await offlineCtx.startRendering();
  }

  /**
   * Encodes AudioBuffer into a WAV Blob
   */
  static bufferToWaveBlob(audioBuffer) {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length * numChannels * 2 + 44;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);

    /* RIFF identifier */
    this.writeString(view, 0, 'RIFF');
    /* RIFF chunk length */
    view.setUint32(4, length - 8, true);
    /* RIFF type */
    this.writeString(view, 8, 'WAVE');
    /* format chunk identifier */
    this.writeString(view, 12, 'fmt ');
    /* format chunk length */
    view.setUint32(16, 16, true);
    /* sample format (raw PCM) */
    view.setUint16(20, 1, true);
    /* channel count */
    view.setUint16(22, numChannels, true);
    /* sample rate */
    view.setUint32(24, sampleRate, true);
    /* byte rate (sample rate * block align) */
    view.setUint32(28, sampleRate * numChannels * 2, true);
    /* block align (channel count * bytes per sample) */
    view.setUint16(32, numChannels * 2, true);
    /* bits per sample */
    view.setUint16(34, 16, true);
    /* data chunk identifier */
    this.writeString(view, 36, 'data');
    /* data chunk length */
    view.setUint32(40, length - 44, true);

    // Interleave channels
    const channels = [];
    for (let i = 0; i < numChannels; i++) {
      channels.push(audioBuffer.getChannelData(i));
    }

    let offset = 44;
    for (let i = 0; i < audioBuffer.length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        let sample = Math.max(-1, Math.min(1, channels[ch][i]));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(offset, sample, true);
        offset += 2;
      }
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  /**
   * Encodes AudioBuffer to MP3 Blob using lamejs
   */
  static bufferToMp3Blob(audioBuffer) {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const kbps = 128;
    const mp3encoder = new window.lamejs.Mp3Encoder(numChannels, sampleRate, kbps);
    const mp3Data = [];

    const left = audioBuffer.getChannelData(0);
    const right = numChannels > 1 ? audioBuffer.getChannelData(1) : left;

    // Convert Float32Array to Int16Array
    const sampleBlockSize = 1152;
    const leftInt16 = new Int16Array(left.length);
    const rightInt16 = new Int16Array(right.length);

    for (let i = 0; i < left.length; i++) {
      let l = Math.max(-1, Math.min(1, left[i]));
      let r = Math.max(-1, Math.min(1, right[i]));
      leftInt16[i] = l < 0 ? l * 0x8000 : l * 0x7FFF;
      rightInt16[i] = r < 0 ? r * 0x8000 : r * 0x7FFF;
    }

    for (let i = 0; i < leftInt16.length; i += sampleBlockSize) {
      const leftChunk = leftInt16.subarray(i, i + sampleBlockSize);
      const rightChunk = rightInt16.subarray(i, i + sampleBlockSize);
      const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
      }
    }

    const mp3buf = mp3encoder.flush();
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }

    return new Blob(mp3Data, { type: 'audio/mp3' });
  }

  static writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  static triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }
}

window.AudioExporter = AudioExporter;
