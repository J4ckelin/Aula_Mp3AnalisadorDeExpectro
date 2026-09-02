/**
 * AudioEngine - Web Audio API processing engine for AudioSpectrum SPA
 */
class AudioEngine {
  constructor() {
    this.audioCtx = null;
    this.audioBuffer = null;
    this.sourceNode = null;

    // Nodes
    this.masterGainNode = null;
    this.bassFilter = null;
    this.midFilter = null;
    this.trebleFilter = null;
    this.analyserNode = null;

    // Therapy Tone Generator Node
    this.toneOscillator = null;
    this.toneGainNode = null;

    // Playback status & state
    this.isPlaying = false;
    this.isPaused = false;
    this.startTime = 0;
    this.pauseOffset = 0;
    this.currentDetuneCents = 0;

    // Callbacks
    this.onEndedCallback = null;
  }

  /**
   * Initializes or resumes the AudioContext
   */
  initContext() {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  /**
   * Decodes an ArrayBuffer (from file input) into AudioBuffer
   */
  async loadAudioData(arrayBuffer) {
    this.initContext();
    this.stop();

    // Decode audio data asynchronously
    this.audioBuffer = await new Promise((resolve, reject) => {
      this.audioCtx.decodeAudioData(
        arrayBuffer.slice(0),
        buffer => resolve(buffer),
        err => reject(err)
      );
    });

    this.setupAudioGraph();
    return this.getAudioReport();
  }

  /**
   * Sets up BiquadFilters for 3-band EQ, Master Gain, Analyser and Tone Generator
   */
  setupAudioGraph() {
    if (!this.audioCtx) return;

    // Master Gain
    this.masterGainNode = this.audioCtx.createGain();

    // 3-Band Equalizer Filters
    // Bass: Lowshelf filter @ 250Hz
    this.bassFilter = this.audioCtx.createBiquadFilter();
    this.bassFilter.type = 'lowshelf';
    this.bassFilter.frequency.value = 250;
    this.bassFilter.gain.value = 0;

    // Mid: Peaking filter @ 1000Hz (Q = 1)
    this.midFilter = this.audioCtx.createBiquadFilter();
    this.midFilter.type = 'peaking';
    this.midFilter.frequency.value = 1000;
    this.midFilter.Q.value = 1.0;
    this.midFilter.gain.value = 0;

    // Treble: Highshelf filter @ 4000Hz
    this.trebleFilter = this.audioCtx.createBiquadFilter();
    this.trebleFilter.type = 'highshelf';
    this.trebleFilter.frequency.value = 4000;
    this.trebleFilter.gain.value = 0;

    // Analyser Node for Spectrum Visualization
    this.analyserNode = this.audioCtx.createAnalyser();
    this.analyserNode.fftSize = 2048;
    this.analyserNode.smoothingTimeConstant = 0.85;

    // Connect Filter Chain: Source -> Bass -> Mid -> Treble -> MasterGain -> Analyser -> Destination
    this.bassFilter.connect(this.midFilter);
    this.midFilter.connect(this.trebleFilter);
    this.trebleFilter.connect(this.masterGainNode);
    this.masterGainNode.connect(this.analyserNode);
    this.analyserNode.connect(this.audioCtx.destination);

    // Setup Tone Generator Node Gain
    this.toneGainNode = this.audioCtx.createGain();
    this.toneGainNode.gain.value = 0;
    this.toneGainNode.connect(this.analyserNode);
  }

  /**
   * Starts or resumes playback
   */
  play(offset = 0) {
    if (!this.audioBuffer) return;
    this.initContext();

    if (this.isPlaying) {
      this.stopSourceOnly();
    }

    this.sourceNode = this.audioCtx.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;
    this.sourceNode.detune.value = this.currentDetuneCents;

    // Connect to beginning of EQ chain
    this.sourceNode.connect(this.bassFilter);

    const startPos = offset || this.pauseOffset;
    this.sourceNode.start(0, startPos);
    this.startTime = this.audioCtx.currentTime - startPos;
    this.isPlaying = true;
    this.isPaused = false;

    this.sourceNode.onended = () => {
      if (this.isPlaying && this.getCurrentTime() >= this.getDuration() - 0.1) {
        this.isPlaying = false;
        this.isPaused = false;
        this.pauseOffset = 0;
        if (this.onEndedCallback) this.onEndedCallback();
      }
    };
  }

  /**
   * Pauses playback
   */
  pause() {
    if (!this.isPlaying) return;
    this.pauseOffset = this.getCurrentTime();
    this.stopSourceOnly();
    this.isPlaying = false;
    this.isPaused = true;
  }

  /**
   * Stops playback completely
   */
  stop() {
    this.stopSourceOnly();
    this.isPlaying = false;
    this.isPaused = false;
    this.pauseOffset = 0;
  }

  stopSourceOnly() {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch (e) {
        // Node might have stopped already
      }
      this.sourceNode = null;
    }
  }

