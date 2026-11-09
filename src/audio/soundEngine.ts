export type MusicMood =
	| "CHESS"
	| "ALTERNATE_TIMELINE"
	| "REALM"
	| "COMBAT"
	| "ACADEMIC_OFFICE";

class SoundEngine {
	private ctx: AudioContext | null = null;
	private _muted: boolean = false;

	// Minimalist Generative Soundtrack state
	private musicStarted: boolean = false;
	private musicMasterGain: GainNode | null = null;
	private delayNode: DelayNode | null = null;
	private musicTimerId: number | null = null;

	private stepIndex: number = 0;
	private barIndex: number = 0;
	private currentMood: MusicMood = "CHESS";

	// Multiversal Pocket Watch horological state
	private watchHandsCount: number = 1;
	private watchParadoxStrain: number = 0;
	private watchImminentWarning: boolean = false;

	public get muted(): boolean {
		return this._muted;
	}

	public set muted(value: boolean) {
		this._muted = value;
		if (this.musicMasterGain && this.ctx) {
			const now = this.ctx.currentTime;
			this.musicMasterGain.gain.cancelScheduledValues(now);
			this.musicMasterGain.gain.setTargetAtTime(
				value ? 0.0001 : 0.22,
				now,
				0.08,
			);
		}
		if (!value) {
			this.startMusic();
		}
	}

	public setMusicMood(mood: MusicMood) {
		this.currentMood = mood;
	}

	public setWatchParadoxState(
		handsCount: number,
		paradoxStrain: number,
		imminentWarning: boolean,
	) {
		this.watchHandsCount = Math.max(1, handsCount);
		this.watchParadoxStrain = Math.max(0, Math.min(1, paradoxStrain));
		this.watchImminentWarning = imminentWarning;
	}

	private getContext(): AudioContext | null {
		if (this._muted) return null;
		if (!this.ctx && typeof window !== "undefined") {
			const AudioCtx =
				window.AudioContext ||
				(window as unknown as { webkitAudioContext: typeof AudioContext })
					.webkitAudioContext;
			if (AudioCtx) {
				this.ctx = new AudioCtx();
				this.setupMusicBus(this.ctx);
			}
		}
		if (this.ctx && this.ctx.state === "suspended") {
			this.ctx.resume().catch(() => {});
		}
		if (this.ctx && !this.musicStarted && !this._muted) {
			this.startMusic();
		}
		return this.ctx;
	}

	private setupMusicBus(ctx: AudioContext) {
		// Master gain for minimalist music (kept tasteful & unobtrusive beneath SFX)
		const master = ctx.createGain();
		master.gain.setValueAtTime(this._muted ? 0.0001 : 0.22, ctx.currentTime);
		master.connect(ctx.destination);
		this.musicMasterGain = master;

		// Atmospheric tape-style feedback delay for mysterious spatial depth
		const delay = ctx.createDelay(2.0);
		delay.delayTime.setValueAtTime(0.4125, ctx.currentTime); // Dotted-eighth hypnotic echo

		const feedback = ctx.createGain();
		feedback.gain.setValueAtTime(0.38, ctx.currentTime);

		const filter = ctx.createBiquadFilter();
		filter.type = "lowpass";
		filter.frequency.setValueAtTime(1650, ctx.currentTime);

		const wetGain = ctx.createGain();
		wetGain.gain.setValueAtTime(0.34, ctx.currentTime);

		delay.connect(filter);
		filter.connect(feedback);
		feedback.connect(delay);
		filter.connect(wetGain);
		wetGain.connect(master);

		this.delayNode = delay;
	}

	/**
	 * Starts the minimalist, repetitive, mysterious generative score.
	 * Inspired by Philip Glass / dark cosmic chamber minimalism:
	 * - Hypnotic 8-step ostinato arpeggios in D minoradd9 / Bb Lydian #5 / G Dorian / A Phrygian
	 * - Deep, slow-breathing sub-cello drone on each bar boundary
	 * - Sparse crystalline glass-harmonica overtones floating in the delay network
	 */
	public startMusic() {
		if (this.musicStarted || typeof window === "undefined") return;
		if (!this.ctx) {
			const AudioCtx =
				window.AudioContext ||
				(window as unknown as { webkitAudioContext: typeof AudioContext })
					.webkitAudioContext;
			if (!AudioCtx) return;
			this.ctx = new AudioCtx();
			this.setupMusicBus(this.ctx);
		}
		if (this.ctx.state === "suspended") {
			this.ctx.resume().catch(() => {});
		}

		this.musicStarted = true;
		this.scheduleNextMusicStep();
	}

	private scheduleNextMusicStep() {
		if (!this.musicStarted) return;

		// Step interval in ms based on current mood (repetitive, steady hypnotic pulse)
		const stepMs =
			this.currentMood === "ACADEMIC_OFFICE"
				? 360
				: this.currentMood === "COMBAT"
					? 235
					: this.currentMood === "REALM"
						? 310
						: this.currentMood === "ALTERNATE_TIMELINE"
							? 265
							: 275;

		if (this.musicTimerId != null) {
			window.clearTimeout(this.musicTimerId);
		}
		this.musicTimerId = window.setTimeout(() => {
			this.musicTimerId = null;
			if (
				!this._muted &&
				this.ctx &&
				this.ctx.state === "running" &&
				this.musicMasterGain
			) {
				this.triggerMinimalistStep(this.ctx, this.musicMasterGain);
			}
			this.scheduleNextMusicStep();
		}, stepMs);
	}

