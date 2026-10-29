// Authentic Two-Way Radio Sound Synthesizer powered by Web Audio API
// 100% Client-side mathematical audio generation, Zero bandwidth, Zero battery lag

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playRadioSound(
  type:
    | 'chirp'
    | 'roger_nasa'
    | 'roger_tactical'
    | 'roger_classic'
    | 'busy'
    | 'alarm'
    | 'squelch'
    | 'click'
    | 'vox_on'
    | 'vox_off'
    | 'director_chime'
) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    switch (type) {
      case 'director_chime': {
        // High-authority Director Priority Override Chime (Tri-tone: 880Hz -> 1320Hz -> 1760Hz)
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const osc3 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';
        osc3.type = 'sine';

        osc1.frequency.setValueAtTime(880, now);
        osc2.frequency.setValueAtTime(1320, now + 0.06);
        osc3.frequency.setValueAtTime(1760, now + 0.12);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

        osc1.connect(gain);
        osc2.connect(gain);
        osc3.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc1.stop(now + 0.06);
        osc2.start(now + 0.06);
        osc2.stop(now + 0.12);
        osc3.start(now + 0.12);
        osc3.stop(now + 0.28);
        break;
      }

      case 'chirp': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(850, now);
        osc.frequency.exponentialRampToValueAtTime(1450, now + 0.045);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.06);
        break;
      }

      case 'roger_nasa': {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';

        osc1.frequency.setValueAtTime(1150, now);
        osc2.frequency.setValueAtTime(1750, now + 0.055);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.setValueAtTime(0.001, now + 0.05);
        gain.gain.setValueAtTime(0.12, now + 0.055);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc1.stop(now + 0.05);
        osc2.start(now + 0.055);
        osc2.stop(now + 0.13);
        break;
      }

      case 'roger_tactical': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1400, now);
        osc.frequency.setValueAtTime(950, now + 0.06);

        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.12);
        break;
      }

      case 'roger_classic': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1520, now);

        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.08);
        break;
      }

      case 'busy': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, now);

        gain.gain.setValueAtTime(0.16, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.18);
        break;
      }

      case 'squelch': {
        const bufferSize = Math.floor(ctx.sampleRate * 0.035);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1800;
        filter.Q.value = 1.8;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

        whiteNoise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        whiteNoise.start(now);
        break;
      }

      case 'alarm': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';

        osc.frequency.setValueAtTime(800, now);
        osc.frequency.linearRampToValueAtTime(1400, now + 0.2);
        osc.frequency.linearRampToValueAtTime(800, now + 0.4);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.5);
        break;
      }

      case 'click': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.025);
        break;
      }

      case 'vox_on': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(700, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.035);
        break;
      }

      case 'vox_off': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(500, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.035);
        break;
      }
    }
  } catch {
    // ignore
  }
}
