import { Skull } from "lucide-react";
import { ARCHETYPES } from "../data/archetypes";
import type { CausalCollapseResolution } from "../types/game";

interface CausalCollapseOverlayProps {
	items: CausalCollapseResolution[];
}

export function CausalCollapseOverlay({ items }: CausalCollapseOverlayProps) {
	if (items.length === 0) return null;

	return (
		<div className="pointer-events-none fixed inset-x-0 top-18.5 z-40 flex flex-col items-center px-4">
			<div className="bg-[#0B0616]/95 border-2 border-fuchsia-400 rounded-2xl px-8 py-4 shadow-[0_0_60px_rgba(217,70,239,0.55)] text-center max-w-2xl">
				<div className="text-xs font-mono font-bold tracking-[0.22em] text-fuchsia-300 uppercase flex items-center justify-center gap-2">
					<Skull className="w-4 h-4 text-rose-400 animate-bounce" />
					<span>CAUSAL ASSASSINATION CONVERGING ACROSS REALITIES</span>
					<Skull className="w-4 h-4 text-rose-400 animate-bounce" />
				</div>
				<div className="font-display text-2xl font-extrabold text-white mt-1">
					{items
						.map((item) => ARCHETYPES[item.erasedPiece.type].chessName)
						.join(", ")}{" "}
					Erased From {items[0].targetTimelineName}!
				</div>
				<div className="mt-2 space-y-1">
					{items.map((item) => (
						<div
							key={item.erasedPiece.id}
							className="text-xs font-mono text-rose-300"
						>
							Lineage{" "}
							<span className="text-amber-300 font-bold">
								[{item.event.victimLineageId}]
							</span>{" "}
							shattered:{" "}
							<span className="text-white font-bold">
								{ARCHETYPES[item.erasedPiece.type].warriorTitle} (
								{ARCHETYPES[item.erasedPiece.type].chessName})
							</span>{" "}
							erased from Square{" "}
							<span className="text-fuchsia-300 font-bold">
								{item.erasedSquareLabel}
							</span>
							!
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