	private triggerMinimalistStep(ctx: AudioContext, dest: AudioNode) {
		const now = ctx.currentTime;
		const step = this.stepIndex % 8;
		const progressionIndex = this.barIndex % 4;

		// Special standalone soundscape when the Chess Universe is GONE and you are Dr. Pawn in a rainy University of Greater Andromeda office:
		if (this.currentMood === "ACADEMIC_OFFICE") {
			// 1. Continuous soft rain pattering against the office windowpane
			const bufferSize = Math.floor(ctx.sampleRate * 0.42);
			const rainBuf = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
			const data = rainBuf.getChannelData(0);
			for (let i = 0; i < bufferSize; i++) {
				const droplet =
					Math.random() < 0.015 ? (Math.random() * 2 - 1) * 2.4 : 0;
				data[i] = (Math.random() * 2 - 1) * 0.35 + droplet;
			}
			const rainSrc = ctx.createBufferSource();
			rainSrc.buffer = rainBuf;

			const rainBand = ctx.createBiquadFilter();
			rainBand.type = "bandpass";
			rainBand.frequency.setValueAtTime(1150 + (step % 3) * 180, now);
			rainBand.Q.setValueAtTime(0.85, now);

			const rainGain = ctx.createGain();
			rainGain.gain.setValueAtTime(0.001, now);
			rainGain.gain.linearRampToValueAtTime(0.09, now + 0.08);
			rainGain.gain.exponentialRampToValueAtTime(0.025, now + 0.41);

			rainSrc.connect(rainBand);
			rainBand.connect(rainGain);
			rainGain.connect(dest);
			rainSrc.start(now);
			rainSrc.stop(now + 0.42);

			// 2. Subtle 1987 fluorescent office light & radiator hum on step 0
			if (step === 0) {
				const humOsc = ctx.createOscillator();
				const humGain = ctx.createGain();
				humOsc.type = "sine";
				humOsc.frequency.setValueAtTime(120, now);
				humGain.gain.setValueAtTime(0.001, now);
				humGain.gain.linearRampToValueAtTime(0.025, now + 0.4);
				humGain.gain.exponentialRampToValueAtTime(0.001, now + 2.6);
				humOsc.connect(humGain);
				humGain.connect(dest);
				humOsc.start(now);
				humOsc.stop(now + 2.7);
			}

			// 3. Sparse, lonely Erik Satie / late-night campus felt-piano note on steps 0 and 5
			if (step === 0 || step === 5) {
				const satieNotes = [
					[293.66, 440.0], // D4, A4
					[261.63, 392.0], // C4, G4
					[246.94, 349.23], // B3, F4
					[220.0, 329.63], // A3, E4
				];
				const pair = satieNotes[progressionIndex];
				const note = pair[step === 0 ? 0 : 1];

				const pOsc = ctx.createOscillator();
				const pFilter = ctx.createBiquadFilter();
				const pGain = ctx.createGain();
				pOsc.type = "triangle";
				pOsc.frequency.setValueAtTime(note, now);
				pFilter.type = "lowpass";
				pFilter.frequency.setValueAtTime(620, now);
				pFilter.frequency.exponentialRampToValueAtTime(190, now + 1.4);

				pGain.gain.setValueAtTime(0.001, now);
				pGain.gain.linearRampToValueAtTime(0.09, now + 0.03);
				pGain.gain.exponentialRampToValueAtTime(0.0008, now + 1.45);

				pOsc.connect(pFilter);
				pFilter.connect(pGain);
				pGain.connect(dest);
				if (this.delayNode) {
					pGain.connect(this.delayNode);
				}
				pOsc.start(now);
				pOsc.stop(now + 1.5);
			}

			this.stepIndex += 1;
			if (this.stepIndex % 8 === 0) {
				this.barIndex += 1;
			}
			return;
		}

		// 4-bar mysterious minimalist harmonic cycle (frequencies in Hz):
		// Bar 0: D minor add9 (D3, A3, E4, F4, A3, D4, E4, F4)
		// Bar 1: Bb Major7 #11 (Bb2, F3, C4, D4, F3, A3, C4, E4)
		// Bar 2: G minor 6 / Dorian (G2, D3, A3, Bb3, D3, E3, A3, D4)
		// Bar 3: A7 b9 Phrygian Dominant tension (A2, E3, Bb3, C#4, E3, A3, Bb3, E4)
		const ostinatoPatterns: number[][] = [
			[146.83, 220.0, 329.63, 349.23, 220.0, 293.66, 329.63, 349.23],
			[116.54, 174.61, 261.63, 293.66, 174.61, 220.0, 261.63, 329.63],
			[98.0, 146.83, 220.0, 233.08, 146.83, 164.81, 220.0, 293.66],
			[110.0, 164.81, 233.08, 277.18, 164.81, 220.0, 233.08, 329.63],
		];

		const droneRoots = [73.42, 58.27, 49.0, 55.0]; // D2, Bb1, G1, A1
		const highBellNotes = [587.33, 659.25, 698.46, 880.0, 523.25]; // D5, E5, F5, A5, C5

		const pattern = ostinatoPatterns[progressionIndex];
		let noteFreq = pattern[step];

		// Subtle pitch shift in subterranean realms (down a fourth for cavernous gravity)
		if (this.currentMood === "REALM") {
			noteFreq *= 0.75;
		} else if (this.currentMood === "ALTERNATE_TIMELINE") {
			// Slight crystalline transposition (+2 semitones) in alternate timelines
			noteFreq *= 1.12246;
		}

		// 1. HYPNOTIC MINIMALIST OSTINATO PLUCK (every step)
		const osc = ctx.createOscillator();
		const subOsc = ctx.createOscillator();
		const filter = ctx.createBiquadFilter();
		const env = ctx.createGain();

		osc.type = this.currentMood === "ALTERNATE_TIMELINE" ? "sine" : "triangle";
		subOsc.type = "sine";

		osc.frequency.setValueAtTime(noteFreq, now);
		// Subtle detuned harmonic layer for mysterious warmth
		subOsc.frequency.setValueAtTime(noteFreq * 0.5, now);
		osc.detune.setValueAtTime(step % 2 === 0 ? 3 : -3, now);

		filter.type = "lowpass";
		const baseCutoff =
			this.currentMood === "COMBAT"
				? 1450
				: this.currentMood === "REALM"
					? 720
					: 980;
		const accent = step === 0 || step === 3 || step === 6 ? 1.45 : 1.0;
		filter.frequency.setValueAtTime(baseCutoff * accent, now);
		filter.frequency.exponentialRampToValueAtTime(240, now + 0.24);
		filter.Q.setValueAtTime(2.4, now);

		const noteGain =
			(step === 0 || step === 3 || step === 6 ? 0.16 : 0.1) *
			(this.currentMood === "REALM" ? 0.85 : 1.0);
		env.gain.setValueAtTime(0.001, now);
		env.gain.linearRampToValueAtTime(noteGain, now + 0.016);
		env.gain.exponentialRampToValueAtTime(0.0008, now + 0.28);

		const subMix = ctx.createGain();
		subMix.gain.setValueAtTime(0.35, now);

		osc.connect(filter);
		subOsc.connect(subMix);
		subMix.connect(filter);
		filter.connect(env);
		env.connect(dest);
		if (this.delayNode) {
			env.connect(this.delayNode);
		}

		osc.start(now);
		subOsc.start(now);
		osc.stop(now + 0.3);
		subOsc.stop(now + 0.3);

		// 2. DEEP MYSTERIOUS SUB-CELLO DRONE SWELL (at step 0 of each 8-step bar)
		if (step === 0) {
			const droneFreq =
				droneRoots[progressionIndex] *
				(this.currentMood === "ALTERNATE_TIMELINE" ? 1.12246 : 1.0);
			const droneOsc1 = ctx.createOscillator();
			const droneOsc2 = ctx.createOscillator();
			const droneFilter = ctx.createBiquadFilter();
			const droneGain = ctx.createGain();

			droneOsc1.type = "sawtooth";
			droneOsc2.type = "triangle";
			droneOsc1.frequency.setValueAtTime(droneFreq, now);
			droneOsc2.frequency.setValueAtTime(droneFreq * 1.5, now); // Fifth harmonic
			droneOsc1.detune.setValueAtTime(-6, now);
			droneOsc2.detune.setValueAtTime(6, now);

			droneFilter.type = "lowpass";
			droneFilter.frequency.setValueAtTime(160, now);
			droneFilter.frequency.linearRampToValueAtTime(340, now + 1.1);
			droneFilter.frequency.exponentialRampToValueAtTime(140, now + 2.3);

			droneGain.gain.setValueAtTime(0.001, now);
			droneGain.gain.linearRampToValueAtTime(0.14, now + 0.65);
			droneGain.gain.exponentialRampToValueAtTime(0.001, now + 2.35);

			const fifthMix = ctx.createGain();
			fifthMix.gain.setValueAtTime(0.28, now);

			droneOsc1.connect(droneFilter);
			droneOsc2.connect(fifthMix);
			fifthMix.connect(droneFilter);
			droneFilter.connect(droneGain);
			droneGain.connect(dest);

			droneOsc1.start(now);
			droneOsc2.start(now);
			droneOsc1.stop(now + 2.4);
			droneOsc2.stop(now + 2.4);
		}

		// 3. SPARSE ETHEREAL GLASS HARMONICA / BELL OVERTONE (on step 4 of odd bars)
		if (step === 4 && this.barIndex % 2 === 1) {
			const bellFreq =
				highBellNotes[
					(this.barIndex + progressionIndex) % highBellNotes.length
				];
			const bellOsc = ctx.createOscillator();
			const bellGain = ctx.createGain();

			bellOsc.type = "sine";
			bellOsc.frequency.setValueAtTime(bellFreq, now);
			bellOsc.frequency.linearRampToValueAtTime(bellFreq * 0.998, now + 1.1);

			bellGain.gain.setValueAtTime(0.001, now);
			bellGain.gain.linearRampToValueAtTime(0.055, now + 0.08);
			bellGain.gain.exponentialRampToValueAtTime(0.0005, now + 1.25);

			bellOsc.connect(bellGain);
			bellGain.connect(dest);
			if (this.delayNode) {
				bellGain.connect(this.delayNode);
			}

			bellOsc.start(now);
			bellOsc.stop(now + 1.3);
		}

		// 4. SUBTLE RITUAL HEARTBEAT PULSE DURING COMBAT DUELS (on steps 0 and 3)
		if (this.currentMood === "COMBAT" && (step === 0 || step === 3)) {
			const pulseOsc = ctx.createOscillator();
			const pulseGain = ctx.createGain();
			pulseOsc.type = "sine";
			pulseOsc.frequency.setValueAtTime(step === 0 ? 85 : 68, now);
			pulseOsc.frequency.exponentialRampToValueAtTime(28, now + 0.16);

			pulseGain.gain.setValueAtTime(step === 0 ? 0.16 : 0.1, now);
			pulseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

			pulseOsc.connect(pulseGain);
			pulseGain.connect(dest);
			pulseOsc.start(now);
			pulseOsc.stop(now + 0.19);
		}

		// 5. MULTIVERSAL POCKET WATCH ESCAPEMENT TICK-TOCK & PARADOX GEAR STRAIN
		if (
			step % 2 === 0 ||
			this.watchImminentWarning ||
			this.watchHandsCount >= 3
		) {
			const isTick = step % 4 === 0;
			const tickOsc = ctx.createOscillator();
			const tickFilter = ctx.createBiquadFilter();
			const tickGain = ctx.createGain();

			tickOsc.type = "triangle";
			const tickFreq = isTick ? 1920 : 1480;
			tickOsc.frequency.setValueAtTime(
				tickFreq * (this.watchImminentWarning ? 1.18 : 1.0),
				now,
			);
			tickOsc.frequency.exponentialRampToValueAtTime(380, now + 0.024);

			tickFilter.type = "bandpass";
			tickFilter.frequency.setValueAtTime(1650, now);
			tickFilter.Q.setValueAtTime(3.5, now);

			const tickVol = Math.min(
				0.16,
				0.045 +
					(this.watchHandsCount - 1) * 0.015 +
					this.watchParadoxStrain * 0.06,
			);
			tickGain.gain.setValueAtTime(tickVol, now);
			tickGain.gain.exponentialRampToValueAtTime(0.0005, now + 0.028);

			tickOsc.connect(tickFilter);
			tickFilter.connect(tickGain);
			tickGain.connect(dest);
			tickOsc.start(now);
			tickOsc.stop(now + 0.03);
		}

		// Stressed metallic gear creak under high paradox load
		if (this.watchParadoxStrain > 0.45 && step === 6) {
			const creakOsc = ctx.createOscillator();
			const creakGain = ctx.createGain();
			creakOsc.type = "sawtooth";
			creakOsc.frequency.setValueAtTime(215, now);
			creakOsc.frequency.linearRampToValueAtTime(178, now + 0.19);
			creakGain.gain.setValueAtTime(0.04 * this.watchParadoxStrain, now);
			creakGain.gain.exponentialRampToValueAtTime(0.0005, now + 0.22);
			creakOsc.connect(creakGain);
			creakGain.connect(dest);
			creakOsc.start(now);
			creakOsc.stop(now + 0.23);
		}

		this.stepIndex += 1;
		if (this.stepIndex % 8 === 0) {
			this.barIndex += 1;
		}
	}

