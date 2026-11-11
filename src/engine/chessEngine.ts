import { ARCHETYPES } from "../data/archetypes";
import {
	type BoardCoord,
	type ChessPiece,
	type Faction,
	type InterventionRiftType,
	type MoveOption,
	type PieceType,
	type SquareSupportAnalysis,
	TACTICAL_INTERVENTION_METER_COST,
	type TacticalSupporter,
	type UnseenThreatVector,
} from "../types/game";
import {
	evaluatePortalBoardExit,
	getGatewayAtSquare,
	getPortalsForRealm,
	REALM_METADATA,
} from "./realmEngine";

export const INTERVENTION_METADATA: Record<
	PieceType,
	{ name: string; tagline: string }
> = {
	p: {
		name: "Desperate Vanguard",
		tagline: "Spear Lunge · Interrupts Momentum (-14 HP, -18 Guard)",
	},
	n: {
		name: "Meteor Lancer",
		tagline: "Aerial Dive · Launches Enemy (-18 HP, Air Juggle)",
	},
	b: {
		name: "Diagonal Judgment",
		tagline: "Glaive Beam · Pierces Guard (-17 HP, +8 Ally Heal)",
	},
	r: {
		name: "Siege Intervention",
		tagline: "Crushing Shockwave · Shatters Guard (-19 HP, -55 Guard)",
	},
	q: {
		name: "Royal Blade Storm",
		tagline: "Crown Blade Swarm · Multi-Hit Barrage (-22 HP)",
	},
	k: {
		name: "Sovereign Aegis",
		tagline: "Royal Ward · Absorbs 75% Next Hit & +35 Guard",
	},
};

export function getPieceLineageId(piece: ChessPiece): string {
	return piece.lineageId || piece.id;
}

export function createInitialBoard(): ChessPiece[] {
	const pieces: ChessPiece[] = [];
	const backRank: PieceType[] = ["r", "n", "b", "q", "k", "b", "n", "r"];

	// Black pieces (Obsidian Dominion) at rows 0 and 1
	for (let col = 0; col < 8; col++) {
		const type = backRank[col];
		const spec = ARCHETYPES[type];
		const id = `b_${type}_${col}`;
		pieces.push({
			id,
			lineageId: `lineage_${id}`,
			originTimelineId: "TL-PRIME",
			type,
			faction: "b",
			row: 0,
			col,
			z: 0,
			w: 0,
			hp: spec.maxHp,
			maxHp: spec.maxHp,
			meter: 25,
			kills: 0,
			hasMoved: false,
			history: [{ row: 0, col, z: 0, w: 0, turn: 1 }],
		});

		const pawnSpec = ARCHETYPES.p;
		const pawnId = `b_p_${col}`;
		pieces.push({
			id: pawnId,
			lineageId: `lineage_${pawnId}`,
			originTimelineId: "TL-PRIME",
			type: "p",
			faction: "b",
			row: 1,
			col,
			z: 0,
			w: 0,
			hp: pawnSpec.maxHp,
			maxHp: pawnSpec.maxHp,
			meter: 30,
			kills: 0,
			hasMoved: false,
			history: [{ row: 1, col, z: 0, w: 0, turn: 1 }],
		});
	}

	// White pieces (Solaris Order) at rows 6 and 7
	for (let col = 0; col < 8; col++) {
		const pawnSpec = ARCHETYPES.p;
		const pawnId = `w_p_${col}`;
		pieces.push({
			id: pawnId,
			lineageId: `lineage_${pawnId}`,
			originTimelineId: "TL-PRIME",
			type: "p",
			faction: "w",
			row: 6,
			col,
			z: 0,
			w: 0,
			hp: pawnSpec.maxHp,
			maxHp: pawnSpec.maxHp,
			meter: 30,
			kills: 0,
			hasMoved: false,
			history: [{ row: 6, col, z: 0, w: 0, turn: 1 }],
		});

		const type = backRank[col];
		const spec = ARCHETYPES[type];
		const id = `w_${type}_${col}`;
		pieces.push({
			id,
			lineageId: `lineage_${id}`,
			originTimelineId: "TL-PRIME",
			type,
			faction: "w",
			row: 7,
			col,
			z: 0,
			w: 0,
			hp: spec.maxHp,
			maxHp: spec.maxHp,
			meter: 25,
			kills: 0,
			hasMoved: false,
			history: [{ row: 7, col, z: 0, w: 0, turn: 1 }],
		});
	}

	// Establish initial Royal Quantum Bell-State Entanglement (|Φ⁺⟩) between Queen & King of each order
	const wQ = pieces.find((p) => p.id === "w_q_3");
	const wK = pieces.find((p) => p.id === "w_k_4");
	if (wQ && wK) {
		wQ.entangledWithId = wK.id;
		wK.entangledWithId = wQ.id;
	}
	const bQ = pieces.find((p) => p.id === "b_q_3");
	const bK = pieces.find((p) => p.id === "b_k_4");
	if (bQ && bK) {
		bQ.entangledWithId = bK.id;
		bK.entangledWithId = bQ.id;
	}

	return pieces;
}

export function getPieceAt(
	pieces: ChessPiece[],
	row: number,
	col: number,
	z: number = 0,
	w: number = 0,
): ChessPiece | undefined {
	return pieces.find(
		(p) => p.row === row && p.col === col && p.z === z && p.w === w,
	);
}

