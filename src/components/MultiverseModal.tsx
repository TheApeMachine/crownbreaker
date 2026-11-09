import {
	ArrowRightLeft,
	CheckCircle2,
	Crosshair,
	Eye,
	GitBranch,
	History,
	Play,
	RotateCcw,
	Skull,
	Sparkles,
	X,
	Zap,
} from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { ARCHETYPES } from "../data/archetypes";
import {
	formatSquareName,
	formatWName,
	getPieceLineageId,
} from "../engine/chessEngine";
import {
	ensureBranchHydrated,
	findVulnerableTargetsInTimeline,
	getLineageManifestationsAcrossMultiverse,
	getPendingCausalBreachesForTimeline,
	runMultiverseVerificationSuite,
} from "../engine/multiverseEngine";
import type { ChessPiece, MultiverseState } from "../types/game";

interface MultiverseModalProps {
	multiverse: MultiverseState;
	activePieces: ChessPiece[];
	selectedPiece: ChessPiece | null;
	isOpen: boolean;
	onClose: () => void;
	onSwitchTimeline: (timelineId: string) => void;
	onForkTimeline: (
		parentTimelineId: string,
		exposeTargetLineageId?: string,
	) => void;
	onDeployPieceToTimeline: (pieceId: string, targetTimelineId: string) => void;
	onTriggerConvergence: (targetTimelineId?: string) => void;
	onTriggerGuidedAssassinationDemo: () => void;
	onRewindLastAssassination?: () => void;
}