	public playChessSelect() {
		const ctx = this.getContext();
		if (!ctx) return;
		const now = ctx.currentTime;
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = "sine";
		osc.frequency.setValueAtTime(520, now);
		osc.frequency.exponentialRampToValueAtTime(780, now + 0.08);
		gain.gain.setValueAtTime(0.12, now);
		gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
		osc.connect(gain);
		gain.connect(ctx.destination);
		osc.start(now);
		osc.stop(now + 0.09);
	}

	public playChessMove() {
		const ctx = this.getContext();
		if (!ctx) return;
		const now = ctx.currentTime;
		// Marble thud
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = "triangle";
		osc.frequency.setValueAtTime(160, now);
		osc.frequency.exponentialRampToValueAtTime(48, now + 0.14);
		gain.gain.setValueAtTime(0.25, now);
		gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
		osc.connect(gain);
		gain.connect(ctx.destination);
		osc.start(now);
		osc.stop(now + 0.15);
	}

	public playArenaTransition() {
		const ctx = this.getContext();
		if (!ctx) return;
		const now = ctx.currentTime;

		// Deep tectonic brass/synth swell
		const freqs = [110, 164.81, 220, 329.63];
		freqs.forEach((f, idx) => {
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = idx % 2 === 0 ? "sawtooth" : "triangle";
			osc.frequency.setValueAtTime(f * 0.5, now);
			osc.frequency.exponentialRampToValueAtTime(f, now + 0.55);

			const filter = ctx.createBiquadFilter();
			filter.type = "lowpass";
			filter.frequency.setValueAtTime(300, now);
			filter.frequency.exponentialRampToValueAtTime(2400, now + 0.5);

			gain.gain.setValueAtTime(0.01, now);
			gain.gain.linearRampToValueAtTime(0.09, now + 0.25);
			gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

			osc.connect(filter);
			filter.connect(gain);
			gain.connect(ctx.destination);
			osc.start(now);
			osc.stop(now + 0.85);
		});
	}