// Find any piece at (row, col) across ANY (z, w) slice, prioritizing the active slice
export function getPieceAtProjected(
	pieces: ChessPiece[],
	row: number,
	col: number,
	activeZ: number,
	activeW: number,
): ChessPiece | undefined {
	const exact = getPieceAt(pieces, row, col, activeZ, activeW);
	if (exact) return exact;
	return pieces.find((p) => p.row === row && p.col === col);
}

export function isInsideBoard(
	row: number,
	col: number,
	z: number = 0,
	w: number = 0,
): boolean {
	return (
		row >= 0 &&
		row < 8 &&
		col >= 0 &&
		col < 8 &&
		z >= 0 &&
		z <= 1 &&
		w >= -1 &&
		w <= 1
	);
}

export function formatWName(w: number): string {
	if (w < 0) return "Kata (-W)";
	if (w > 0) return "Ana (+W)";
	return "Prime (W=0)";
}

export function formatZName(z: number): string {
	return z === 0 ? "Ground (Z=0)" : "Astral (Z=1)";
}

/**
 * Generates both standard 3D slice moves AND true 4D Hypercube + Temporal Intercept moves!
 * targetSliceW / targetSliceZ lets the player project moves into a chosen 4D slice,
 * or attack pieces hidden in adjacent 4D slices!
 */
