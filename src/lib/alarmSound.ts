/**
 * alarmSound.ts
 *
 * Web Audio API alarm sound generator.
 * Creates an escalating, annoying siren using oscillators.
 * No audio files needed — all synthesized in real-time.
 */

export class AlarmSound {
    private ctx: AudioContext | null = null;
    private mainOsc: OscillatorNode | null = null;
    private lfo: OscillatorNode | null = null;
    private gainNode: GainNode | null = null;
    private lfoGain: GainNode | null = null;
    private isPlaying = false;
    private volumeLevel = 0.3;
    private escalationTimer: ReturnType<typeof setInterval> | null = null;

    start() {
        if (this.isPlaying) return;
        this.isPlaying = true;

        this.ctx = new AudioContext();
        this.gainNode = this.ctx.createGain();
        this.gainNode.gain.value = this.volumeLevel;
        this.gainNode.connect(this.ctx.destination);

        // Main siren oscillator — harsh sawtooth wave
        this.mainOsc = this.ctx.createOscillator();
        this.mainOsc.type = "sawtooth";
        this.mainOsc.frequency.value = 800;

        // LFO to sweep the frequency up and down (siren effect)
        this.lfo = this.ctx.createOscillator();
        this.lfo.type = "sine";
        this.lfo.frequency.value = 3; // 3 sweeps per second

        this.lfoGain = this.ctx.createGain();
        this.lfoGain.gain.value = 400; // sweep range: 800 ± 400 Hz

        this.lfo.connect(this.lfoGain);
        this.lfoGain.connect(this.mainOsc.frequency);
        this.mainOsc.connect(this.gainNode);

        this.mainOsc.start();
        this.lfo.start();

        // Escalate volume over time — gets louder every 5 seconds
        this.escalationTimer = setInterval(() => {
            this.volumeLevel = Math.min(1.0, this.volumeLevel + 0.05);
            if (this.gainNode) {
                this.gainNode.gain.setValueAtTime(this.volumeLevel, this.ctx!.currentTime);
            }
            // Also increase siren speed for extra annoyance
            if (this.lfo) {
                const newFreq = Math.min(8, this.lfo.frequency.value + 0.3);
                this.lfo.frequency.setValueAtTime(newFreq, this.ctx!.currentTime);
            }
        }, 5000);
    }

    stop() {
        this.isPlaying = false;
        if (this.escalationTimer) {
            clearInterval(this.escalationTimer);
            this.escalationTimer = null;
        }
        try {
            this.mainOsc?.stop();
            this.lfo?.stop();
        } catch { /* already stopped */ }
        this.mainOsc?.disconnect();
        this.lfo?.disconnect();
        this.lfoGain?.disconnect();
        this.gainNode?.disconnect();
        this.ctx?.close();
        this.ctx = null;
        this.mainOsc = null;
        this.lfo = null;
        this.lfoGain = null;
        this.gainNode = null;
        this.volumeLevel = 0.3;
    }

    getIsPlaying() {
        return this.isPlaying;
    }
}

// Singleton
export const alarmSound = new AlarmSound();
