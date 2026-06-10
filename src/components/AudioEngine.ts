// Retro Sound Synthesis Engine using Web Audio API

class AudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  public getMuteStatus() {
    return this.isMuted;
  }

  private playTone(freqs: number[], duration: number, type: OscillatorType = 'sine', slide: boolean = false, volume: number = 0.1) {
    if (this.isMuted) return;
    try {
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      const now = this.ctx.currentTime;

      if (slide && freqs.length > 1) {
        osc.frequency.setValueAtTime(freqs[0], now);
        osc.frequency.exponentialRampToValueAtTime(freqs[1], now + duration);
      } else {
        freqs.forEach((freq, idx) => {
          const startTime = now + (duration / freqs.length) * idx;
          osc.frequency.setValueAtTime(freq, startTime);
        });
      }

      // Envelope volume control
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {
      console.warn("Audio failure:", e);
    }
  }

  public playClick() {
    this.playTone([400, 600], 0.08, 'triangle', false, 0.15);
  }

  public playMeow() {
    // A cute cat meow synth sound (slides frequency up 'me-' then down '-ow')
    if (this.isMuted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.frequency.setValueAtTime(392, now);
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.12);
      osc.frequency.exponentialRampToValueAtTime(554.37, now + 0.28);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.setValueAtTime(0.12, now + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

      osc.start(now);
      osc.stop(now + 0.28);
    } catch (e) {
      console.warn("Audio meow failure:", e);
    }
  }

  public playJump() {
    // Vintage upward sweep
    this.playTone([160, 520], 0.18, 'square', true, 0.08);
  }

  public playDoubleJump() {
    // Slightly higher pitch upward sweep
    this.playTone([240, 680], 0.15, 'square', true, 0.07);
  }

  public playCoin() {
    // Distinct double-tone retro chime (C5 -> G5)
    this.playTone([987.77, 1318.51], 0.2, 'sine', false, 0.12);
  }

  public playFish() {
    // Bubble aquatic sound
    this.playTone([440, 880], 0.15, 'triangle', true, 0.15);
  }

  public playHurt() {
    // Descending hazard sound with low buzz
    this.playTone([300, 60], 0.3, 'sawtooth', true, 0.15);
  }

  public playHeal() {
    // Dreamy chime (C5 -> E5 -> G5 -> C6)
    this.playTone([523.25, 659.25, 783.99, 1046.50], 0.3, 'sine', false, 0.15);
  }

  public playDefeatEnemy() {
    this.playTone([200, 400, 150], 0.15, 'triangle', false, 0.12);
  }

  public playScratch() {
    // Noise/shh sword trace like sound
    this.playTone([800, 1200], 0.12, 'sawtooth', true, 0.08);
  }

  public playShoot() {
    // High frequency falling dart sound
    this.playTone([1000, 500], 0.15, 'sine', true, 0.08);
  }

  public playSpring() {
    // Low bouncy spring wave
    this.playTone([150, 450, 200, 500], 0.25, 'triangle', true, 0.15);
  }

  public playPurchase() {
    // Coin cash chimes
    this.playTone([880, 1046.50, 1318.51], 0.35, 'sine', false, 0.15);
  }

  public playClear() {
    // Happy fanfarre
    if (this.isMuted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.50, 783.99, 1046.50, 1318.51];
      notes.forEach((note, index) => {
        setTimeout(() => {
          this.playTone([note], 0.25, 'sine', false, 0.15);
        }, index * 120);
      });
    } catch (e) {
      console.warn("Audio clear fx failure:", e);
    }
  }

  public playGameOver() {
    // Sad game-over melody
    if (this.isMuted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const notes = [440, 415.30, 392, 349.23];
      notes.forEach((note, index) => {
        setTimeout(() => {
          this.playTone([note], 0.4, 'sawtooth', false, 0.1);
        }, index * 200);
      });
    } catch (e) {
      console.warn("Audio clear fx failure:", e);
    }
  }
}

export const audio = new AudioEngine();