export function getValidMovesForPiece(
	piece: ChessPiece,
	pieces: ChessPiece[],
	targetSliceZ: number = piece.z,
	targetSliceW: number = piece.w,
): MoveOption[] {
	const moves: MoveOption[] = [];
	const { row, col, z, w, faction, type } = piece;

	const addMoveIfValid = (
		r: number,
		c: number,
		tz: number,
		tw: number,
		customLabel?: string,
	): boolean => {
		if (!isInsideBoard(r, c, tz, tw)) return false;
		const isCrossSlice = tz !== z || tw !== w;
		const occupant = getPieceAt(pieces, r, c, tz, tw);

		if (!occupant) {
			moves.push({
				from: { row, col, z, w },
				to: { row: r, col: c, z: tz, w: tw },
				isCapture: false,
				isPromotion: type === "p" && (r === 0 || r === 7),
				dimensionType: isCrossSlice ? "4D_HYPER_SHIFT" : "3D_SLICE",
				dimensionLabel:
					customLabel ||
					(isCrossSlice
						? `4D Phase Shift → ${formatWName(tw)} · ${formatZName(tz)}`
						: undefined),
			});
			return true;
		} else if (occupant.faction !== faction) {
			moves.push({
				from: { row, col, z, w },
				to: { row: r, col: c, z: tz, w: tw },
				isCapture: true,
				targetPiece: occupant,
				isPromotion: type === "p" && (r === 0 || r === 7),
				dimensionType: isCrossSlice ? "4D_CROSS_SLICE_STRIKE" : "3D_SLICE",
				dimensionLabel:
					customLabel ||
					(isCrossSlice
						? `4D Cross-Dimensional Ambush (${formatWName(w)} → ${formatWName(tw)})`
						: undefined),
			});
			return false;
		}
		return false;
	};

	// 1. Standard moves within the piece's own (z, w) slice OR projected into (targetSliceZ, targetSliceW)
	const sliceDelta = Math.abs(targetSliceZ - z) + Math.abs(targetSliceW - w);

	if (type === "p") {
		const dir = faction === "w" ? -1 : 1;
		const startRow = faction === "w" ? 6 : 1;
		const nextRow = row + dir;

		// Standard 1-step forward (in own slice or 1 step into W/Z)
		if (sliceDelta <= 1) {
			if (
				isInsideBoard(nextRow, col, targetSliceZ, targetSliceW) &&
				!getPieceAt(pieces, nextRow, col, targetSliceZ, targetSliceW)
			) {
				addMoveIfValid(
					nextRow,
					col,
					targetSliceZ,
					targetSliceW,
					sliceDelta > 0
						? `4D Vanguard Step (${formatWName(targetSliceW)})`
						: undefined,
				);

				const doubleRow = row + dir * 2;
				if (
					sliceDelta === 0 &&
					row === startRow &&
					isInsideBoard(doubleRow, col, z, w) &&
					!getPieceAt(pieces, doubleRow, col, z, w)
				) {
					addMoveIfValid(doubleRow, col, z, w);
				}
			}
		}

		// Diagonal captures (across X/Y and also across W/Z adjacent slices!)
		for (const tw of [w - 1, w, w + 1]) {
			for (const tz of [z - 1, z, z + 1]) {
				if (!isInsideBoard(nextRow, col, tz, tw)) continue;
				if (Math.abs(tw - w) + Math.abs(tz - z) > 1) continue;
				for (const dc of [-1, 1]) {
					const capCol = col + dc;
					if (isInsideBoard(nextRow, capCol, tz, tw)) {
						const target = getPieceAt(pieces, nextRow, capCol, tz, tw);
						if (target && target.faction !== faction) {
							addMoveIfValid(
								nextRow,
								capCol,
								tz,
								tw,
								tw !== w || tz !== z
									? `4D Diagonal Hyper-Capture (${formatWName(tw)})`
									: undefined,
							);
						}
					}
				}
			}
		}
	} else if (type === "n") {
		// 2D L-jumps in current or adjacent W/Z slice
		const jumps = [
			[-2, -1],
			[-2, 1],
			[-1, -2],
			[-1, 2],
			[1, -2],
			[1, 2],
			[2, -1],
			[2, 1],
		];
		for (const [dr, dc] of jumps) {
			addMoveIfValid(row + dr, col + dc, targetSliceZ, targetSliceW);
			// Also check captures in any adjacent W/Z slice!
			for (const tw of [-1, 0, 1]) {
				for (const tz of [0, 1]) {
					if (tw === targetSliceW && tz === targetSliceZ) continue;
					if (Math.abs(tw - w) + Math.abs(tz - z) <= 1) {
						const occ = getPieceAt(pieces, row + dr, col + dc, tz, tw);
						if (occ && occ.faction !== faction) {
							addMoveIfValid(
								row + dr,
								col + dc,
								tz,
								tw,
								`4D L-Jump across (${dr},${dc},ΔW=${tw - w})`,
							);
						}
					}
				}
			}
		}
		// Pure 4D L-jump: 2 steps in X or Y, 1 step in W or Z!
		if (targetSliceW !== w || targetSliceZ !== z) {
			for (const [dr, dc] of [
				[-2, 0],
				[2, 0],
				[0, -2],
				[0, 2],
			]) {
				addMoveIfValid(
					row + dr,
					col + dc,
					targetSliceZ,
					targetSliceW,
					`4D Hyper-Knight Jump (2 Space + 1 ${formatWName(targetSliceW)})`,
				);
			}
		}
	} else if (type === "b" || type === "r" || type === "q") {
		const dirs: [number, number][] = [];
		if (type === "b" || type === "q") {
			dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
		}
		if (type === "r" || type === "q") {
			dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);
		}

		// Standard rays in (targetSliceZ, targetSliceW)
		for (const [dr, dc] of dirs) {
			let r = row + dr;
			let c = col + dc;
			while (isInsideBoard(r, c, targetSliceZ, targetSliceW)) {
				const cont = addMoveIfValid(
					r,
					c,
					targetSliceZ,
					targetSliceW,
					targetSliceW !== w || targetSliceZ !== z
						? `4D Multidimensional Ray → ${formatWName(targetSliceW)}`
						: undefined,
				);
				if (!cont) break;
				r += dr;
				c += dc;
			}
		}

		// Pure 4th-Dimensional Orthogonal Shift for Rook & Queen (same X, Y, different W or Z!)
		if (
			(type === "r" || type === "q") &&
			(targetSliceW !== w || targetSliceZ !== z)
		) {
			addMoveIfValid(
				row,
				col,
				targetSliceZ,
				targetSliceW,
				`Pure 4D Orthogonal Teleport (${formatWName(w)} → ${formatWName(targetSliceW)})`,
			);
		}

		// Cross-Slice 4D Ray Captures: Can this Bishop/Rook/Queen strike an enemy piece sitting in ANOTHER (z, w) slice?
		for (const enemy of pieces) {
			if (enemy.faction === faction) continue;
			if (enemy.w === targetSliceW && enemy.z === targetSliceZ) continue;
			const dr = enemy.row - row;
			const dc = enemy.col - col;
			const dw = enemy.w - w;
			const dz = enemy.z - z;
			const stepDist = Math.max(Math.abs(dr), Math.abs(dc));

			if (
				type === "r" &&
				(dr === 0 || dc === 0) &&
				stepDist <= 6 &&
				Math.abs(dw) + Math.abs(dz) === 1
			) {
				addMoveIfValid(
					enemy.row,
					enemy.col,
					enemy.z,
					enemy.w,
					`4D Rook Orthogonal Strike into ${formatWName(enemy.w)}`,
				);
			} else if (
				type === "b" &&
				Math.abs(dr) === Math.abs(dc) &&
				stepDist > 0 &&
				Math.abs(dw) + Math.abs(dz) === 1
			) {
				addMoveIfValid(
					enemy.row,
					enemy.col,
					enemy.z,
					enemy.w,
					`4D Bishop Diagonal Strike into ${formatWName(enemy.w)}`,
				);
			} else if (
				type === "q" &&
				(dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc)) &&
				Math.abs(dw) + Math.abs(dz) === 1
			) {
				addMoveIfValid(
					enemy.row,
					enemy.col,
					enemy.z,
					enemy.w,
					`4D Queen Hyper-Strike into ${formatWName(enemy.w)}`,
				);
			}
		}
	} else if (type === "k") {
		for (let dr = -1; dr <= 1; dr++) {
			for (let dc = -1; dc <= 1; dc++) {
				if (dr === 0 && dc === 0 && targetSliceZ === z && targetSliceW === w)
					continue;
				addMoveIfValid(row + dr, col + dc, targetSliceZ, targetSliceW);
			}
		}
	}

	// 2. TEMPORAL CAUSALITY INTERCEPT: Check if any enemy piece's PAST coordinate (from 1-2 turns ago) can be intercepted!
	for (const enemy of pieces) {
		if (enemy.faction === faction || enemy.history.length < 2) continue;
		// Look at the enemy's previous spacetime waypoint (1 turn ago)
		const pastWaypoint = enemy.history[enemy.history.length - 2];
		if (pastWaypoint.row === enemy.row && pastWaypoint.col === enemy.col)
			continue;

		// If our piece is adjacent to that past coordinate, we can launch a Temporal Intercept Duel!
		const distToPast = Math.hypot(
			pastWaypoint.row - row,
			pastWaypoint.col - col,
		);
		if (
			distToPast <= 1.5 &&
			!getPieceAt(pieces, pastWaypoint.row, pastWaypoint.col, z, w)
		) {
			moves.push({
				from: { row, col, z, w },
				to: {
					row: pastWaypoint.row,
					col: pastWaypoint.col,
					z: pastWaypoint.z,
					w: pastWaypoint.w,
				},
				isCapture: true,
				targetPiece: enemy,
				dimensionType: "TEMPORAL_INTERCEPT",
				dimensionLabel: `Chrono-Intercept: Strike ${ARCHETYPES[enemy.type].chessName}'s Past Echo at ${formatSquareName(pastWaypoint)}!`,
			});
		}
	}

	// 3. SUBTERRANEAN REALM GATEWAY STANDING DESCENT & PORTAL ROUTING:
	// If this piece is already standing on a BoardGateway square, it can descend directly into that realm!
	const standingGateway = getGatewayAtSquare(row, col, z, w);
	if (standingGateway) {
		moves.push({
			from: { row, col, z, w },
			to: { row, col, z, w },
			isCapture: false,
			dimensionType: "REALM_GATEWAY_DESCENT",
			dimensionLabel: `Descend Directly Into ${REALM_METADATA[standingGateway.realmId].title}`,
			gatewayId: standingGateway.id,
			realmId: standingGateway.realmId,
		});

		// Also expose connected BOARD_ASCENT portal exits from this realm for AI graph pathfinding & tactical preview
		const realmPortals = getPortalsForRealm(standingGateway.realmId);
		for (const portal of realmPortals) {
			if (portal.kind !== "BOARD_ASCENT") continue;
			for (const inverted of [false, true]) {
				const evalExit = evaluatePortalBoardExit(
					portal,
					piece,
					pieces,
					inverted,
					inverted,
				);
				if (!evalExit || evalExit.status === "ALLY_OBSTRUCTED") continue;
				if (
					evalExit.coord.row === row &&
					evalExit.coord.col === col &&
					evalExit.coord.z === z &&
					evalExit.coord.w === w
				) {
					continue;
				}
				const alreadyListed = moves.some(
					(m) =>
						m.to.row === evalExit.coord.row &&
						m.to.col === evalExit.coord.col &&
						m.to.z === evalExit.coord.z &&
						m.to.w === evalExit.coord.w,
				);
				if (!alreadyListed) {
					moves.push({
						from: { row, col, z, w },
						to: { ...evalExit.coord },
						isCapture: evalExit.status === "ENEMY_OCCUPIED",
						targetPiece: evalExit.occupant,
						isPromotion:
							type === "p" &&
							(evalExit.coord.row === 0 || evalExit.coord.row === 7),
						dimensionType: "REALM_PORTAL_TRAVERSAL",
						dimensionLabel: `Realm Traversal via ${REALM_METADATA[standingGateway.realmId].title} → ${evalExit.squareLabel}`,
						gatewayId: standingGateway.id,
						exitGatewayId: portal.id,
						realmId: standingGateway.realmId,
					});
				}
			}
		}
	}

	// 4. MULTIVERSAL SYNOD & CHRONOCRATOR OMNI-VECTORS:
	// Warriors fused with parallel-universe counterparts (`synodStacks > 0`) or crowned `isChronocrator`
	// atop the Colossal Pocket Watch command cross-archetype Synod L-Leaps & Royal Sovereign Vectors!
	if ((piece.synodStacks && piece.synodStacks > 0) || piece.isChronocrator) {
		if (type !== "n") {
			const synodJumps = [
				[-2, -1],
				[-2, 1],
				[-1, -2],
				[-1, 2],
				[1, -2],
				[1, 2],
				[2, -1],
				[2, 1],
			];
			for (const [dr, dc] of synodJumps) {
				const r = row + dr;
				const c = col + dc;
				if (
					!moves.some(
						(m) =>
							m.to.row === r &&
							m.to.col === c &&
							m.to.z === targetSliceZ &&
							m.to.w === targetSliceW,
					)
				) {
					addMoveIfValid(
						r,
						c,
						targetSliceZ,
						targetSliceW,
						piece.isChronocrator
							? "⌚ Chronocrator Horological L-Leap"
							: `✦ Synod Resonance L-Leap (×${piece.synodStacks})`,
					);
				}
			}
		}

		if (piece.isChronocrator && type !== "q") {
			const omniDirs: [number, number][] = [
				[-1, -1],
				[-1, 1],
				[1, -1],
				[1, 1],
				[-1, 0],
				[1, 0],
				[0, -1],
				[0, 1],
			];
			for (const [dr, dc] of omniDirs) {
				for (let step = 1; step <= 3; step++) {
					const r = row + dr * step;
					const c = col + dc * step;
					if (!isInsideBoard(r, c, targetSliceZ, targetSliceW)) break;
					const already = moves.some(
						(m) =>
							m.to.row === r &&
							m.to.col === c &&
							m.to.z === targetSliceZ &&
							m.to.w === targetSliceW,
					);
					const occ = getPieceAt(pieces, r, c, targetSliceZ, targetSliceW);
					if (!already) {
						addMoveIfValid(
							r,
							c,
							targetSliceZ,
							targetSliceW,
							"⌚ Chronocrator Sovereign Ray",
						);
					}
					if (occ) break;
				}
			}
		}
	}

	// 5. SENTIENT MATHEMATICAL THEOREM (`piece.isSentientTheorem && piece.theoremStatus === 'PUBLISHED'`):
	// Publication prints whatever manuscript Dr. Pawn actually established.
	// Checkmate Yesterday exists only when the monarch lemma holds:
	// the orthogonal sector is continuous, the crown sector is not, and the Jacobian has no real pole.
	if (piece.isSentientTheorem && piece.theoremStatus === "PUBLISHED") {
		// A. Transfinite Prime-Number Vectors ((±2, ±2), (±3, 0), (0, ±3), (±3, ±3))
		const theoremVectors = [
			[-2, -2],
			[-2, 2],
			[2, -2],
			[2, 2],
			[-3, 0],
			[3, 0],
			[0, -3],
			[0, 3],
			[-3, -3],
			[-3, 3],
			[3, -3],
			[3, 3],
		];
		for (const [dr, dc] of theoremVectors) {
			const r = row + dr;
			const c = col + dc;
			if (
				isInsideBoard(r, c, targetSliceZ, targetSliceW) &&
				!moves.some(
					(m) =>
						m.to.row === r &&
						m.to.col === c &&
						m.to.z === targetSliceZ &&
						m.to.w === targetSliceW,
				)
			) {
				addMoveIfValid(
					r,
					c,
					targetSliceZ,
					targetSliceW,
					"⊢ Gödelian Lemma Vector (Transfinite Step)",
				);
			}
		}

		// B. RETROACTIVE "CHECKMATE YESTERDAY" VECTORS:
		// Only if the published manuscript established that no monarch is continuous through the cut.
		if (piece.monarchLemmaProved) {
		const enemies = pieces
			.filter((e) => e.faction !== faction && e.hp > 0)
			.sort(
				(a, b) =>
					ARCHETYPES[b.type].tacticalValue - ARCHETYPES[a.type].tacticalValue,
			);

		for (const enemy of enemies) {
			if (enemy.type !== "k" && enemy.type !== "q" && enemy.type !== "r")
				continue;
			const yesterdayWp =
				enemy.history.length >= 2
					? enemy.history[enemy.history.length - 2]
					: enemy.history[0] || {
							row: enemy.faction === "b" ? 0 : 7,
							col: enemy.col,
							z: 0,
							w: 0,
							turn: 1,
						};

			// Ensure the Yesterday square isn't obstructed by a friendly piece right now
			const occAtYesterday = getPieceAt(
				pieces,
				yesterdayWp.row,
				yesterdayWp.col,
				yesterdayWp.z,
				yesterdayWp.w,
			);
			if (
				occAtYesterday &&
				occAtYesterday.faction === faction &&
				occAtYesterday.id !== piece.id
			) {
				continue;
			}

			const sqName = formatSquareName(yesterdayWp);
			const pastTurnLabel = yesterdayWp.turn || 1;
			moves.push({
				from: { row, col, z, w },
				to: {
					row: yesterdayWp.row,
					col: yesterdayWp.col,
					z: yesterdayWp.z,
					w: yesterdayWp.w,
				},
				isCapture: true,
				targetPiece: enemy,
				dimensionType: "CHECKMATE_YESTERDAY",
				dimensionLabel: piece.entanglementSwapUnlocked
					? enemy.type === "k"
						? `⊢ CKW ENTANGLEMENT SWAP: Decohere ${ARCHETYPES[enemy.type].chessName} from the Crown at Turn ${pastTurnLabel} (${sqName})!`
						: `⊢ Entanglement Swap: Sever Yesterday's ${ARCHETYPES[enemy.type].chessName} at ${sqName} (Turn ${pastTurnLabel})!`
					: enemy.type === "k"
						? `⊢ Q.E.D. CHECKMATE YESTERDAY: Refute ${ARCHETYPES[enemy.type].chessName} at Turn ${pastTurnLabel} (${sqName})!`
						: `⊢ Retroactive Proof: Refute Yesterday's ${ARCHETYPES[enemy.type].chessName} at ${sqName} (Turn ${pastTurnLabel})!`,
			});
		}
		}
	}

	return moves;
}

