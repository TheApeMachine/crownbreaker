import { soundEngine } from "../audio/soundEngine";
import { ARCHETYPES, calculateSpecialHitDamage } from "../data/archetypes";
import {
	type AttackInput,
	type ChessPiece,
	type CombatCallout,
	type ComboRecipe,
	type Faction,
	type FighterRuntime,
	type FighterStatusEffectType,
	TACTICAL_INTERVENTION_METER_COST,
	type TacticalSupporter,
	type VictoryTauntSpec,
} from "../types/game";

export const ARENA_HALF_WIDTH = 5.2;
const GRAVITY = 28.0;
const PARRY_WINDOW_MS = 175;
const COMBO_CHAIN_WINDOW_MS = 650;

export function createFighterRuntime(
	piece: ChessPiece,
	isAttacker: boolean,
	isAI: boolean,
	entangledPartnerName?: string,
	supporters: TacticalSupporter[] = [],
): FighterRuntime {
	const spec = ARCHETYPES[piece.type];
	const initialMeter = Math.min(
		100,
		piece.meter + (isAttacker ? 20 : 10) + (entangledPartnerName ? 15 : 0),
	);

	return {
		piece,
		spec,
		isAttacker,
		isAI,
		x: isAttacker ? -2.6 : 2.6,
		y: 0,
		vx: 0,
		vy: 0,
		facing: isAttacker ? 1 : -1,
		hp: piece.hp,
		maxHp: piece.maxHp,
		recoverableHp: piece.hp,
		meter: initialMeter,
		guardGauge: 100,
		action: "idle",
		actionTimerMs: 0,
		actionDurationMs: 0,
		hasHitThisAction: false,
		specialHitsRemaining: 0,
		comboBuffer: [],
		comboWindowTimerMs: 0,
		activeComboRecipe: null,
		comboStepIndex: 0,
		hitCount: 0,
		comboDamageAccum: 0,
		lastBlockPressTime: -9999,
		superArmorActive: false,
		invulnerableTimerMs: 0,
		hitFlashTimerMs: 0,
		wPhaseOffset: 0,
		wPhaseTimerMs: 0,
		wPhaseCooldownMs: 0,
		temporalEchoTimerMs: 0,
		temporalEchoX: 0,
		temporalEchoFacing: 1,
		temporalEchoHasStruck: false,
		clashLockTimerMs: 0,
		clashPower: 0,
		entangledPartnerName,
		supporters: supporters.map((s) => ({ ...s })),
		selectedSupporterIndex: 0,
		interventionUsed: false,
		sovereignAegisActive: Boolean(piece.mirrorInvertedParity),
		statusBurnTimerMs: piece.persistentBurnMs ?? 0,
		statusBurnTickAccumMs: 0,
		statusSlowTimerMs: piece.persistentSlowMs ?? 0,
		statusWeakenedTimerMs: piece.persistentWeakenedMs ?? 0,
	};
}

export function getFighterSpeedMultiplier(fighter: FighterRuntime): number {
	return fighter.statusSlowTimerMs > 0 ? 0.55 : 1.0;
}

export function applyFighterStatusEffect(
	target: FighterRuntime,
	effect: FighterStatusEffectType,
	durationMs: number,
	onCallout: (c: Omit<CombatCallout, "id" | "createdAt">) => void,
) {
	if (target.hp <= 0) return;

	if (effect === "burn") {
		const wasActive = target.statusBurnTimerMs > 0;
		target.statusBurnTimerMs = Math.max(target.statusBurnTimerMs, durationMs);
		if (!wasActive) {
			target.statusBurnTickAccumMs = 0;
			onCallout({
				text: "🔥 IGNITED: BURN STATUS!",
				subtext: "4 HP/TICK PLASMA SCORCH & GUARD CORROSION",
				x: target.x,
				y: 2.42,
				color: "#fb923c",
			});
		}
	} else if (effect === "slow") {
		const wasActive = target.statusSlowTimerMs > 0;
		target.statusSlowTimerMs = Math.max(target.statusSlowTimerMs, durationMs);
		if (!wasActive) {
			onCallout({
				text: "❄️ STASIS: SLOWED STATUS!",
				subtext: "-45% MOBILITY & -28% ATTACK FRAME TEMPO",
				x: target.x,
				y: 2.42,
				color: "#38bdf8",
			});
		}
	} else if (effect === "weakened") {
		const wasActive = target.statusWeakenedTimerMs > 0;
		target.statusWeakenedTimerMs = Math.max(
			target.statusWeakenedTimerMs,
			durationMs,
		);
		if (!wasActive) {
			onCallout({
				text: "💔 SUNDERED: WEAKENED STATUS!",
				subtext: "+25% INCOMING DAMAGE · -25% STRIKE POWER",
				x: target.x,
				y: 2.42,
				color: "#c084fc",
			});
		}
	}
}

/**
 * TACTICAL INTERVENTION: THE BOARD FIGHTS BACK
 * Validates and initiates a Tactical Intervention from an eligible supporting chess piece.
 * - Each fighter may call ONE intervention per duel.
 * - Deducts 25 persistent tactical meter from the supporting ChessPiece on the board.
 */
export function triggerTacticalIntervention(
	caller: FighterRuntime,
	requestedSupporterIndex: number | undefined,
	boardPieces: ChessPiece[],
	onCallout: (c: Omit<CombatCallout, "id" | "createdAt">) => void,
): TacticalSupporter | null {
	if (
		caller.interventionUsed ||
		caller.hp <= 0 ||
		caller.action === "victory" ||
		caller.action === "victory_taunt" ||
		caller.action === "defeat" ||
		caller.supporters.length === 0
	) {
		return null;
	}

	let chosenIdx =
		requestedSupporterIndex !== undefined
			? requestedSupporterIndex
			: caller.selectedSupporterIndex;

	let supporter = caller.supporters[chosenIdx];
	if (!supporter?.canIntervene) {
		// Fallback to first eligible supporter with >= 25 meter
		chosenIdx = caller.supporters.findIndex((s) => s.canIntervene);
		if (chosenIdx === -1) return null;
		supporter = caller.supporters[chosenIdx];
	}

	// Verify the persistent ChessPiece on the board still has >= 25 meter
	const persistentPiece = boardPieces.find((p) => p.id === supporter.pieceId);
	if (persistentPiece) {
		if (persistentPiece.meter < TACTICAL_INTERVENTION_METER_COST) {
			supporter.canIntervene = false;
			supporter.meter = persistentPiece.meter;
			return null;
		}
		// Deduct 25 persistent tactical meter from the supporting piece!
		persistentPiece.meter = Math.max(
			0,
			persistentPiece.meter - TACTICAL_INTERVENTION_METER_COST,
		);
		supporter.meter = persistentPiece.meter;
	} else {
		if (supporter.meter < TACTICAL_INTERVENTION_METER_COST) return null;
		supporter.meter = Math.max(
			0,
			supporter.meter - TACTICAL_INTERVENTION_METER_COST,
		);
	}

	supporter.canIntervene = false;
	caller.interventionUsed = true;
	caller.selectedSupporterIndex = chosenIdx;

	soundEngine.playTacticalIntervention(supporter.isCrossDimensional);

	const riftPrefix =
		supporter.riftType === "ANA_PLUS_W"
			? "4D ANA (+W) RIFT · "
			: supporter.riftType === "KATA_MINUS_W"
				? "4D KATA (-W) RIFT · "
				: supporter.riftType === "ASTRAL_PLUS_Z"
					? "4D ASTRAL (+Z) RIFT · "
					: "TACTICAL SUPPORT · ";

	const hexColorStr = `#${supporter.riftColorHex.toString(16).padStart(6, "0")}`;
	onCallout({
		text: `${riftPrefix}${supporter.interventionName.toUpperCase()}!`,
		subtext: `${ARCHETYPES[supporter.type].chessName.toUpperCase()} INTERVENES (${supporter.vectorLabel}) · -25 METER`,
		x: caller.x,
		y: 2.38,
		color: hexColorStr,
	});

	return { ...supporter };
}

