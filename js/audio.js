// js/audio.js

const AudioModule = {
  ctx: null,

  // Inisialisasi AudioContext (dibutuhkan oleh browser modern)
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },

  // Suara Alarm Kebakaran / Sirine Ketahuan Mencontek
  playViolationAlarm() {
    this.init();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth'; // Gelombang tajam khas sirine/alarm

    // Efek frekuensi naik-turun cepat (Suara Sirine Darurat)
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.3);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.45);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.6);

    // Pengaturan Volume (Bunyi Bip Tegas)
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.65);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.65);
  }
};
