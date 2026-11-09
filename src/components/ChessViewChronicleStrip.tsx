import {
	AlertTriangle,
	Clock,
	GitBranch,
	Orbit,
	RotateCcw,
	Sparkles,
} from "lucide-react";
import { ARCHETYPES } from "../data/archetypes";
import {
	computeSquareSupportAnalysis,
	formatSquareName,
	formatWName,
} from "../engine/chessEngine";
import {
	getCounterpartManifestationsForPiece,
	getPendingCausalBreachesForTimeline,
} from "../engine/multiverseEngine";
import { REALM_METADATA } from "../engine/realmEngine";
import type {
	AcademicColloquiumState,
	ChessPiece,
	Faction,
	MoveOption,
	MultiverseState,
	UnseenThreatVector,
} from "../types/game";
import { getProfessorPersona } from "./AcademicColloquiumOverlay";

export interface WatchEventBanner {
	title: string;
	subtitle: string;
}

export interface ChessViewChronicleStripProps {
	timelineBranchLabel: string;
	turnNumber: number;
	multiverseState: MultiverseState;
	activeSliceW: number;
	activeSliceZ: number;
	turnFaction: Faction;
	onOpenMultiverse: () => void;
	onSwitchTimeline: (timelineId: string) => void;
	onHoverTimelineOnWatch: (timelineId: string | null) => void;
	watchShowcaseStep: number;
	onAdvanceWatchShowcase: () => void;
	watchEventBanner: WatchEventBanner | null;
	onTriggerConvergence: (timelineId: string) => void;
	canRewindTimeline: boolean;
	onChronoRewind: () => void;
	unseenThreats: UnseenThreatVector[];
	onSelect4DSlice: (newW: number, newZ: number, alsoSetView?: boolean) => void;
	selectedPiece: ChessPiece | null;
	academicColloquium: AcademicColloquiumState | null;
	pieces: ChessPiece[];
	validMoves: MoveOption[];
	onEntangleSelectedPiece: () => void;
	onCheckmateYesterdayShowcase: (publishedTheorem: boolean) => void;
	onSynodTranspose: (timelineId: string) => void;
	onAscendToPocketWatchDuel: (piece: ChessPiece) => void;
	onExecuteChessMove: (piece: ChessPiece, move: MoveOption) => void;
	targetMoveW: number;
	targetMoveZ: number;
	hoveredCaptureMove: MoveOption | null;
}