/**
 * Applies the actual archetype-specific combat state changes (HP, guard, hitstun, launch, or Sovereign Aegis)
 * at the climax of the 0.75s Tactical Intervention sequence!
 */
export function applyTacticalInterventionImpact(
	caller: FighterRuntime,
	opponent: FighterRuntime,
	supporter: TacticalSupporter,
	events: CombatStepEvents,
	onCallout: (c: Omit<CombatCallout, "id" | "createdAt">) => void,
) {
	if (opponent.hp <= 0 || caller.hp <= 0) return;

	const type = supporter.type;
	const colorHex = supporter.riftColorHex;

	if (type === "p") {
		// Pawn — Desperate Vanguard: Rushes in with a quick spear jab and interrupts the enemy's momentum!
		const dmg = 14;
		opponent.hp = Math.max(0, opponent.hp - dmg);
		opponent.guardGauge = Math.max(0, opponent.guardGauge - 18);
		opponent.action = "hitstun";
		opponent.actionTimerMs = 0;
		opponent.actionDurationMs = 520;
		opponent.superArmorActive = false;
		opponent.wPhaseTimerMs = 0;
		opponent.wPhaseOffset = 0;
		opponent.vx = caller.facing * 2.8;
		opponent.vy = 1.6;
		opponent.hitCount += 1;
		opponent.comboDamageAccum += dmg;
		opponent.hitFlashTimerMs = 150;

		soundEngine.playHit("heavy");
		events.cameraShake = Math.max(events.cameraShake, 0.26);
		events.sparkWorldPos = { x: opponent.x, y: 1.05, color: colorHex };
		onCallout({
			text: "DESPERATE VANGUARD HIT!",
			subtext: "MOMENTUM INTERRUPTED · -14 HP · -18 GUARD",
			x: opponent.x,
			y: 1.95,
			color: "#fde047",
		});
	} else if (type === "n") {
		// Knight — Meteor Lancer: Leaps into the arena from an elevated angle, landing a launching strike!
		const dmg = 18;
		opponent.hp = Math.max(0, opponent.hp - dmg);
		opponent.guardGauge = Math.max(0, opponent.guardGauge - 24);
		opponent.action = "knockdown";
		opponent.actionTimerMs = 0;
		opponent.actionDurationMs = 640;
		opponent.superArmorActive = false;
		opponent.wPhaseTimerMs = 0;
		opponent.wPhaseOffset = 0;
		opponent.vx = caller.facing * 3.4;
		opponent.vy = 7.4; // High aerial launch!
		opponent.hitCount += 1;
		opponent.comboDamageAccum += dmg;
		opponent.hitFlashTimerMs = 170;

		soundEngine.playHit("special");
		events.cameraShake = Math.max(events.cameraShake, 0.36);
		events.slowMoDurationMs = 180;
		events.sparkWorldPos = { x: opponent.x, y: 1.35, color: colorHex };
		onCallout({
			text: "METEOR LANCER LAUNCH!",
			subtext: "AERIAL DIVE IMPACT · -18 HP · AIR JUGGLE READY",
			x: opponent.x,
			y: 2.15,
			color: "#38bdf8",
		});
	} else if (type === "b") {
		// Bishop — Diagonal Judgment: Fires a luminous glaive beam along its supporting diagonal!
		const isBlocking = opponent.action === "block";
		const dmg = isBlocking ? 9 : 17;
		opponent.hp = Math.max(0, opponent.hp - dmg);
		opponent.guardGauge = Math.max(0, opponent.guardGauge - 28);
		opponent.action = "hitstun";
		opponent.actionTimerMs = 0;
		opponent.actionDurationMs = 480;
		opponent.superArmorActive = false;
		opponent.wPhaseTimerMs = 0;
		opponent.wPhaseOffset = 0;
		opponent.vx = caller.facing * 3.8;
		opponent.hitCount += 1;
		opponent.comboDamageAccum += dmg;
		opponent.hitFlashTimerMs = 160;

		// Bishop also sanctifies/heals the calling warrior for +8 HP!
		caller.hp = Math.min(caller.maxHp, caller.hp + 8);
		caller.recoverableHp = Math.max(caller.recoverableHp, caller.hp);

		soundEngine.playHit("special");
		events.cameraShake = Math.max(events.cameraShake, 0.3);
		events.sparkWorldPos = { x: opponent.x, y: 1.2, color: colorHex };
		onCallout({
			text: "DIAGONAL JUDGMENT BEAM!",
			subtext: `-${dmg} HP PIERCE · +8 HP SANCTIFIED HEAL`,
			x: opponent.x,
			y: 2.1,
			color: "#c084fc",
		});
	} else if (type === "r") {
		// Rook — Siege Intervention: Crushing shockwave with significant guard damage and knockback!
		const dmg = 19;
		opponent.hp = Math.max(0, opponent.hp - dmg);
		opponent.guardGauge = Math.max(0, opponent.guardGauge - 55);
		const guardShattered = opponent.guardGauge <= 0;
		if (guardShattered) {
			opponent.guardGauge = 45;
		}
		opponent.action = "knockdown";
		opponent.actionTimerMs = 0;
		opponent.actionDurationMs = guardShattered ? 760 : 620;
		opponent.superArmorActive = false;
		opponent.wPhaseTimerMs = 0;
		opponent.wPhaseOffset = 0;
		opponent.vx = caller.facing * 6.4;
		opponent.vy = 4.0;
		opponent.hitCount += 1;
		opponent.comboDamageAccum += dmg;
		opponent.hitFlashTimerMs = 190;

		soundEngine.playHit("special");
		events.cameraShake = Math.max(events.cameraShake, 0.45);
		events.slowMoDurationMs = 210;
		events.sparkWorldPos = { x: opponent.x, y: 0.9, color: colorHex };
		onCallout({
			text: guardShattered ? "SIEGE GUARD SHATTER!" : "SIEGE SHOCKWAVE!",
			subtext: `-${dmg} HP · -55 GUARD · HEAVY KNOCKBACK`,
			x: opponent.x,
			y: 2.15,
			color: "#f43f5e",
		});
	} else if (type === "q") {
		// Queen — Royal Blade Storm: Projects a brief swarm of crown blades toward the opposing fighter!
		const dmg = 22;
		opponent.hp = Math.max(0, opponent.hp - dmg);
		opponent.guardGauge = Math.max(0, opponent.guardGauge - 32);
		opponent.action = "hitstun";
		opponent.actionTimerMs = 0;
		opponent.actionDurationMs = 580;
		opponent.superArmorActive = false;
		opponent.wPhaseTimerMs = 0;
		opponent.wPhaseOffset = 0;
		opponent.vx = caller.facing * 4.2;
		opponent.vy = 4.4;
		opponent.hitCount += 3;
		opponent.comboDamageAccum += dmg;
		opponent.hitFlashTimerMs = 190;

		soundEngine.playHit("special");
		events.cameraShake = Math.max(events.cameraShake, 0.38);
		events.slowMoDurationMs = 200;
		events.sparkWorldPos = { x: opponent.x, y: 1.25, color: colorHex };
		onCallout({
			text: "ROYAL BLADE STORM!",
			subtext: "+3 HIT CROWN BARRAGE · -22 HP",
			x: opponent.x,
			y: 2.2,
			color: "#f59e0b",
		});
	} else if (type === "k") {
		// King — Sovereign Aegis: Projects a defensive shield that absorbs 75% of the next incoming hit!
		caller.sovereignAegisActive = true;
		caller.guardGauge = Math.min(100, caller.guardGauge + 35);
		caller.hp = Math.min(caller.maxHp, caller.hp + 10);
		caller.recoverableHp = Math.max(caller.recoverableHp, caller.hp);

		// Also emits a royal ward pulse if the enemy is close
		if (Math.abs(opponent.x - caller.x) <= 3.6) {
			opponent.hp = Math.max(0, opponent.hp - 10);
			opponent.vx = caller.facing * 3.8;
			opponent.action = "hitstun";
			opponent.actionTimerMs = 0;
			opponent.actionDurationMs = 360;
		}

		soundEngine.playBulletTimeParry();
		events.cameraShake = Math.max(events.cameraShake, 0.24);
		events.sparkWorldPos = { x: caller.x, y: 1.15, color: 0xfde047 };
		onCallout({
			text: "SOVEREIGN AEGIS WARD ACTIVE!",
			subtext: "ABSORBS 75% NEXT HIT · +35 GUARD · +10 HP",
			x: caller.x,
			y: 2.15,
			color: "#fde047",
		});
	}

	// Offensive Interventions also inflict their archetype's signature Status Effect for 3.2s!
	if (type !== "k" && opponent.hp > 0) {
		applyFighterStatusEffect(
			opponent,
			ARCHETYPES[type].special.statusEffect,
			3200,
			onCallout,
		);
	}
}

