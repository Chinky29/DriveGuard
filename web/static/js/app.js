/**
 * DriveGuard: Real-Time Driver-State Monitoring Web Application Controller
 * Handles client webcam, WebSocket telemetry, HUD canvas drawing, audio chimes, and threshold tuning.
 */

class DriveGuardApp {
  constructor() {
    // DOM Elements
    this.videoEl = document.getElementById('webcamVideo');
    this.annotatedStreamEl = document.getElementById('annotatedStream');
    this.hudCanvas = document.getElementById('hudCanvas');
    this.hudCtx = this.hudCanvas.getContext('2d');
    this.sparklineCanvas = document.getElementById('sparklineCanvas');
    this.sparkCtx = this.sparklineCanvas.getContext('2d');

    this.advisoryBanner = document.getElementById('advisoryBanner');
    this.bannerBadge = document.getElementById('bannerBadge');
    this.bannerText = document.getElementById('bannerText');

    this.earValEl = document.getElementById('earValue');
    this.earProgressEl = document.getElementById('earProgress');
    this.closureValEl = document.getElementById('closureValue');
    this.perclosValEl = document.getElementById('perclosValue');
    this.perclosProgressEl = document.getElementById('perclosProgress');

    this.yawValEl = document.getElementById('yawValue');
    this.pitchValEl = document.getElementById('pitchValue');
    this.rollValEl = document.getElementById('rollValue');
    this.headDeviationValEl = document.getElementById('headDeviationValue');

    this.fpsStatEl = document.getElementById('fpsStat');
    this.eventsTableBody = document.getElementById('eventsTableBody');

    // State
    this.currentMode = 'demo'; // 'webcam', 'demo', 'sim'
    this.stream = null;
    this.ws = null;
    this.isProcessing = false;
    this.earHistory = new Array(40).fill(0.3);
    this.lastAdvisoryLevel = 'NORMAL';
    this.audioEnabled = true;
    this.audioCtx = null;

    // Offscreen canvas for frame capture
    this.captureCanvas = document.createElement('canvas');
    this.captureCanvas.width = 640;
    this.captureCanvas.height = 480;
    this.captureCtx = this.captureCanvas.getContext('2d');

    this.init();
  }

  async init() {
    this.setupEventListeners();
    await this.fetchConfig();
    this.setupAudio();
    this.switchSource('demo'); // Default to demo feed for instant preview
    this.startTelemetryPolling();
  }