  seek(seconds) {
    const wasPlaying = this.isPlaying;
    this.stopSourceOnly();
    this.pauseOffset = Math.max(0, Math.min(seconds, this.getDuration()));
    if (wasPlaying) {
      this.play(this.pauseOffset);
    }
  }

  getCurrentTime() {
    if (this.isPlaying) {
      return Math.min(this.audioCtx.currentTime - this.startTime, this.getDuration());
    }
    return this.pauseOffset;
  }

  getDuration() {
    return this.audioBuffer ? this.audioBuffer.duration : 0;
  }

  // Fader Gain Control
  setMasterVolume(val) {
    if (this.masterGainNode) {
      this.masterGainNode.gain.setValueAtTime(val, this.audioCtx.currentTime);
    }
  }

  setBassGain(dbVal) {
    if (this.bassFilter) {
      this.bassFilter.gain.setValueAtTime(dbVal, this.audioCtx.currentTime);
    }
  }

  setMidGain(dbVal) {
    if (this.midFilter) {
      this.midFilter.gain.setValueAtTime(dbVal, this.audioCtx.currentTime);
    }
  }

  setTrebleGain(dbVal) {
    if (this.trebleFilter) {
      this.trebleFilter.gain.setValueAtTime(dbVal, this.audioCtx.currentTime);
    }
  }

  // Pitch Shift / Frequency Retuning (Cents offset from 440Hz base)
  setPitchCents(cents) {
    this.currentDetuneCents = cents;
    if (this.sourceNode && this.sourceNode.detune) {
      this.sourceNode.detune.setValueAtTime(cents, this.audioCtx.currentTime);
    }
  }

  // Pure Tone / Solfeggio Frequency Overlay
  setTherapyTone(freqHz, gainVal = 0.1) {
    this.initContext();
    if (this.toneOscillator) {
      try {
        this.toneOscillator.stop();
        this.toneOscillator.disconnect();
      } catch (e) {}
      this.toneOscillator = null;
    }

    if (freqHz > 0) {
      this.toneOscillator = this.audioCtx.createOscillator();
      this.toneOscillator.type = 'sine';
      this.toneOscillator.frequency.setValueAtTime(freqHz, this.audioCtx.currentTime);
      this.toneOscillator.connect(this.toneGainNode);
      this.toneGainNode.gain.setValueAtTime(gainVal, this.audioCtx.currentTime);
      this.toneOscillator.start();
    } else {
      this.toneGainNode.gain.setValueAtTime(0, this.audioCtx.currentTime);
    }
  }

  setTherapyToneVolume(gainVal) {
    if (this.toneGainNode && this.audioCtx) {
      this.toneGainNode.gain.setValueAtTime(gainVal, this.audioCtx.currentTime);
    }
  }

  // Real-time Frequency Spectrum & Waveform data extraction
  getFrequencyData(array) {
    if (this.analyserNode) {
      this.analyserNode.getByteFrequencyData(array);
    }
  }

  getWaveformData(array) {
    if (this.analyserNode) {
      this.analyserNode.getByteTimeDomainData(array);
    }
  }

  /**
   * Generates a descriptive report of the loaded audio buffer
   */
  getAudioReport() {
    if (!this.audioBuffer) return null;

    const sampleRate = this.audioBuffer.sampleRate;
    const channels = this.audioBuffer.numberOfChannels;
    const duration = this.audioBuffer.duration;

    // Calculate RMS (Dynamic Range estimation)
    const channelData = this.audioBuffer.getChannelData(0);
    let sumSquares = 0;
    const step = Math.ceil(channelData.length / 10000); // Sample 10,000 points
    let sampleCount = 0;

    for (let i = 0; i < channelData.length; i += step) {
      sumSquares += channelData[i] * channelData[i];
      sampleCount++;
    }

    const rms = Math.sqrt(sumSquares / sampleCount);
    const dbRMS = 20 * Math.log10(rms || 0.0001);

    return {
      sampleRate: `${sampleRate} Hz`,
      channels: channels === 1 ? 'Mono (1)' : channels === 2 ? 'Estéreo (2)' : `${channels} canais`,
      duration: `${Math.floor(duration / 60)}m ${Math.floor(duration % 60)}s`,
      dynamicRange: `${dbRMS.toFixed(1)} dB (RMS)`,
      dominantFreq: 'Análise em Tempo Real'
    };
  }
}

window.AudioEngine = AudioEngine;
