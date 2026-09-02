/**
 * Visualizer Module - Handles Canvas rendering of real-time audio spectrum
 * Modes: 'bars' (Frequency Bars), 'wave' (Waveform), 'circular' (Circular Spectrum)
 * Incorporates subtle rhythm-based animations and theme/mood styling
 */
class Visualizer {
  constructor(canvasElement, audioEngine) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.audioEngine = audioEngine;

    this.mode = 'bars'; // 'bars' | 'wave' | 'circular'
    this.animationId = null;

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    if (this.canvas.parentElement) {
      this.canvas.width = this.canvas.parentElement.clientWidth || 800;
      this.canvas.height = this.canvas.parentElement.clientHeight || 240;
    }
  }

  setMode(mode) {
    this.mode = mode;
  }

  start() {
    if (!this.animationId) {
      this.draw();
    }
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
      this.clearCanvas();
    }
  }

  clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  draw() {
    this.animationId = requestAnimationFrame(() => this.draw());

    const width = this.canvas.width;
    const height = this.canvas.height;
    this.ctx.clearRect(0, 0, width, height);

    // Get primary theme colors from CSS variables
    const styles = getComputedStyle(document.body);
    const accentPrimary = styles.getPropertyValue('--accent-primary').trim() || '#6b9ac4';
    const accentSecondary = styles.getPropertyValue('--accent-secondary').trim() || '#97c1a9';

    if (this.mode === 'bars') {
      this.drawBars(width, height, accentPrimary, accentSecondary);
    } else if (this.mode === 'wave') {
      this.drawWaveform(width, height, accentPrimary);
    } else if (this.mode === 'circular') {
      this.drawCircular(width, height, accentPrimary, accentSecondary);
    }
  }

  /**
   * Frequency Bars Visualization with rhythm bounce
   */
  drawBars(width, height, col1, col2) {
    const bufferLength = 64; // Sub-sample for crisp bars
    const dataArray = new Uint8Array(bufferLength);
    this.audioEngine.getFrequencyData(dataArray);

    const barWidth = (width / bufferLength) * 0.75;
    const gap = (width / bufferLength) * 0.25;
    let x = gap / 2;

    const gradient = this.ctx.createLinearGradient(0, height, 0, 0);
    gradient.addColorStop(0, col1);
    gradient.addColorStop(1, col2);

    for (let i = 0; i < bufferLength; i++) {
      const value = dataArray[i];
      const percent = value / 255;
      const barHeight = percent * height * 0.9;

      // Draw main bar
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      if (this.ctx.roundRect) {
        this.ctx.roundRect(x, height - barHeight, barWidth, barHeight, [4, 4, 0, 0]);
      } else {
        this.ctx.rect(x, height - barHeight, barWidth, barHeight);
      }
      this.ctx.fill();

      // Top accent peak
      this.ctx.fillStyle = col2;
      this.ctx.fillRect(x, Math.max(0, height - barHeight - 4), barWidth, 3);

      x += barWidth + gap;
    }
  }

  /**
   * Oscilloscope Waveform Visualization
   */
  drawWaveform(width, height, color) {
    const bufferLength = 512;
    const dataArray = new Uint8Array(bufferLength);
    this.audioEngine.getWaveformData(dataArray);

    this.ctx.lineWidth = 3;
    this.ctx.strokeStyle = color;
    this.ctx.shadowBlur = 8;
    this.ctx.shadowColor = color;
    this.ctx.beginPath();

    const sliceWidth = width / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * height) / 2;

      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    this.ctx.lineTo(width, height / 2);
    this.ctx.stroke();
    this.ctx.shadowBlur = 0; // Reset
  }

  /**
   * Circular Spectrum Visualizer
   */
  drawCircular(width, height, col1, col2) {
    const bufferLength = 64;
    const dataArray = new Uint8Array(bufferLength);
    this.audioEngine.getFrequencyData(dataArray);

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.25;

    // Pulse center with bass
    const bassAvg = (dataArray[0] + dataArray[1] + dataArray[2] + dataArray[3]) / 4;
    const pulseRadius = radius + (bassAvg / 255) * 15;

    this.ctx.save();
    this.ctx.translate(centerX, centerY);

    // Inner pulsing circle
    this.ctx.beginPath();
    this.ctx.arc(0, 0, pulseRadius * 0.7, 0, 2 * Math.PI);
    this.ctx.fillStyle = col1;
    this.ctx.globalAlpha = 0.3;
    this.ctx.fill();
    this.ctx.globalAlpha = 1.0;

    for (let i = 0; i < bufferLength; i++) {
      const value = dataArray[i];
      const barHeight = (value / 255) * (radius * 1.2);
      const angle = (i / bufferLength) * Math.PI * 2;

      const xStart = Math.cos(angle) * pulseRadius;
      const yStart = Math.sin(angle) * pulseRadius;
      const xEnd = Math.cos(angle) * (pulseRadius + barHeight);
      const yEnd = Math.sin(angle) * (pulseRadius + barHeight);

      this.ctx.strokeStyle = i % 2 === 0 ? col1 : col2;
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.moveTo(xStart, yStart);
      this.ctx.lineTo(xEnd, yEnd);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }
}

window.Visualizer = Visualizer;
