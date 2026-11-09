import {
	ArrowLeft,
	ArrowRight,
	ArrowUp,
	Clock,
	Crosshair,
	Eye,
	Orbit,
	Shield,
	Swords,
	Users,
	Zap,
} from "lucide-react";
import type React from "react";
import { ARCHETYPES, calculateSpecialHitDamage } from "../data/archetypes";
import { formatSquareName } from "../engine/chessEngine";
import type {
	AttackInput,
	CombatCallout,
	FighterRuntime,
	GamePhase,
} from "../types/game";

export type PlayerCombatInputAction =
	| "left"
	| "right"
	| "jump"
	| "block_down"
	| "block_up"
	| "dash_fwd"
	| "dash_back"
	| "phase_shift_4d"
	| "temporal_echo"
	| "tactical_intervention"
	| AttackInput;

interface CombatHudOverlayProps {
	phase: GamePhase;
	attacker: FighterRuntime | null;
	defender: FighterRuntime | null;
	fightTimer: number;
	duelSquareName: string;
	introShotIndex: number;
	combatCameraMode: "first_person" | "side_arena";
	onToggleCombatCameraMode: () => void;
	callouts: CombatCallout[];
	dockCollapsed: boolean;
	onToggleDock: () => void;
	onPlayerInput: (action: PlayerCombatInputAction) => void;
	onTriggerIntervention: (supporterIndex?: number) => void;
	onSelectSupporter: (supporterIndex: number) => void;
	koNarrative?: { title: string; subtitle: string; wasUpset: boolean } | null;
}

