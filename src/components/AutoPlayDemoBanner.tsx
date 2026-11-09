interface AutoPlayDemoBannerProps {
	demoDirectorStage: string;
	onTakeControl: () => void;
}

export function AutoPlayDemoBanner({
	demoDirectorStage,
	onTakeControl,
}: AutoPlayDemoBannerProps) {
	return (
		<div className="pointer-events-auto fixed top-16 right-6 z-30 bg-[#071318]/95 border border-emerald-400/70 rounded-xl px-4 py-2.5 shadow-[0_0_28px_rgba(16,185,129,0.25)] flex items-center gap-3.5 max-w-md">
			<div className="flex flex-col">
				<div className="flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-wider text-emerald-300">
					<span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
					<span>DIRECTOR&apos;S AUTO-PLAY SHOWCASE ACTIVE</span>
				</div>
				<div className="text-xs font-semibold text-white mt-0.5 truncate">
					{demoDirectorStage}
				</div>
			</div>
			<button
				type="button"
				onClick={onTakeControl}
				className="px-3 py-1.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-mono font-bold text-[11px] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
				title="Stop Auto-Play Demo and immediately take manual control of the current board or duel (P Key)"
			>
				Take Control (P)
			</button>
		</div>
	);
}
