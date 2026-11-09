import {
	Clock,
	Eye,
	GitBranch,
	GraduationCap,
	Layers,
	Orbit,
	Pause,
	Play,
	RotateCcw,
	Sparkles,
	Volume2,
	VolumeX,
	Zap,
} from "lucide-react";
import type { CameraPreset } from "../types/appCamera";
import type {
	AcademicColloquiumState,
	BattleLogEntry,
	ChessPiece,
} from "../types/game";

export type { CameraPreset } from "../types/appCamera";

export interface ChessBottomControlDockProps {
	dockCollapsed: boolean;
	onToggleDock: () => void;
	autoPlayDemo: boolean;
	academicColloquium: AcademicColloquiumState | null;
	pieces: ChessPiece[];
	cameraPreset: CameraPreset;
	activeSliceW: number;
	activeSliceZ: number;
	battleLogs: BattleLogEntry[];
	muted: boolean;
	onToggleAutoPlayDemo: () => void;
	onOpenMultiverse: () => void;
	onTriggerGuidedAssassinationDemo: () => void;
	onTriggerRealmShowcase: () => void;
	onAscendToPocketWatchDuel: () => void;
	onCheckmateYesterdayShowcase: (publishedTheorem: boolean) => void;
	onTrigger4DHyperScenario: () => void;
	onSelect4DSlice: (newW: number, newZ: number, alsoSetView?: boolean) => void;
	onSelectCameraPreset: (preset: CameraPreset) => void;
	onToggleMute: () => void;
	onResetGame: () => void;
}