/**
 * Computes all squares on the currently viewed 3D slice (activeZ, activeW)
 * that are threatened from UNSEEN 4th-dimensional directions (pieces with w != activeW or z != activeZ)!
 */
export function computeUnseen4DThreats(
	pieces: ChessPiece[],
	activeZ: number,
	activeW: number,
	friendlyFaction: Faction,
): UnseenThreatVector[] {
	const threats: UnseenThreatVector[] = [];

	for (const enemy of pieces) {
		if (enemy.faction === friendlyFaction) continue;
		// Only consider pieces lurking outside the currently viewed 3D slice!
		if (enemy.z === activeZ && enemy.w === activeW) continue;

		const dw = Math.abs(enemy.w - activeW);
		const dz = Math.abs(enemy.z - activeZ);
		if (dw + dz > 1) continue; // Adjacent 4D fold threats

		const axisDesc = `From ${formatWName(enemy.w)} · ${formatZName(enemy.z)}`;

		// Project their 4D attack rays onto the current (activeZ, activeW) board!
		if (enemy.type === "r" || enemy.type === "q") {
			// Pure 4D orthogonal threat on the exact same (row, col)!
			threats.push({
				attacker: enemy,
				targetRow: enemy.row,
				targetCol: enemy.col,
				targetZ: activeZ,
				targetW: activeW,
				axisDescription: `${ARCHETYPES[enemy.type].chessName} projects straight through ${axisDesc}`,
			});
		}

		if (enemy.type === "b" || enemy.type === "q") {
			for (const [dr, dc] of [
				[-1, -1],
				[-1, 1],
				[1, -1],
				[1, 1],
			]) {
				const r = enemy.row + dr;
				const c = enemy.col + dc;
				if (isInsideBoard(r, c, activeZ, activeW)) {
					threats.push({
						attacker: enemy,
						targetRow: r,
						targetCol: c,
						targetZ: activeZ,
						targetW: activeW,
						axisDescription: `${ARCHETYPES[enemy.type].chessName} projects 4D Diagonal ${axisDesc}`,
					});
				}
			}
		}

		if (enemy.type === "n") {
			for (const [dr, dc] of [
				[-2, 0],
				[2, 0],
				[0, -2],
				[0, 2],
			]) {
				const r = enemy.row + dr;
				const c = enemy.col + dc;
				if (isInsideBoard(r, c, activeZ, activeW)) {
					threats.push({
						attacker: enemy,
						targetRow: r,
						targetCol: c,
						targetZ: activeZ,
						targetW: activeW,
						axisDescription: `Knight 4D L-Leap Threat ${axisDesc}`,
					});
				}
			}
		}
	}

	return threats;
}