function findMatchingCombo(
	recipes: ComboRecipe[],
	sequence: AttackInput[],
): { exact: ComboRecipe | null; partial: ComboRecipe | null } {
	let exact: ComboRecipe | null = null;
	let partial: ComboRecipe | null = null;

	for (const recipe of recipes) {
		if (recipe.sequence.length === sequence.length) {
			if (recipe.sequence.every((val, idx) => val === sequence[idx])) {
				exact = recipe;
			}
		} else if (recipe.sequence.length > sequence.length) {
			if (sequence.every((val, idx) => val === recipe.sequence[idx])) {
				partial = recipe;
			}
		}
	}
	return { exact, partial };
}

/**
 * 4D Hypercube Combat Mechanic #1: Ana/Kata W-Axis Phase Shift!
 * Shifts the fighter into the 4th spatial dimension (W = +1 or -1) for 680ms,
 * allowing them to pass right through 3D attacks and cross up behind the opponent!
 */
export function triggerFighter4DPhaseShift(
	fighter: FighterRuntime,
	onCallout: (c: Omit<CombatCallout, "id" | "createdAt">) => void,
): boolean {
	if (
		fighter.wPhaseTimerMs > 0 ||
		fighter.wPhaseCooldownMs > 0 ||
		fighter.action === "hitstun" ||
		fighter.action === "knockdown" ||
		fighter.action === "victory" ||
		fighter.action === "defeat"
	) {
		return false;
	}

	fighter.wPhaseOffset = fighter.wPhaseOffset === 1 ? -1 : 1;
	fighter.wPhaseTimerMs = 680;
	fighter.wPhaseCooldownMs = 2200;
	fighter.vx = fighter.facing * (fighter.spec.dashSpeed * 0.95);
	fighter.action = "dash_fwd";
	fighter.actionTimerMs = 0;
	fighter.actionDurationMs = 340;

	soundEngine.playSpecialActivate();
	onCallout({
		text:
			fighter.wPhaseOffset > 0
				? "4D ANA PHASE SHIFT (+W)"
				: "4D KATA PHASE SHIFT (-W)",
		subtext: "INTANGIBLE TO 3D STRIKES · PHASE THROUGH FOE",
		x: fighter.x,
		y: 2.15,
		color: "#c084fc",
	});
	return true;
}

/**
 * 4D Spacetime Combat Mechanic #2: Temporal Echo Clone (x, y, z, t)!
 * Leaves a Past-Self Temporal Hologram at the current coordinate while vaulting across the enemy
 * for a simultaneous two-timeline pincer strike!
 */
export function triggerFighterTemporalEcho(
	fighter: FighterRuntime,
	onCallout: (c: Omit<CombatCallout, "id" | "createdAt">) => void,
): boolean {
	if (
		fighter.temporalEchoTimerMs > 0 ||
		fighter.meter < 25 ||
		fighter.action === "hitstun" ||
		fighter.action === "knockdown" ||
		fighter.action === "victory" ||
		fighter.action === "defeat"
	) {
		return false;
	}

	fighter.meter -= 25;
	fighter.temporalEchoTimerMs = 750;
	fighter.temporalEchoX = fighter.x;
	fighter.temporalEchoFacing = fighter.facing;
	fighter.temporalEchoHasStruck = false;

	// Propel present self across to pincer the opponent from the other side!
	fighter.vx = fighter.facing * (fighter.spec.dashSpeed * 1.15);
	fighter.vy = 5.5;
	fighter.wPhaseTimerMs = 350; // Brief 4D phase so we vault cleanly past the opponent
	fighter.wPhaseOffset = 1;

	soundEngine.playSpecialActivate();
	onCallout({
		text: "TEMPORAL ECHO BIFURCATION!",
		subtext: "PAST & PRESENT PINCER ATTACK (Δt = -1)",
		x: fighter.x,
		y: 2.25,
		color: "#38bdf8",
	});
	return true;
}

export function triggerFighterAttack(
	fighter: FighterRuntime,
	input: AttackInput,
	onCallout: (c: Omit<CombatCallout, "id" | "createdAt">) => void,
): boolean {
	// During a Blade Clash Lock, pressing Attack surges Clash Power to overpower the enemy's weapon!
	if (fighter.action === "blade_clash" && fighter.clashLockTimerMs > 0) {
		fighter.clashPower += input === "H" ? 1.35 : input === "S" ? 1.75 : 1.0;
		soundEngine.playBladeClashLock();
		return true;
	}

	if (
		fighter.action === "hitstun" ||
		fighter.action === "knockdown" ||
		fighter.action === "victory" ||
		fighter.action === "defeat"
	) {
		return false;
	}

	// Attacking brings the fighter back into Prime 3D space (W=0) to materialize the strike!
	if (fighter.wPhaseTimerMs > 0) {
		fighter.wPhaseTimerMs = 0;
		fighter.wPhaseOffset = 0;
	}

	const isAttacking =
		fighter.action.startsWith("light") ||
		fighter.action.startsWith("heavy") ||
		fighter.action === "combo_finisher";

	if (fighter.action === "special") return false;

	if (input === "S") {
		if (fighter.meter < fighter.spec.special.meterCost) return false;
		fighter.meter -= fighter.spec.special.meterCost;
		fighter.action = "special";
		fighter.actionTimerMs = 0;
		const sp = fighter.spec.special;
		fighter.actionDurationMs = sp.startupMs + sp.activeMs + sp.recoveryMs;
		fighter.hasHitThisAction = false;
		fighter.specialHitsRemaining = sp.hits;
		fighter.superArmorActive =
			fighter.spec.type === "r" || fighter.spec.type === "k";
		fighter.comboBuffer = [];

		if (fighter.spec.type === "n") {
			fighter.vy = 11.5;
			fighter.vx = fighter.facing * 6.5;
		} else {
			fighter.vx = fighter.facing * 3.5;
		}

		soundEngine.playSpecialActivate();
		onCallout({
			text: sp.name.toUpperCase(),
			subtext: sp.tagline,
			x: fighter.x,
			y: 2.3,
			color: "#f59e0b",
		});
		return true;
	}

	if (isAttacking) {
		const canCancel =
			fighter.action !== "combo_finisher" &&
			fighter.actionTimerMs >= fighter.actionDurationMs * 0.36;
		if (!canCancel) return false;
	}

	const nextBuffer: AttackInput[] =
		fighter.comboWindowTimerMs > 0 ? [...fighter.comboBuffer, input] : [input];

	const { exact, partial } = findMatchingCombo(fighter.spec.combos, nextBuffer);

	if (exact) {
		fighter.comboBuffer = [];
		fighter.comboWindowTimerMs = 0;
		fighter.activeComboRecipe = exact;
		fighter.action = "combo_finisher";
		fighter.actionTimerMs = 0;
		const moveData = input === "H" ? fighter.spec.heavy : fighter.spec.light;
		fighter.actionDurationMs =
			moveData.startupMs * 0.85 + moveData.activeMs * 1.2 + moveData.recoveryMs;
		fighter.hasHitThisAction = false;
		fighter.superArmorActive = Boolean(moveData.superArmor);
		fighter.vx = fighter.facing * 5.2;

		soundEngine.playSwing(true);
		onCallout({
			text: exact.name,
			subtext: `COMBO FINISHER (${exact.sequence.join(" · ")})`,
			x: fighter.x,
			y: 2.0,
			color: "#38bdf8",
		});
		return true;
	}

	const finalBuffer = partial ? nextBuffer : [input];
	fighter.comboBuffer = finalBuffer;
	fighter.comboWindowTimerMs = COMBO_CHAIN_WINDOW_MS;
	fighter.activeComboRecipe = null;

	const stepNum = finalBuffer.length;
	if (input === "L") {
		fighter.action =
			stepNum === 1 ? "light_1" : stepNum === 2 ? "light_2" : "light_3";
		const l = fighter.spec.light;
		fighter.actionDurationMs = l.startupMs + l.activeMs + l.recoveryMs;
		fighter.superArmorActive = false;
		fighter.vx = fighter.facing * 2.8;
		soundEngine.playSwing(false);
	} else {
		fighter.action = stepNum === 1 ? "heavy_1" : "heavy_2";
		const h = fighter.spec.heavy;
		fighter.actionDurationMs = h.startupMs + h.activeMs + h.recoveryMs;
		fighter.superArmorActive = Boolean(h.superArmor);
		fighter.vx = fighter.facing * 3.8;
		soundEngine.playSwing(true);
	}

	fighter.actionTimerMs = 0;
	fighter.hasHitThisAction = false;
	return true;
}

