import {
	ArrowUpRight,
	Compass,
	Flame,
	Orbit,
	ShieldAlert,
	Sparkles,
	Swords,
} from "lucide-react";
import type React from "react";
import { ARCHETYPES } from "../data/archetypes";
import {
	evaluatePortalBoardExit,
	getPortalsForRealm,
	type PortalBoardExitEvaluation,
	REALM_METADATA,
} from "../engine/realmEngine";
import type {
	ChessPiece,
	GamePhase,
	RealmId,
	RealmPortalNode,
} from "../types/game";

export interface RealmHudOverlayProps {
	phase: GamePhase;
	activeRealmId: RealmId;
	traveler: ChessPiece | null;
	allPieces: ChessPiece[];
	isParityInverted: boolean;
	crucibleAnvilClaimed: boolean;
	nearbyPortal: RealmPortalNode | null;
	nearbyPortalEval: PortalBoardExitEvaluation | null;
	statusBanner: string | null;
	onTraversePortal: (portal: RealmPortalNode) => void;
	onSteerTowardPortal: (portal: RealmPortalNode) => void;
	onRealmAction: (action: "jump" | "dash" | "strike") => void;
}

export const RealmHudOverlay: React.FC<RealmHudOverlayProps> = ({
	phase,
	activeRealmId,
	traveler,
	allPieces,
	isParityInverted,
	crucibleAnvilClaimed,
	nearbyPortal,
	nearbyPortalEval,
	statusBanner,
	onTraversePortal,
	onSteerTowardPortal,
	onRealmAction,
}) => {
	if (
		phase !== "REALM_DESCENT" &&
		phase !== "REALM_EXPLORATION" &&
		phase !== "REALM_ASCENT"
	) {
		return null;
	}

	const meta = REALM_METADATA[activeRealmId];
	const realmPortals = getPortalsForRealm(activeRealmId);
	const spec = traveler ? ARCHETYPES[traveler.type] : null;
	const hpRatio = traveler ? traveler.hp / Math.max(1, traveler.maxHp) : 1;

	return (
		<div className="pointer-events-none fixed inset-0 top-13.25 z-20 flex flex-col justify-between p-5 select-none">
			{/* Top Story & Coordinate Transformation Header */}
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div className="pointer-events-auto bg-[#070910]/85 border-l-2 border-amber-400 pl-4 pr-5 py-3 rounded-r-xl shadow-2xl max-w-lg backdrop-blur-sm">
					<div className="flex items-center gap-2 text-[10px] font-mono tracking-[0.2em] text-amber-300 uppercase">
						<Orbit className="w-3.5 h-3.5 text-amber-400" />
						<span>
							{phase === "REALM_DESCENT"
								? "DESCENDING BENEATH THE 4D BOARD"
								: phase === "REALM_ASCENT"
									? "ASCENDING THROUGH DIMENSIONAL GATEWAY"
									: `SUBTERRANEAN REALM · ${meta.mechanicTitle}`}
						</span>
					</div>
					<h2 className="font-display text-xl font-extrabold text-white tracking-wide mt-0.5">
						{meta.title}
					</h2>
					<p className="text-xs text-slate-300 mt-1 leading-relaxed">
						{meta.mechanicSummary}
					</p>

					{/* Active Realm State Badges */}
					<div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] font-mono">
						{isParityInverted && (
							<span className="px-2 py-0.5 rounded bg-cyan-950/90 border border-cyan-400/50 text-cyan-200 flex items-center gap-1">
								<Sparkles className="w-3 h-3 text-cyan-300" />
								Chiral Parity Inverted: (r, c, w) ↦ (7−r, 7−c, −w) · Mirror
								Aegis Active
							</span>
						)}
						{crucibleAnvilClaimed && (
							<span className="px-2 py-0.5 rounded bg-amber-950/90 border border-amber-400/60 text-amber-200 flex items-center gap-1">
								<Flame className="w-3 h-3 text-amber-400" />
								Hellfire Tempered: Deep Flank Ascent Unlocked
							</span>
						)}
						{traveler?.persistentBurnMs && traveler.persistentBurnMs > 0 ? (
							<span className="px-2 py-0.5 rounded bg-orange-950/90 border border-orange-500/60 text-orange-300">
								Scorched Armor (Persistent Burn)
							</span>
						) : null}
						{traveler?.persistentSlowMs && traveler.persistentSlowMs > 0 ? (
							<span className="px-2 py-0.5 rounded bg-sky-950/90 border border-sky-500/60 text-sky-300">
								Chrono-Stasis (Persistent Slow)
							</span>
						) : null}
					</div>
				</div>

				{/* Connected Portals & Live Board Exit Status Compass */}
				{traveler && phase === "REALM_EXPLORATION" && (
					<div className="pointer-events-auto bg-[#070910]/85 border border-slate-800/90 rounded-xl p-3.5 shadow-2xl w-80 backdrop-blur-sm">
						<div className="flex items-center justify-between text-[10px] font-mono tracking-wider text-slate-400 uppercase mb-2">
							<span className="flex items-center gap-1.5 text-amber-300 font-semibold">
								<Compass className="w-3.5 h-3.5" />
								Realm Gateways & Board Exits
							</span>
							<span>Click to Steer / Enter</span>
						</div>

						<div className="flex flex-col gap-1.5">
							{realmPortals.map((p) => {
								const evalRes =
									p.kind === "BOARD_ASCENT"
										? evaluatePortalBoardExit(
												p,
												traveler,
												allPieces,
												isParityInverted,
												crucibleAnvilClaimed,
											)
										: null;

								const isNear = nearbyPortal?.id === p.id;
								const isBlocked = evalRes?.status === "ALLY_OBSTRUCTED";
								const isContested = evalRes?.status === "ENEMY_OCCUPIED";

								return (
									<button
										type="button"
										key={p.id}
										onClick={() => {
											if (isNear && !isBlocked) {
												onTraversePortal(p);
											} else {
												onSteerTowardPortal(p);
											}
										}}
										className={`w-full text-left px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2 ${
											isNear
												? "bg-amber-500/20 border-amber-400 text-white shadow-[0_0_15px_rgba(245,158,11,0.25)]"
												: isBlocked
													? "bg-rose-950/30 border-rose-900/50 text-slate-500"
													: "bg-slate-900/80 hover:bg-slate-800/90 border-slate-800 text-slate-200"
										}`}
									>
										<div className="min-w-0">
											<div className="text-xs font-semibold truncate flex items-center gap-1.5">
												<span>{p.name}</span>
												{p.kind === "INTER_REALM" && (
													<span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-500/40">
														Realm Link
													</span>
												)}
												{p.kind === "MIRROR_INVERTER" && (
													<span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40">
														Invert Parity
													</span>
												)}
											</div>
											<div className="text-[10px] font-mono text-slate-400 truncate">
												{evalRes ? (
													isBlocked ? (
														<span className="text-rose-400">
															Blocked by Allied{" "}
															{evalRes.occupant
																? ARCHETYPES[evalRes.occupant.type].chessName
																: "unit"}{" "}
															at {evalRes.squareLabel}
														</span>
													) : isContested ? (
														<span className="text-rose-300 font-bold">
															⚔ Ambush{" "}
															{evalRes.occupant
																? ARCHETYPES[evalRes.occupant.type].chessName
																: "unit"}{" "}
															at {evalRes.squareLabel}
														</span>
													) : (
														<span className="text-emerald-300">
															Emerges at {evalRes.squareLabel} (Clear)
														</span>
													)
												) : (
													p.subtitle
												)}
											</div>
										</div>
										<ArrowUpRight className="w-3.5 h-3.5 shrink-0 text-amber-400" />
									</button>
								);
							})}
						</div>
					</div>
				)}
			</div>

			{/* Center Proximity Portal Prompt or Status Callout */}
			<div className="flex flex-col items-center gap-2 my-auto">
				{statusBanner && (
					<div className="bg-[#090D18]/90 border border-amber-400/60 px-5 py-2 rounded-xl text-xs font-mono font-bold text-amber-200 shadow-2xl tracking-wide uppercase">
						{statusBanner}
					</div>
				)}

				{nearbyPortal && phase === "REALM_EXPLORATION" && (
					<div
						className={`pointer-events-auto bg-[#070A12]/95 border-2 rounded-2xl px-6 py-3.5 text-center max-w-md ${
							nearbyPortal.kind === "TIMELINE_PORTAL"
								? "border-fuchsia-400/90 shadow-[0_0_40px_rgba(217,70,239,0.45)]"
								: "border-amber-400/80 shadow-[0_0_35px_rgba(245,158,11,0.3)]"
						}`}
					>
						<div
							className={`text-[10px] font-mono tracking-widest uppercase ${
								nearbyPortal.kind === "TIMELINE_PORTAL"
									? "text-fuchsia-300 font-bold"
									: "text-amber-300"
							}`}
						>
							{nearbyPortal.kind === "TIMELINE_PORTAL"
								? `MULTIVERSAL TIMELINE PORTAL · ${nearbyPortal.targetTimelineId || "TL-PRIME"}`
								: nearbyPortal.kind === "BOARD_ASCENT"
									? "DIMENSIONAL ASCENT GATEWAY"
									: nearbyPortal.kind === "MIRROR_INVERTER"
										? "CHIRAL INVERSION MIRROR"
										: "INTER-REALM RIFT PORTAL"}
						</div>
						<div className="font-display text-lg font-bold text-white mt-0.5">
							{nearbyPortal.name}
						</div>
						<div className="text-xs font-mono text-slate-300 mt-1">
							{nearbyPortal.transformFormula}
						</div>

						{nearbyPortalEval?.status === "ALLY_OBSTRUCTED" ? (
							<div className="mt-2.5 px-3 py-1.5 rounded-lg bg-rose-950/90 border border-rose-500/60 text-rose-200 text-xs font-mono flex items-center justify-center gap-1.5">
								<ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
								<span>
									Exit {nearbyPortalEval.squareLabel} Obstructed by Allied{" "}
									{nearbyPortalEval.occupant
										? ARCHETYPES[nearbyPortalEval.occupant.type].chessName
										: "unit"}
									!
								</span>
							</div>
						) : (
							<button
								type="button"
								onClick={() => onTraversePortal(nearbyPortal)}
								className={`mt-3 px-5 py-2 font-mono font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2 mx-auto ${
									nearbyPortal.kind === "TIMELINE_PORTAL"
										? "bg-fuchsia-400 hover:bg-fuchsia-300 text-slate-950"
										: "bg-amber-400 hover:bg-amber-300 text-slate-950"
								}`}
							>
								<Swords className="w-3.5 h-3.5" />
								{nearbyPortalEval?.status === "ENEMY_OCCUPIED" &&
								nearbyPortalEval.occupant
									? nearbyPortal.kind === "TIMELINE_PORTAL"
										? `Emerge in ${nearbyPortal.targetTimelineId} & Assassinate ${ARCHETYPES[nearbyPortalEval.occupant.type].chessName} at ${nearbyPortalEval.squareLabel} (E)`
										: `Ascend & Ambush ${ARCHETYPES[nearbyPortalEval.occupant.type].chessName} at ${nearbyPortalEval.squareLabel} (E / Walk In)`
									: nearbyPortal.kind === "TIMELINE_PORTAL"
										? `Emerge in ${nearbyPortal.targetTimelineId} at Square ${nearbyPortalEval?.squareLabel} (E / Walk In)`
										: nearbyPortal.kind === "BOARD_ASCENT"
											? `Ascend to Chessboard Square ${nearbyPortalEval?.squareLabel} (E / Walk In)`
											: nearbyPortal.kind === "MIRROR_INVERTER"
												? "Step Through Looking-Glass to Invert Parity (E / Walk In)"
												: `Cross Into ${nearbyPortal.subtitle} (E / Walk In)`}
							</button>
						)}
					</div>
				)}
			</div>

			{/* Bottom Diegetic Warrior Condition & 3rd-Person Navigation Controls */}
			{traveler && spec && (
				<div className="pointer-events-auto flex flex-wrap items-center justify-between gap-4 bg-[#070910]/90 border border-slate-800/90 rounded-xl px-5 py-3 shadow-2xl backdrop-blur-sm">
					<div className="flex items-center gap-4">
						<div>
							<div className="text-[10px] font-mono text-amber-400 uppercase tracking-wider">
								Subterranean Traveler ·{" "}
								{traveler.faction === "w"
									? "Solaris Order"
									: "Obsidian Dominion"}
							</div>
							<div className="font-display text-base font-bold text-white">
								{spec.warriorTitle} ({spec.chessName})
							</div>
							<div className="text-xs font-mono text-slate-300">
								Vitality:{" "}
								<span
									className={
										hpRatio > 0.65
											? "text-emerald-300"
											: hpRatio > 0.32
												? "text-amber-300"
												: "text-rose-400"
									}
								>
									{hpRatio > 0.65
										? "Unbroken Armor"
										: hpRatio > 0.32
											? "Battle-Scored"
											: "Critical Fractures"}
								</span>{" "}
								· Soul Resonance:{" "}
								<span className="text-cyan-300">
									{Math.round(traveler.meter)}%
								</span>
							</div>
						</div>
					</div>

					<div className="flex flex-wrap items-center gap-2">
						<div className="text-[11px] font-mono text-slate-400 mr-2 hidden md:block">
							<span className="text-slate-200 font-semibold">
								[WASD / Arrows]
							</span>{" "}
							Move & Steer ·{" "}
							<span className="text-slate-200 font-semibold">[Space]</span> Jump
							· <span className="text-slate-200 font-semibold">[Shift]</span>{" "}
							Dash · <span className="text-slate-200 font-semibold">[J]</span>{" "}
							Strike · <span className="text-slate-200 font-semibold">[E]</span>{" "}
							Enter Portal
						</div>

						<button
							type="button"
							onClick={() => onRealmAction("jump")}
							className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-mono text-xs rounded-lg cursor-pointer"
						>
							Jump (Space)
						</button>
						<button
							type="button"
							onClick={() => onRealmAction("dash")}
							className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 font-mono text-xs rounded-lg cursor-pointer"
						>
							Dash (Shift)
						</button>
						<button
							type="button"
							onClick={() => onRealmAction("strike")}
							className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/60 text-amber-200 font-mono text-xs rounded-lg cursor-pointer"
						>
							Weapon Strike (J)
						</button>
					</div>
				</div>
			)}
		</div>
	);
};