export function chooseAIMove(
	pieces: ChessPiece[],
	aiFaction: Faction,
	preferActionShowcase: boolean = false,
): { piece: ChessPiece; move: MoveOption } | null {
	const aiPieces = pieces.filter((p) => p.faction === aiFaction);
	const candidates: { piece: ChessPiece; move: MoveOption; score: number }[] =
		[];

	for (const piece of aiPieces) {
		// AI considers both its current slice AND shifting into Ana (+1) or Kata (-1)!
		const targetWOptions = preferActionShowcase
			? [piece.w, 0, 1, -1].filter((v, i, arr) => arr.indexOf(v) === i)
			: Math.random() < 0.3
				? [piece.w, piece.w === 0 ? 1 : 0]
				: [piece.w];

		for (const tw of targetWOptions) {
			const validMoves = getValidMovesForPiece(piece, pieces, piece.z, tw);
			for (const move of validMoves) {
				let score = Math.random() * 4;

				const centerDist =
					Math.abs(3.5 - move.to.row) + Math.abs(3.5 - move.to.col);
				score += (7 - centerDist) * 1.4;

				if (piece.type === "p") {
					score += (aiFaction === "b" ? move.to.row : 7 - move.to.row) * 1.5;
				}

				if (move.dimensionType === "4D_HYPER_SHIFT") {
					score += preferActionShowcase ? 10 : 5;
				}

				// AI Realm Graph Pathfinding: Evaluate entering a gateway or traversing a realm portal!
				if (move.dimensionType === "REALM_GATEWAY_DESCENT" && move.realmId) {
					const realmPortals = getPortalsForRealm(move.realmId);
					let bestExitBonus = 6;
					for (const portal of realmPortals) {
						if (portal.kind !== "BOARD_ASCENT") continue;
						const exitEval = evaluatePortalBoardExit(
							portal,
							piece,
							pieces,
							true,
							true,
						);
						if (!exitEval || exitEval.status === "ALLY_OBSTRUCTED") continue;
						if (exitEval.status === "ENEMY_OCCUPIED" && exitEval.occupant) {
							const targetVal =
								ARCHETYPES[exitEval.occupant.type].tacticalValue;
							bestExitBonus = Math.max(bestExitBonus, 14 + targetVal * 4.5);
						} else {
							const adv =
								aiFaction === "b" ? exitEval.coord.row : 7 - exitEval.coord.row;
							bestExitBonus = Math.max(bestExitBonus, adv * 2.2);
						}
					}
					// Account for Ashen Crucible environmental hazard cost if piece HP is low
					if (
						move.realmId === "ASHEN_CRUCIBLE" &&
						piece.hp < piece.maxHp * 0.35
					) {
						bestExitBonus -= 10;
					}
					score += bestExitBonus;
				} else if (move.dimensionType === "REALM_PORTAL_TRAVERSAL") {
					score += preferActionShowcase ? 24 : 14;
				}

				if (move.isCapture && move.targetPiece) {
					const targetSpec = ARCHETYPES[move.targetPiece.type];
					const attackerSpec = ARCHETYPES[piece.type];
					const hpAdvantage = piece.hp / move.targetPiece.hp;
					score +=
						(preferActionShowcase ? 65 : 0) +
						targetSpec.tacticalValue * 12 * Math.min(1.6, hpAdvantage);
					if (
						move.dimensionType === "4D_CROSS_SLICE_STRIKE" ||
						move.dimensionType === "TEMPORAL_INTERCEPT" ||
						move.dimensionType === "REALM_PORTAL_TRAVERSAL"
					) {
						score += preferActionShowcase ? 28 : 16; // AI loves dramatic 4D & Realm ambushes!
					}
					if (piece.type === "p" && targetSpec.tacticalValue >= 5) {
						score += 22;
					}
					if (attackerSpec.tacticalValue >= 5) {
						score += 10;
					}

					// Account for Tactical Support Coverage on the contested square!
					const supportAnalysis = computeSquareSupportAnalysis(
						pieces,
						move.to,
						piece.faction,
						move.targetPiece.faction,
						[piece.id, move.targetPiece.id],
					);
					const readyAlliedSupport = supportAnalysis.attackerSupporters.filter(
						(s) => s.canIntervene,
					).length;
					const readyEnemySupport = supportAnalysis.defenderSupporters.filter(
						(s) => s.canIntervene,
					).length;
					score += (readyAlliedSupport - readyEnemySupport) * 6.5;
					if (
						preferActionShowcase &&
						(readyAlliedSupport > 0 || readyEnemySupport > 0)
					) {
						score += 18; // Showcase duels where Tactical Intervention: The Board Fights Back is active!
					}
				}

				candidates.push({ piece, move, score });
			}
		}
	}

	if (candidates.length === 0) return null;
	candidates.sort((a, b) => b.score - a.score);
	return { piece: candidates[0].piece, move: candidates[0].move };
}