export function triggerFighterDash(fighter: FighterRuntime, forward: boolean) {
	if (
		fighter.action === "hitstun" ||
		fighter.action === "knockdown" ||
		fighter.action === "special"
	) {
		return;
	}
	fighter.action = forward ? "dash_fwd" : "dash_back";
	fighter.actionTimerMs = 0;
	fighter.actionDurationMs = 210;
	const dir = forward ? fighter.facing : -fighter.facing;
	fighter.vx =
		dir * fighter.spec.dashSpeed * getFighterSpeedMultiplier(fighter);
	if (!forward) {
		fighter.invulnerableTimerMs = 110;
	}
	soundEngine.playSwing(false);
}

export function triggerFighterJump(fighter: FighterRuntime) {
	if (fighter.y > 0.05) return;
	if (
		fighter.action === "hitstun" ||
		fighter.action === "knockdown" ||
		fighter.action === "special"
	) {
		return;
	}
	fighter.action = "jump";
	fighter.actionTimerMs = 0;
	fighter.actionDurationMs = 550;
	fighter.vy =
		fighter.spec.jumpForce * (fighter.statusSlowTimerMs > 0 ? 0.78 : 1.0);
}

export interface CombatStepEvents {
	cameraShake: number;
	hitstopMs: number;
	slowMoDurationMs: number;
	sparkWorldPos: { x: number; y: number; color: number } | null;
	parryImpact: {
		x: number;
		y: number;
		facing: 1 | -1;
		defenderFaction: Faction;
		defenderIsAttacker: boolean;
	} | null;
}