	public playSwing(heavy: boolean = false) {
		const ctx = this.getContext();
		if (!ctx) return;
		const now = ctx.currentTime;
		const dur = heavy ? 0.22 : 0.12;

		// White noise burst filtered for whoosh
		const bufferSize = Math.floor(ctx.sampleRate * dur);
		const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
		const data = buffer.getChannelData(0);
		for (let i = 0; i < bufferSize; i++) {
			data[i] = Math.random() * 2 - 1;
		}

		const noise = ctx.createBufferSource();
		noise.buffer = buffer;

		const filter = ctx.createBiquadFilter();
		filter.type = "bandpass";
		filter.frequency.setValueAtTime(heavy ? 420 : 880, now);
		filter.frequency.exponentialRampToValueAtTime(heavy ? 180 : 340, now + dur);
		filter.Q.value = 2.2;

		const gain = ctx.createGain();
		gain.gain.setValueAtTime(heavy ? 0.22 : 0.14, now);
		gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

		noise.connect(filter);
		filter.connect(gain);
		gain.connect(ctx.destination);
		noise.start(now);
	}

	public playHit(type: "light" | "heavy" | "special" | "finisher") {
		const ctx = this.getContext();
		if (!ctx) return;
		const now = ctx.currentTime;

		const osc = ctx.createOscillator();
		const gain = ctx.createGain();

		if (type === "light") {
			osc.type = "triangle";
			osc.frequency.setValueAtTime(280, now);
			osc.frequency.exponentialRampToValueAtTime(75, now + 0.11);
			gain.gain.setValueAtTime(0.28, now);
			gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
			osc.connect(gain);
			gain.connect(ctx.destination);
			osc.start(now);
			osc.stop(now + 0.12);
		} else if (type === "heavy") {
			osc.type = "sawtooth";
			osc.frequency.setValueAtTime(190, now);
			osc.frequency.exponentialRampToValueAtTime(42, now + 0.22);
			gain.gain.setValueAtTime(0.38, now);
			gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
			osc.connect(gain);
			gain.connect(ctx.destination);
			osc.start(now);
			osc.stop(now + 0.24);
		} else {
			// Finisher or Special impact: dual harmonic crunch
			[150, 225, 450].forEach((freq, idx) => {
				const o = ctx.createOscillator();
				const g = ctx.createGain();
				o.type = idx === 0 ? "sawtooth" : "square";
				o.frequency.setValueAtTime(freq, now);
				o.frequency.exponentialRampToValueAtTime(freq * 0.28, now + 0.28);
				g.gain.setValueAtTime(0.18, now);
				g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
				o.connect(g);
				g.connect(ctx.destination);
				o.start(now);
				o.stop(now + 0.3);
			});
		}
	}

