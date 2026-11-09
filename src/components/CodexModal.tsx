import { Shield, Swords, X, Zap } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { ARCHETYPES } from "../data/archetypes";
import type { PieceType } from "../types/game";

interface CodexModalProps {
	isOpen: boolean;
	onClose: () => void;
	onLaunchExhibitionDuel: (
		attackerType: PieceType,
		defenderType: PieceType,
	) => void;
}

const PIECE_ORDER: PieceType[] = ["p", "n", "b", "r", "q", "k"];

export const CodexModal: React.FC<CodexModalProps> = ({
	isOpen,
	onClose,
	onLaunchExhibitionDuel,
}) => {
	const [selectedType, setSelectedType] = useState<PieceType>("p");
	const [duelAttacker, setDuelAttacker] = useState<PieceType>("p");
	const [duelDefender, setDuelDefender] = useState<PieceType>("q");

	if (!isOpen) return null;

	const spec = ARCHETYPES[selectedType];

	return (
		<div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4 md:p-8">
			<div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-[#0D111A] border border-slate-800 shadow-2xl">
				{/* Modal Header */}
				<div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
					<div>
						<h2 className="font-display text-xl font-bold text-white">
							Warrior Codex & Combo Architecture
						</h2>
						<p className="text-xs text-slate-400">
							Every chess capture triggers a real-time 3D martial duel. Study
							each piece’s combo trees and tactical-value Special scaling.
						</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
						aria-label="Close Codex"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				{/* Archetype Selector Tabs */}
				<div className="flex items-center gap-2 border-b border-slate-800 bg-[#090B10] px-6 py-3 overflow-x-auto">
					{PIECE_ORDER.map((pt) => {
						const item = ARCHETYPES[pt];
						const active = pt === selectedType;
						return (
							<button
								type="button"
								key={pt}
								onClick={() => setSelectedType(pt)}
								className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
									active
										? "bg-amber-500 text-slate-950 font-semibold"
										: "bg-slate-900 text-slate-300 hover:bg-slate-800"
								}`}
							>
								{item.chessName} · {item.warriorTitle} (Val {item.tacticalValue}
								)
							</button>
						);
					})}
				</div>

				{/* Codex Body */}
				<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto p-6">
					{/* Left Column: Fighter Specs & Special Scaling */}
					<div className="lg:col-span-6 flex flex-col gap-5">
						<div>
							<div className="text-xs font-mono text-amber-400">
								{spec.chessName.toUpperCase()} ARCHETYPE · TACTICAL VALUE{" "}
								{spec.tacticalValue}
							</div>
							<h3 className="font-display text-2xl font-bold text-white mt-0.5">
								{spec.warriorTitle}
							</h3>
							<p className="text-xs text-slate-400 mt-1">
								{spec.fightingStyle} · Armed with {spec.weaponName}
							</p>
						</div>

						{/* Base Stats */}
						<div className="grid grid-cols-3 gap-3 bg-[#090B10] border border-slate-800/90 rounded-xl p-4">
							<div>
								<div className="text-[11px] text-slate-400">Base Vitality</div>
								<div className="font-mono text-lg font-bold text-white tabular-nums">
									{spec.maxHp} HP
								</div>
							</div>
							<div>
								<div className="text-[11px] text-slate-400">
									Light / Heavy Dmg
								</div>
								<div className="font-mono text-lg font-bold text-sky-400 tabular-nums">
									{spec.light.damage} / {spec.heavy.damage}
								</div>
							</div>
							<div>
								<div className="text-[11px] text-slate-400">
									Move / Dash Speed
								</div>
								<div className="font-mono text-lg font-bold text-amber-400 tabular-nums">
									{spec.walkSpeed} / {spec.dashSpeed}
								</div>
							</div>
						</div>

						{/* Unique Tactical-Value Special Move */}
						<div className="bg-[#090B10] border border-amber-500/30 rounded-xl p-4 flex flex-col gap-2">
							<div className="flex items-center justify-between">
								<span className="text-xs font-mono text-amber-400 flex items-center gap-1.5">
									<Zap className="w-3.5 h-3.5" />
									UNIQUE SPECIAL MOVE (KEY: U)
								</span>
								<span className="text-xs font-mono text-slate-300 tabular-nums">
									{spec.special.meterCost}% Meter · {spec.special.baseDamage}{" "}
									Base Dmg ({spec.special.hits} Hits)
								</span>
							</div>
							<div className="font-display text-base font-bold text-white">
								{spec.special.name}
							</div>
							<p className="text-xs text-slate-300 leading-relaxed">
								{spec.special.scalingNote}
							</p>
						</div>

						{/* Universal Defensive Mechanics */}
						<div className="bg-[#090B10] border border-slate-800 rounded-xl p-4 flex flex-col gap-1.5">
							<div className="text-xs font-semibold text-sky-400 flex items-center gap-1.5">
								<Shield className="w-3.5 h-3.5" />
								How a Pawn Can Defeat a Queen: Perfect Parry & Underdog Valor
							</div>
							<p className="text-xs text-slate-300 leading-relaxed">
								Pressing <span className="font-mono text-white">S / Block</span>{" "}
								within 175ms of an enemy strike triggers a{" "}
								<span className="text-amber-300 font-medium">
									Perfect Parry
								</span>
								—negating all damage, granting +24% Tactical Meter, and
								staggering the attacker for a full counter-combo. If a Defending
								Pawn defeats an Attacking Queen, the Queen is eliminated from
								the chessboard!
							</p>
						</div>
					</div>

					{/* Right Column: Combo Tree & Instant Exhibition Duel Launcher */}
					<div className="lg:col-span-6 flex flex-col justify-between gap-5">
						<div className="flex flex-col gap-3">
							<h4 className="text-sm font-semibold text-white">
								Signature 3-Stage Combo Trees
							</h4>
							{spec.combos.map((combo) => (
								<div
									key={combo.id}
									className="bg-[#090B10] border border-slate-800 rounded-xl p-3.5 flex flex-col gap-1.5"
								>
									<div className="flex items-center justify-between">
										<span className="font-display text-sm font-bold text-white">
											{combo.name}
										</span>
										<span className="font-mono text-xs font-semibold text-sky-400">
											{combo.sequence
												.map((k) => (k === "L" ? "Light (J)" : "Heavy (K)"))
												.join(" → ")}
										</span>
									</div>
									<p className="text-xs text-slate-400">{combo.description}</p>
									<div className="text-[11px] font-mono text-slate-400">
										Finisher Scaling:{" "}
										{Math.round(combo.finisherMultiplier * 100)}% Dmg · Effect:{" "}
										{combo.effect.replace("_", " ").toUpperCase()}
									</div>
								</div>
							))}
						</div>

						{/* Instant Exhibition Duel Sandbox */}
						<div className="bg-slate-900/90 border border-slate-700 rounded-xl p-4 flex flex-col gap-3">
							<div>
								<div className="text-xs font-semibold text-amber-400">
									Instant Exhibition Duel Sandbox
								</div>
								<p className="text-xs text-slate-400">
									Test any matchup immediately (e.g. Pawn vs Queen) with full
									smooth 3D arena transition.
								</p>
							</div>
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label
										htmlFor="codex-duel-attacker"
										className="block text-[11px] text-slate-400 mb-1"
									>
										Player Attacker (Solaris)
									</label>
									<select
										id="codex-duel-attacker"
										value={duelAttacker}
										onChange={(e) =>
											setDuelAttacker(e.target.value as PieceType)
										}
										className="w-full rounded-lg bg-[#090B10] border border-slate-700 px-3 py-2 text-xs text-white"
									>
										{PIECE_ORDER.map((pt) => (
											<option key={pt} value={pt}>
												{ARCHETYPES[pt].chessName} (
												{ARCHETYPES[pt].warriorTitle})
											</option>
										))}
									</select>
								</div>
								<div>
									<label
										htmlFor="codex-duel-defender"
										className="block text-[11px] text-slate-400 mb-1"
									>
										Opponent Defender (Obsidian)
									</label>
									<select
										id="codex-duel-defender"
										value={duelDefender}
										onChange={(e) =>
											setDuelDefender(e.target.value as PieceType)
										}
										className="w-full rounded-lg bg-[#090B10] border border-slate-700 px-3 py-2 text-xs text-white"
									>
										{PIECE_ORDER.map((pt) => (
											<option key={pt} value={pt}>
												{ARCHETYPES[pt].chessName} (
												{ARCHETYPES[pt].warriorTitle})
											</option>
										))}
									</select>
								</div>
							</div>
							<button
								type="button"
								onClick={() => {
									onClose();
									onLaunchExhibitionDuel(duelAttacker, duelDefender);
								}}
								className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-lg flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
							>
								<Swords className="w-4 h-4" />
								Start {ARCHETYPES[duelAttacker].chessName} vs{" "}
								{ARCHETYPES[duelDefender].chessName} Duel Now
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