export function ChessViewChronicleStrip({
	timelineBranchLabel,
	turnNumber,
	multiverseState,
	activeSliceW,
	activeSliceZ,
	turnFaction,
	onOpenMultiverse,
	onSwitchTimeline,
	onHoverTimelineOnWatch,
	watchShowcaseStep,
	onAdvanceWatchShowcase,
	watchEventBanner,
	onTriggerConvergence,
	canRewindTimeline,
	onChronoRewind,
	unseenThreats,
	onSelect4DSlice,
	selectedPiece,
	academicColloquium,
	pieces,
	validMoves,
	onEntangleSelectedPiece,
	onCheckmateYesterdayShowcase,
	onSynodTranspose,
	onAscendToPocketWatchDuel,
	onExecuteChessMove,
	targetMoveW,
	targetMoveZ,
	hoveredCaptureMove,
}: ChessViewChronicleStripProps) {
	return (
		<div className="pointer-events-none fixed top-16.5 left-6 z-20 flex flex-col gap-2.5 max-w-md">
			{/* Chapter, Active Reality & Quick Branch Switcher */}
			<div className="pointer-events-auto drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)] bg-[#080B14]/85 border border-slate-800/90 rounded-xl px-4 py-2.5 backdrop-blur-sm">
				<div className="flex items-center justify-between gap-3">
					<div className="font-mono text-[11px] tracking-[0.16em] text-amber-400/90 uppercase font-bold">
						{timelineBranchLabel} · Turn {turnNumber}
					</div>
					<button
						type="button"
						onClick={onOpenMultiverse}
						className="px-2.5 py-0.5 rounded bg-fuchsia-500/20 hover:bg-fuchsia-500/35 border border-fuchsia-400/60 text-[10px] font-mono font-bold text-fuchsia-200 flex items-center gap-1 cursor-pointer transition-colors"
						title="Open Multiverse Causal Nexus & Lineage Inspector (M Key)"
					>
						<GitBranch className="w-3 h-3" />
						Multiverse (M)
					</button>
				</div>

				<div className="font-display text-base font-bold text-white tracking-wide mt-0.5">
					{activeSliceW !== 0 || activeSliceZ !== 0
						? `Across the ${formatWName(activeSliceW)} Horizon`
						: turnFaction === "w"
							? "The Solaris Order Commands the Field"
							: "The Obsidian Dominion Advances"}
				</div>

				{/* Quick Parallel Reality Switcher (Hovering highlights the corresponding hand on the 3D Pocket Watch!) */}
				<div className="mt-2 pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5">
					<span className="text-[10px] font-mono text-slate-400 mr-0.5">
						Realities:
					</span>
					{Array.from(multiverseState.timelines.values())
						.slice(0, 6)
						.map((br) => {
							const isCur = br.id === multiverseState.activeTimelineId;
							const unprop = getPendingCausalBreachesForTimeline(
								multiverseState,
								br.id,
							);
							return (
								<button
									type="button"
									key={br.id}
									onClick={() => onSwitchTimeline(br.id)}
									onMouseEnter={() => onHoverTimelineOnWatch(br.id)}
									onMouseLeave={() => onHoverTimelineOnWatch(null)}
									className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all cursor-pointer flex items-center gap-1 ${
										br.isCollapsed
											? "bg-rose-950/90 text-rose-300 border border-rose-500/60 line-through"
											: isCur
												? "bg-fuchsia-500 text-slate-950 font-bold shadow-sm"
												: "bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-700/80"
									}`}
									title={`${br.name}: ${br.divergenceSummary} (Hover to highlight hand on Cosmic Watch)`}
								>
									<span>{br.shortCode}</span>
									{unprop.length > 0 && (
										<span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
									)}
								</button>
							);
						})}
				</div>

				{/* Multiversal Pocket Watch & Remembered-Square Ledger Bar */}
				<div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 text-[10px] font-mono text-slate-300">
					<span>
						Watch Hands:{" "}
						<strong className="text-amber-300">
							{multiverseState.visitedTimelineIds.length}
						</strong>{" "}
						· Remembered Sq:{" "}
						<strong className="text-rose-300">
							{multiverseState.rememberedSquares.length}
						</strong>
					</span>
					<button
						type="button"
						onClick={onAdvanceWatchShowcase}
						className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/60 text-amber-200 font-bold cursor-pointer transition-colors"
						title="Step through the 5-stage Multiversal Pocket Watch Evolution Showcase"
					>
						{watchShowcaseStep === 0
							? "Watch Showcase →"
							: `Watch Stage ${watchShowcaseStep}/5 →`}
					</button>
				</div>

				{watchEventBanner && (
					<div className="mt-2 bg-[#140C1C]/95 border-l-2 border-amber-400 pl-2.5 py-1.5 pr-2 rounded-r-lg">
						<div className="text-[10px] font-mono font-bold text-amber-300">
							{watchEventBanner.title}
						</div>
						<div className="text-[10px] text-slate-300 leading-snug mt-0.5">
							{watchEventBanner.subtitle}
						</div>
					</div>
				)}

				{getPendingCausalBreachesForTimeline(multiverseState, "TL-PRIME")
					.length > 0 && (
					<button
						type="button"
						onClick={() => onTriggerConvergence("TL-PRIME")}
						className="mt-2 w-full px-3 py-1.5 bg-linear-to-r from-fuchsia-500 to-rose-500 hover:from-fuchsia-400 hover:to-rose-400 text-slate-950 font-mono font-bold text-[11px] rounded-lg flex items-center justify-center gap-1.5 shadow-lg animate-pulse cursor-pointer"
					>
						<Sparkles className="w-3.5 h-3.5" />
						Converge Causal Assassination Into Prime Reality!
					</button>
				)}

				{canRewindTimeline && (
					<button
						type="button"
						onClick={onChronoRewind}
						className="mt-1.5 w-full px-3 py-1 bg-cyan-950/85 hover:bg-cyan-900 border border-cyan-400/40 rounded-lg text-[11px] font-mono text-cyan-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
						title="Rewind spacetime causality by 1 turn and fork a parallel timeline branch"
					>
						<RotateCcw className="w-3 h-3 text-cyan-300" />
						Rewind Causality (Δt = -1)
					</button>
				)}
			</div>

			{unseenThreats.length > 0 && (
				<div className="pointer-events-auto bg-[#090616]/85 border-l-2 border-purple-400 pl-3 py-1.5 pr-3 rounded-r-lg">
					<div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-purple-300">
						<AlertTriangle className="w-3.5 h-3.5 text-purple-400 shrink-0" />
						<span>
							Shadow from {formatWName(unseenThreats[0].attacker.w)} threatens{" "}
							{formatSquareName({
								row: unseenThreats[0].targetRow,
								col: unseenThreats[0].targetCol,
							})}
						</span>
					</div>
					<button
						type="button"
						onClick={() =>
							onSelect4DSlice(
								unseenThreats[0].attacker.w,
								unseenThreats[0].attacker.z,
								true,
							)
						}
						className="mt-1 text-[11px] font-mono text-cyan-300 hover:text-cyan-200 underline cursor-pointer"
					>
						Shift Gaze to {formatWName(unseenThreats[0].attacker.w)}
					</button>
				</div>
			)}

			{selectedPiece &&
				(() => {
					const condRatio = selectedPiece.hp / Math.max(1, selectedPiece.maxHp);
					const conditionStory =
						condRatio > 0.75
							? "Radiant & Unscathed"
							: condRatio > 0.35
								? "Armor Scored in Battle"
								: "Pauldrons Sundered · Embers Rising";
					const reachableGatewayMove = validMoves.find(
						(m) => m.dimensionType === "REALM_GATEWAY_DESCENT",
					);
					const counterparts = getCounterpartManifestationsForPiece(
						multiverseState,
						selectedPiece,
						multiverseState.activeTimelineId,
						pieces,
					);
					return (
						<div className="pointer-events-auto bg-[#0B0E17]/85 border border-slate-800/90 rounded-xl px-3.5 py-2.5 shadow-xl">
							<div className="flex items-center justify-between gap-2">
								<div>
									<div className="font-display text-sm font-bold text-white flex items-center gap-1.5 flex-wrap">
										<span>
											{academicColloquium?.active
												? `🎓 ${getProfessorPersona(selectedPiece).academicTitle}`
												: selectedPiece.isSentientTheorem
													? "⊢ Sentient Mathematical Theorem"
													: ARCHETYPES[selectedPiece.type].warriorTitle}
										</span>
										{selectedPiece.isSentientTheorem && (
											<span
												className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
													selectedPiece.theoremStatus === "PUBLISHED"
														? "bg-sky-400/25 border border-sky-300/80 text-sky-200"
														: "bg-amber-400/25 border border-amber-300/80 text-amber-200"
												}`}
											>
												{selectedPiece.theoremStatus === "PUBLISHED"
													? "⊢ PUBLISHED Q.E.D."
													: "🎓 PREPRINT UNDER PEER REVIEW"}
											</span>
										)}
										{selectedPiece.isChronocrator && (
											<span className="px-1.5 py-0.5 rounded bg-amber-400/20 border border-amber-400/70 text-[9px] font-mono text-amber-300">
												⌚ CHRONOCRATOR
											</span>
										)}
										{Boolean(
											selectedPiece.synodStacks &&
												selectedPiece.synodStacks > 0,
										) && (
											<span className="px-1.5 py-0.5 rounded bg-cyan-400/20 border border-cyan-400/70 text-[9px] font-mono text-cyan-200">
												✦ SYNOD ×{selectedPiece.synodStacks}
											</span>
										)}
									</div>
									{selectedPiece.theoremAxiom && (
										<div className="text-[10px] font-mono font-bold text-sky-300 mt-0.5">
											{selectedPiece.theoremAxiom}
										</div>
									)}
									{academicColloquium?.active && (
										<div className="text-[10px] font-mono text-amber-200/90 mt-0.5">
											{getProfessorPersona(selectedPiece).department} ·{" "}
											<span className="text-amber-300">
												{getProfessorPersona(selectedPiece).elbowPatchStyle}
											</span>
										</div>
									)}
									<div className="text-[11px] font-mono text-amber-300/90">
										{ARCHETYPES[selectedPiece.type].chessName} at{" "}
										{formatSquareName({
											row: selectedPiece.row,
											col: selectedPiece.col,
										})}{" "}
										·{" "}
										<span
											className={
												condRatio < 0.35 ? "text-rose-400" : "text-slate-300"
											}
										>
											{conditionStory}
										</span>
									</div>
								</div>
								<button
									type="button"
									onClick={onEntangleSelectedPiece}
									className="px-2 py-1 bg-cyan-950/90 hover:bg-cyan-900 border border-cyan-400/50 rounded text-[10px] font-mono text-cyan-200 transition-colors cursor-pointer shrink-0"
									title="Bind this warrior in a Quantum Bell Pair with an ally"
								>
									{selectedPiece.entangledWithId
										? "|Φ⁺⟩ Re-Bind"
										: "|Φ⁺⟩ Soul-Bind"}
								</button>
							</div>

							{selectedPiece.type === "p" && (
								<button
									type="button"
									onClick={() =>
										onCheckmateYesterdayShowcase(
											Boolean(
												selectedPiece.isSentientTheorem &&
													selectedPiece.theoremStatus === "PUBLISHED",
											),
										)
									}
									className="mt-2 w-full px-3 py-1.5 bg-linear-to-r from-sky-500/30 to-amber-500/30 hover:from-sky-500/45 hover:to-amber-500/45 border border-sky-400/75 rounded-lg text-[10px] font-mono font-bold text-sky-100 flex items-center justify-between transition-colors cursor-pointer shadow-[0_0_18px_rgba(56,189,248,0.25)]"
									title="Merge this Pawn with its alternate-timeline self to formulate a Sentient Mathematical Theorem, undergo Academic Peer Review as Tweed-Suited Professors, and unlock Checkmate Yesterday!"
								>
									<span>
										{selectedPiece.isSentientTheorem
											? selectedPiece.theoremStatus === "PUBLISHED"
												? "⊢ Execute Published Q.E.D. Checkmate Yesterday"
												: "🎓 Continue Academic Peer Review (In Session)"
											: "🎓 Merge Alternate Pawn → Develop Sentient Theorem"}
									</span>
									<span className="text-amber-300 font-bold">
										{selectedPiece.isSentientTheorem
											? selectedPiece.theoremStatus === "PUBLISHED"
												? "Δt = −1 →"
												: "Peer Review →"
											: "Preprint →"}
									</span>
								</button>
							)}

							{counterparts.length > 0 && (
								<div className="mt-2 pt-2 border-t border-slate-800/80">
									<div className="text-[10px] font-mono text-cyan-300 font-bold flex items-center justify-between">
										<span>✦ Multiversal Synod Counterparts:</span>
										<span className="text-[9px] text-slate-400">
											{selectedPiece.type === "p"
												? "Merge into Sentient Theorem!"
												: "Swap & Fuse (+L-Leaps)"}
										</span>
									</div>
									<div className="mt-1 flex flex-wrap gap-1.5">
										{counterparts.slice(0, 4).map((cp) => (
											<button
												type="button"
												key={cp.timelineId}
												onClick={() => onSynodTranspose(cp.timelineId)}
												onMouseEnter={() =>
													onHoverTimelineOnWatch(cp.timelineId)
												}
												onMouseLeave={() => onHoverTimelineOnWatch(null)}
												className="px-2 py-1 rounded bg-cyan-950/90 hover:bg-cyan-900 border border-cyan-400/60 text-[10px] font-mono text-cyan-100 flex items-center gap-1 cursor-pointer transition-colors"
												title={`Quantum-Swap with counterpart in ${cp.timelineName} at ${cp.squareLabel} (+25 HP, +30% Meter, Synod L-Leaps)`}
											>
												<span className="text-amber-300 font-bold">
													{cp.shortCode}
												</span>
												<span>→ {cp.squareLabel}</span>
												{cp.occupantOnActiveBoard && (
													<span className="text-rose-400 font-bold">⚔</span>
												)}
											</button>
										))}
									</div>
								</div>
							)}

							<button
								type="button"
								onClick={() => onAscendToPocketWatchDuel(selectedPiece)}
								className="mt-2 w-full px-3 py-1.5 bg-linear-to-r from-amber-500/25 to-fuchsia-500/25 hover:from-amber-500/40 hover:to-fuchsia-500/40 border border-amber-400/60 rounded-lg text-[10px] font-mono font-bold text-amber-200 flex items-center justify-between transition-colors cursor-pointer"
								title="Ascend with this warrior to fight atop the Colossal Multiversal Pocket Watch in the sky! Victory crowns them Chronocrator & resurrects fallen allies!"
							>
								<span className="flex items-center gap-1.5">
									<Clock className="w-3.5 h-3.5 text-amber-300" />
									<span>Ascend to Pocket Watch Duel</span>
								</span>
								<span className="text-amber-300">Crown Chronocrator →</span>
							</button>

							{reachableGatewayMove && (
								<button
									type="button"
									onClick={() =>
										onExecuteChessMove(selectedPiece, reachableGatewayMove)
									}
									className="mt-2 w-full px-3 py-1.5 bg-purple-950/90 hover:bg-purple-900 border border-purple-400/60 rounded-lg text-[11px] font-mono font-bold text-purple-200 flex items-center justify-between transition-colors cursor-pointer"
								>
									<span>
										⟁ Descend {formatSquareName(reachableGatewayMove.to)}{" "}
										Gateway
									</span>
									<span className="text-amber-300">
										{reachableGatewayMove.realmId
											? REALM_METADATA[reachableGatewayMove.realmId].title
											: "Enter Realm"}{" "}
										→
									</span>
								</button>
							)}

							<div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1.5">
								<span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
									<Orbit className="w-3 h-3 text-cyan-400" />
									Step Across:
								</span>
								<div className="flex items-center gap-1">
									{(
										[
											[-1, "Kata (-W)"],
											[0, "Prime"],
											[1, "Ana (+W)"],
										] as [number, string][]
									).map(([wVal, label]) => (
										<button
											type="button"
											key={wVal}
											onClick={() => onSelect4DSlice(wVal, targetMoveZ, false)}
											className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
												targetMoveW === wVal
													? "bg-cyan-500 text-slate-950 font-bold"
													: "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
											}`}
										>
											{label}
										</button>
									))}
								</div>
							</div>
						</div>
					);
				})()}

			{hoveredCaptureMove?.targetPiece &&
				selectedPiece &&
				(() => {
					const hoverSupport = computeSquareSupportAnalysis(
						pieces,
						hoveredCaptureMove.to,
						selectedPiece.faction,
						hoveredCaptureMove.targetPiece.faction,
						[selectedPiece.id, hoveredCaptureMove.targetPiece.id],
					);
					const readyAllies = hoverSupport.attackerSupporters.filter(
						(s) => s.canIntervene,
					);
					const readyEnemies = hoverSupport.defenderSupporters.filter(
						(s) => s.canIntervene,
					);
					return (
						<div className="bg-[#0B0E17]/90 border-l-2 border-rose-500 pl-3 py-2 pr-3.5 rounded-r-xl shadow-2xl">
							<div className="font-display text-xs font-bold text-rose-300 tracking-wide uppercase">
								Challenge{" "}
								{ARCHETYPES[hoveredCaptureMove.targetPiece.type].warriorTitle}{" "}
								at {formatSquareName(hoveredCaptureMove.to)}
							</div>
							<div className="mt-1 flex items-center gap-3 text-[11px] font-mono">
								<span className="text-emerald-300">
									{readyAllies.length} Allied{" "}
									{readyAllies.length === 1 ? "Vanguard" : "Vanguards"} Ready
								</span>
								<span className="text-slate-500">·</span>
								<span className="text-rose-300">
									{readyEnemies.length} Enemy{" "}
									{readyEnemies.length === 1 ? "Sentinel" : "Sentinels"} Ready
								</span>
							</div>
						</div>
					);
				})()}
		</div>
	);
}