export function formatSquareName(coord: BoardCoord): string {
	const files = ["A", "B", "C", "D", "E", "F", "G", "H"];
	return `${files[coord.col]}${8 - coord.row}`;
}

/**
 * Determines whether a single surviving, non-participating piece can legally attack/cover
 * the contested square (targetCoord) under the existing 3D & 4D movement geometry.
 *
 * Critically distinguishes ATTACKING A SQUARE from CAPTURING AN ENEMY:
 * - Friendly pieces defending their own occupied square qualify!
 * - Sliding rays (Bishop, Rook, Queen) must have an unobstructed path across intermediate squares
 *   (ignoring only the two active duel participants in `excludedPieceIds`).
 */
export function canPieceAttackSquare(
	supporter: ChessPiece,
	targetCoord: { row: number; col: number; z: number; w: number },
	pieces: ChessPiece[],
	excludedPieceIds: string[],
): { canAttack: boolean; vectorLabel: string } {
	if (excludedPieceIds.includes(supporter.id)) {
		return { canAttack: false, vectorLabel: "" };
	}

	const { row, col, z, w, type, faction } = supporter;
	const { row: tr, col: tc, z: tz, w: tw } = targetCoord;

	// Cannot support from the exact same 4D coordinate as the duel itself
	if (row === tr && col === tc && z === tz && w === tw) {
		return { canAttack: false, vectorLabel: "" };
	}

	const dr = tr - row;
	const dc = tc - col;
	const dz = tz - z;
	const dw = tw - w;
	const sliceDelta = Math.abs(dz) + Math.abs(dw);

	// Existing movement rules allow same-slice (sliceDelta === 0) or adjacent 4D slice (sliceDelta === 1)
	if (sliceDelta > 1) {
		return { canAttack: false, vectorLabel: "" };
	}

	const isCrossSlice = sliceDelta === 1;
	const slicePrefix = isCrossSlice
		? dz !== 0
			? `4D Astral (+Z)`
			: dw > 0
				? `4D Ana (+W)`
				: `4D Kata (-W)`
		: `Prime`;

	// Helper to check if a sliding ray from (row, col) to (tr, tc) is unobstructed
	const isRayUnobstructed = (): boolean => {
		const steps = Math.max(Math.abs(dr), Math.abs(dc));
		if (steps <= 1) return true;
		const stepR = Math.sign(dr);
		const stepC = Math.sign(dc);

		for (let s = 1; s < steps; s++) {
			const checkR = row + stepR * s;
			const checkC = col + stepC * s;
			// Check obstruction in supporter's slice AND target's slice so no piece blocks the ray
			for (const p of pieces) {
				if (excludedPieceIds.includes(p.id)) continue;
				if (p.row === checkR && p.col === checkC) {
					if ((p.z === z && p.w === w) || (p.z === tz && p.w === tw)) {
						return false;
					}
				}
			}
		}
		return true;
	};

	if (type === "p") {
		const forwardDir = faction === "w" ? -1 : 1;
		// Pawns attack diagonally 1 step forward (in own slice or adjacent 4D slice)
		if (dr === forwardDir && Math.abs(dc) === 1) {
			return {
				canAttack: true,
				vectorLabel: `${slicePrefix} Diagonal Vanguard (${formatSquareName(supporter)})`,
			};
		}
		return { canAttack: false, vectorLabel: "" };
	}

	if (type === "n") {
		const isStandardL =
			(Math.abs(dr) === 2 && Math.abs(dc) === 1) ||
			(Math.abs(dr) === 1 && Math.abs(dc) === 2);
		const isHyper4DL =
			isCrossSlice &&
			((Math.abs(dr) === 2 && dc === 0) || (dr === 0 && Math.abs(dc) === 2));

		if (isStandardL || isHyper4DL) {
			return {
				canAttack: true,
				vectorLabel: isHyper4DL
					? `${slicePrefix} Hyper-Knight L-Jump (${formatSquareName(supporter)})`
					: `${slicePrefix} L-Jump (${formatSquareName(supporter)})`,
			};
		}
		return { canAttack: false, vectorLabel: "" };
	}

	if (type === "k") {
		if (Math.abs(dr) <= 1 && Math.abs(dc) <= 1) {
			return {
				canAttack: true,
				vectorLabel: `${slicePrefix} Sovereign Radius (${formatSquareName(supporter)})`,
			};
		}
		return { canAttack: false, vectorLabel: "" };
	}

	if (type === "b") {
		if (
			Math.abs(dr) === Math.abs(dc) &&
			Math.abs(dr) > 0 &&
			isRayUnobstructed()
		) {
			return {
				canAttack: true,
				vectorLabel: `${slicePrefix} Diagonal Ray (${formatSquareName(supporter)})`,
			};
		}
		return { canAttack: false, vectorLabel: "" };
	}

	if (type === "r") {
		// Pure 4D Orthogonal shift at the exact same (row, col) across adjacent W/Z slice!
		if (dr === 0 && dc === 0 && isCrossSlice) {
			return {
				canAttack: true,
				vectorLabel: `${slicePrefix} Orthogonal 4D Axis (${formatSquareName(supporter)})`,
			};
		}
		const stepDist = Math.max(Math.abs(dr), Math.abs(dc));
		const validDist = !isCrossSlice || stepDist <= 6;
		if (
			(dr === 0 || dc === 0) &&
			stepDist > 0 &&
			validDist &&
			isRayUnobstructed()
		) {
			return {
				canAttack: true,
				vectorLabel: `${slicePrefix} Orthogonal File/Rank (${formatSquareName(supporter)})`,
			};
		}
		return { canAttack: false, vectorLabel: "" };
	}

	if (type === "q") {
		if (dr === 0 && dc === 0 && isCrossSlice) {
			return {
				canAttack: true,
				vectorLabel: `${slicePrefix} Hyper-Axis (${formatSquareName(supporter)})`,
			};
		}
		const isOrthoOrDiag = dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc);
		const stepDist = Math.max(Math.abs(dr), Math.abs(dc));
		if (isOrthoOrDiag && stepDist > 0 && isRayUnobstructed()) {
			return {
				canAttack: true,
				vectorLabel: `${slicePrefix} Royal Vector (${formatSquareName(supporter)})`,
			};
		}
		return { canAttack: false, vectorLabel: "" };
	}

	return { canAttack: false, vectorLabel: "" };
}

