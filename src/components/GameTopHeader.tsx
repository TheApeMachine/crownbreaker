import { Clock, GitBranch, Zap } from "lucide-react";
import type { CameraPreset } from "../types/appCamera";
import type { MultiverseState } from "../types/game";

interface GameTopHeaderProps {
	multiverseState: MultiverseState;
	cameraPreset: CameraPreset;
	onOpenMultiverse: () => void;
	onToggleWatchCamera: () => void;
	onGuidedAssassination: () => void;
	onRealmShowcase: () => void;
	onOpenCodex: () => void;
}

export function GameTopHeader({
	multiverseState,
	cameraPreset,
	onOpenMultiverse,
	onToggleWatchCamera,
	onGuidedAssassination,
	onRealmShowcase,
	onOpenCodex,
}: GameTopHeaderProps) {
	return (
		<header className="relative z-30 flex items-center justify-between gap-8 px-6 py-3.5 bg-[#07090E] border-b border-slate-800/90">
			<span className="font-display text-lg font-bold tracking-wider text-amber-400 whitespace-nowrap shrink-0">
				CROWNBREAKER 4D
			</span>

			<nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-300">
				<button
					type="button"
					onClick={onOpenMultiverse}
					className="text-fuchsia-300 hover:text-fuchsia-200 font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5"
				>
					<GitBranch className="w-3.5 h-3.5 text-fuchsia-400" />
					Multiverse Nexus ({multiverseState.timelines.size} Realities)
				</button>
				<button
					type="button"
					onClick={onToggleWatchCamera}
					className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 font-semibold ${
						cameraPreset === "pocket_watch"
							? "text-amber-300 underline"
							: "text-amber-400 hover:text-amber-200"
					}`}
					title="Tilt camera upward to inspect the Colossal Multiversal Pocket Watch above the chessboard (C Key)"
				>
					<Clock className="w-3.5 h-3.5 text-amber-400" />
					{cameraPreset === "pocket_watch"
						? "Return to Board (C)"
						: `Cosmic Watch (${multiverseState.visitedTimelineIds.length} Hands)`}
				</button>
				<button
					type="button"
					onClick={onGuidedAssassination}
					className="text-rose-300 hover:text-rose-200 font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5"
				>
					<Zap className="w-3.5 h-3.5 text-rose-400" />
					Causal Assassination (Ω-1 → Prime)
				</button>
				<button
					type="button"
					onClick={onRealmShowcase}
					className="hover:text-cyan-300 text-cyan-400 font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
				>
					Impossible Realms
				</button>
			</nav>

			<div className="flex items-center gap-3 shrink-0">
				<button
					type="button"
					onClick={onOpenCodex}
					className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
				>
					Warrior Codex & Duels
				</button>
			</div>
		</header>
	);
}