export function stepCombatSimulation(
	f1: FighterRuntime,
	f2: FighterRuntime,
	dtSeconds: number,
	nowMs: number,
	onCallout: (c: Omit<CombatCallout, "id" | "createdAt">) => void,
): CombatStepEvents {
	const dtMs = dtSeconds * 1000;
	const events: CombatStepEvents = {
		cameraShake: 0,
		hitstopMs: 0,
		slowMoDurationMs: 0,
		sparkWorldPos: null,
		parryImpact: null,
	};

	const fighters = [f1, f2];

	// 0. Handle Active Blade Clash Lock ("BLADE BIND!")
	if (f1.action === "blade_clash" && f2.action === "blade_clash") {
		f1.clashLockTimerMs = Math.max(0, f1.clashLockTimerMs - dtMs);
		f2.clashLockTimerMs = f1.clashLockTimerMs;

		// AI mashes during Blade Clash
		for (const f of fighters) {
			if (f.isAI && Math.random() < dtSeconds * 4.2) {
				f.clashPower += 1.0;
			}
		}

		// Continuous spark shower while weapons grind
		if (Math.random() < dtSeconds * 18) {
			events.sparkWorldPos = {
				x: (f1.x + f2.x) * 0.5,
				y: 1.18,
				color: 0xfde047,
			};
		}

		if (
			f1.clashLockTimerMs <= 0 ||
			Math.abs(f1.clashPower - f2.clashPower) >= 3.2
		) {
			const f1Wins =
				f1.clashPower > f2.clashPower ||
				(f1.clashPower === f2.clashPower && !f1.isAI);
			const winner = f1Wins ? f1 : f2;
			const loser = f1Wins ? f2 : f1;

			winner.clashLockTimerMs = 0;
			loser.clashLockTimerMs = 0;
			winner.clashPower = 0;
			loser.clashPower = 0;

			winner.action = "combo_finisher";
			winner.actionTimerMs = 0;
			winner.actionDurationMs = 340;
			winner.hasHitThisAction = true;
			winner.meter = Math.min(100, winner.meter + 25);

			loser.hp = Math.max(1, loser.hp - 22);
			loser.action = "knockdown";
			loser.actionTimerMs = 0;
			loser.actionDurationMs = 580;
			loser.vx = winner.facing * 5.6;
			loser.vy = 5.4;
			loser.hitFlashTimerMs = 180;

			soundEngine.playHit("special");
			events.cameraShake = 0.42;
			events.slowMoDurationMs = 260;
			events.sparkWorldPos = {
				x: (f1.x + f2.x) * 0.5,
				y: 1.25,
				color: 0xf59e0b,
			};
			onCallout({
				text: `${winner.spec.chessName.toUpperCase()} WINS BLADE BIND!`,
				subtext: "GUARD SHATTERED · -22 HP · +25% METER",
				x: loser.x,
				y: 2.25,
				color: "#fde047",
			});
		}
		return events;
	}

	// 1. Update timers, status effects, 4D phase timers, physics, and facing
	for (let i = 0; i < 2; i++) {
		const f = fighters[i];
		const opp = fighters[1 - i];

		// Slow status reduces attack frame progression speed by 28%
		const isAttackFrame =
			f.action.startsWith("light") ||
			f.action.startsWith("heavy") ||
			f.action === "combo_finisher";
		const frameTempoMult =
			f.statusSlowTimerMs > 0 && isAttackFrame ? 0.72 : 1.0;
		f.actionTimerMs += dtMs * frameTempoMult;

		// Tick active Status Effects ('burn', 'slow', 'weakened')
		if (f.statusBurnTimerMs > 0) {
			f.statusBurnTimerMs = Math.max(0, f.statusBurnTimerMs - dtMs);
			f.statusBurnTickAccumMs += dtMs;
			if (f.statusBurnTickAccumMs >= 650) {
				f.statusBurnTickAccumMs -= 650;
				if (f.hp > 1) {
					const burnDmg = 4;
					f.hp = Math.max(1, f.hp - burnDmg);
					f.recoverableHp = Math.max(f.hp, f.recoverableHp - burnDmg * 1.4);
					f.guardGauge = Math.max(0, f.guardGauge - 3.5);
					f.hitFlashTimerMs = Math.max(f.hitFlashTimerMs, 60);
					events.sparkWorldPos = { x: f.x, y: 1.15, color: 0xf97316 };
					onCallout({
						text: "🔥 BURN SCORCH (-4 HP)",
						x: f.x,
						y: 1.68,
						color: "#fb923c",
					});
				}
			}
		} else {
			f.statusBurnTickAccumMs = 0;
		}

		if (f.statusSlowTimerMs > 0) {
			f.statusSlowTimerMs = Math.max(0, f.statusSlowTimerMs - dtMs);
		}
		if (f.statusWeakenedTimerMs > 0) {
			f.statusWeakenedTimerMs = Math.max(0, f.statusWeakenedTimerMs - dtMs);
		}

		if (f.comboWindowTimerMs > 0) {
			f.comboWindowTimerMs = Math.max(0, f.comboWindowTimerMs - dtMs);
			if (f.comboWindowTimerMs === 0) {
				f.comboBuffer = [];
			}
		}
		if (f.invulnerableTimerMs > 0) {
			f.invulnerableTimerMs = Math.max(0, f.invulnerableTimerMs - dtMs);
		}
		if (f.hitFlashTimerMs > 0) {
			f.hitFlashTimerMs = Math.max(0, f.hitFlashTimerMs - dtMs);
		}
		if (f.wPhaseCooldownMs > 0) {
			f.wPhaseCooldownMs = Math.max(0, f.wPhaseCooldownMs - dtMs);
		}
		if (f.wPhaseTimerMs > 0) {
			f.wPhaseTimerMs = Math.max(0, f.wPhaseTimerMs - dtMs);
			if (f.wPhaseTimerMs === 0) {
				f.wPhaseOffset = 0;
			}
		}

		// Check Temporal Echo Clone Strike!
		if (f.temporalEchoTimerMs > 0) {
			f.temporalEchoTimerMs = Math.max(0, f.temporalEchoTimerMs - dtMs);
			if (!f.temporalEchoHasStruck && f.temporalEchoTimerMs <= 420) {
				f.temporalEchoHasStruck = true;
				const distFromEcho = Math.abs(opp.x - f.temporalEchoX);
				if (distFromEcho <= f.spec.heavy.range * 1.15 && opp.hp > 0) {
					resolveStrikeImpact(
						f,
						opp,
						{
							damage: 16,
							chipDamage: 4,
							hitstunMs: 460,
							blockstunMs: 220,
							knockback: 2.2,
							launchY: 4.5,
							unblockable: false,
							effect: "launch",
							isSpecial: false,
							underdogBonusPct: 0,
							canHit4DPhase: true,
						},
						nowMs,
						events,
						onCallout,
					);
					onCallout({
						text: "CHRONO-ECHO PINCER HIT!",
						subtext: "PAST SELF LANDED CROSS-TIMELINE STRIKE",
						x: f.temporalEchoX,
						y: 1.95,
						color: "#38bdf8",
					});
				}
			}
		}

		if (f.recoverableHp > f.hp) {
			f.recoverableHp = Math.max(f.hp, f.recoverableHp - dtSeconds * 8);
		}

		// Quantum Bell-State Entanglement Resonance: passive shielding & vitality transfer from entangled partner!
		if (f.entangledPartnerName && f.hp > 0 && f.hp < f.maxHp) {
			f.hp = Math.min(f.maxHp, f.hp + dtSeconds * 1.8);
			f.guardGauge = Math.min(100, f.guardGauge + dtSeconds * 6);
		}

		if (f.action !== "block") {
			f.guardGauge = Math.min(100, f.guardGauge + dtSeconds * 14);
		}

		f.x += f.vx * dtSeconds;
		const friction = f.y > 0.05 ? 2.5 : 10.5;
		f.vx *= Math.max(0, 1 - friction * dtSeconds);

		if (f.y > 0 || f.vy !== 0) {
			f.y += f.vy * dtSeconds;
			f.vy -= GRAVITY * dtSeconds;
			if (f.y <= 0) {
				f.y = 0;
				f.vy = 0;
				if (f.action === "jump") {
					f.action = "idle";
				}
			}
		}

		if (Math.abs(f.x) >= ARENA_HALF_WIDTH) {
			const clampedX = Math.sign(f.x) * ARENA_HALF_WIDTH;
			if (f.action === "hitstun" && Math.abs(f.vx) > 6.5) {
				f.vx = -f.vx * 0.55;
				f.vy = Math.max(f.vy, 5.0);
				events.cameraShake = Math.max(events.cameraShake, 0.35);
				onCallout({
					text: "WALL BOUNCE!",
					x: clampedX,
					y: 1.6,
					color: "#f43f5e",
				});
			} else {
				f.vx = 0;
			}
			f.x = clampedX;
		}

		// Prevent overlapping on the ground ONLY if neither fighter is 4D Phase-Shifted!
		// If either fighter is in 4D W-Phase, they pass right through each other for a 4D cross-up!
		const eitherPhased = f.wPhaseTimerMs > 0 || opp.wPhaseTimerMs > 0;
		const dist = f.x - opp.x;
		const minSep = 0.92;
		if (
			!eitherPhased &&
			Math.abs(dist) < minSep &&
			Math.abs(f.y - opp.y) < 0.9
		) {
			const push = (minSep - Math.abs(dist)) * 0.5;
			const dir = dist >= 0 ? 1 : -1;
			f.x = Math.max(
				-ARENA_HALF_WIDTH,
				Math.min(ARENA_HALF_WIDTH, f.x + dir * push),
			);
			opp.x = Math.max(
				-ARENA_HALF_WIDTH,
				Math.min(ARENA_HALF_WIDTH, opp.x - dir * push),
			);
		}

		if (
			f.action === "idle" ||
			f.action === "walk_fwd" ||
			f.action === "walk_back" ||
			f.action === "block"
		) {
			f.facing = opp.x >= f.x ? 1 : -1;
		}

		if (
			f.action !== "idle" &&
			f.action !== "walk_fwd" &&
			f.action !== "walk_back" &&
			f.action !== "block" &&
			f.action !== "victory" &&
			f.action !== "victory_taunt" &&
			f.action !== "defeat" &&
			f.actionTimerMs >= f.actionDurationMs
		) {
			if (f.action === "hitstun" || f.action === "knockdown") {
				f.hitCount = 0;
				f.comboDamageAccum = 0;
			}
			f.action = "idle";
			f.actionTimerMs = 0;
			f.superArmorActive = false;
		}
	}

	// 2. Check active attack hitboxes for both fighters
	for (let i = 0; i < 2; i++) {
		const atk = fighters[i];
		const def = fighters[1 - i];

		if (def.hp <= 0 || atk.hp <= 0) continue;

		if (atk.action === "special" && atk.specialHitsRemaining > 0) {
			const sp = atk.spec.special;
			const elapsedActive = atk.actionTimerMs - sp.startupMs;
			if (elapsedActive >= 0 && elapsedActive <= sp.activeMs) {
				const hitInterval = sp.activeMs / sp.hits;
				const expectedHitsDone = Math.floor(elapsedActive / hitInterval) + 1;
				const hitsDoneSoFar = sp.hits - atk.specialHitsRemaining;

				if (expectedHitsDone > hitsDoneSoFar) {
					atk.specialHitsRemaining--;
					const dist = Math.abs(def.x - atk.x);
					const inFront = (def.x - atk.x) * atk.facing >= -0.4;

					if (dist <= sp.range && inFront && def.invulnerableTimerMs <= 0) {
						const { perHitDamage, underdogBonusPct } =
							calculateSpecialHitDamage(atk.spec, def.spec);
						resolveStrikeImpact(
							atk,
							def,
							{
								damage: perHitDamage,
								chipDamage: Math.ceil(perHitDamage * 0.25),
								hitstunMs: 420,
								blockstunMs: 240,
								knockback: atk.specialHitsRemaining === 0 ? 4.2 : 1.1,
								launchY: atk.specialHitsRemaining === 0 ? 5.2 : 1.5,
								unblockable: Boolean(sp.unblockable),
								effect: atk.specialHitsRemaining === 0 ? "launch" : undefined,
								isSpecial: true,
								underdogBonusPct,
								canHit4DPhase: true, // Specials cleave across 4D space!
							},
							nowMs,
							events,
							onCallout,
						);
					}
				}
			}
		}

		const isLight = atk.action.startsWith("light");
		const isHeavy = atk.action.startsWith("heavy");
		const isFinisher = atk.action === "combo_finisher";

		if ((isLight || isHeavy || isFinisher) && !atk.hasHitThisAction) {
			const baseMove =
				isHeavy ||
				(isFinisher && atk.activeComboRecipe?.sequence.at(-1) === "H")
					? atk.spec.heavy
					: atk.spec.light;

			const startup = isFinisher
				? baseMove.startupMs * 0.85
				: baseMove.startupMs;
			const active = isFinisher ? baseMove.activeMs * 1.2 : baseMove.activeMs;

			if (
				atk.actionTimerMs >= startup &&
				atk.actionTimerMs <= startup + active
			) {
				const dist = Math.abs(def.x - atk.x);
				const inFront = (def.x - atk.x) * atk.facing >= -0.25;
				const effectiveRange = isFinisher
					? baseMove.range * 1.22
					: baseMove.range;

				if (dist <= effectiveRange && inFront && def.invulnerableTimerMs <= 0) {
					// Check if Defender is ALSO in active attack frames -> Trigger a Simultaneous BLADE CLASH LOCK!
					const defIsAttacking =
						def.action.startsWith("light") ||
						def.action.startsWith("heavy") ||
						def.action === "combo_finisher";
					if (defIsAttacking && !def.hasHitThisAction) {
						const defBase = def.action.startsWith("heavy")
							? def.spec.heavy
							: def.spec.light;
						if (
							def.actionTimerMs >= defBase.startupMs * 0.65 &&
							def.actionTimerMs <= defBase.startupMs + defBase.activeMs * 1.25
						) {
							atk.action = "blade_clash";
							def.action = "blade_clash";
							atk.clashLockTimerMs = 580;
							def.clashLockTimerMs = 580;
							atk.clashPower = 1;
							def.clashPower = 1;
							atk.hasHitThisAction = true;
							def.hasHitThisAction = true;
							atk.vx = 0;
							def.vx = 0;
							soundEngine.playBladeClashLock();
							events.cameraShake = 0.3;
							events.sparkWorldPos = {
								x: (atk.x + def.x) * 0.5,
								y: 1.18,
								color: 0xfde047,
							};
							onCallout({
								text: "BLADE BIND CLASH!",
								subtext: "MASH STRIKE (J / K) TO SHATTER ENEMY GUARD!",
								x: (atk.x + def.x) * 0.5,
								y: 2.25,
								color: "#fde047",
							});
							return events;
						}
					}

					atk.hasHitThisAction = true;
					const mult =
						isFinisher && atk.activeComboRecipe
							? atk.activeComboRecipe.finisherMultiplier
							: 1.0;
					const chshS = atk.piece.publishedChshS ?? 0;
					const tsirelsonAssist =
						Boolean(atk.entangledPartnerName) && chshS >= 2 * Math.SQRT2 - 0.05;
					const entangledBonus =
						isFinisher && atk.entangledPartnerName
							? tsirelsonAssist
								? 14
								: 7
							: 0;
					const synodStacks =
						(atk.piece.synodStacks || 0) + (atk.piece.isChronocrator ? 1 : 0);
					const theoremBonus = atk.piece.isSentientTheorem ? 14 : 0;
					const synodBonus =
						theoremBonus +
						((isHeavy || isFinisher) && synodStacks > 0 ? synodStacks * 6 : 0);
					const dmg =
						Math.round(baseMove.damage * mult) + entangledBonus + synodBonus;

					atk.meter = Math.min(
						100,
						atk.meter +
							baseMove.meterGain +
							(atk.piece.isSentientTheorem ? 10 : 0),
					);

					resolveStrikeImpact(
						atk,
						def,
						{
							damage: dmg,
							chipDamage: baseMove.chipDamage + (synodBonus > 0 ? 4 : 0),
							hitstunMs: isFinisher
								? baseMove.hitstunMs * 1.25
								: baseMove.hitstunMs,
							blockstunMs: baseMove.blockstunMs,
							knockback: isFinisher
								? baseMove.knockback * 1.35
								: baseMove.knockback,
							launchY:
								isFinisher && atk.activeComboRecipe?.effect === "launch"
									? 7.8
									: baseMove.launchY,
							unblockable: Boolean(
								(atk.piece.isSentientTheorem && isFinisher) ||
									(tsirelsonAssist && isFinisher),
							),
							effect: isFinisher ? atk.activeComboRecipe?.effect : undefined,
							isSpecial: false,
							underdogBonusPct: 0,
							canHit4DPhase:
								isFinisher ||
								Boolean(atk.piece.isChronocrator) ||
								Boolean(atk.piece.isSentientTheorem),
						},
						nowMs,
						events,
						onCallout,
					);

					if (
						atk.piece.isSentientTheorem &&
						atk.piece.theoremStatus === "UNPUBLISHED_DRAFT"
					) {
						def.recoverableHp = def.hp;
						onCallout({
							text: isFinisher
								? `🎓 REVIEWER #2 OBJECTION OVERRULED (+${synodBonus} DMG)!`
								: `📚 CITATION NEEDED! (+${synodBonus} DEBATE RIGOR)`,
							subtext: "ORAL DEFENSE PODIUM · PEER-REVIEW COUNTEREXAMPLE",
							x: def.x,
							y: 2.52,
							color: "#fbbf24",
						});
					} else if (atk.piece.isSentientTheorem) {
						// Published Sentient Mathematical Theorem rewinds the opponent's recoverable vitality ("Yesterday's Lemma")!
						def.recoverableHp = def.hp;
						onCallout({
							text: `⊢ Q.E.D. AXIOMATIC PROOF STRIKE (+${synodBonus} DMG)!`,
							subtext:
								atk.piece.theoremAxiom ||
								"RETROACTIVE INDUCTION · YESTERDAY REFUTED",
							x: def.x,
							y: 2.52,
							color: "#38bdf8",
						});
					} else if (synodBonus > 0) {
						onCallout({
							text: atk.piece.isChronocrator
								? `⌚ CHRONOCRATOR SOVEREIGN STRIKE: +${synodBonus} DMG!`
								: `✦ SYNOD TRIAD STRIKE (×${synodStacks}): +${synodBonus} DMG!`,
							subtext: "PARALLEL-UNIVERSE COUNTERPARTS STRUCK IN UNISON",
							x: def.x,
							y: 2.48,
							color: "#fbbf24",
						});
					} else if (entangledBonus > 0 && atk.entangledPartnerName) {
						onCallout({
							text: tsirelsonAssist
								? `|Φ⁺⟩ TSIRELSON BREACH ASSIST: +${entangledBonus} DMG!`
								: `|Φ⁺⟩ ENTANGLED ASSIST: +${entangledBonus} DMG!`,
							subtext: tsirelsonAssist
								? `CHSH S≈2√2 · CLASSICAL LOCALITY TORN · ${atk.entangledPartnerName.toUpperCase()}`
								: `BELL RESONANCE (S≤2 CLASSICAL) · ${atk.entangledPartnerName.toUpperCase()}`,
							x: def.x,
							y: 2.35,
							color: tsirelsonAssist ? "#f472b6" : "#38bdf8",
						});
					}
				}
			}
		}
	}

	return events;
}