/**
 * Computes all surviving, non-participating pieces from both the attacking and defending factions
 * whose legal attack vectors cover `targetCoord`.
 */
export function computeSquareSupportAnalysis(
	pieces: ChessPiece[],
	targetCoord: { row: number; col: number; z: number; w: number },
	attackerFaction: Faction,
	defenderFaction: Faction,
	excludedParticipantIds: string[],
): SquareSupportAnalysis {
	const attackerSupporters: TacticalSupporter[] = [];
	const defenderSupporters: TacticalSupporter[] = [];

	for (const p of pieces) {
		if (p.hp <= 0) continue;
		const coverage = canPieceAttackSquare(
			p,
			targetCoord,
			pieces,
			excludedParticipantIds,
		);
		if (!coverage.canAttack) continue;

		const isCrossDimensional = p.w !== targetCoord.w || p.z !== targetCoord.z;
		let riftType: InterventionRiftType = "PRIME";
		let riftColorHex = p.faction === "w" ? 0xf59e0b : 0xf43f5e;

		if (isCrossDimensional) {
			if (p.z > targetCoord.z || p.z === 1) {
				riftType = "ASTRAL_PLUS_Z";
				riftColorHex = 0x34d399; // Emerald (+Z)
			} else if (p.w > 0 || p.w > targetCoord.w) {
				riftType = "ANA_PLUS_W";
				riftColorHex = 0x38bdf8; // Cyan (+W)
			} else {
				riftType = "KATA_MINUS_W";
				riftColorHex = 0xc084fc; // Violet (-W)
			}
		}

		const meta = INTERVENTION_METADATA[p.type];
		const supporterEntry: TacticalSupporter = {
			pieceId: p.id,
			type: p.type,
			faction: p.faction,
			row: p.row,
			col: p.col,
			z: p.z,
			w: p.w,
			meter: p.meter,
			canIntervene: p.meter >= TACTICAL_INTERVENTION_METER_COST,
			isCrossDimensional,
			riftType,
			riftColorHex,
			interventionName: meta.name,
			interventionTagline: meta.tagline,
			vectorLabel: coverage.vectorLabel,
		};

		if (p.faction === attackerFaction) {
			attackerSupporters.push(supporterEntry);
		} else if (p.faction === defenderFaction) {
			defenderSupporters.push(supporterEntry);
		}
	}

	// Sort supporters so ready cross-dimensional & high-tactical-value pieces appear first!
	const sortFn = (a: TacticalSupporter, b: TacticalSupporter) => {
		if (a.canIntervene !== b.canIntervene) return a.canIntervene ? -1 : 1;
		if (a.isCrossDimensional !== b.isCrossDimensional)
			return a.isCrossDimensional ? -1 : 1;
		return ARCHETYPES[b.type].tacticalValue - ARCHETYPES[a.type].tacticalValue;
	};

	attackerSupporters.sort(sortFn);
	defenderSupporters.sort(sortFn);

	return { attackerSupporters, defenderSupporters };
}