export function ChessBottomControlDock({
	dockCollapsed,
	onToggleDock,
	autoPlayDemo,
	academicColloquium,
	pieces,
	cameraPreset,
	activeSliceW,
	activeSliceZ,
	battleLogs,
	muted,
	onToggleAutoPlayDemo,
	onOpenMultiverse,
	onTriggerGuidedAssassinationDemo,
	onTriggerRealmShowcase,
	onAscendToPocketWatchDuel,
	onCheckmateYesterdayShowcase,
	onTrigger4DHyperScenario,
	onSelect4DSlice,
	onSelectCameraPreset,
	onToggleMute,
	onResetGame,
}: ChessBottomControlDockProps) {
	return (
		<div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 w-[min(1080px,96vw)] flex flex-col items-center pointer-events-auto">
			<button
				type="button"
				onClick={onToggleDock}
				className="mb-1 px-3 py-1 text-xs font-mono text-slate-300 bg-[#0B0E17]/95 border border-slate-800 rounded-t-lg hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
			>
				{dockCollapsed
					? "▴ Show 4D Hypercube Navigator & Impossible Realms (H)"
					: "▾ Hide Controls (H)"}
			</button>

			{!dockCollapsed && (
				<div className="w-full bg-[#0B0E17]/95 border border-slate-800 rounded-xl px-4 py-3 shadow-2xl flex flex-wrap items-center justify-between gap-3">
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={onToggleAutoPlayDemo}
							className={`px-3 py-2 font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
								autoPlayDemo
									? "bg-emerald-400 hover:bg-emerald-300 text-slate-950 shadow-[0_0_18px_rgba(52,211,153,0.35)]"
									: "bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-400/60 text-emerald-200"
							}`}
							title="Watch an autonomous AI-vs-AI showcase demonstrating 4D Quantum Chess, Spaghetti Western Crash-Zooms, First-Person Visor Combat, and Tactical Board Interventions! (P Key)"
						>
							{autoPlayDemo ? (
								<Pause className="w-3.5 h-3.5" />
							) : (
								<Play className="w-3.5 h-3.5" />
							)}
							{autoPlayDemo ? "Pause Demo (P)" : "Auto-Play Demo (P)"}
						</button>
						<button
							type="button"
							onClick={onOpenMultiverse}
							className="px-3 py-2 bg-fuchsia-950/95 hover:bg-fuchsia-900 border border-fuchsia-400/70 text-fuchsia-200 font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
							title="Open the Multiversal Causal Nexus to inspect parallel timelines, Global Piece Lineages, and trigger Reality Convergence! (M Key)"
						>
							<GitBranch className="w-3.5 h-3.5 text-fuchsia-300" />
							Multiverse Nexus (M)
						</button>
						<button
							type="button"
							onClick={onTriggerGuidedAssassinationDemo}
							className="px-3 py-2 bg-linear-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
							title="Enter Timeline Ω-1, assassinate the exposed Obsidian Queen, and converge her death back into Prime Reality!"
						>
							<Zap className="w-3.5 h-3.5" />
							Causal Assassination (Ω-1)
						</button>
						<button
							type="button"
							onClick={() => onTriggerRealmShowcase()}
							className="px-3 py-2 bg-cyan-950/95 hover:bg-cyan-900 border border-cyan-400/60 text-cyan-200 font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
							title="Descend with a warrior through a Board Gateway Well into the 3D Subterranean Realms (The Shattered Mirror, The Ashen Crucible, The Echoing Remnant)!"
						>
							<Sparkles className="w-3.5 h-3.5 text-cyan-300" />
							Descend Into Realms
						</button>
						<button
							type="button"
							onClick={() => onAscendToPocketWatchDuel()}
							className="px-3 py-2 bg-amber-950/95 hover:bg-amber-900 border border-amber-400/70 text-amber-200 font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
							title="Ascend into the sky to fight a real-time 3D duel directly atop the spinning gears and hands of the Colossal Multiversal Pocket Watch!"
						>
							<Clock className="w-3.5 h-3.5 text-amber-300" />
							Watch Ascension Duel
						</button>
						<button
							type="button"
							onClick={() => onCheckmateYesterdayShowcase(false)}
							className="px-3 py-2 bg-linear-to-r from-sky-500 to-amber-400 hover:from-sky-400 hover:to-amber-300 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-[0_0_18px_rgba(56,189,248,0.3)]"
							title="Develop a Sentient Mathematical Theorem by merging a Pawn with its alternate self -> All pieces become Tweed-Suited Professors for Peer Review, Revisions & Tenure Defense -> Publish to unlock Checkmate Yesterday!"
						>
							<GraduationCap className="w-4 h-4 text-slate-950" />
							<span>
								{academicColloquium?.active
									? "🎓 Peer Review in Session"
									: pieces.some(
												(p) =>
													p.isSentientTheorem &&
													p.theoremStatus === "PUBLISHED",
											)
										? "⊢ Q.E.D. Checkmate Yesterday!"
										: "🎓 Develop Theorem & Peer Review"}
							</span>
						</button>
						<button
							type="button"
							onClick={onTrigger4DHyperScenario}
							className="px-3 py-2 bg-purple-950/90 hover:bg-purple-900 border border-purple-500/50 text-purple-200 font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
							title="Shift pieces across the 4th spatial dimension (Ana +W / Kata -W) to experience Unseen 4D Threats & Cross-Dimensional Ambushes!"
						>
							<Orbit className="w-3.5 h-3.5 text-purple-400" />
							4D Hyper-Ambush
						</button>
					</div>

					<div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
						<Layers className="w-3.5 h-3.5 text-purple-400 ml-1.5 mr-1" />
						{(
							[
								[-1, 0, "Kata (-W)"],
								[0, 0, "Prime (W=0)"],
								[1, 0, "Ana (+W)"],
								[0, 1, "Astral (+Z)"],
							] as [number, number, string][]
						).map(([wVal, zVal, label]) => (
							<button
								type="button"
								key={`${wVal}_${zVal}`}
								onClick={() => onSelect4DSlice(wVal, zVal, true)}
								className={`px-2.5 py-1 text-xs font-mono rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
									activeSliceW === wVal && activeSliceZ === zVal
										? "bg-purple-900/90 text-purple-200 border border-purple-500/40 shadow-sm"
										: "text-slate-400 hover:text-slate-200"
								}`}
							>
								{label}
							</button>
						))}
					</div>

					<div className="flex items-center gap-2">
						<div className="hidden lg:flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
							<Eye className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-1" />
							{(
								[
									["white_orbit", "Orbit"],
									["top_tactical", "Top"],
									["cinematic_angle", "Flank"],
									["pocket_watch", "Watch (C)"],
								] as [CameraPreset, string][]
							).map(([preset, label]) => (
								<button
									type="button"
									key={preset}
									onClick={() => onSelectCameraPreset(preset)}
									className={`px-2 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
										cameraPreset === preset
											? "bg-slate-800 text-amber-400 shadow-sm"
											: "text-slate-400 hover:text-slate-200"
									}`}
								>
									{label}
								</button>
							))}
						</div>

						<button
							type="button"
							onClick={onToggleMute}
							className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
							aria-label={muted ? "Unmute Audio" : "Mute Audio"}
							title={muted ? "Unmute Audio" : "Mute Audio"}
						>
							{muted ? (
								<VolumeX className="w-4 h-4" />
							) : (
								<Volume2 className="w-4 h-4" />
							)}
						</button>

						<button
							type="button"
							onClick={onResetGame}
							className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
							aria-label="Reset Match"
							title="Reset Match"
						>
							<RotateCcw className="w-4 h-4" />
						</button>
					</div>

					{battleLogs.length > 0 && (
						<div className="w-full border-t border-slate-800/80 pt-2 flex items-center justify-between text-xs text-slate-400">
							<div className="truncate">
								<span className="font-mono text-amber-400 mr-2">
									MULTIVERSAL CHRONICLE:
								</span>
								<span className="text-slate-200 font-medium">
									{battleLogs[0].summary}
								</span>
								<span className="mx-1.5">·</span>
								<span>{battleLogs[0].detail}</span>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