function resolveStrikeImpact(
	atk: FighterRuntime,
	def: FighterRuntime,
	strike: {
		damage: number;
		chipDamage: number;
		hitstunMs: number;
		blockstunMs: number;
		knockback: number;
		launchY: number;
		unblockable: boolean;
		effect?: ComboRecipe["effect"];
		isSpecial: boolean;
		underdogBonusPct: number;
		canHit4DPhase?: boolean;
	},
	nowMs: number,
	events: CombatStepEvents,
	onCallout: (c: Omit<CombatCallout, "id" | "createdAt">) => void,
) {
	// Check if Defender is shifted into the 4th spatial dimension (W != 0)!
	if (def.wPhaseTimerMs > 0 && !strike.canHit4DPhase) {
		def.meter = Math.min(100, def.meter + 14);
		events.slowMoDurationMs = 210;
		soundEngine.playBulletTimeParry();
		onCallout({
			text: "4D QUANTUM TUNNEL EVASION!",
			subtext: "TIME DILATED · +14% METER · COUNTER WINDOW",
			x: def.x,
			y: 2.05,
			color: "#c084fc",
		});
		return;
	}

	const isBlocking = def.action === "block" && !strike.unblockable;

	// Check Perfect Parry (< 175ms since pressing Block)
	if (isBlocking && nowMs - def.lastBlockPressTime <= PARRY_WINDOW_MS) {
		def.action = "parry_flash";
		def.actionTimerMs = 0;
		def.actionDurationMs = 260;
		def.meter = Math.min(100, def.meter + 24);
		def.hp = Math.min(def.maxHp, def.hp + 5);
		atk.vx = -atk.facing * 3.5;

		// Exact point of blade-on-shield impact along the defender's forward guard plane
		const impactX =
			def.x + def.facing * Math.min(0.52, Math.abs(atk.x - def.x) * 0.46);
		const impactY = 1.18 + (def.y * 0.65 + atk.y * 0.35) * 0.72;

		soundEngine.playBulletTimeParry();
		events.cameraShake = 0.32;
		events.hitstopMs = 55;
		events.slowMoDurationMs = 280;
		events.sparkWorldPos = { x: impactX, y: impactY, color: 0xfef08a };
		events.parryImpact = {
			x: impactX,
			y: impactY,
			facing: def.facing,
			defenderFaction: def.piece.faction,
			defenderIsAttacker: def.isAttacker,
		};
		onCallout({
			text: "HIGH-NOON PERFECT PARRY!",
			subtext: "BULLET-TIME RIPOSTE · +24% METER",
			x: def.x,
			y: 2.1,
			color: "#fde047",
		});
		return;
	}

	if (isBlocking && strike.effect !== "guard_crush") {
		const defWeakGuardMult = def.statusWeakenedTimerMs > 0 ? 1.25 : 1.0;
		const finalChip =
			strike.effect === "pierce"
				? Math.round(strike.damage * 0.5)
				: strike.chipDamage;
		def.hp = Math.max(1, def.hp - Math.round(finalChip * defWeakGuardMult));
		def.guardGauge = Math.max(
			0,
			def.guardGauge - strike.damage * 1.3 * defWeakGuardMult,
		);
		def.meter = Math.min(100, def.meter + 6);
		def.vx = atk.facing * strike.knockback * 0.55;

		// Even if blocked, the final hit of a Special Move inflicts a half-duration status effect through the guard!
		if (strike.isSpecial && atk.specialHitsRemaining === 0) {
			applyFighterStatusEffect(
				def,
				atk.spec.special.statusEffect,
				Math.round(atk.spec.special.statusDurationMs * 0.6),
				onCallout,
			);
		}

		if (def.guardGauge <= 0) {
			def.guardGauge = 50;
			def.action = "hitstun";
			def.actionTimerMs = 0;
			def.actionDurationMs = 680;
			soundEngine.playHit("heavy");
			onCallout({
				text: "GUARD BROKEN!",
				x: def.x,
				y: 1.9,
				color: "#f43f5e",
			});
		} else {
			soundEngine.playBlock(false);
			events.sparkWorldPos = {
				x: (atk.x + def.x) * 0.5,
				y: 1.0,
				color: 0x93c5fd,
			};
		}
		return;
	}

	// Check King's Sovereign Aegis Intervention Shield (absorbs 75% of incoming hit with zero hitstun!)
	if (def.sovereignAegisActive) {
		def.sovereignAegisActive = false;
		const absorbedDamage = Math.max(1, Math.round(strike.damage * 0.25));
		def.hp = Math.max(1, def.hp - absorbedDamage);
		def.meter = Math.min(100, def.meter + 18);
		atk.vx = -atk.facing * 4.2;

		soundEngine.playBlock(true);
		events.cameraShake = 0.26;
		events.slowMoDurationMs = 200;
		events.sparkWorldPos = { x: def.x, y: 1.15, color: 0xfde047 };
		onCallout({
			text: "SOVEREIGN AEGIS ABSORPTION!",
			subtext: `75% DAMAGE MITIGATED (-${absorbedDamage} HP) · ZERO HITSTUN`,
			x: def.x,
			y: 2.15,
			color: "#fde047",
		});
		return;
	}

	// Apply Weakened Status Modifiers (-25% outgoing damage when attacker is Weakened; +25% incoming damage when defender is Weakened)
	const atkWeakenedMult = atk.statusWeakenedTimerMs > 0 ? 0.75 : 1.0;
	const defWeakenedMult = def.statusWeakenedTimerMs > 0 ? 1.25 : 1.0;
	const scaling = Math.max(0.45, 1 - def.hitCount * 0.08);
	const actualDamage = Math.max(
		2,
		Math.round(strike.damage * scaling * atkWeakenedMult * defWeakenedMult),
	);

	def.hp = Math.max(0, def.hp - actualDamage);
	def.hitCount += 1;
	def.comboDamageAccum += actualDamage;
	def.hitFlashTimerMs = 130;
	def.meter = Math.min(100, def.meter + 8);
	def.wPhaseTimerMs = 0;
	def.wPhaseOffset = 0;

	// Special Move Hit applies the Archetype's Signature Status Effect ('burn', 'slow', or 'weakened')!
	if (strike.isSpecial && def.hp > 0) {
		applyFighterStatusEffect(
			def,
			atk.spec.special.statusEffect,
			atk.spec.special.statusDurationMs,
			onCallout,
		);
	}

	if (atk.hp < atk.recoverableHp) {
		atk.hp = Math.min(
			atk.recoverableHp,
			atk.hp + Math.ceil(actualDamage * 0.15),
		);
	}

	if (
		def.superArmorActive &&
		!strike.isSpecial &&
		strike.effect !== "guard_crush"
	) {
		soundEngine.playHit("light");
		events.sparkWorldPos = { x: def.x, y: 1.1, color: 0xf59e0b };
		onCallout({
			text: "SUPER ARMOR!",
			subtext: `-${actualDamage} HP`,
			x: def.x,
			y: 1.8,
			color: "#fbbf24",
		});
		return;
	}

	def.action = strike.launchY > 4.0 ? "knockdown" : "hitstun";
	def.actionTimerMs = 0;
	def.actionDurationMs = strike.hitstunMs;
	def.superArmorActive = false;

	if (strike.effect === "vortex") {
		def.vx = -atk.facing * 3.8;
		def.vy = 3.2;
	} else {
		def.vx = atk.facing * strike.knockback;
		if (strike.launchY > 0 || def.y > 0.1) {
			def.vy = Math.max(strike.launchY, 3.8);
		}
	}

	const isBigHit =
		strike.damage >= 20 || strike.isSpecial || Boolean(strike.effect);
	soundEngine.playHit(
		strike.isSpecial ? "special" : isBigHit ? "heavy" : "light",
	);
	events.cameraShake = isBigHit ? 0.32 : 0.14;
	events.sparkWorldPos = {
		x: (atk.x + def.x) * 0.5,
		y: 1.05 + def.y * 0.5,
		color: strike.isSpecial ? 0xf59e0b : isBigHit ? 0xf43f5e : 0x38bdf8,
	};

	if (strike.underdogBonusPct > 0 && atk.specialHitsRemaining === 0) {
		onCallout({
			text: `GIANT SLAYER +${strike.underdogBonusPct}%!`,
			subtext: `${def.hitCount} HIT COMBO · ${def.comboDamageAccum} DMG`,
			x: def.x,
			y: 2.2,
			color: "#34d399",
		});
	} else if (def.hitCount >= 2) {
		onCallout({
			text: `${def.hitCount} HIT COMBO!`,
			subtext: `${def.comboDamageAccum} TOTAL DMG`,
			x: def.x,
			y: 1.85,
			color: isBigHit ? "#f59e0b" : "#38bdf8",
		});
	}
}