export const CombatHudOverlay: React.FC<CombatHudOverlayProps> = ({
	phase,
	attacker,
	defender,
	fightTimer,
	duelSquareName,
	introShotIndex,
	combatCameraMode,
	onToggleCombatCameraMode,
	callouts,
	dockCollapsed,
	onToggleDock,
	onPlayerInput,
	onTriggerIntervention,
	onSelectSupporter,
	koNarrative,
}) => {
	if (!attacker || !defender) return null;

	const isFightVisible =
		phase === "TRANSITION_TO_FIGHT" ||
		phase === "FIGHT_INTRO" ||
		phase === "FIGHT_ACTIVE" ||
		phase === "FIGHT_OUTRO";

	if (!isFightVisible) return null;

	const humanFighter = !attacker.isAI
		? attacker
		: !defender.isAI
			? defender
			: attacker;
	const opponentFighter = humanFighter === attacker ? defender : attacker;
	const specialCalc = calculateSpecialHitDamage(
		humanFighter.spec,
		opponentFighter.spec,
	);
	const canUseSpecial =
		humanFighter.meter >= humanFighter.spec.special.meterCost;
	const canUsePhase4D =
		humanFighter.wPhaseCooldownMs <= 0 && humanFighter.wPhaseTimerMs <= 0;
	const canUseTemporalEcho =
		humanFighter.meter >= 25 && humanFighter.temporalEchoTimerMs <= 0;
	const readyHumanSupporters = humanFighter.supporters.filter(
		(s) => s.canIntervene,
	);
	const canUseIntervention =
		!humanFighter.interventionUsed && readyHumanSupporters.length > 0;

	const isQuantumPhased =
		humanFighter.wPhaseTimerMs > 0 ||
		humanFighter.temporalEchoTimerMs > 0 ||
		opponentFighter.wPhaseTimerMs > 0;

	const isEnemyAttacking =
		opponentFighter.action.startsWith("light") ||
		opponentFighter.action.startsWith("heavy") ||
		opponentFighter.action === "combo_finisher" ||
		opponentFighter.action === "special";

	const fighterDistance = Math.abs(humanFighter.x - opponentFighter.x);
	const inStrikeRange = fighterDistance <= humanFighter.spec.light.range + 0.25;

	const advanceInput: PlayerCombatInputAction =
		humanFighter.facing === 1 ? "right" : "left";
	const retreatInput: PlayerCombatInputAction =
		humanFighter.facing === 1 ? "left" : "right";

	return (
		<div className="pointer-events-none fixed inset-x-0 top-13.25 bottom-0 z-20 flex flex-col justify-between px-4 py-2.5 md:px-8 md:py-4 overflow-hidden">
			{/* 1. CINEMA 2.39:1 ANAMORPHIC LETTERBOX FRAMING DURING STANDOFF INTRO & VICTORY OUTRO */}
			{(phase === "TRANSITION_TO_FIGHT" ||
				phase === "FIGHT_INTRO" ||
				phase === "FIGHT_OUTRO") && (
				<>
					<div className="fixed inset-x-0 top-13.25 h-12 bg-black/90 z-10 border-b border-amber-500/30 flex items-center justify-between px-8">
						<span className="font-display text-xs tracking-[0.2em] text-amber-300/90 uppercase">
							{phase === "FIGHT_OUTRO"
								? `Square ${duelSquareName} · Victory in Single Combat`
								: introShotIndex === 0
									? `${attacker.spec.warriorTitle} (${attacker.spec.chessName})`
									: introShotIndex === 1
										? `${defender.spec.warriorTitle} (${defender.spec.chessName})`
										: `Square ${duelSquareName} · Draw Weapons`}
						</span>
						<span className="font-mono text-[11px] tracking-[0.15em] text-slate-400">
							{attacker.spec.chessName} vs {defender.spec.chessName}
						</span>
					</div>

					{/* Lower-Third Cinema Subtitle Bar: Shows Victory glory WITHOUT blocking the center 3D scene! */}
					<div className="fixed inset-x-0 bottom-0 h-16 bg-black/90 z-10 border-t border-amber-500/30 flex flex-col items-center justify-center px-6 text-center">
						{phase === "FIGHT_OUTRO" && koNarrative ? (
							<>
								<div className="font-display text-base md:text-lg font-bold tracking-wide text-amber-300">
									{koNarrative.title}
								</div>
								<div className="text-xs text-slate-300 mt-0.5">
									{koNarrative.subtitle}
								</div>
							</>
						) : (
							<div className="font-display text-xs tracking-[0.22em] text-slate-300 uppercase">
								{introShotIndex === 0
									? "The Challenger locks eyes across the contested square"
									: introShotIndex === 1
										? "The Defender stands ground to hold the position"
										: "First-Person Visor Perspective Engaged"}
							</div>
						)}
					</div>
				</>
			)}

			{/* 2. DIEGETIC FIRST-PERSON VISOR RIM & SUBTLE RETICLE (No Cluttered Scoreboards!) */}
			{phase === "FIGHT_ACTIVE" && combatCameraMode === "first_person" && (
				<>
					{/* Subtle Curved Helmet Visor Top Rim */}
					<div
						className={`fixed inset-x-12 top-[58px] h-6 rounded-b-[100%] border-b transition-colors duration-200 ${
							isQuantumPhased
								? "border-cyan-400/50"
								: isEnemyAttacking
									? "border-rose-500/60"
									: "border-amber-500/20"
						}`}
					/>

					{/* Center Visor Reticle & Minimal Contextual Prompt (Only during Blade Bind or Parry Window) */}
					<div className="fixed inset-0 top-13.25 flex flex-col items-center justify-center pointer-events-none z-10">
						{humanFighter.action === "blade_clash" ? (
							<div className="mb-14 text-center">
								<div className="font-display text-sm font-bold tracking-widest text-amber-300 drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
									Weapons Locked — Strike Repeatedly (J / K) to Break Guard
								</div>
							</div>
						) : (
							isEnemyAttacking && (
								<div className="mb-14 text-center">
									<span className="font-display text-xs font-bold tracking-widest text-rose-300 drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
										Incoming {opponentFighter.spec.chessName} Strike — Tap [S]
										to Parry
									</span>
								</div>
							)
						)}

						<div
							className={`relative flex items-center justify-center w-10 h-10 rounded-full border transition-all duration-100 ${
								humanFighter.action === "blade_clash"
									? "border-amber-300 scale-125"
									: isEnemyAttacking
										? "border-rose-400/80 scale-110"
										: inStrikeRange
											? "border-amber-400/60 scale-100"
											: "border-slate-500/25 scale-90"
							}`}
						>
							<Crosshair
								className={`w-4 h-4 ${
									humanFighter.action === "blade_clash"
										? "text-amber-300"
										: isEnemyAttacking
											? "text-rose-400"
											: inStrikeRange
												? "text-amber-400/80"
												: "text-slate-400/40"
								}`}
							/>
						</div>
					</div>
				</>
			)}

			{/* 3. QUIET UNBOXED TOP STORY WHISPER (During Active Fight Only — Zero Health Bar Clutter!) */}
			{phase === "FIGHT_ACTIVE" && (
				<div className="relative z-20 mx-auto w-full max-w-4xl flex flex-col items-center">
					<div className="flex items-center gap-4 text-xs text-slate-200 drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
						<span className="font-display font-bold text-amber-300 tracking-wide">
							{attacker.spec.warriorTitle}
						</span>
						{attacker.statusBurnTimerMs > 0 && (
							<span className="text-orange-400 font-mono text-[11px]">
								Ignited
							</span>
						)}
						{attacker.statusSlowTimerMs > 0 && (
							<span className="text-sky-300 font-mono text-[11px]">Slowed</span>
						)}
						{attacker.statusWeakenedTimerMs > 0 && (
							<span className="text-purple-300 font-mono text-[11px]">
								Sundered
							</span>
						)}

						<span className="font-mono text-slate-400">
							Square {duelSquareName} · {Math.ceil(fightTimer)}s
						</span>

						{defender.statusBurnTimerMs > 0 && (
							<span className="text-orange-400 font-mono text-[11px]">
								Ignited
							</span>
						)}
						{defender.statusSlowTimerMs > 0 && (
							<span className="text-sky-300 font-mono text-[11px]">Slowed</span>
						)}
						{defender.statusWeakenedTimerMs > 0 && (
							<span className="text-purple-300 font-mono text-[11px]">
								Sundered
							</span>
						)}
						<span className="font-display font-bold text-rose-300 tracking-wide">
							{defender.spec.warriorTitle}
						</span>

						<button
							type="button"
							onClick={onToggleCombatCameraMode}
							className="pointer-events-auto ml-2 px-2 py-0.5 rounded bg-slate-900/80 hover:bg-slate-800 border border-slate-700/70 text-[10px] font-mono text-amber-300 flex items-center gap-1 transition-colors cursor-pointer"
							title="Toggle between First-Person Visor POV and 3rd-Person Arena Camera (V Key)"
						>
							<Eye className="w-3 h-3" />
							{combatCameraMode === "first_person"
								? "Arena Cam (V)"
								: "Visor POV (V)"}
						</button>
					</div>

					{/* Whisper-Quiet Story Callout Subtitle (Unboxed text with drop-shadow) */}
					{callouts.length > 0 && (
						<div className="mt-1.5 text-center pointer-events-none">
							{callouts.slice(-1).map((c) => (
								<div
									key={c.id}
									className="drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]"
								>
									<div
										className="font-display text-sm font-bold tracking-wider"
										style={{ color: c.color }}
									>
										{c.text}
									</div>
									{c.subtext && (
										<div className="text-[11px] text-slate-300">
											{c.subtext}
										</div>
									)}
								</div>
							))}
						</div>
					)}
				</div>
			)}

			{/* 4. SLEEK COLLAPSIBLE BOTTOM COMBAT DOCK (Hidden during Intro/Outro so Victory is 100% Unobstructed!) */}
			{phase === "FIGHT_ACTIVE" && (
				<div className="relative z-20 pointer-events-auto mx-auto w-full max-w-4xl flex flex-col items-center">
					{/* Allied Board Support Whisper Line (Only when supporters can intervene) */}
					{humanFighter.supporters.length > 0 &&
						!humanFighter.interventionUsed && (
							<div className="mb-1.5 flex items-center gap-2 text-[11px] text-slate-300 drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
								<span className="text-cyan-300 font-medium">
									Allied Line of Sight:
								</span>
								{humanFighter.supporters.slice(0, 3).map((sup, idx) => {
									const isSelected =
										idx === humanFighter.selectedSupporterIndex;
									const sq = formatSquareName({ row: sup.row, col: sup.col });
									return (
										<button
											type="button"
											key={sup.pieceId}
											onClick={() => {
												onSelectSupporter(idx);
												if (sup.canIntervene) {
													onTriggerIntervention(idx);
												}
											}}
											disabled={!sup.canIntervene}
											className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
												sup.canIntervene
													? isSelected
														? "bg-cyan-950/90 text-cyan-200 border border-cyan-400/60 font-semibold"
														: "bg-slate-900/80 text-slate-300 hover:text-white border border-slate-700/60"
													: "text-slate-500 cursor-not-allowed"
											}`}
										>
											{isSelected && sup.canIntervene ? "[T] " : ""}
											{ARCHETYPES[sup.type].chessName} ({sq}) —{" "}
											{sup.interventionName}
										</button>
									);
								})}
							</div>
						)}

					<button
						type="button"
						onClick={onToggleDock}
						className="mb-1 px-3 py-0.5 text-[11px] font-mono text-slate-400 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
					>
						{dockCollapsed
							? "▴ Show Combat Controls (H)"
							: "▾ Cinema Mode · Hide Controls (H)"}
					</button>

					{!dockCollapsed && (
						<div className="w-full bg-[#0B0E17]/90 border border-slate-800/80 rounded-xl px-4 py-2 shadow-2xl flex flex-wrap items-center justify-between gap-2">
							{/* Movement & Shield Parry */}
							<div className="flex items-center gap-1.5">
								<button
									type="button"
									onPointerDown={() => onPlayerInput(retreatInput)}
									className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-lg text-xs text-slate-200 flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
								>
									<ArrowLeft className="w-3.5 h-3.5" /> Back (A)
								</button>
								<button
									type="button"
									onPointerDown={() => onPlayerInput("jump")}
									className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-lg text-xs text-slate-200 flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
								>
									<ArrowUp className="w-3.5 h-3.5" /> Leap (W)
								</button>
								<button
									type="button"
									onPointerDown={() => onPlayerInput(advanceInput)}
									className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-lg text-xs text-slate-200 flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
								>
									Advance (D) <ArrowRight className="w-3.5 h-3.5" />
								</button>
								<button
									type="button"
									onPointerDown={() => onPlayerInput("block_down")}
									onPointerUp={() => onPlayerInput("block_up")}
									onPointerLeave={() => onPlayerInput("block_up")}
									className="px-2.5 py-1.5 bg-sky-950/80 hover:bg-sky-900/80 border border-sky-500/40 rounded-lg text-xs text-sky-200 flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
								>
									<Shield className="w-3.5 h-3.5" /> Parry (S)
								</button>
							</div>

							{/* Strikes & 4D Quantum Actions */}
							<div className="flex items-center gap-1.5">
								<button
									type="button"
									onPointerDown={() => onPlayerInput("L")}
									className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-xs font-semibold text-white flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
								>
									<Swords className="w-3.5 h-3.5 text-sky-400" />
									Light (J)
								</button>
								<button
									type="button"
									onPointerDown={() => onPlayerInput("H")}
									className="px-3 py-1.5 bg-rose-950/90 hover:bg-rose-900 border border-rose-500/50 rounded-lg text-xs font-semibold text-rose-100 flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
								>
									<Swords className="w-3.5 h-3.5 text-rose-400" />
									Heavy (K)
								</button>
								<button
									type="button"
									onPointerDown={() => onPlayerInput("S")}
									disabled={!canUseSpecial}
									className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 whitespace-nowrap shrink-0 transition-all cursor-pointer ${
										canUseSpecial
											? "bg-amber-500 hover:bg-amber-400 text-slate-950 border border-amber-300 shadow-lg"
											: "bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed"
									}`}
									title={`${humanFighter.spec.special.name}: ${specialCalc.totalDamage} DMG · Inflicts ${humanFighter.spec.special.statusEffect}`}
								>
									<Zap className="w-3.5 h-3.5" />
									Special (U)
								</button>
								<button
									type="button"
									onPointerDown={() => onPlayerInput("phase_shift_4d")}
									disabled={!canUsePhase4D}
									className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 whitespace-nowrap shrink-0 transition-all cursor-pointer ${
										canUsePhase4D
											? "bg-purple-950/90 hover:bg-purple-900 text-purple-200 border border-purple-500/50"
											: "bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed"
									}`}
								>
									<Orbit className="w-3.5 h-3.5 text-purple-400" />
									Phase (Q)
								</button>
								<button
									type="button"
									onPointerDown={() => onPlayerInput("temporal_echo")}
									disabled={!canUseTemporalEcho}
									className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 whitespace-nowrap shrink-0 transition-all cursor-pointer ${
										canUseTemporalEcho
											? "bg-cyan-950/90 hover:bg-cyan-900 text-cyan-200 border border-cyan-500/50"
											: "bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed"
									}`}
								>
									<Clock className="w-3.5 h-3.5 text-cyan-400" />
									Echo (E)
								</button>
								{canUseIntervention && (
									<button
										type="button"
										onPointerDown={() => onTriggerIntervention()}
										className="px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 whitespace-nowrap shrink-0 bg-emerald-950/90 hover:bg-emerald-900 text-emerald-200 border border-emerald-400/70 cursor-pointer"
									>
										<Users className="w-3.5 h-3.5 text-emerald-400" />
										Summon Ally (T)
									</button>
								)}
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
};
