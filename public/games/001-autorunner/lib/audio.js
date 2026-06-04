const makeContext = () => {
	const AudioContextClass = window.AudioContext || window.webkitAudioContext;
	return AudioContextClass ? new AudioContextClass() : null;
};

const MUSIC_SOURCES = [
	{
		type: 'audio/ogg; codecs="vorbis"',
		url: new URL('../media/music.ogg', import.meta.url).href,
	},
	{
		type: 'audio/mpeg',
		url: new URL('../media/music.mp3', import.meta.url).href,
	},
];

const selectMusicSource = (audio) => {
	if (!audio?.canPlayType) {
		return MUSIC_SOURCES[0].url;
	}

	const source = MUSIC_SOURCES.find((candidate) => audio.canPlayType(candidate.type));
	return (source || MUSIC_SOURCES[0]).url;
};

export class AutorunnerAudio {
	constructor() {
		this.context = null;
		this.music = null;
		this.started = false;
	}

	ensure() {
		if (typeof window === 'undefined') {
			return;
		}

		this.ensureMusic();
		this.ensureContext();
	}

	ensureMusic() {
		if (typeof Audio === 'undefined') {
			return;
		}

		if (!this.music) {
			this.music = new Audio();
			this.music.loop = true;
			this.music.preload = 'auto';
			this.music.volume = 0.15;
			this.music.src = selectMusicSource(this.music);
		}

		if (this.started) {
			return;
		}

		this.started = true;
		const play = this.music.play();
		if (play?.catch) {
			play.catch(() => {
				this.started = false;
			});
		}
	}

	ensureContext() {
		if (!this.context) {
			this.context = makeContext();
		}

		if (!this.context) {
			return;
		}

		if (this.context.state === 'suspended') {
			this.context.resume();
		}
	}

	tone(frequency, duration, type, volume, when = 0) {
		if (!this.context) {
			return;
		}

		const oscillator = this.context.createOscillator();
		const gain = this.context.createGain();
		const start = when || this.context.currentTime;

		oscillator.type = type;
		oscillator.frequency.setValueAtTime(frequency, start);
		gain.gain.setValueAtTime(0.0001, start);
		gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + 0.01);
		gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
		oscillator.connect(gain);
		gain.connect(this.context.destination);
		oscillator.start(start);
		oscillator.stop(start + duration + 0.03);
	}

	noise(duration, volume, when = 0, filterFrequency = 900) {
		if (!this.context) {
			return;
		}

		const sampleRate = this.context.sampleRate;
		const frameCount = Math.max(1, Math.floor(sampleRate * duration));
		const buffer = this.context.createBuffer(1, frameCount, sampleRate);
		const data = buffer.getChannelData(0);

		for (let i = 0; i < frameCount; i++) {
			data[i] = (Math.random() * 2 - 1) * (1 - i / frameCount);
		}

		const source = this.context.createBufferSource();
		const filter = this.context.createBiquadFilter();
		const gain = this.context.createGain();
		const start = when || this.context.currentTime;

		filter.type = 'highpass';
		filter.frequency.setValueAtTime(filterFrequency, start);
		gain.gain.setValueAtTime(volume, start);
		gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
		source.buffer = buffer;
		source.connect(filter);
		filter.connect(gain);
		gain.connect(this.context.destination);
		source.start(start);
	}

	jump() {
		this.ensure();
		if (!this.context) {
			return;
		}

		const now = this.context.currentTime;
		this.tone(320, 0.08, 'square', 0.09, now);
		this.tone(480, 0.08, 'square', 0.045, now + 0.035);
	}

	land() {
		this.ensure();
		this.noise(0.05, 0.055, this.context?.currentTime || 0, 260);
	}

	fail() {
		this.ensure();
		if (!this.context) {
			return;
		}

		const now = this.context.currentTime;
		this.tone(120, 0.28, 'sawtooth', 0.12, now);
		this.tone(82, 0.42, 'sawtooth', 0.08, now + 0.12);
		this.noise(0.32, 0.075, now, 180);
	}
}