export function updateFighterAI(
	ai: FighterRuntime,
	opponent: FighterRuntime,
	dtSeconds: number,
	nowMs: number,
	onCallout: (c: Omit<CombatCallout, "id" | "createdAt">) => void,
	onRequestIntervention?: (
		caller: FighterRuntime,
		supporterIndex: number,
	) => void,
	isDemoShowcase: boolean = false,
) {
	if (
		ai.hp <= 0 ||
		opponent.hp <= 0 ||
		ai.action === "hitstun" ||
		ai.action === "knockdown" ||
		ai.action === "special"
	) {
		return;
	}

	// During a Simultaneous Blade Clash Lock, AI actively mashes weapon clash power!
	if (ai.action === "blade_clash" && ai.clashLockTimerMs > 0) {
		if (Math.random() < dtSeconds * (isDemoShowcase ? 8.5 : 5.5)) {
			triggerFighterAttack(ai, Math.random() < 0.4 ? "H" : "L", onCallout);
		}
		return;
	}

	const dist = Math.abs(opponent.x - ai.x);
	const preferredRange = ai.spec.light.range * 0.92;

	const oppAttacking =
		opponent.action.startsWith("light") ||
		opponent.action.startsWith("heavy") ||
		opponent.action === "combo_finisher" ||
		opponent.action === "special";

	// AI Tactical Intervention Decision:
	// If AI hasn't used its intervention yet and has an eligible supporter (meter >= 25),
	// summon it when threatened (low HP / enemy attacking) or when pressing an offensive window!
	if (!ai.interventionUsed && onRequestIntervention) {
		const readyIdx = ai.supporters.findIndex((s) => s.canIntervene);
		if (readyIdx !== -1) {
			const isThreatened =
				ai.hp < ai.maxHp * 0.78 || ai.guardGauge < 60 || oppAttacking;
			const inOffensiveWindow =
				dist <= 4.0 && opponent.hp < opponent.maxHp * 0.92;
			const baseRate = isDemoShowcase ? 1.85 : 1.0;
			const triggerChance =
				(isThreatened
					? dtSeconds * 1.5
					: inOffensiveWindow
						? dtSeconds * 0.85
						: dtSeconds * 0.38) * baseRate;
			if (Math.random() < triggerChance) {
				onRequestIntervention(ai, readyIdx);
				return;
			}
		}
	}

	if (oppAttacking && dist < opponent.spec.heavy.range * 1.15) {
		if (
			ai.action === "idle" ||
			ai.action === "walk_fwd" ||
			ai.action === "walk_back"
		) {
			// AI can either 4D Phase-Shift through the attack OR guard/parry!
			if (
				ai.wPhaseCooldownMs <= 0 &&
				Math.random() < (isDemoShowcase ? 0.28 : 0.16)
			) {
				triggerFighter4DPhaseShift(ai, onCallout);
				return;
			}
			if (Math.random() < (isDemoShowcase ? 0.46 : 0.36)) {
				// Occasionally land a crisp High-Noon Perfect Parry!
				const isPerfectParry = Math.random() < (isDemoShowcase ? 0.45 : 0.25);
				ai.lastBlockPressTime = isPerfectParry ? nowMs : nowMs - 220;
				ai.action = "block";
				ai.vx = 0;
				return;
			}
		}
	} else if (ai.action === "block" && !oppAttacking) {
		ai.action = "idle";
	}

	// Chain into 3-step Archetype Combos!
	const isAiAttacking =
		ai.action.startsWith("light") || ai.action.startsWith("heavy");
	if (isAiAttacking && ai.actionTimerMs >= ai.actionDurationMs * 0.44) {
		if (
			dist <= ai.spec.heavy.range * 1.2 &&
			Math.random() < (isDemoShowcase ? 0.72 : 0.48)
		) {
			const targetRecipe =
				ai.spec.combos[Math.floor(Math.random() * ai.spec.combos.length)];
			const nextStep = targetRecipe.sequence[ai.comboBuffer.length] || "H";
			triggerFighterAttack(ai, nextStep, onCallout);
			return;
		}
	}

	if (
		ai.action !== "idle" &&
		ai.action !== "walk_fwd" &&
		ai.action !== "walk_back"
	) {
		return;
	}

	// Unleash Archetype Special when meter is ready!
	if (
		ai.meter >= ai.spec.special.meterCost &&
		dist <= ai.spec.special.range * 0.92 &&
		Math.random() < dtSeconds * (isDemoShowcase ? 3.8 : 2.4)
	) {
		triggerFighterAttack(ai, "S", onCallout);
		return;
	}

	// Use 4D Temporal Echo Clone (x, y, z, t) pincer attack when mid-close range!
	if (
		ai.temporalEchoTimerMs <= 0 &&
		ai.meter >= 35 &&
		dist <= 2.9 &&
		Math.random() < dtSeconds * (isDemoShowcase ? 1.35 : 0.55)
	) {
		triggerFighterTemporalEcho(ai, onCallout);
		return;
	}

	const aiSpeedMult = getFighterSpeedMultiplier(ai);
	if (dist > preferredRange + 0.32) {
		if (
			dist > 3.2 &&
			Math.random() < dtSeconds * (isDemoShowcase ? 2.4 : 1.5)
		) {
			triggerFighterDash(ai, true);
		} else {
			ai.action = "walk_fwd";
			ai.vx =
				ai.facing *
				ai.spec.walkSpeed *
				aiSpeedMult *
				(isDemoShowcase ? 1.15 : 1.0);
		}
	} else {
		ai.vx = 0;
		const roll = Math.random();
		const atkFreq = isDemoShowcase ? 6.5 : 4.2;
		if (roll < dtSeconds * atkFreq) {
			const attackType: AttackInput = Math.random() < 0.62 ? "L" : "H";
			triggerFighterAttack(ai, attackType, onCallout);
		} else if (roll < dtSeconds * (atkFreq + 0.8)) {
			ai.action = "walk_back";
			ai.vx = -ai.facing * ai.spec.walkSpeed * aiSpeedMult * 0.75;
		} else {
			ai.action = "idle";
		}
	}
}

