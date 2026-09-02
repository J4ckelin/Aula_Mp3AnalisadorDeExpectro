/**
 * App Main Controller - Connects UI components with AudioEngine, Visualizer and Exporter
 */
document.addEventListener('DOMContentLoaded', () => {
  const audioEngine = new window.AudioEngine();
  const visualizer = new window.Visualizer(
    document.getElementById('spectrum-canvas'),
    audioEngine
  );

  // DOM Elements
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('audio-file-input');
  const fileNameDisplay = document.getElementById('file-name');

  const btnPlay = document.getElementById('btn-play');
  const btnPause = document.getElementById('btn-pause');
  const btnStop = document.getElementById('btn-stop');
  const seekBar = document.getElementById('seek-bar');
  const currentTimeDisplay = document.getElementById('current-time');
  const durationTimeDisplay = document.getElementById('duration-time');

  // Report Elements
  const repStatus = document.getElementById('rep-status');
  const repSampleRate = document.getElementById('rep-sample-rate');
  const repChannels = document.getElementById('rep-channels');
  const repDuration = document.getElementById('rep-duration');
  const repDominantFreq = document.getElementById('rep-dominant-freq');
  const repDynamicRange = document.getElementById('rep-dynamic-range');

  // Fader Controls
  const faderMaster = document.getElementById('fader-master');
  const faderBass = document.getElementById('fader-bass');
  const faderMid = document.getElementById('fader-mid');
  const faderTreble = document.getElementById('fader-treble');
  const valMaster = document.getElementById('val-master');
  const valBass = document.getElementById('val-bass');
  const valMid = document.getElementById('val-mid');
  const valTreble = document.getElementById('val-treble');

  // Pitch / Therapy Controls
  const pitchButtons = document.querySelectorAll('.btn-preset');
  const pitchSlider = document.getElementById('pitch-slider');
  const valPitch = document.getElementById('val-pitch');
  const toneSelect = document.getElementById('tone-freq-select');
  const toneVolumeSlider = document.getElementById('tone-volume-slider');
  const valToneVolume = document.getElementById('val-tone-volume');

  // Export Buttons
  const btnExportWav = document.getElementById('btn-export-wav');
  const btnExportMp3 = document.getElementById('btn-export-mp3');
  const exportStatus = document.getElementById('export-status');

  // Theme & Mood Controls
  const themeToggle = document.getElementById('theme-toggle');
  const moodSelect = document.getElementById('mood-select');

  let rawAudioArrayBuffer = null;
  let updateTimer = null;

  // Helper formatting function
  function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  // File Upload Handlers
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    fileNameDisplay.textContent = file.name;
    repStatus.textContent = 'Carregando e decodificando áudio...';

    try {
      rawAudioArrayBuffer = await file.arrayBuffer();
      const report = await audioEngine.loadAudioData(rawAudioArrayBuffer);

      // Update Report UI
      repStatus.textContent = 'Áudio carregado com sucesso';
      repSampleRate.textContent = report.sampleRate;
      repChannels.textContent = report.channels;
      repDuration.textContent = report.duration;
      repDynamicRange.textContent = report.dynamicRange;
      repDominantFreq.textContent = report.dominantFreq;

      // Enable UI controls
      btnPlay.disabled = false;
      btnPause.disabled = true;
      btnStop.disabled = false;
      seekBar.disabled = false;
      btnExportWav.disabled = false;
      btnExportMp3.disabled = false;

      durationTimeDisplay.textContent = formatTime(audioEngine.getDuration());
      seekBar.max = Math.floor(audioEngine.getDuration());
      seekBar.value = 0;

      // Start Visualizer render loop
      visualizer.start();
    } catch (err) {
      console.error(err);
      repStatus.textContent = 'Erro ao processar o arquivo de áudio.';
    }
  });

  // Playback Controls
  btnPlay.addEventListener('click', () => {
    audioEngine.play();
    btnPlay.disabled = true;
    btnPause.disabled = false;
    startProgressLoop();
  });

  btnPause.addEventListener('click', () => {
    audioEngine.pause();
    btnPlay.disabled = false;
    btnPause.disabled = true;
    stopProgressLoop();
  });

  btnStop.addEventListener('click', () => {
    audioEngine.stop();
    btnPlay.disabled = false;
    btnPause.disabled = true;
    seekBar.value = 0;
    currentTimeDisplay.textContent = '00:00';
    stopProgressLoop();
  });

  audioEngine.onEndedCallback = () => {
    btnPlay.disabled = false;
    btnPause.disabled = true;
    seekBar.value = 0;
    currentTimeDisplay.textContent = '00:00';
    stopProgressLoop();
  };

  seekBar.addEventListener('input', () => {
    const time = parseFloat(seekBar.value);
    currentTimeDisplay.textContent = formatTime(time);
    audioEngine.seek(time);
  });

  function startProgressLoop() {
    stopProgressLoop();
    updateTimer = setInterval(() => {
      const current = audioEngine.getCurrentTime();
      currentTimeDisplay.textContent = formatTime(current);
      seekBar.value = Math.floor(current);
    }, 250);
  }

  function stopProgressLoop() {
    if (updateTimer) {
      clearInterval(updateTimer);
      updateTimer = null;
    }
  }

  // Fader Events
  faderMaster.addEventListener('input', () => {
    const val = parseFloat(faderMaster.value);
    audioEngine.setMasterVolume(val);
    valMaster.textContent = `${Math.round(val * 100)}%`;
  });

  faderBass.addEventListener('input', () => {
    const val = parseFloat(faderBass.value);
    audioEngine.setBassGain(val);
    valBass.textContent = `${val > 0 ? '+' : ''}${val} dB`;
  });

  faderMid.addEventListener('input', () => {
    const val = parseFloat(faderMid.value);
    audioEngine.setMidGain(val);
    valMid.textContent = `${val > 0 ? '+' : ''}${val} dB`;
  });

  faderTreble.addEventListener('input', () => {
    const val = parseFloat(faderTreble.value);
    audioEngine.setTrebleGain(val);
    valTreble.textContent = `${val > 0 ? '+' : ''}${val} dB`;
  });

  // Pitch Shift Events
  pitchButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      pitchButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const targetHz = parseFloat(btn.dataset.pitch);
      // Calculate cents relative to standard 440 Hz
      // cents = 1200 * log2(f2 / f1)
      const cents = Math.round(1200 * Math.log2(targetHz / 440));
      pitchSlider.value = cents;
      valPitch.textContent = `${cents > 0 ? '+' : ''}${cents} Cents (${targetHz} Hz)`;
      audioEngine.setPitchCents(cents);
    });
  });

  pitchSlider.addEventListener('input', () => {
    pitchButtons.forEach(b => b.classList.remove('active'));
    const cents = parseInt(pitchSlider.value, 10);
    // Calculated Hz estimate: 440 * 2^(cents/1200)
    const estHz = Math.round(440 * Math.pow(2, cents / 1200));
    valPitch.textContent = `${cents > 0 ? '+' : ''}${cents} Cents (~${estHz} Hz)`;
    audioEngine.setPitchCents(cents);
  });

  // Therapy Tone Events
  toneSelect.addEventListener('change', () => {
    const freq = parseFloat(toneSelect.value);
    const vol = parseFloat(toneVolumeSlider.value);
    audioEngine.setTherapyTone(freq, vol);
  });

  toneVolumeSlider.addEventListener('input', () => {
    const vol = parseFloat(toneVolumeSlider.value);
    valToneVolume.textContent = `${Math.round(vol * 200)}%`; // scale to 0-100% display
    audioEngine.setTherapyToneVolume(vol);
  });

  // Visualizer Mode Selector
  document.querySelectorAll('input[name="viz-type"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      visualizer.setMode(e.target.value);
    });
  });

  // Theme & Psychology Color Mood Handlers
  themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);

    const icon = themeToggle.querySelector('.theme-icon');
    const text = themeToggle.querySelector('.theme-text');
    if (newTheme === 'dark') {
      icon.textContent = '☀️';
      text.textContent = 'Modo Claro';
    } else {
      icon.textContent = '🌙';
      text.textContent = 'Modo Escuro';
    }
  });

  moodSelect.addEventListener('change', (e) => {
    document.documentElement.setAttribute('data-mood', e.target.value);
  });

  // Export Logic
  async function performExport(format) {
    if (!audioEngine.audioBuffer) return;

    exportStatus.textContent = `Processando renderização offline e codificando em ${format.toUpperCase()}...`;
    btnExportWav.disabled = true;
    btnExportMp3.disabled = true;

    try {
      const settings = {
        masterGain: parseFloat(faderMaster.value),
        bassGain: parseFloat(faderBass.value),
        midGain: parseFloat(faderMid.value),
        trebleGain: parseFloat(faderTreble.value),
        detuneCents: parseInt(pitchSlider.value, 10),
        therapyFreq: parseFloat(toneSelect.value),
        therapyGain: parseFloat(toneVolumeSlider.value)
      };

      const renderedBuffer = await window.AudioExporter.renderOfflineAudio(
        audioEngine.audioBuffer,
        settings
      );

      let blob;
      let filename = `audio_equil_${Date.now()}.${format}`;

      if (format === 'wav') {
        blob = window.AudioExporter.bufferToWaveBlob(renderedBuffer);
      } else {
        blob = window.AudioExporter.bufferToMp3Blob(renderedBuffer);
      }

      window.AudioExporter.triggerDownload(blob, filename);
      exportStatus.textContent = `Exportação para ${format.toUpperCase()} concluída com sucesso! Download iniciado.`;
    } catch (err) {
      console.error(err);
      exportStatus.textContent = `Erro ao exportar áudio: ${err.message}`;
    } finally {
      btnExportWav.disabled = false;
      btnExportMp3.disabled = false;
    }
  }

  btnExportWav.addEventListener('click', () => performExport('wav'));
  btnExportMp3.addEventListener('click', () => performExport('mp3'));
});