	public playBlock(isParry: boolean = false) {
		const ctx = this.getContext();
		if (!ctx) return;
		const now = ctx.currentTime;

		if (isParry) {
			// High metallic resonant ring!
			[880, 1320, 1760].forEach((f) => {
				const osc = ctx.createOscillator();
				const gain = ctx.createGain();
				osc.type = "sine";
				osc.frequency.setValueAtTime(f, now);
				osc.frequency.exponentialRampToValueAtTime(f * 1.15, now + 0.32);
				gain.gain.setValueAtTime(0.16, now);
				gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
				osc.connect(gain);
				gain.connect(ctx.destination);
				osc.start(now);
				osc.stop(now + 0.35);
			});
		} else {
			// Metallic clank
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = "square";
			osc.frequency.setValueAtTime(420, now);
			osc.frequency.exponentialRampToValueAtTime(190, now + 0.09);
			gain.gain.setValueAtTime(0.18, now);
			gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
			osc.connect(gain);
			gain.connect(ctx.destination);
			osc.start(now);
			osc.stop(now + 0.1);
		}
	}

	public playSpecialActivate() {
		const ctx = this.getContext();
		if (!ctx) return;
		const now = ctx.currentTime;
		const notes = [261.63, 329.63, 392.0, 523.25, 659.25];
		notes.forEach((freq, i) => {
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = "triangle";
			const start = now + i * 0.04;
			osc.frequency.setValueAtTime(freq, start);
			osc.frequency.exponentialRampToValueAtTime(freq * 1.25, start + 0.25);
			gain.gain.setValueAtTime(0.14, start);
			gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28);
			osc.connect(gain);
			gain.connect(ctx.destination);
			osc.start(start);
			osc.stop(start + 0.28);
		});
	}

	public playKO() {
		const ctx = this.getContext();
		if (!ctx) return;
		const now = ctx.currentTime;
		// Dramatic gong + low sub drop
		const sub = ctx.createOscillator();
		const subGain = ctx.createGain();
		sub.type = "sine";
		sub.frequency.setValueAtTime(120, now);
		sub.frequency.exponentialRampToValueAtTime(28, now + 0.8);
		subGain.gain.setValueAtTime(0.45, now);
		subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
		sub.connect(subGain);
		subGain.connect(ctx.destination);
		sub.start(now);
		sub.stop(now + 0.85);

		[220, 277.18, 329.63, 440].forEach((freq) => {
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = "sawtooth";
			osc.frequency.setValueAtTime(freq, now);
			gain.gain.setValueAtTime(0.12, now);
			gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
			osc.connect(gain);
			gain.connect(ctx.destination);
			osc.start(now);
			osc.stop(now + 0.9);
		});
	}

	private lastHopSoundTime = 0;

	public playBystanderHop() {
		const ctx = this.getContext();
		if (!ctx) return;
		const nowMs = performance.now();
		if (nowMs - this.lastHopSoundTime < 140) return; // Throttle when multiple pieces scatter at once
		this.lastHopSoundTime = nowMs;

		const now = ctx.currentTime;
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = "sine";
		const baseFreq = 320 + Math.random() * 180;
		osc.frequency.setValueAtTime(baseFreq, now);
		osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.65, now + 0.09);
		gain.gain.setValueAtTime(0.06, now);
		gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
		osc.connect(gain);
		gain.connect(ctx.destination);
		osc.start(now);
		osc.stop(now + 0.1);
	}

	public playWesternStandoffCut(shotIndex: number) {
		const ctx = this.getContext();
		if (!ctx) return;
		const now = ctx.currentTime;

		// 1. Whip-zoom lens whoosh (filtered noise burst)
		const bufferSize = Math.floor(ctx.sampleRate * 0.14);
		const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
		const data = buffer.getChannelData(0);
		for (let i = 0; i < bufferSize; i++) {
			data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
		}
		const noise = ctx.createBufferSource();
		noise.buffer = buffer;

		const filter = ctx.createBiquadFilter();
		filter.type = "bandpass";
		filter.frequency.setValueAtTime(350, now);
		filter.frequency.exponentialRampToValueAtTime(1800, now + 0.09);
		filter.Q.value = 2.5;

		const nGain = ctx.createGain();
		nGain.gain.setValueAtTime(0.18, now);
		nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

		noise.connect(filter);
		filter.connect(nGain);
		nGain.connect(ctx.destination);
		noise.start(now);

		// 2. Spaghetti Western tense metallic twang / bell sting
		const notes =
			shotIndex === 0
				? [329.63, 493.88] // E4 -> B4
				: shotIndex === 1
					? [392.0, 587.33] // G4 -> D5
					: [246.94, 329.63, 493.88, 659.25]; // B-minor / E-minor dramatic standoff chord

		notes.forEach((freq, idx) => {
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = shotIndex === 2 ? "sawtooth" : "triangle";
			const start = now + idx * 0.055;
			osc.frequency.setValueAtTime(freq, start);
			// Slight vibrato/bend on the standoff note
			osc.frequency.linearRampToValueAtTime(freq * 1.015, start + 0.18);
			osc.frequency.linearRampToValueAtTime(freq, start + 0.38);

			gain.gain.setValueAtTime(shotIndex === 2 ? 0.09 : 0.14, start);
			gain.gain.exponentialRampToValueAtTime(0.001, start + 0.48);

			osc.connect(gain);
			gain.connect(ctx.destination);
			osc.start(start);
			osc.stop(start + 0.48);
		});
	}

	public playBladeClashLock() {
		const ctx = this.getContext();
		if (!ctx) return;
		const now = ctx.currentTime;

		// High-tension metallic blade bind screech + ring
		const freqs = [1180, 1760, 2480];
		freqs.forEach((f, idx) => {
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = idx === 0 ? "sawtooth" : "triangle";
			osc.frequency.setValueAtTime(f, now);
			osc.frequency.exponentialRampToValueAtTime(f * 1.18, now + 0.25);

			gain.gain.setValueAtTime(0.11 / (idx + 1), now);
			gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

			osc.connect(gain);
			gain.connect(ctx.destination);
			osc.start(now);
			osc.stop(now + 0.35);
		});
	}

	public playBulletTimeParry() {
		const ctx = this.getContext();
		if (!ctx) return;
		const now = ctx.currentTime;

		// 1. Sub-bass time-dilation drop
		const sub = ctx.createOscillator();
		const subGain = ctx.createGain();
		sub.type = "sine";
		sub.frequency.setValueAtTime(160, now);
		sub.frequency.exponentialRampToValueAtTime(38, now + 0.38);
		subGain.gain.setValueAtTime(0.28, now);
		subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
		sub.connect(subGain);
		subGain.connect(ctx.destination);
		sub.start(now);
		sub.stop(now + 0.4);

		// 2. High-noon crystalline bell harmonic
		[880, 1318.5].forEach((freq, i) => {
			const osc = ctx.createOscillator();
			const g = ctx.createGain();
			osc.type = "sine";
			osc.frequency.setValueAtTime(freq, now + i * 0.04);
			g.gain.setValueAtTime(0.12, now + i * 0.04);
			g.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
			osc.connect(g);
			g.connect(ctx.destination);
			osc.start(now + i * 0.04);
			osc.stop(now + 0.45);
		});
	}

	public playQuantumEntangle(isRewind = false) {
		const ctx = this.getContext();
		if (!ctx) return;
		const now = ctx.currentTime;

		const chord = isRewind
			? [783.99, 587.33, 440, 293.66]
			: [440, 659.25, 880, 1174.66];
		chord.forEach((freq, idx) => {
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = "sine";
			const t0 = now + idx * 0.045;
			osc.frequency.setValueAtTime(freq, t0);
			osc.frequency.exponentialRampToValueAtTime(
				isRewind ? freq * 0.85 : freq * 1.06,
				t0 + 0.32,
			);

			gain.gain.setValueAtTime(0.09, t0);
			gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.36);

			osc.connect(gain);
			gain.connect(ctx.destination);
			osc.start(t0);
			osc.stop(t0 + 0.36);
		});
	}

	public playTacticalIntervention(isCrossDimensional: boolean) {
		const ctx = this.getContext();
		if (!ctx) return;
		const now = ctx.currentTime;

		// 1. Dimensional Rift Tear / Tactical Horn Blast
		const hornFreqs = isCrossDimensional
			? [293.66, 440.0, 587.33, 880.0] // D4 - A4 - D5 - A5 Quantum Rift Fanfare
			: [261.63, 392.0, 523.25]; // C4 - G4 - C5 Tactical Vanguard Horn

		hornFreqs.forEach((freq, idx) => {
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = isCrossDimensional ? "sawtooth" : "triangle";
			const t0 = now + idx * 0.038;
			osc.frequency.setValueAtTime(freq * 0.92, t0);
			osc.frequency.exponentialRampToValueAtTime(freq, t0 + 0.08);
			osc.frequency.exponentialRampToValueAtTime(freq * 1.04, t0 + 0.38);

			gain.gain.setValueAtTime(0.11 / (idx * 0.4 + 1), t0);
			gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.44);

			osc.connect(gain);
			gain.connect(ctx.destination);
			osc.start(t0);
			osc.stop(t0 + 0.44);
		});
	}

	public playRealmPortalTransition(descending: boolean = true) {
		const ctx = this.getContext();
		if (!ctx) return;
		const now = ctx.currentTime;

		// Deep sub-dimensional rift resonance + harmonic shimmer
		const baseFreqs = descending
			? [220, 164.81, 110, 73.42]
			: [110, 164.81, 246.94, 329.63, 440];

		baseFreqs.forEach((freq, idx) => {
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = idx % 2 === 0 ? "sine" : "triangle";
			const t0 = now + idx * 0.065;
			osc.frequency.setValueAtTime(descending ? freq * 1.3 : freq * 0.75, t0);
			osc.frequency.exponentialRampToValueAtTime(freq, t0 + 0.48);

			gain.gain.setValueAtTime(0.12, t0);
			gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.56);

			osc.connect(gain);
			gain.connect(ctx.destination);
			osc.start(t0);
			osc.stop(t0 + 0.56);
		});
	}

	public playMirrorParityFlip() {
		const ctx = this.getContext();
		if (!ctx) return;
		const now = ctx.currentTime;

		// Crystalline glass chord inversion
		[523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, idx) => {
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = "sine";
			const t0 = now + idx * 0.035;
			osc.frequency.setValueAtTime(freq, t0);
			osc.frequency.exponentialRampToValueAtTime(freq * 1.5, t0 + 0.35);

			gain.gain.setValueAtTime(0.09, t0);
			gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.4);

			osc.connect(gain);
			gain.connect(ctx.destination);
			osc.start(t0);
			osc.stop(t0 + 0.4);
		});
	}

	public playCrucibleHazard(isAnvilBuff: boolean = false) {
		const ctx = this.getContext();
		if (!ctx) return;
		const now = ctx.currentTime;

		if (isAnvilBuff) {
			// Heavy blacksmith anvil ring + harmonic ascend
			[440, 880, 1320, 1760].forEach((f, i) => {
				const osc = ctx.createOscillator();
				const gain = ctx.createGain();
				osc.type = i === 0 ? "triangle" : "sine";
				osc.frequency.setValueAtTime(f, now);
				gain.gain.setValueAtTime(0.15 / (i + 1), now);
				gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
				osc.connect(gain);
				gain.connect(ctx.destination);
				osc.start(now);
				osc.stop(now + 0.65);
			});
		} else {
			// Sizzling magma / piston slam crunch
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = "sawtooth";
			osc.frequency.setValueAtTime(140, now);
			osc.frequency.exponentialRampToValueAtTime(36, now + 0.28);
			gain.gain.setValueAtTime(0.26, now);
			gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
			osc.connect(gain);
			gain.connect(ctx.destination);
			osc.start(now);
			osc.stop(now + 0.32);
		}
	}

	public playWatchHandForged() {
		const ctx = this.getContext();
		if (!ctx) return;
		const now = ctx.currentTime;

		// 1. Heavy mechanical clockwork ratchet clicks (3 rapid escapement locks)
		for (let i = 0; i < 3; i++) {
			const t0 = now + i * 0.055;
			const clickOsc = ctx.createOscillator();
			const clickGain = ctx.createGain();
			clickOsc.type = "square";
			clickOsc.frequency.setValueAtTime(920 + i * 240, t0);
			clickOsc.frequency.exponentialRampToValueAtTime(220, t0 + 0.035);
			clickGain.gain.setValueAtTime(0.14, t0);
			clickGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.04);
			clickOsc.connect(clickGain);
			clickGain.connect(ctx.destination);
			clickOsc.start(t0);
			clickOsc.stop(t0 + 0.045);
		}

		// 2. Ascending horological chime as the new hand locks into place
		[440, 554.37, 659.25, 880].forEach((freq, idx) => {
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = "sine";
			const t0 = now + 0.12 + idx * 0.05;
			osc.frequency.setValueAtTime(freq, t0);
			gain.gain.setValueAtTime(0.11 / (idx * 0.35 + 1), t0);
			gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.55);
			osc.connect(gain);
			gain.connect(ctx.destination);
			osc.start(t0);
			osc.stop(t0 + 0.58);
		});
	}

	public playWatchDoomBell(isParadoxCollision: boolean = false) {
		const ctx = this.getContext();
		if (!ctx) return;
		const now = ctx.currentTime;

		// 1. Deep cathedral bronze bell partials (inharmonic minor third overtone series)
		const partials = isParadoxCollision
			? [98.0, 196.0, 233.08, 293.66, 466.16, 783.99]
			: [110.0, 220.0, 261.63, 329.63, 523.25];

		partials.forEach((freq, idx) => {
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = idx === 0 ? "triangle" : "sine";
			osc.frequency.setValueAtTime(freq, now);
			osc.frequency.exponentialRampToValueAtTime(freq * 0.992, now + 1.45);

			gain.gain.setValueAtTime(0.24 / (idx * 0.55 + 1), now);
			gain.gain.exponentialRampToValueAtTime(0.0008, now + 1.5);

			osc.connect(gain);
			gain.connect(ctx.destination);
			osc.start(now);
			osc.stop(now + 1.55);
		});

		// 2. If Paradox Square Death or Timeline Collapse: sharp crystal fracture snap!
		if (isParadoxCollision) {
			[1480, 2240, 3120].forEach((f, i) => {
				const snapOsc = ctx.createOscillator();
				const snapGain = ctx.createGain();
				snapOsc.type = "sawtooth";
				const t0 = now + i * 0.03;
				snapOsc.frequency.setValueAtTime(f, t0);
				snapOsc.frequency.exponentialRampToValueAtTime(f * 0.42, t0 + 0.14);
				snapGain.gain.setValueAtTime(0.14, t0);
				snapGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.16);
				snapOsc.connect(snapGain);
				snapGain.connect(ctx.destination);
				snapOsc.start(t0);
				snapOsc.stop(t0 + 0.17);
			});
		}
	}

	public playSynodResonance(isAscension: boolean = false) {
		const ctx = this.getContext();
		if (!ctx) return;
		const now = ctx.currentTime;

		// Shimmering polyharmonic Synod Triad chord (D major9 / Lydian celestial resonance)
		const freqs = isAscension
			? [293.66, 440.0, 587.33, 739.99, 880.0, 1174.66, 1479.98]
			: [293.66, 440.0, 659.25, 739.99, 1108.73];

		freqs.forEach((freq, idx) => {
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = idx % 2 === 0 ? "sine" : "triangle";
			const t0 = now + idx * 0.04;
			osc.frequency.setValueAtTime(freq * 0.98, t0);
			osc.frequency.exponentialRampToValueAtTime(freq, t0 + 0.09);
			osc.frequency.exponentialRampToValueAtTime(freq * 1.005, t0 + 0.72);

			gain.gain.setValueAtTime(0.11 / (idx * 0.35 + 1), t0);
			gain.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.78);

			osc.connect(gain);
			gain.connect(ctx.destination);
			if (this.delayNode) {
				gain.connect(this.delayNode);
			}
			osc.start(t0);
			osc.stop(t0 + 0.8);
		});
	}

	public playBrokenCoffeeMachineSputter() {
		const ctx = this.getContext();
		if (!ctx) return;
		const now = ctx.currentTime;

		// Pathetic 1987 heating-coil click followed by a dry, calcified gurgle
		for (let i = 0; i < 4; i++) {
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = "sawtooth";
			const t0 = now + i * 0.09;
			osc.frequency.setValueAtTime(140 - i * 18, t0);
			osc.frequency.exponentialRampToValueAtTime(48, t0 + 0.07);
			gain.gain.setValueAtTime(0.12, t0);
			gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.075);
			osc.connect(gain);
			gain.connect(ctx.destination);
			osc.start(t0);
			osc.stop(t0 + 0.08);
		}
	}

	public playRejectionStamp() {
		const ctx = this.getContext();
		if (!ctx) return;
		const now = ctx.currentTime;

		// Heavy bureaucratic rubber stamp THUD + Reviewer #2 dissonance
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = "triangle";
		osc.frequency.setValueAtTime(115, now);
		osc.frequency.exponentialRampToValueAtTime(36, now + 0.24);
		gain.gain.setValueAtTime(0.28, now);
		gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
		osc.connect(gain);
		gain.connect(ctx.destination);
		osc.start(now);
		osc.stop(now + 0.28);
	}

	public playOfficeKeyboardClack() {
		const ctx = this.getContext();
		if (!ctx) return;
		const now = ctx.currentTime;

		// IBM Model M mechanical keyboard clack
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = "square";
		osc.frequency.setValueAtTime(1650 + Math.random() * 420, now);
		osc.frequency.exponentialRampToValueAtTime(320, now + 0.025);
		gain.gain.setValueAtTime(0.07, now);
		gain.gain.exponentialRampToValueAtTime(0.001, now + 0.028);
		osc.connect(gain);
		gain.connect(ctx.destination);
		osc.start(now);
		osc.stop(now + 0.03);
	}

	public playTramChime() {
		const ctx = this.getContext();
		if (!ctx) return;
		const now = ctx.currentTime;

		// Pleasant retro municipal tram chime (G4 -> C5 -> E5 harmonic transit announcement)
		[392.0, 523.25, 659.25].forEach((freq, idx) => {
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = "sine";
			const t0 = now + idx * 0.16;
			osc.frequency.setValueAtTime(freq, t0);
			gain.gain.setValueAtTime(0.18, t0);
			gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.55);
			osc.connect(gain);
			gain.connect(ctx.destination);
			osc.start(t0);
			osc.stop(t0 + 0.56);
		});
	}

	public playTramBell() {
		const ctx = this.getContext();
		if (!ctx) return;
		const now = ctx.currentTime;

		// Crisp dual brass tram gong / safety bell (Ding-ding!)
		[0, 0.13].forEach((delay) => {
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = "triangle";
			const t0 = now + delay;
			osc.frequency.setValueAtTime(1864.66, t0); // A#6
			osc.frequency.exponentialRampToValueAtTime(1480, t0 + 0.18);
			gain.gain.setValueAtTime(0.16, t0);
			gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.2);
			osc.connect(gain);
			gain.connect(ctx.destination);
			osc.start(t0);
			osc.stop(t0 + 0.22);
		});
	}

	public playTramMotorHum() {
		const ctx = this.getContext();
		if (!ctx) return;
		const now = ctx.currentTime;

		// Electric inverter acceleration whine & steel wheel rail resonance
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = "sawtooth";
		osc.frequency.setValueAtTime(85, now);
		osc.frequency.exponentialRampToValueAtTime(320, now + 0.65);

		const filter = ctx.createBiquadFilter();
		filter.type = "lowpass";
		filter.frequency.setValueAtTime(350, now);
		filter.frequency.exponentialRampToValueAtTime(750, now + 0.65);

		gain.gain.setValueAtTime(0.12, now);
		gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

		osc.connect(filter);
		filter.connect(gain);
		gain.connect(ctx.destination);
		osc.start(now);
		osc.stop(now + 0.75);
	}
}

export const soundEngine = new SoundEngine();