/**
 * Initiates the archetype-specific Victory Taunt choreography for the winning warrior
 * and collapses the defeated warrior at the start of FIGHT_OUTRO.
 */
export function triggerVictoryTaunt(
	winner: FighterRuntime,
	loser: FighterRuntime,
): VictoryTauntSpec {
	const taunt = winner.spec.victoryTaunt;
	winner.action = "victory_taunt";
	winner.actionTimerMs = 0;
	winner.actionDurationMs = taunt.durationMs;
	winner.hasHitThisAction = false; // used to trigger mid-taunt climax VFX once!
	winner.vx = 0;
	winner.vy = 0;
	winner.y = 0;
	winner.wPhaseTimerMs = 0;
	winner.wPhaseOffset = 0;
	winner.statusBurnTimerMs = 0;
	winner.statusSlowTimerMs = 0;
	winner.statusWeakenedTimerMs = 0;
	winner.facing = loser.x >= winner.x ? 1 : -1;

	loser.action = "defeat";
	loser.actionTimerMs = 0;
	loser.actionDurationMs = taunt.durationMs;
	loser.vx = 0;
	loser.vy = 0;
	loser.y = 0;
	loser.wPhaseTimerMs = 0;
	loser.wPhaseOffset = 0;

	return taunt;
}

/**
 * Advances the Victory Taunt timer during FIGHT_OUTRO and signals when the archetype's
 * signature mid-taunt flourish climax occurs (for synchronized arena sparks/shockwaves).
 */
export function stepVictoryTaunt(
	winner: FighterRuntime,
	loser: FighterRuntime,
	dtSeconds: number,
): { triggeredClimaxVFX: boolean; climaxColorHex: number } {
	const dtMs = dtSeconds * 1000;
	if (winner.action !== "victory_taunt") {
		winner.action = "victory_taunt";
		winner.actionDurationMs = winner.spec.victoryTaunt.durationMs;
	}

	winner.actionTimerMs = Math.min(
		winner.actionDurationMs,
		winner.actionTimerMs + dtMs,
	);
	loser.actionTimerMs = Math.min(
		loser.actionDurationMs,
		loser.actionTimerMs + dtMs,
	);

	let triggeredClimaxVFX = false;
	const progress =
		winner.actionDurationMs > 0
			? winner.actionTimerMs / winner.actionDurationMs
			: 0;

	// Trigger the archetype's climax flourish impact at 42% through the Victory Taunt!
	if (!winner.hasHitThisAction && progress >= 0.42) {
		winner.hasHitThisAction = true;
		triggeredClimaxVFX = true;
	}

	return {
		triggeredClimaxVFX,
		climaxColorHex: winner.spec.victoryTaunt.flourishColorHex,
	};
}
