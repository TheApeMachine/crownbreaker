import type { Faction } from "../types/game";

interface WarVictoryModalProps {
	warVictor: { faction: Faction; reason: string };
	onReset: () => void;
	onDismiss: () => void;
}

export function WarVictoryModal({
	warVictor,
	onReset,
	onDismiss,
}: WarVictoryModalProps) {
	return (
		<div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4">
			<div className="bg-[#0D111A] border border-amber-500/60 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
				<div className="font-mono text-xs text-amber-400 tracking-widest">
					CROWNBREAKER VICTORY
				</div>
				<h2 className="font-display text-3xl font-extrabold text-white mt-2">
					{warVictor.faction === "w"
						? "Solaris Order Triumphs"
						: "Obsidian Dominion Triumphs"}
				</h2>
				<p className="text-sm text-slate-300 mt-3 leading-relaxed">
					{warVictor.reason}
				</p>
				<div className="mt-6 flex items-center justify-center gap-3">
					<button
						type="button"
						onClick={onReset}
						className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-xs rounded-lg transition-colors whitespace-nowrap shrink-0"
					>
						Play New Campaign
					</button>
					<button
						type="button"
						onClick={onDismiss}
						className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-lg transition-colors whitespace-nowrap shrink-0"
					>
						Inspect Board
					</button>
				</div>
			</div>
		</div>
	);
}