export const MultiverseModal: React.FC<MultiverseModalProps> = ({
	multiverse,
	activePieces,
	selectedPiece,
	isOpen,
	onClose,
	onSwitchTimeline,
	onForkTimeline,
	onDeployPieceToTimeline,
	onTriggerConvergence,
	onTriggerGuidedAssassinationDemo,
	onRewindLastAssassination,
}) => {
	const [activeTab, setActiveTab] = useState<
		"tree" | "lineage" | "causality" | "verify"
	>("tree");
	const [inspectedTimelineId, setInspectedTimelineId] = useState<string>(
		multiverse.activeTimelineId,
	);
	const [inspectedLineageId, setInspectedLineageId] = useState<string>(
		selectedPiece ? getPieceLineageId(selectedPiece) : "lineage_b_q_3", // Default to Obsidian Queen!
	);

	const verificationResults = useMemo(() => {
		if (!isOpen || activeTab !== "verify") return [];
		return runMultiverseVerificationSuite();
	}, [isOpen, activeTab]);

	if (!isOpen) return null;

	const branches = Array.from(multiverse.timelines.values());
	const inspectedBranch =
		ensureBranchHydrated(multiverse, inspectedTimelineId) ||
		ensureBranchHydrated(multiverse, multiverse.activeTimelineId) ||
		branches[0];

	const inspectedPieces =
		inspectedBranch.id === multiverse.activeTimelineId
			? activePieces
			: inspectedBranch.pieces;

	const vulnerableTargets = findVulnerableTargetsInTimeline(
		multiverse,
		inspectedBranch.id,
		"w",
	);

	const lineageManifestations = getLineageManifestationsAcrossMultiverse(
		multiverse,
		inspectedLineageId,
	);
	const lineageDeathEvent =
		multiverse.eliminatedLineages.get(inspectedLineageId) || null;
	const allDeaths = Array.from(multiverse.eliminatedLineages.values());
	const primeBreaches = getPendingCausalBreachesForTimeline(
		multiverse,
		"TL-PRIME",
	);

	// Representative major lineages for quick selection in Lineage Inspector
	const featuredLineages = [
		{
			lineageId: "lineage_b_q_3",
			label: "Obsidian Queen (D8)",
			faction: "b",
			type: "q" as const,
		},
		{
			lineageId: "lineage_b_k_4",
			label: "Obsidian King (E8)",
			faction: "b",
			type: "k" as const,
		},
		{
			lineageId: "lineage_b_r_0",
			label: "Obsidian A8 Rook",
			faction: "b",
			type: "r" as const,
		},
		{
			lineageId: "lineage_b_n_6",
			label: "Obsidian G8 Knight",
			faction: "b",
			type: "n" as const,
		},
		{
			lineageId: "lineage_w_q_3",
			label: "Solaris Queen (D1)",
			faction: "w",
			type: "q" as const,
		},
		{
			lineageId: "lineage_w_k_4",
			label: "Solaris King (E1)",
			faction: "w",
			type: "k" as const,
		},
		{
			lineageId: "lineage_w_n_6",
			label: "Solaris G1 Knight",
			faction: "w",
			type: "n" as const,
		},
		{
			lineageId: "lineage_w_b_5",
			label: "Solaris F1 Bishop",
			faction: "w",
			type: "b" as const,
		},
	];

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 select-none">
			<div className="bg-[#080B12] border border-fuchsia-500/40 rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-[0_0_60px_rgba(192,132,252,0.22)] overflow-hidden">
				{/* Top Header */}
				<div className="px-6 py-4 bg-linear-to-r from-[#0F0B1D] via-[#0B0E17] to-[#0F0B1D] border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-fuchsia-950/90 border border-fuchsia-400/50 flex items-center justify-center shadow-[0_0_20px_rgba(217,70,239,0.3)]">
							<GitBranch className="w-5 h-5 text-fuchsia-300" />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<span className="text-[10px] font-mono uppercase tracking-[0.22em] text-fuchsia-400 font-semibold">
									CROWNBREAKER MULTIVERSAL WAR · CAUSAL NEXUS
								</span>
								<span className="px-2 py-0.5 rounded bg-fuchsia-950/90 border border-fuchsia-500/40 text-[10px] font-mono text-fuchsia-200">
									{branches.length} Realities ({multiverse.hydratedOrder.length}
									/{multiverse.maxHydratedWorkingSet} Hydrated)
								</span>
								{allDeaths.length > 0 && (
									<span className="px-2 py-0.5 rounded bg-rose-950/90 border border-rose-500/50 text-[10px] font-mono text-rose-300 flex items-center gap-1">
										<Skull className="w-3 h-3" />
										{allDeaths.length} Lineages Assassinated
									</span>
								)}
							</div>
							<h2
								className="text-xl font-bold text-white tracking-wider uppercase"
								style={{ fontFamily: "'Cinzel', serif" }}
							>
								Branching Timelines, Global Piece Lineage &amp; Causal
								Assassination
							</h2>
						</div>
					</div>

					<div className="flex items-center gap-2.5">
						<button
							type="button"
							onClick={onTriggerGuidedAssassinationDemo}
							className="px-3.5 py-2 rounded-xl bg-linear-to-r from-fuchsia-500 to-amber-400 hover:from-fuchsia-400 hover:to-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-[0_0_20px_rgba(217,70,239,0.4)] transition-all cursor-pointer"
							title="Enter Timeline Ω-1 where the Obsidian Queen is exposed, assassinate her in combat, and converge her death back into Prime Reality!"
						>
							<Zap className="w-3.5 h-3.5" />
							<span>Guided Causal Assassination (Ω-1 → Prime)</span>
						</button>

						<button
							type="button"
							onClick={() => onTriggerConvergence("TL-PRIME")}
							className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-all cursor-pointer ${
								primeBreaches.length > 0
									? "bg-rose-500 hover:bg-rose-400 text-slate-950 border-rose-300 shadow-[0_0_22px_rgba(244,63,94,0.5)] animate-pulse"
									: "bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700"
							}`}
							title="Reconcile all multiversal lineage deaths into Prime Reality and collapse any assassinated counterparts!"
						>
							<Sparkles className="w-3.5 h-3.5" />
							<span>
								Converge Prime Reality
								{primeBreaches.length > 0
									? ` (${primeBreaches.length} Pending!)`
									: ""}
							</span>
						</button>

						<button
							type="button"
							onClick={onClose}
							className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
							aria-label="Close Multiverse Nexus"
						>
							<X className="w-4 h-4" />
						</button>
					</div>
				</div>

				{/* Navigation Tabs */}
				<div className="px-6 py-2.5 bg-[#0B0E17] border-b border-slate-800/90 flex flex-wrap items-center justify-between gap-3">
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => setActiveTab("tree")}
							className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
								activeTab === "tree"
									? "bg-fuchsia-950/90 text-fuchsia-200 border border-fuchsia-400/60"
									: "text-slate-400 hover:text-slate-200"
							}`}
						>
							<GitBranch className="w-3.5 h-3.5" />
							<span>1. Multiverse Tree &amp; Branch Explorer</span>
						</button>
						<button
							type="button"
							onClick={() => setActiveTab("lineage")}
							className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
								activeTab === "lineage"
									? "bg-cyan-950/90 text-cyan-200 border border-cyan-400/60"
									: "text-slate-400 hover:text-slate-200"
							}`}
						>
							<Crosshair className="w-3.5 h-3.5" />
							<span>2. Global Piece Lineage Inspector</span>
						</button>
						<button
							type="button"
							onClick={() => setActiveTab("causality")}
							className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
								activeTab === "causality"
									? "bg-rose-950/90 text-rose-200 border border-rose-400/60"
									: "text-slate-400 hover:text-slate-200"
							}`}
						>
							<History className="w-3.5 h-3.5" />
							<span>3. Causal Death Ledger ({allDeaths.length})</span>
						</button>
						<button
							type="button"
							onClick={() => setActiveTab("verify")}
							className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
								activeTab === "verify"
									? "bg-emerald-950/90 text-emerald-200 border border-emerald-400/60"
									: "text-slate-400 hover:text-slate-200"
							}`}
						>
							<CheckCircle2 className="w-3.5 h-3.5" />
							<span>4. Automated Verification Suite (8/8)</span>
						</button>
					</div>

					<div className="text-[11px] font-mono text-slate-400">
						Active Reality:{" "}
						<span className="text-fuchsia-300 font-bold">
							{multiverse.timelines.get(multiverse.activeTimelineId)?.id} (
							{multiverse.timelines.get(multiverse.activeTimelineId)?.name})
						</span>
					</div>
				</div>

				{/* Main Content Body */}
				<div className="flex-1 overflow-y-auto p-6">
					{activeTab === "tree" && (
						<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
							{/* Left Column: Branching Timeline Tree List */}
							<div className="lg:col-span-5 flex flex-col gap-3">
								<div className="flex items-center justify-between">
									<span className="text-xs font-mono uppercase tracking-wider text-slate-400">
										Parallel Timeline Branches ({branches.length})
									</span>
									<button
										type="button"
										onClick={() => onForkTimeline(inspectedBranch.id)}
										className="px-2.5 py-1 rounded-lg bg-fuchsia-950/80 hover:bg-fuchsia-900 border border-fuchsia-400/50 text-fuchsia-200 text-[11px] font-mono flex items-center gap-1 cursor-pointer"
									>
										<GitBranch className="w-3 h-3" />
										<span>+ Fork From {inspectedBranch.shortCode}</span>
									</button>
								</div>

								<div className="space-y-2.5 max-h-[54vh] overflow-y-auto pr-1">
									{branches.map((b) => {
										const isCurrentPlayable =
											b.id === multiverse.activeTimelineId;
										const isInspected = b.id === inspectedBranch.id;
										const breaches = getPendingCausalBreachesForTimeline(
											multiverse,
											b.id,
										);
										const vulns = findVulnerableTargetsInTimeline(
											multiverse,
											b.id,
											"w",
										);
										return (
											<div
												key={b.id}
												onClick={() => setInspectedTimelineId(b.id)}
												className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
													isInspected
														? "bg-fuchsia-950/35 border-fuchsia-400/80 shadow-[0_0_20px_rgba(217,70,239,0.2)]"
														: "bg-[#0D121D] hover:bg-[#111827] border-slate-800"
												}`}
											>
												<div className="flex items-center justify-between gap-2">
													<div className="flex items-center gap-2">
														<span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40">
															{b.id}
														</span>
														<span className="font-semibold text-sm text-white">
															{b.name}
														</span>
														{isCurrentPlayable && (
															<span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-[10px] font-mono uppercase">
																Active Here
															</span>
														)}
													</div>
													<span className="text-[10px] font-mono text-slate-400">
														{b.isDehydrated ? "Serialized (Lazy)" : "Hydrated"}
													</span>
												</div>

												<p className="text-xs text-slate-300 mt-1.5 font-mono">
													{b.divergenceSummary}
												</p>

												<div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
													<div className="flex items-center gap-2">
														<span className="text-slate-400">
															Turn {b.turnNumber} (
															{b.turnFaction === "w" ? "Solaris" : "Obsidian"})
														</span>
														{b.parentTimelineId && (
															<span className="text-slate-500">
																← Forked from {b.parentTimelineId}
															</span>
														)}
													</div>

													<div className="flex items-center gap-1.5">
														{vulns.length > 0 && (
															<span className="px-2 py-0.5 rounded bg-amber-950/90 border border-amber-500/50 text-amber-300">
																{vulns.length} Exposed Target
																{vulns.length > 1 ? "s" : ""}
															</span>
														)}
														{breaches.length > 0 && (
															<span className="px-2 py-0.5 rounded bg-rose-950/90 border border-rose-500/60 text-rose-300 font-bold">
																{breaches.length} Causal Breach!
															</span>
														)}
													</div>
												</div>

												<div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center gap-2">
													<button
														type="button"
														onClick={(e) => {
															e.stopPropagation();
															onSwitchTimeline(b.id);
														}}
														className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
															isCurrentPlayable
																? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/40"
																: "bg-fuchsia-500 hover:bg-fuchsia-400 text-slate-950"
														}`}
													>
														<Play className="w-3 h-3" />
														<span>
															{isCurrentPlayable
																? "Currently Playing Here"
																: `Enter ${b.shortCode}`}
														</span>
													</button>

													{selectedPiece && !isCurrentPlayable && (
														<button
															type="button"
															onClick={(e) => {
																e.stopPropagation();
																onDeployPieceToTimeline(selectedPiece.id, b.id);
															}}
															className="py-1.5 px-3 rounded-lg bg-cyan-950/90 hover:bg-cyan-900 border border-cyan-400/60 text-cyan-200 text-xs font-mono flex items-center gap-1 cursor-pointer"
															title={`Send selected ${ARCHETYPES[selectedPiece.type].chessName} across timelines into ${b.id}!`}
														>
															<ArrowRightLeft className="w-3 h-3" />
															<span>
																Send {ARCHETYPES[selectedPiece.type].chessName}
															</span>
														</button>
													)}

													{breaches.length > 0 && (
														<button
															type="button"
															onClick={(e) => {
																e.stopPropagation();
																onTriggerConvergence(b.id);
															}}
															className="py-1.5 px-3 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 font-mono font-bold text-xs flex items-center gap-1 cursor-pointer"
														>
															<Skull className="w-3 h-3" />
															<span>Converge ({breaches.length})</span>
														</button>
													)}
												</div>
											</div>
										);
									})}
								</div>
							</div>

							{/* Right Column: Live 8x8 Board Preview & Vulnerable Targets in Inspected Branch */}
							<div className="lg:col-span-7 bg-[#0B0F1A] border border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-4">
								<div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
									<div>
										<div className="flex items-center gap-2">
											<span className="text-xs font-mono uppercase tracking-widest text-fuchsia-400">
												INSPECTING REALITY {inspectedBranch.id}
											</span>
											<span className="text-xs font-mono text-slate-400">
												· {inspectedPieces.length} Living Pieces
											</span>
										</div>
										<h3 className="text-lg font-bold text-white">
											{inspectedBranch.name} —{" "}
											{inspectedBranch.divergenceSummary}
										</h3>
									</div>

									<div className="flex items-center gap-2">
										<button
											type="button"
											onClick={() =>
												onForkTimeline(inspectedBranch.id, "lineage_b_q_3")
											}
											className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-300 text-xs font-mono cursor-pointer"
											title="Fork a new legal branch from this timeline where an enemy Queen or Rook diverges!"
										>
											+ Fork Queen Divergence
										</button>
										<button
											type="button"
											onClick={() => onSwitchTimeline(inspectedBranch.id)}
											className="px-3.5 py-1.5 rounded-lg bg-fuchsia-500 hover:bg-fuchsia-400 text-slate-950 font-bold text-xs font-mono cursor-pointer"
										>
											Switch To This Board
										</button>
									</div>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
									{/* 8x8 Mini Tactical Board Map */}
									<div className="md:col-span-6 flex flex-col items-center">
										<div className="grid grid-cols-8 border-2 border-slate-700 rounded-lg overflow-hidden shadow-inner w-64 h-64">
											{Array.from({ length: 64 }).map((_, idx) => {
												const r = Math.floor(idx / 8);
												const c = idx % 8;
												const isDark = (r + c) % 2 === 1;
												const pieceHere = inspectedPieces.find(
													(p) => p.row === r && p.col === c,
												);
												const isVulnHere = vulnerableTargets.some(
													(v) =>
														v.victimSquare.row === r &&
														v.victimSquare.col === c,
												);
												const pLineage = pieceHere
													? getPieceLineageId(pieceHere)
													: null;
												const deathEv = pLineage
													? multiverse.eliminatedLineages.get(pLineage)
													: undefined;
												const isCondemned =
													!!deathEv &&
													!inspectedBranch.appliedDeathEventIds.includes(
														deathEv.id,
													);

												const glyphMap: Record<string, string> = {
													w_k: "♔",
													w_q: "♕",
													w_r: "♖",
													w_b: "♗",
													w_n: "♘",
													w_p: "♙",
													b_k: "♚",
													b_q: "♛",
													b_r: "♜",
													b_b: "♝",
													b_n: "♞",
													b_p: "♟",
												};

												return (
													<div
														key={`${r}_${c}`}
														onClick={() => {
															if (pieceHere) {
																setInspectedLineageId(
																	getPieceLineageId(pieceHere),
																);
																setActiveTab("lineage");
															}
														}}
														className={`relative flex items-center justify-center text-base select-none ${
															isCondemned
																? "bg-rose-900/80 animate-pulse"
																: isVulnHere
																	? "bg-amber-500/35 ring-1 ring-amber-400"
																	: isDark
																		? "bg-slate-900"
																		: "bg-slate-800/70"
														} ${pieceHere ? "cursor-pointer hover:ring-1 hover:ring-fuchsia-400" : ""}`}
														title={
															pieceHere
																? `${ARCHETYPES[pieceHere.type].chessName} (${formatSquareName({ row: r, col: c })}) · Lineage: ${getPieceLineageId(pieceHere)} — Click to inspect across all timelines!`
																: formatSquareName({ row: r, col: c })
														}
													>
														{pieceHere && (
															<span
																className={
																	pieceHere.faction === "w"
																		? "text-amber-300 drop-shadow"
																		: "text-fuchsia-300 drop-shadow"
																}
															>
																{
																	glyphMap[
																		`${pieceHere.faction}_${pieceHere.type}`
																	]
																}
															</span>
														)}
													</div>
												);
											})}
										</div>
										<span className="text-[10px] font-mono text-slate-400 mt-2">
											Click any piece on the map to trace its Global Lineage ID
											across all realities
										</span>
									</div>

									{/* Exposed Assassination Targets in this Timeline */}
									<div className="md:col-span-6 flex flex-col gap-2.5">
										<div className="text-xs font-mono uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
											<Crosshair className="w-3.5 h-3.5" />
											<span>Causal Assassination Opportunities</span>
										</div>

										{vulnerableTargets.length === 0 ? (
											<div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 text-xs text-slate-400 font-mono">
												No immediate one-turn captures detected on this slice.
												Click{" "}
												<span className="text-amber-300">
													+ Fork Queen Divergence
												</span>{" "}
												or enter Timeline Ω-1 to hunt exposed high-value pieces!
											</div>
										) : (
											<div className="space-y-2 max-h-52 overflow-y-auto pr-1">
												{vulnerableTargets.slice(0, 4).map((vt) => (
													<div
														key={vt.victimLineageId}
														className="p-3 rounded-xl bg-amber-950/25 border border-amber-500/40 flex flex-col gap-1.5"
													>
														<div className="flex items-center justify-between">
															<span className="text-xs font-bold text-amber-200">
																Exposed {ARCHETYPES[vt.victimType].chessName} at{" "}
																{vt.victimSquareLabel}
															</span>
															<span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
																{vt.victimLineageId}
															</span>
														</div>
														<div className="text-[11px] font-mono text-slate-300">
															Strike with Solaris{" "}
															{ARCHETYPES[vt.attackerType].chessName} (
															{vt.attackerSquareLabel} → {vt.victimSquareLabel})
														</div>
														<div className="flex items-center gap-2 mt-1">
															<button
																type="button"
																onClick={() =>
																	onSwitchTimeline(inspectedBranch.id)
																}
																className="px-2.5 py-1 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 font-mono font-bold text-[10px] cursor-pointer"
															>
																Switch &amp; Hunt Target
															</button>
															<button
																type="button"
																onClick={() => {
																	setInspectedLineageId(vt.victimLineageId);
																	setActiveTab("lineage");
																}}
																className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-[10px] cursor-pointer"
															>
																Inspect Lineage
															</button>
														</div>
													</div>
												))}
											</div>
										)}
									</div>
								</div>
							</div>
						</div>
					)}

					{activeTab === "lineage" && (
						<div className="flex flex-col gap-5">
							<div className="flex flex-wrap items-center justify-between gap-3 bg-[#0D1322] border border-cyan-500/30 rounded-xl p-4">
								<div>
									<div className="text-[10px] font-mono uppercase tracking-widest text-cyan-400">
										PERSISTENT MULTIVERSAL PIECE IDENTITY
									</div>
									<div className="text-base font-bold text-white mt-0.5">
										Inspecting Lineage:{" "}
										<span className="font-mono text-cyan-300">
											{inspectedLineageId}
										</span>
									</div>
								</div>

								<div className="flex flex-wrap items-center gap-1.5">
									{featuredLineages.map((fl) => (
										<button
											type="button"
											key={fl.lineageId}
											onClick={() => setInspectedLineageId(fl.lineageId)}
											className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
												inspectedLineageId === fl.lineageId
													? "bg-cyan-400 text-slate-950 font-bold"
													: "bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
											}`}
										>
											{fl.label}
										</button>
									))}
								</div>
							</div>

							{lineageDeathEvent && (
								<div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/60 flex flex-wrap items-center justify-between gap-4">
									<div className="flex items-center gap-3">
										<Skull className="w-6 h-6 text-rose-400 shrink-0" />
										<div>
											<div className="text-xs font-mono font-bold uppercase text-rose-300">
												AUTHORITATIVE MULTIVERSAL DEATH RECORDED FOR{" "}
												{inspectedLineageId}
											</div>
											<div className="text-xs text-slate-200 font-mono mt-0.5">
												Slain in{" "}
												<span className="text-amber-300">
													{lineageDeathEvent.sourceTimelineName}
												</span>{" "}
												at square{" "}
												<span className="text-amber-300">
													{lineageDeathEvent.sourceSquareLabel}
												</span>{" "}
												by{" "}
												{ARCHETYPES[lineageDeathEvent.killerType].warriorTitle}
											</div>
										</div>
									</div>
									<button
										type="button"
										onClick={() => onTriggerConvergence("TL-PRIME")}
										className="px-3.5 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-mono font-bold text-xs cursor-pointer"
									>
										Propagate Death To Prime Reality
									</button>
								</div>
							)}

							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
								{lineageManifestations.map((m) => {
									const branch = multiverse.timelines.get(m.timelineId);
									const isPropagatedDead =
										lineageDeathEvent &&
										branch?.appliedDeathEventIds.includes(lineageDeathEvent.id);
									return (
										<div
											key={m.timelineId}
											className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
												!m.piece
													? "bg-rose-950/20 border-rose-500/40"
													: lineageDeathEvent && !isPropagatedDead
														? "bg-amber-950/25 border-amber-500/60"
														: "bg-[#0D121D] border-slate-800"
											}`}
										>
											<div>
												<div className="flex items-center justify-between">
													<span className="px-2 py-0.5 rounded bg-slate-800 text-fuchsia-300 font-mono text-xs font-bold">
														{m.timelineId}
													</span>
													<span className="text-[11px] font-mono text-slate-400">
														{m.timelineName}
													</span>
												</div>

												{m.piece ? (
													<div className="mt-3 space-y-1 font-mono text-xs">
														<div className="text-sm font-bold text-white">
															{ARCHETYPES[m.piece.type].warriorTitle} (
															{ARCHETYPES[m.piece.type].chessName})
														</div>
														<div className="text-cyan-300">
															Square: {formatSquareName(m.piece)} ·{" "}
															{formatWName(m.piece.w)}
														</div>
														<div className="text-slate-300">
															Vitality: {m.piece.hp}/{m.piece.maxHp} HP · Meter:{" "}
															{Math.round(m.piece.meter)}%
														</div>
														{lineageDeathEvent && !isPropagatedDead && (
															<div className="mt-2 px-2 py-1 rounded bg-rose-500/20 border border-rose-500/50 text-rose-300 text-[11px] font-bold">
																⚠ DOOMED BY CAUSAL ASSASSINATION (Awaiting
																Convergence)
															</div>
														)}
													</div>
												) : (
													<div className="mt-3 text-xs font-mono text-rose-300 flex items-center gap-1.5">
														<Skull className="w-4 h-4 shrink-0" />
														<span>
															Eliminated from {m.shortCode} (Causal Death
															Applied)
														</span>
													</div>
												)}
											</div>

											<button
												type="button"
												onClick={() => onSwitchTimeline(m.timelineId)}
												className="w-full py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
											>
												<Eye className="w-3.5 h-3.5" />
												<span>View in {m.shortCode}</span>
											</button>
										</div>
									);
								})}
							</div>
						</div>
					)}

					{activeTab === "causality" && (
						<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
							{/* Authoritative Causal Death Events */}
							<div className="lg:col-span-8 space-y-3">
								<div className="text-xs font-mono uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
									<Skull className="w-4 h-4" />
									<span>
										Authoritative Multiversal Death Events ({allDeaths.length})
									</span>
								</div>

								{allDeaths.length === 0 ? (
									<div className="p-6 rounded-xl bg-[#0D121D] border border-slate-800 text-xs font-mono text-slate-400">
										No cross-timeline Causal Assassinations recorded yet. Click{" "}
										<span className="text-amber-300 font-bold">
											Guided Causal Assassination (Ω-1 → Prime)
										</span>{" "}
										above or capture any enemy piece in an alternate timeline to
										record an authoritative lineage death!
									</div>
								) : (
									allDeaths.map((d) => (
										<div
											key={d.id}
											className="p-4 rounded-xl bg-rose-950/25 border border-rose-500/40 flex flex-col gap-2"
										>
											<div className="flex items-center justify-between">
												<span className="font-mono text-xs font-bold text-rose-300">
													Lineage Terminated: {d.victimLineageId} (
													{ARCHETYPES[d.victimType].warriorTitle})
												</span>
												<span className="text-[11px] font-mono text-amber-300">
													Origin: {d.sourceTimelineName} · Square{" "}
													{d.sourceSquareLabel}
												</span>
											</div>
											<div className="text-xs font-mono text-slate-300">
												{d.combatSummary}
											</div>
										</div>
									))
								)}
							</div>

							{/* Temporal Paradox Rewind Controls */}
							<div className="lg:col-span-4 space-y-3">
								<div className="text-xs font-mono uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
									<RotateCcw className="w-4 h-4" />
									<span>Temporal Causality Rewind</span>
								</div>

								<div className="p-4 rounded-xl bg-[#0D121D] border border-slate-800 flex flex-col gap-3">
									<p className="text-xs font-mono text-slate-300 leading-relaxed">
										Rewinding a Causal Assassination revokes the authoritative
										lineage death from the Multiverse Ledger and restores the
										slain piece to its pre-collapse square!
									</p>
									{allDeaths.length > 0 && onRewindLastAssassination && (
										<button
											type="button"
											onClick={onRewindLastAssassination}
											className="w-full py-2 px-3 rounded-lg bg-cyan-950/90 hover:bg-cyan-900 border border-cyan-400/60 text-cyan-200 text-xs font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer"
										>
											<RotateCcw className="w-3.5 h-3.5" />
											<span>Rewind Latest Causal Assassination</span>
										</button>
									)}
								</div>
							</div>
						</div>
					)}

					{activeTab === "verify" && (
						<div className="space-y-4">
							<div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 flex items-center justify-between">
								<div>
									<div className="text-xs font-mono font-bold uppercase text-emerald-300">
										DETERMINISTIC MULTIVERSAL &amp; CAUSAL ASSASSINATION
										VERIFICATION SUITE
									</div>
									<div className="text-xs text-slate-300 font-mono mt-0.5">
										Executes live headless assertions verifying all 8
										architectural invariants of branching timelines, global
										lineage IDs, and Reality Convergence.
									</div>
								</div>
								<span className="px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-mono font-bold text-xs">
									{verificationResults.filter((r) => r.passed).length} /{" "}
									{verificationResults.length} PASSED
								</span>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
								{verificationResults.map((res) => (
									<div
										key={res.name}
										className={`p-3.5 rounded-xl border ${
											res.passed
												? "bg-[#0B131E] border-emerald-500/40"
												: "bg-rose-950/40 border-rose-500/60"
										}`}
									>
										<div className="flex items-center justify-between gap-2">
											<span className="font-mono text-xs font-bold text-white">
												{res.name}
											</span>
											<span
												className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
													res.passed
														? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
														: "bg-rose-500/20 text-rose-300"
												}`}
											>
												{res.passed ? "PASS" : "FAIL"}
											</span>
										</div>
										<p className="text-[11px] font-mono text-slate-300 mt-1.5">
											{res.detail}
										</p>
									</div>
								))}
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};
