// Retro Sound Synthesis Engine using Web Audio API

class AudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private currentBgm: HTMLAudioElement | null = null;
  private currentBgmPath: string = '';
  private synthBgmInterval: any = null;
  private currentSynthTrackId: string = '';

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
    this.syncMuteWithBgm();
    return this.isMuted;
  }

  public getMuteStatus() {
    return this.isMuted;
  }

  private syncMuteWithBgm() {
    if (this.currentBgm) {
      this.currentBgm.muted = this.isMuted;
      if (!this.isMuted) {
        this.currentBgm.play().catch(() => {});
      }
    }
  }

  private getTrackIdFromPath(path: string): string {
    const p = path.toLowerCase();
    if (p.includes('2_23')) return '2_23_AM';
    if (p.includes('少年') || p.includes('summer')) return 'stage1';
    if (p.includes('flutter')) return 'stage2';
    if (p.includes('pastel') || p.includes('パステル') || p.includes('パステル')) return 'stage3';
    if (p.includes('thunder')) return 'stage4';
    if (p.includes('8bit') || p.includes('8-bit')) return 'stage5';
    if (p.includes('風') || p.includes('kaze')) return 'stage6';
    return '2_23_AM';
  }

  public playBgm(preferredPath: string) {
    const trackId = this.getTrackIdFromPath(preferredPath);
    
    // Always stop any active procedural synthesizer BGM first
    this.stopSynthBgm();

    const fallbacks = [preferredPath];
    
    // Auto-generate fallback options for absolute path, relative path & public folder structures
    if (preferredPath.startsWith('/')) {
      const name = preferredPath.substring(1);
      fallbacks.push(`public/${name}`);
      fallbacks.push(name);
    } else {
      fallbacks.push(`/${preferredPath}`);
      if (preferredPath.startsWith('public/')) {
        fallbacks.push(`/${preferredPath.substring(7)}`);
        fallbacks.push(preferredPath.substring(7));
      } else {
        fallbacks.push(`/public/${preferredPath}`);
        fallbacks.push(`public/${preferredPath}`);
      }
    }

    // Japanese NFD/NFC Normalization Fallbacks
    const normalizedNFC = preferredPath.normalize('NFC');
    const normalizedNFD = preferredPath.normalize('NFD');
    
    if (normalizedNFC !== preferredPath) {
      fallbacks.push(normalizedNFC);
      if (normalizedNFC.startsWith('/')) {
        fallbacks.push(`/public/${normalizedNFC.substring(1)}`);
      } else {
        fallbacks.push(`/${normalizedNFC}`);
      }
    }
    if (normalizedNFD !== preferredPath) {
      fallbacks.push(normalizedNFD);
      if (normalizedNFD.startsWith('/')) {
        fallbacks.push(`/public/${normalizedNFD.substring(1)}`);
      } else {
        fallbacks.push(`/${normalizedNFD}`);
      }
    }

    // Specific file string replacements (e.g. 8-bit_Aggressive1 vs 8bit_Aggressive1)
    if (preferredPath.includes('8-bit_Aggressive1')) {
      const alt = preferredPath.replace('8-bit_Aggressive1', '8bit_Aggressive1');
      fallbacks.push(alt);
      if (alt.startsWith('/')) fallbacks.push(`/public/${alt.substring(1)}`);
      else fallbacks.push(`/${alt}`);
    } else if (preferredPath.includes('8bit_Aggressive1')) {
      const alt = preferredPath.replace('8bit_Aggressive1', '8-bit_Aggressive1');
      fallbacks.push(alt);
      if (alt.startsWith('/')) fallbacks.push(`/public/${alt.substring(1)}`);
      else fallbacks.push(`/${alt}`);
    }

    // Filter duplicates
    const uniquePaths = Array.from(new Set(fallbacks));
    
    this.startBgmSequence(uniquePaths, 0, trackId);
  }

  private startBgmSequence(paths: string[], index: number, trackId: string) {
    if (index >= paths.length) {
      console.warn("All MP3 BGM paths failed to load or are deleted, starting robust 8-bit procedural synthesizer:", paths);
      this.playSynthBgm(trackId);
      return;
    }

    const path = paths[index];

    // If already playing this path and sound element is alive, just update play status
    if (this.currentBgmPath === path && this.currentBgm) {
      if (this.isMuted) {
        this.currentBgm.muted = true;
      } else {
        this.currentBgm.muted = false;
        this.currentBgm.play().catch(() => {});
      }
      return;
    }

    this.stopBgm();

    this.currentBgmPath = path;
    const audioEl = new Audio(path);
    audioEl.loop = true;
    audioEl.muted = this.isMuted;
    audioEl.volume = 0.20; // 20% volume is nice and atmospheric

    this.currentBgm = audioEl;

    // Set error callback to automatically try next fallback path
    audioEl.onerror = () => {
      console.warn(`Failed to load BGM path: ${path}, trying fallback...`);
      if (this.currentBgm === audioEl) {
        this.startBgmSequence(paths, index + 1, trackId);
      }
    };

    audioEl.play().catch((err) => {
      console.warn(`BGM autoplay deferred for interaction on path: ${path}`, err);
      
      const resumeBgm = () => {
        if (this.currentBgm === audioEl) {
          audioEl.play().catch(() => {});
        }
        window.removeEventListener('click', resumeBgm);
        window.removeEventListener('keydown', resumeBgm);
      };
      window.addEventListener('click', resumeBgm);
      window.addEventListener('keydown', resumeBgm);
    });
  }

  public stopBgm() {
    if (this.currentBgm) {
      this.currentBgm.pause();
      this.currentBgm = null;
    }
    this.currentBgmPath = '';
    this.stopSynthBgm();
  }

  // Beautiful procedural chip-tune loops
  public playSynthBgm(trackId: string) {
    if (this.currentSynthTrackId === trackId) return;
    this.stopSynthBgm();
    
    try {
      this.init();
    } catch (e) {
      return;
    }

    this.currentSynthTrackId = trackId;
    
    let bpm = 120;
    if (trackId === '2_23_AM') bpm = 95;
    else if (trackId === 'stage1') bpm = 120;
    else if (trackId === 'stage2') bpm = 135;
    else if (trackId === 'stage3') bpm = 115;
    else if (trackId === 'stage4') bpm = 140;
    else if (trackId === 'stage5') bpm = 150;
    else if (trackId === 'stage6') bpm = 130;

    const stepDuration = 60000 / bpm / 2; // Eighth-note steps
    let step = 0;

    const tick = () => {
      this.playSynthStep(trackId, step);
      step = (step + 1) % 32;
    };

    // Trigger immediately
    tick();
    this.synthBgmInterval = setInterval(tick, stepDuration);
  }

  public stopSynthBgm() {
    if (this.synthBgmInterval) {
      clearInterval(this.synthBgmInterval);
      this.synthBgmInterval = null;
    }
    this.currentSynthTrackId = '';
  }

  private playSynthStep(trackId: string, step: number) {
    if (this.isMuted) return;
    
    try {
      this.init();
    } catch (e) {
      return;
    }

    if (trackId === '2_23_AM') {
      // Gentle lofi chord cycle on odd/even steps
      const chordIdx = Math.floor(step / 8);
      const isBassStep = (step % 8 === 0 || step % 8 === 4);
      const isMelodyStep = (step % 2 === 0);

      const bassNotes = [130.81, 110.00, 87.31, 98.00]; // C3, A2, F2, G2
      const chordNotes = [
        [329.63, 392.00, 493.88, 523.25], // Cmaj7: E4, G4, B4, C5
        [261.63, 329.63, 392.00, 440.00], // Am7: C4, E4, G4, A4
        [220.00, 261.63, 329.63, 349.23], // Fmaj7: A3, C4, E4, F4
        [246.94, 293.66, 349.23, 392.00]  // G7: B3, D4, F4, G4
      ];

      if (isBassStep) {
        const freq = bassNotes[chordIdx];
        this.playTone([freq], 0.8, 'triangle', false, 0.04);
      }
      if (isMelodyStep) {
        const chord = chordNotes[chordIdx];
        const noteIdx = (step % 8) / 2;
        const freq = chord[noteIdx % chord.length];
        this.playTone([freq], 0.35, 'sine', false, 0.04);
      }
    } 
    else if (trackId === 'stage1') {
      // Upbeat happy summer adventure
      const chordIdx = Math.floor(step / 8); // C, F, G, C
      const bassNotes = [130.81, 174.61, 196.00, 130.81]; // C3, F3, G3, C3
      const isBassStep = (step % 4 === 0 || step % 4 === 2);
      
      if (isBassStep) {
        const bassFreq = bassNotes[chordIdx] * (step % 4 === 2 ? 1.5 : 1.0);
        this.playTone([bassFreq], 0.18, 'triangle', false, 0.035);
      }

      const melodyPattern = [
        659.25, 0, 783.99, 0, 1046.50, 0, 783.99, 0, // C chord: E5, G5, C6, G5
        698.46, 0, 880.00, 0, 1046.50, 0, 880.00, 0, // F chord: F5, A5, C6, A5
        783.99, 0, 987.77, 0, 1174.66, 0, 987.77, 0, // G chord: G5, B5, D6, B5
        1046.50, 0, 783.99, 0, 659.25, 0, 523.25, 0  // C chord: C6, G5, E5, C5
      ];
      const freq = melodyPattern[step];
      if (freq > 0) {
        this.playTone([freq], 0.15, 'square', false, 0.03);
      }
    } 
    else if (trackId === 'stage2') {
      // Windy sewer arpeggios
      const chordIdx = Math.floor(step / 8); // Dm, Gm, Bb, A
      const bassRoots = [146.83, 196.00, 116.54, 110.00]; // D3, G3, Bb2, A2
      
      const arpeggios = [
        [293.66, 349.23, 440.00, 587.33, 440.00, 349.23, 293.66, 349.23], // Dm
        [392.00, 466.16, 587.33, 783.99, 587.33, 466.16, 392.00, 466.16], // Gm
        [233.08, 293.66, 349.23, 466.16, 349.23, 293.66, 233.08, 293.66], // Bb
        [220.00, 277.18, 329.63, 440.00, 329.63, 277.18, 220.00, 277.18]  // A
      ];

      if (step % 4 === 0) {
        this.playTone([bassRoots[chordIdx]], 0.3, 'sine', false, 0.045);
      }

      const chordNotes = arpeggios[chordIdx];
      const noteFreq = chordNotes[step % 8] * 1.5;
      this.playTone([noteFreq], 0.11, 'sine', false, 0.025);
    } 
    else if (trackId === 'stage3') {
      // Red palace cherry sakura scale
      const chordIdx = Math.floor(step / 8); // Am, F, Dm, E
      const bassRoots = [110.00, 87.31, 146.83, 82.41]; // A2, F2, D3, E2
      
      if (step % 4 === 0) {
        this.playTone([bassRoots[chordIdx]], 0.35, 'triangle', false, 0.035);
      }

      const orientalMelody = [
        440.00, 0, 523.25, 0, 587.33, 0, 659.25, 0, // Am
        698.46, 0, 659.25, 0, 523.25, 0, 440.00, 0, // F
        587.33, 0, 698.46, 0, 880.00, 0, 698.46, 0, // Dm
        659.25, 0, 493.88, 0, 523.25, 0, 493.88, 0  // E
      ];
      
      const melodyFreq = orientalMelody[step];
      if (melodyFreq > 0) {
        this.playTone([melodyFreq], 0.22, 'triangle', false, 0.035);
      }
    } 
    else if (trackId === 'stage4') {
      // Electric techno beat
      const chordIdx = Math.floor(step / 8); // Em, C, G, B
      const bassRoots = [82.41, 65.41, 98.00, 123.47]; // E2, C2, G2, B2
      
      if (step % 2 === 0) {
        this.playTone([bassRoots[chordIdx]], 0.12, 'sawtooth', false, 0.02);
      }

      const laserPattern = [
        659.25, 1318.51, 0, 587.33, 783.99, 1568.00, 0, 0,
        523.25, 1046.50, 0, 493.88, 659.25, 783.99, 0, 0,
        783.99, 1568.00, 0, 739.99, 987.77, 1174.66, 0, 0,
        987.77, 1975.53, 0, 932.33, 311.13, 369.99, 0, 0
      ];
      const laserFreq = laserPattern[step];
      if (laserFreq > 0) {
        this.playTone([laserFreq], 0.08, 'square', false, 0.025);
      }
    } 
    else if (trackId === 'stage5') {
      // Cyber boss matrix chug
      const bassRoots = [65.41, 65.41, 69.30, 69.30]; // C2, Db2
      const chordIdx = Math.floor(step / 8);

      if (step % 2 === 0) {
        this.playTone([bassRoots[chordIdx]], 0.1, 'sawtooth', false, 0.025);
      }

      if (step % 8 === 0) {
        this.playTone([1200, 300], 0.35, 'sawtooth', true, 0.03);
      } else if (step % 2 === 1) {
        const cyberNotes = [523.25, 554.37, 659.25, 783.99];
        const cyberFreq = cyberNotes[(step + chordIdx) % cyberNotes.length] * 1.5;
        this.playTone([cyberFreq], 0.06, 'square', false, 0.02);
      }
    } 
    else if (trackId === 'stage6') {
      // WIND CUTTER - Epic Boss Flight
      const chordIdx = Math.floor(step / 8); // Dm, Bb, Gm, A
      const bassRoots = [146.83, 116.54, 196.00, 110.00];

      if (step % 4 === 0 || step % 4 === 3) {
        this.playTone([bassRoots[chordIdx]], 0.22, 'sawtooth', false, 0.03);
      }

      const windMelody = [
        587.33, 0, 659.25, 0, 698.46, 0, 880.00, 0, // Dm
        932.33, 0, 880.00, 0, 783.99, 0, 698.46, 0, // Bb
        587.33, 0, 698.46, 0, 880.00, 0, 698.46, 0, // Gm
        659.25, 0, 554.37, 0, 587.33, 0, 554.37, 0  // A
      ];
      const windFreq = windMelody[step];
      if (windFreq > 0) {
        this.playTone([windFreq], 0.2, 'square', false, 0.03);
      }
    }
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