  setupEventListeners() {
    document.querySelectorAll('.btn-source').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = btn.dataset.source;
        this.switchSource(mode);
      });
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const target = btn.dataset.tab;
        document.getElementById('tuningTab').style.display = target === 'tuning' ? 'grid' : 'none';
        document.getElementById('eventsTab').style.display = target === 'events' ? 'block' : 'none';
      });
    });

    // Slider inputs
    const earSlider = document.getElementById('sliderEar');
    const earLabel = document.getElementById('lblSliderEar');
    earSlider.addEventListener('input', () => {
      earLabel.textContent = parseFloat(earSlider.value).toFixed(2);
      this.updateConfigThrottled({ ear_threshold: parseFloat(earSlider.value) });
    });

    const closeSlider = document.getElementById('sliderClosure');
    const closeLabel = document.getElementById('lblSliderClosure');
    closeSlider.addEventListener('input', () => {
      closeLabel.textContent = `${parseFloat(closeSlider.value).toFixed(1)}s`;
      this.updateConfigThrottled({ closure_duration_warning_sec: parseFloat(closeSlider.value) });
    });

    const yawSlider = document.getElementById('sliderYaw');
    const yawLabel = document.getElementById('lblSliderYaw');
    yawSlider.addEventListener('input', () => {
      yawLabel.textContent = `${parseFloat(yawSlider.value).toFixed(0)}°`;
      this.updateConfigThrottled({ yaw_threshold_deg: parseFloat(yawSlider.value) });
    });

    // Audio chime toggle button
    const audioToggle = document.getElementById('audioToggle');
    if (audioToggle) {
      audioToggle.addEventListener('click', () => {
        this.audioEnabled = !this.audioEnabled;
        audioToggle.textContent = this.audioEnabled ? '🔔 Audio: ON' : '🔕 Audio: MUTED';
      });
    }
  }

  setupAudio() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContext();
    } catch (e) {
      console.warn('Web Audio API not supported:', e);
    }
  }

  playChime(type) {
    if (!this.audioEnabled || !this.audioCtx) return;
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    if (type === 'NOTICE') {
      // Gentle amber double-tone
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880.00, now + 0.1); // A5
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'WARNING') {
      // Elevated cautionary pulse
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(740, now);
      osc.frequency.setValueAtTime(554, now + 0.15);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.start(now);
      osc.stop(now + 0.45);
    }
  }

  async switchSource(mode) {
    this.currentMode = mode;
    document.querySelectorAll('.btn-source').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.source === mode);
    });

    // Stop client webcam if active
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    this.isProcessing = false;

    if (mode === 'webcam') {
      this.annotatedStreamEl.style.display = 'none';
      this.videoEl.style.display = 'block';
      await this.startWebcam();
    } else if (mode === 'demo') {
      this.videoEl.style.display = 'none';
      this.annotatedStreamEl.style.display = 'block';
      this.annotatedStreamEl.src = '/video_feed?' + Date.now();
    } else if (mode === 'sim') {
      this.annotatedStreamEl.style.display = 'none';
      this.videoEl.style.display = 'block';
      this.startSimulation();
    }
  }

  async startWebcam() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, frameRate: 30 },
        audio: false,
      });
      this.videoEl.srcObject = this.stream;
      await this.videoEl.play();
      this.isProcessing = true;
      this.processWebcamLoop();
    } catch (err) {
      alert('Could not access your webcam. Falling back to Demo video stream.\n\nDetails: ' + err.message);
      this.switchSource('demo');
    }
  }

  startSimulation() {
    this.isProcessing = true;
    let simStep = 0;
    const simInterval = setInterval(() => {
      if (!this.isProcessing || this.currentMode !== 'sim') {
        clearInterval(simInterval);
        return;
      }
      simStep++;
      // Cycle simulation every 150 steps (~5 sec)
      const phase = (simStep % 150);
      let ear = 0.32;
      let yaw = 0.0;
      let pitch = 0.0;
      let reason = "Attentive";
      let level = "NORMAL";

      if (phase >= 40 && phase < 80) {
        // Prolonged eye closure
        ear = 0.12;
        reason = "prolonged eye closure";
        level = phase > 65 ? "WARNING" : "NOTICE";
      } else if (phase >= 90 && phase < 130) {
        // Sustained head deviation
        yaw = 32.0;
        reason = "sustained head deviation";
        level = phase > 115 ? "WARNING" : "NOTICE";
      }

      this.updateTelemetryUI({
        timestamp: Date.now() / 1000,
        face_detected: true,
        advisory_level: level,
        advisory_reason: reason,
        display_message: `Advisory: ${reason}`,
        avg_ear: ear,
        perclos: level === "NORMAL" ? 0.04 : 0.22,
        eye_closed: ear < 0.21,
        eye_closed_sec: ear < 0.21 ? (phase - 40) * 0.05 : 0.0,
        yaw_deg: yaw,
        pitch_deg: pitch,
        roll_deg: 0.0,
        head_deviated_sec: yaw > 25.0 ? (phase - 90) * 0.05 : 0.0,
        head_reason: yaw > 25.0 ? "turned right" : "facing forward",
        fps: 30.0,
      });
    }, 50);
  }

  async processWebcamLoop() {
    if (!this.isProcessing || this.currentMode !== 'webcam') return;

    if (this.videoEl.readyState >= 2) {
      this.captureCtx.drawImage(this.videoEl, 0, 0, 640, 480);
      const b64 = this.captureCanvas.toDataURL('image/jpeg', 0.7);

      const startTime = performance.now();
      try {
        const resp = await fetch('/api/process-frame', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: b64 }),
        });
        const data = await resp.json();
        const latency = performance.now() - startTime;
        const fps = Math.min(30, 1000 / Math.max(1, latency));
        data.fps = fps;

        this.updateTelemetryUI(data);
        this.renderCanvasHUD(data);
      } catch (e) {
        console.error('Frame process error:', e);
      }
    }

    requestAnimationFrame(() => this.processWebcamLoop());
  }

  updateTelemetryUI(data) {
    if (!data) return;

    const level = data.advisory_level || 'UNKNOWN';

    // Check for advisory sound
    if (level !== this.lastAdvisoryLevel) {
      if (level === 'NOTICE') this.playChime('NOTICE');
      if (level === 'WARNING') this.playChime('WARNING');
      this.lastAdvisoryLevel = level;
    }

    // Advisory Floating Banner
    this.advisoryBanner.className = `advisory-floating-banner ${level}`;
    this.bannerBadge.className = `banner-badge ${level}`;
    this.bannerBadge.textContent = level;
    this.bannerText.textContent = data.display_message || 'Attentive';

    // Telemetry Hero Values
    this.earValEl.textContent = Number(data.avg_ear || 0).toFixed(3);
    const earPct = Math.min(100, Math.max(0, (data.avg_ear / 0.45) * 100));
    this.earProgressEl.style.width = `${earPct}%`;
    this.earProgressEl.style.backgroundColor = data.avg_ear < 0.21 ? 'var(--accent-crimson)' : 'var(--accent-emerald)';

    this.closureValEl.textContent = `${Number(data.eye_closed_sec || 0).toFixed(2)}s`;

    const perclos = data.perclos != null ? (data.perclos * 100).toFixed(1) : '--';
    this.perclosValEl.textContent = `${perclos}%`;
    this.perclosProgressEl.style.width = data.perclos != null ? `${Math.min(100, data.perclos * 100)}%` : '0%';

    // Head Pose Gyro
    this.yawValEl.textContent = `${Number(data.yaw_deg || 0).toFixed(1)}°`;
    this.pitchValEl.textContent = `${Number(data.pitch_deg || 0).toFixed(1)}°`;
    this.rollValEl.textContent = `${Number(data.roll_deg || 0).toFixed(1)}°`;
    this.headDeviationValEl.textContent = `${Number(data.head_deviated_sec || 0).toFixed(1)}s (${data.head_reason || 'forward'})`;

    // FPS
    if (data.fps) {
      this.fpsStatEl.textContent = `${data.fps.toFixed(1)} FPS`;
    }

    // Update Sparkline chart
    this.earHistory.push(data.avg_ear || 0);
    this.earHistory.shift();
    this.drawSparkline();
  }

  drawSparkline() {
    const w = this.sparklineCanvas.width;
    const h = this.sparklineCanvas.height;
    const ctx = this.sparkCtx;

    ctx.clearRect(0, 0, w, h);

    // Threshold reference line
    const threshY = h - (0.21 / 0.5) * h;
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, threshY);
    ctx.lineTo(w, threshY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Sparkline curve
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const step = w / (this.earHistory.length - 1);
    this.earHistory.forEach((val, i) => {
      const y = h - (Math.min(0.5, Math.max(0, val)) / 0.5) * h;
      if (i === 0) ctx.moveTo(0, y);
      else ctx.lineTo(i * step, y);
    });
    ctx.stroke();
  }

  renderCanvasHUD(data) {
    const w = this.hudCanvas.width = this.videoEl.clientWidth || 640;
    const h = this.hudCanvas.height = this.videoEl.clientHeight || 480;
    const ctx = this.hudCtx;
    ctx.clearRect(0, 0, w, h);

    if (!data.face_detected) return;

    // Draw 3D Orientation Axes if returned
    if (data.axes) {
      const scaleX = w / 640;
      const scaleY = h / 480;
      const o = [data.axes.origin[0] * scaleX, data.axes.origin[1] * scaleY];
      const x = [data.axes.x_pt[0] * scaleX, data.axes.x_pt[1] * scaleY];
      const y = [data.axes.y_pt[0] * scaleX, data.axes.y_pt[1] * scaleY];
      const z = [data.axes.z_pt[0] * scaleX, data.axes.z_pt[1] * scaleY];

      ctx.lineWidth = 3;
      // Red: X Axis
      ctx.strokeStyle = '#ef4444';
      ctx.beginPath(); ctx.moveTo(o[0], o[1]); ctx.lineTo(x[0], x[1]); ctx.stroke();
      // Green: Y Axis
      ctx.strokeStyle = '#10b981';
      ctx.beginPath(); ctx.moveTo(o[0], o[1]); ctx.lineTo(y[0], y[1]); ctx.stroke();
      // Blue: Z Axis
      ctx.strokeStyle = '#3b82f6';
      ctx.beginPath(); ctx.moveTo(o[0], o[1]); ctx.lineTo(z[0], z[1]); ctx.stroke();
    }
  }

  async fetchConfig() {
    try {
      const res = await fetch('/api/config');
      const cfg = await res.json();
      document.getElementById('sliderEar').value = cfg.eye.ear_threshold;
      document.getElementById('lblSliderEar').textContent = cfg.eye.ear_threshold.toFixed(2);

      document.getElementById('sliderClosure').value = cfg.eye.closure_duration_warning_sec;
      document.getElementById('lblSliderClosure').textContent = `${cfg.eye.closure_duration_warning_sec.toFixed(1)}s`;

      document.getElementById('sliderYaw').value = cfg.headpose.yaw_threshold_deg;
      document.getElementById('lblSliderYaw').textContent = `${cfg.headpose.yaw_threshold_deg.toFixed(0)}°`;
    } catch (e) {
      console.warn('Failed to fetch config:', e);
    }
  }

  async updateConfigThrottled(payload) {
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      console.error('Config update failed:', e);
    }
  }

  startTelemetryPolling() {
    setInterval(async () => {
      // Refresh event audit table
      try {
        const resp = await fetch('/api/events');
        const data = await resp.json();
        if (data.events && this.eventsTableBody) {
          this.eventsTableBody.innerHTML = data.events.slice(-8).reverse().map(ev => `
            <tr>
              <td>${ev.timestamp_iso ? ev.timestamp_iso.substring(11, 19) : ''}</td>
              <td><span class="banner-badge ${ev.advisory_level}">${ev.advisory_level}</span></td>
              <td>${ev.advisory_reason}</td>
              <td>${ev.avg_ear}</td>
              <td>${ev.yaw_deg}° / ${ev.pitch_deg}°</td>
            </tr>
          `).join('');
        }
      } catch (e) {}
    }, 2500);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new DriveGuardApp();
});
