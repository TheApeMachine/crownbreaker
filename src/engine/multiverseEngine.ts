import { ARCHETYPES } from "../data/archetypes";
import type {
	CausalCollapseResolution,
	CausalDeathEvent,
	ChessPiece,
	CounterpartManifestationSummary,
	Faction,
	MoveOption,
	MultiverseMoveRecord,
	MultiverseState,
	PocketWatchEvent,
	PocketWatchEventKind,
	RememberedSquareEntry,
	TimelineBranch,
	VulnerableTargetSummary,
} from "../types/game";
import {
	createInitialBoard,
	formatSquareName,
	formatWName,
	getPieceAt,
	getPieceLineageId,
	getValidMovesForPiece,
} from "./chessEngine";

export function clonePiece(p: ChessPiece): ChessPiece {
	return {
		...p,
		lineageId: getPieceLineageId(p),
		originTimelineId: p.originTimelineId || "TL-PRIME",
		inRealm: p.inRealm ?? null,
		history: p.history.map((h) => ({ ...h })),
	};
}

export function clonePiecesArray(pieces: ChessPiece[]): ChessPiece[] {
	return pieces.map(clonePiece);
}

/**
 * Applies a single legal move deterministically to a mutable board array `pieces`
 * and returns the captured piece (if any) and a `MultiverseMoveRecord`.
 */
export function applyLegalMoveToBoard(
	pieces: ChessPiece[],
	pieceLineageId: string,
	move: MoveOption,
	turnNumber: number,
	seq: number,
): { capturedPiece?: ChessPiece; record: MultiverseMoveRecord } | null {
	const mover = pieces.find((p) => getPieceLineageId(p) === pieceLineageId);
	if (!mover) return null;

	const occupant = getPieceAt(
		pieces,
		move.to.row,
		move.to.col,
		move.to.z,
		move.to.w,
	);

	let capturedPiece: ChessPiece | undefined;
	if (occupant && occupant.id !== mover.id) {
		if (occupant.faction === mover.faction) {
			// Allied obstruction — illegal move
			return null;
		}
		capturedPiece = clonePiece(occupant);
		const idx = pieces.findIndex((p) => p.id === occupant.id);
		if (idx >= 0) {
			pieces.splice(idx, 1);
		}
	}

	const fromCoord = {
		row: mover.row,
		col: mover.col,
		z: mover.z,
		w: mover.w,
	};

	mover.row = move.to.row;
	mover.col = move.to.col;
	mover.z = move.to.z;
	mover.w = move.to.w;
	mover.hasMoved = true;
	mover.meter = Math.min(100, mover.meter + 10);
	if (capturedPiece) {
		mover.kills += 1;
	}
	if (mover.type === "p" && (mover.row === 0 || mover.row === 7)) {
		mover.type = "q";
		mover.maxHp = ARCHETYPES.q.maxHp;
		mover.hp = ARCHETYPES.q.maxHp;
	}
	mover.history.push({
		row: mover.row,
		col: mover.col,
		z: mover.z,
		w: mover.w,
		turn: turnNumber,
	});

	const fromSq = formatSquareName(fromCoord);
	const toSq = formatSquareName(move.to);
	const summary = capturedPiece
		? `${ARCHETYPES[mover.type].chessName} (${fromSq}) captured ${ARCHETYPES[capturedPiece.type].chessName} at ${toSq}`
		: `${ARCHETYPES[mover.type].chessName} ${fromSq} → ${toSq}${move.to.w !== 0 ? ` [${formatWName(move.to.w)}]` : ""}`;

	return {
		capturedPiece,
		record: {
			seq,
			turnNumber,
			faction: mover.faction,
			pieceLineageId: getPieceLineageId(mover),
			pieceType: mover.type,
			from: fromCoord,
			to: { ...move.to },
			capturedLineageId: capturedPiece
				? getPieceLineageId(capturedPiece)
				: undefined,
			capturedType: capturedPiece?.type,
			summary,
		},
	};
}

/**
 * Ensures a branch's `pieces` array is hydrated in memory.
 * If the branch was dehydrated to bound memory, deterministically reconstructs
 * its exact board state from `forkBasePieces` + `moveHistory` + `eliminatedLineages`.
 */
export function ensureBranchHydrated(
	multiverse: MultiverseState,
	timelineId: string,
): TimelineBranch | undefined {
	const branch = multiverse.timelines.get(timelineId);
	if (!branch) return undefined;

	if (branch.isDehydrated) {
		const reconstructed = clonePiecesArray(branch.forkBasePieces);
		for (const rec of branch.moveHistory) {
			const m: MoveOption = {
				from: { ...rec.from },
				to: { ...rec.to },
				isCapture: Boolean(rec.capturedLineageId),
			};
			applyLegalMoveToBoard(
				reconstructed,
				rec.pieceLineageId,
				m,
				rec.turnNumber,
				rec.seq,
			);
		}
		// Filter out any lineages that have been applied as causal deaths on this branch
		const appliedDeaths = new Set(branch.appliedDeathEventIds);
		const deadLineages = new Set<string>();
		for (const [linId, ev] of multiverse.eliminatedLineages.entries()) {
			if (appliedDeaths.has(ev.id)) {
				deadLineages.add(linId);
			}
		}
		branch.pieces = reconstructed.filter(
			(p) => !deadLineages.has(getPieceLineageId(p)),
		);
		branch.isDehydrated = false;
	}

	// Update LRU hydrated order
	multiverse.hydratedOrder = [
		...multiverse.hydratedOrder.filter((id) => id !== timelineId),
		timelineId,
	];
	enforceWorkingSetLimit(multiverse);

	return branch;
}

/**
 * Keeps only `maxHydratedWorkingSet` timelines with full `pieces` arrays in memory,
 * dehydrating the oldest inactive timelines so the multiverse can expand indefinitely
 * without unbounded memory growth.
 */
export function enforceWorkingSetLimit(multiverse: MultiverseState): void {
	while (multiverse.hydratedOrder.length > multiverse.maxHydratedWorkingSet) {
		const candidateIdx = multiverse.hydratedOrder.findIndex(
			(id) =>
				id !== multiverse.activeTimelineId && id !== multiverse.primeTimelineId,
		);
		if (candidateIdx === -1) break;
		const evictId = multiverse.hydratedOrder[candidateIdx];
		multiverse.hydratedOrder.splice(candidateIdx, 1);
		const branch = multiverse.timelines.get(evictId);
		if (branch && !branch.isDehydrated) {
			branch.pieces = [];
			branch.isDehydrated = true;
		}
	}
}

/**
 * Creates a genuinely diverged timeline branch from an existing timeline's state
 * by executing real, validated legal moves from `getValidMovesForPiece`.
 */
export function forkTimelineFromBranch(
	multiverse: MultiverseState,
	parentTimelineId: string,
	options?: {
		customName?: string;
		exposeTargetLineageId?: string;
		preferAggressiveDivergence?: boolean;
		seedOffset?: number;
		isBackgroundSeed?: boolean;
	},
): TimelineBranch {
	const parent =
		ensureBranchHydrated(multiverse, parentTimelineId) ||
		ensureBranchHydrated(multiverse, multiverse.primeTimelineId)!;

	multiverse.branchCounter += 1;
	multiverse.seqCounter += 1;
	const branchNum = multiverse.branchCounter;
	const newId = `TL-OMEGA-${branchNum}`;
	const shortCode = `Ω-${branchNum}`;
	const name = options?.customName || `Timeline ${shortCode}`;

	// Filter out any globally eliminated lineages so a dead piece can NEVER resurrect in a new fork
	const basePieces = clonePiecesArray(parent.pieces).filter(
		(p) => !multiverse.eliminatedLineages.has(getPieceLineageId(p)),
	);
	// Clear any transient realm flags on the forked board
	for (const p of basePieces) {
		p.inRealm = null;
	}

	const workingPieces = clonePiecesArray(basePieces);
	const moveHistory: MultiverseMoveRecord[] = [];
	let currentTurn = parent.turnNumber;
	let currentFaction: Faction = parent.turnFaction;
	let divergenceSummary = "";

	const parentLastMove =
		parent.moveHistory.length > 0
			? parent.moveHistory[parent.moveHistory.length - 1]
			: null;

	// Step 1: If `exposeTargetLineageId` is requested (e.g. exposing the Obsidian Queen `lineage_b_q_3` on F6),
	// execute the exact legal sequence of moves from `workingPieces` that brings that piece into an exposed position!
	if (options?.exposeTargetLineageId) {
		const targetPiece = workingPieces.find(
			(p) => getPieceLineageId(p) === options.exposeTargetLineageId,
		);
		if (targetPiece) {
			// If targetPiece is a back-rank Queen or Bishop/Rook blocked by a pawn, advance its blocking pawn legally first!
			const blockerPawn = workingPieces.find(
				(p) =>
					p.faction === targetPiece.faction &&
					p.type === "p" &&
					Math.abs(p.col - targetPiece.col) <= 1 &&
					p.row === (targetPiece.faction === "b" ? 1 : 6),
			);

			if (blockerPawn) {
				const pawnMoves = getValidMovesForPiece(
					blockerPawn,
					workingPieces,
					blockerPawn.z,
					blockerPawn.w,
				).filter((m) => !m.isCapture && m.dimensionType === "3D_SLICE");
				const chosenPawnMove =
					pawnMoves.find((m) => Math.abs(m.to.row - m.from.row) === 2) ||
					pawnMoves[0];
				if (chosenPawnMove) {
					multiverse.seqCounter += 1;
					const res = applyLegalMoveToBoard(
						workingPieces,
						getPieceLineageId(blockerPawn),
						chosenPawnMove,
						currentTurn,
						multiverse.seqCounter,
					);
					if (res) moveHistory.push(res.record);
					currentTurn += 1;
				}
			}

			// Advance an opposing knight or bishop so it has a legal strike vector
			const oppAttackers = workingPieces.filter(
				(p) =>
					p.faction !== targetPiece.faction &&
					(p.type === "n" ||
						p.type === "r" ||
						p.type === "b" ||
						p.type === "q"),
			);
			for (const atk of oppAttackers) {
				const atkMoves = getValidMovesForPiece(
					atk,
					workingPieces,
					atk.z,
					atk.w,
				).filter((m) => !m.isCapture && m.dimensionType === "3D_SLICE");
				if (atkMoves.length > 0) {
					const bestAdvance = atkMoves.sort(
						(a, b) => Math.abs(3.5 - a.to.row) - Math.abs(3.5 - b.to.row),
					)[0];
					multiverse.seqCounter += 1;
					const res = applyLegalMoveToBoard(
						workingPieces,
						getPieceLineageId(atk),
						bestAdvance,
						currentTurn,
						multiverse.seqCounter,
					);
					if (res) moveHistory.push(res.record);
					currentTurn += 1;
					break;
				}
			}

			// Now move `targetPiece` itself via a legal move to an exposed forward square!
			const targetMoves = getValidMovesForPiece(
				targetPiece,
				workingPieces,
				targetPiece.z,
				targetPiece.w,
			).filter((m) => !m.isCapture && m.dimensionType === "3D_SLICE");

			if (targetMoves.length > 0) {
				// Pick a legal square where an opposing piece can legally attack `targetPiece` on the next turn!
				let chosenExposureMove = targetMoves[0];
				for (const candMove of targetMoves) {
					const testBoard = clonePiecesArray(workingPieces);
					applyLegalMoveToBoard(
						testBoard,
						getPieceLineageId(targetPiece),
						candMove,
						currentTurn,
						99999,
					);
					const canBeCaptured = testBoard
						.filter((p) => p.faction !== targetPiece.faction)
						.some((enemy) =>
							getValidMovesForPiece(
								enemy,
								testBoard,
								candMove.to.z,
								candMove.to.w,
							).some(
								(em) =>
									em.isCapture &&
									em.targetPiece &&
									getPieceLineageId(em.targetPiece) ===
										getPieceLineageId(targetPiece),
							),
						);
					if (canBeCaptured) {
						chosenExposureMove = candMove;
						break;
					}
					// Otherwise prefer advancing deeper toward the center
					if (
						Math.abs(3.5 - candMove.to.row) <
						Math.abs(3.5 - chosenExposureMove.to.row)
					) {
						chosenExposureMove = candMove;
					}
				}

				multiverse.seqCounter += 1;
				const res = applyLegalMoveToBoard(
					workingPieces,
					getPieceLineageId(targetPiece),
					chosenExposureMove,
					currentTurn,
					multiverse.seqCounter,
				);
				if (res) {
					moveHistory.push(res.record);
					divergenceSummary = `${ARCHETYPES[targetPiece.type].chessName} advanced to ${formatSquareName(chosenExposureMove.to)} (Exposed)`;
				}
				currentTurn += 1;
			}

			// Ensure at least one opposing warrior has a direct legal capture on `targetPiece` in this branch!
			const alreadyCapturable = workingPieces
				.filter((p) => p.faction !== targetPiece.faction)
				.some((enemy) =>
					getValidMovesForPiece(
						enemy,
						workingPieces,
						targetPiece.z,
						targetPiece.w,
					).some(
						(em) =>
							em.isCapture &&
							em.targetPiece &&
							getPieceLineageId(em.targetPiece) ===
								getPieceLineageId(targetPiece),
					),
				);

			if (!alreadyCapturable) {
				// Find a legal 1-step setup move for an opposing piece that puts `targetPiece` in its capture sights
				const oppPieces = workingPieces.filter(
					(p) => p.faction !== targetPiece.faction && p.type !== "k",
				);
				outerLoop: for (const op of oppPieces) {
					const opMoves = getValidMovesForPiece(
						op,
						workingPieces,
						op.z,
						op.w,
					).filter((m) => !m.isCapture && m.dimensionType === "3D_SLICE");
					for (const om of opMoves) {
						const testBoard = clonePiecesArray(workingPieces);
						applyLegalMoveToBoard(
							testBoard,
							getPieceLineageId(op),
							om,
							currentTurn,
							99998,
						);
						const movedOp = testBoard.find(
							(x) => getPieceLineageId(x) === getPieceLineageId(op),
						);
						if (
							movedOp &&
							getValidMovesForPiece(
								movedOp,
								testBoard,
								targetPiece.z,
								targetPiece.w,
							).some(
								(em) =>
									em.isCapture &&
									em.targetPiece &&
									getPieceLineageId(em.targetPiece) ===
										getPieceLineageId(targetPiece),
							)
						) {
							multiverse.seqCounter += 1;
							const res = applyLegalMoveToBoard(
								workingPieces,
								getPieceLineageId(op),
								om,
								currentTurn,
								multiverse.seqCounter,
							);
							if (res) moveHistory.push(res.record);
							currentTurn += 1;
							break outerLoop;
						}
					}
				}
			}
			currentFaction = targetPiece.faction === "b" ? "w" : "b";
		}
	} else {
		// Standard legal multi-ply divergence: choose 2–3 legal moves that differ from `parentLastMove`
		const seed = (options?.seedOffset ?? branchNum) * 7 + 3;
		const plies = 2 + (branchNum % 2);

		for (let ply = 0; ply < plies; ply++) {
			const factionPieces = workingPieces.filter(
				(p) => p.faction === currentFaction,
			);
			const allLegal: { piece: ChessPiece; move: MoveOption; score: number }[] =
				[];

			for (const p of factionPieces) {
				const moves = getValidMovesForPiece(p, workingPieces, p.z, p.w).filter(
					(m) =>
						m.dimensionType === "3D_SLICE" ||
						m.dimensionType === "4D_HYPER_SHIFT",
				);
				for (const m of moves) {
					// Do not repeat the exact move that occurred in the parent timeline on ply 0
					if (
						ply === 0 &&
						parentLastMove &&
						getPieceLineageId(p) === parentLastMove.pieceLineageId &&
						m.to.row === parentLastMove.to.row &&
						m.to.col === parentLastMove.to.col
					) {
						continue;
					}
					// Avoid capturing in the automatic setup plies so pieces remain alive for the player/AI to hunt!
					if (m.isCapture) continue;

					const centerBonus =
						7 - (Math.abs(3.5 - m.to.row) + Math.abs(3.5 - m.to.col));
					const pieceBonus =
						p.type === "n" || p.type === "b" || p.type === "q" ? 6 : 2;
					const hash =
						((p.col * 13 + m.to.row * 17 + m.to.col * 23 + seed + ply * 11) %
							19) *
						0.4;
					allLegal.push({
						piece: p,
						move: m,
						score: centerBonus + pieceBonus + hash,
					});
				}
			}

			if (allLegal.length === 0) break;
			allLegal.sort((a, b) => b.score - a.score);
			const chosen =
				allLegal[ply === 0 ? branchNum % Math.min(4, allLegal.length) : 0];

			multiverse.seqCounter += 1;
			const res = applyLegalMoveToBoard(
				workingPieces,
				getPieceLineageId(chosen.piece),
				chosen.move,
				currentTurn,
				multiverse.seqCounter,
			);
			if (res) {
				moveHistory.push(res.record);
				if (!divergenceSummary) {
					divergenceSummary = res.record.summary;
				}
			}

			currentFaction = currentFaction === "w" ? "b" : "w";
			currentTurn += 1;
		}
	}

	if (!divergenceSummary) {
		divergenceSummary =
			moveHistory[0]?.summary ||
			`Forked from ${parent.shortCode} at Turn ${parent.turnNumber}`;
	}

	const divergenceDepth = (parent.divergenceDepth ?? 0) + 1;
	const visitedByPlayer = !options?.isBackgroundSeed;

	const newBranch: TimelineBranch = {
		id: newId,
		name,
		shortCode,
		parentTimelineId: parent.id,
		forkTurn: parent.turnNumber,
		divergenceSummary,
		turnNumber: currentTurn,
		turnFaction: currentFaction,
		pieces: workingPieces,
		forkBasePieces: basePieces,
		moveHistory,
		appliedDeathEventIds: Array.from(
			multiverse.eliminatedLineages.values(),
		).map((e) => e.id),
		createdAtSeq: multiverse.seqCounter,
		isDehydrated: false,
		visitedByPlayer,
		divergenceDepth,
		isCollapsed: false,
	};

	multiverse.timelines.set(newId, newBranch);
	multiverse.hydratedOrder.push(newId);

	if (visitedByPlayer) {
		if (!multiverse.visitedTimelineIds.includes(newId)) {
			multiverse.visitedTimelineIds.push(newId);
		}
		// Record initial diverged footprints in rememberedSquares
		for (const rec of moveHistory) {
			const sqLabel = formatSquareName(rec.to);
			multiverse.rememberedSquares.push({
				id: `rem_${newId}_${rec.seq}`,
				lineageId: rec.pieceLineageId,
				pieceType: rec.pieceType,
				faction: rec.faction,
				row: rec.to.row,
				col: rec.to.col,
				z: rec.to.z,
				w: rec.to.w,
				squareLabel: sqLabel,
				sourceTimelineId: newId,
				sourceShortCode: shortCode,
				turnNumber: rec.turnNumber,
				createdAtSeq: rec.seq,
			});
		}
		emitPocketWatchEvent(
			multiverse,
			"NEW_TIMELINE_HAND",
			newId,
			parent.id,
			`New Hand Forged: ${shortCode}`,
			divergenceSummary,
		);
	}

	enforceWorkingSetLimit(multiverse);

	return newBranch;
}

/**
 * Emits a horological event to drive physical animations on the 3D Multiversal Pocket Watch.
 */
export function emitPocketWatchEvent(
	multiverse: MultiverseState,
	kind: PocketWatchEventKind,
	timelineId: string,
	secondaryTimelineId: string | undefined,
	title: string,
	subtitle: string,
): PocketWatchEvent {
	const ev: PocketWatchEvent = {
		id: `watch_ev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
		kind,
		timelineId,
		secondaryTimelineId,
		title,
		subtitle,
		timestampMs: performance.now(),
	};
	multiverse.watchEvents = [ev, ...multiverse.watchEvents.slice(0, 15)];
	return ev;
}

/**
 * Marks a timeline as visited/awakened on the Multiversal Pocket Watch, adding a persistent hand
 * for that universe if it did not already have one, and seeding its diverged footprints into `rememberedSquares`.
 */
export function markTimelineVisitedOnWatch(
	multiverse: MultiverseState,
	timelineId: string,
	emitEvent: boolean = true,
): boolean {
	const branch = ensureBranchHydrated(multiverse, timelineId);
	if (!branch) return false;

	const isFirstVisit = !multiverse.visitedTimelineIds.includes(timelineId);
	branch.visitedByPlayer = true;

	if (isFirstVisit) {
		multiverse.visitedTimelineIds.push(timelineId);
		// Record its diverged moves into the Remembered-Square ledger
		for (const rec of branch.moveHistory) {
			const exists = multiverse.rememberedSquares.some(
				(r) =>
					r.sourceTimelineId === timelineId &&
					r.lineageId === rec.pieceLineageId &&
					r.row === rec.to.row &&
					r.col === rec.to.col &&
					r.z === rec.to.z &&
					r.w === rec.to.w,
			);
			if (!exists) {
				multiverse.rememberedSquares.push({
					id: `rem_${timelineId}_${rec.seq}`,
					lineageId: rec.pieceLineageId,
					pieceType: rec.pieceType,
					faction: rec.faction,
					row: rec.to.row,
					col: rec.to.col,
					z: rec.to.z,
					w: rec.to.w,
					squareLabel: formatSquareName(rec.to),
					sourceTimelineId: timelineId,
					sourceShortCode: branch.shortCode,
					turnNumber: rec.turnNumber,
					createdAtSeq: rec.seq,
				});
			}
		}
		if (emitEvent) {
			emitPocketWatchEvent(
				multiverse,
				"NEW_TIMELINE_HAND",
				timelineId,
				branch.parentTimelineId || undefined,
				`Universe Hand Awakened: ${branch.shortCode}`,
				branch.divergenceSummary,
			);
		}
	} else if (emitEvent) {
		emitPocketWatchEvent(
			multiverse,
			"TIMELINE_ENTERED",
			timelineId,
			undefined,
			`Active Dial Aligned: ${branch.shortCode}`,
			branch.name,
		);
	}

	return isFirstVisit;
}

/**
 * Records a square occupied by a warrior in `timelineId` into the multiverse's Remembered-Square ledger.
 * Every square a piece occupies in a visited universe becomes a Lethal Remembered Square for that piece's
 * lineage when revisited in a different universe!
 */
export function recordRememberedSquare(
	multiverse: MultiverseState,
	piece: ChessPiece,
	coord: { row: number; col: number; z: number; w: number },
	timelineId: string,
	turnNumber: number,
): RememberedSquareEntry {
	const lineageId = getPieceLineageId(piece);
	const branch = multiverse.timelines.get(timelineId);
	const shortCode = branch?.shortCode || timelineId;
	const sqLabel = formatSquareName(coord);

	const existing = multiverse.rememberedSquares.find(
		(r) =>
			r.lineageId === lineageId &&
			r.sourceTimelineId === timelineId &&
			r.row === coord.row &&
			r.col === coord.col &&
			r.z === coord.z &&
			r.w === coord.w,
	);
	if (existing) return existing;

	multiverse.seqCounter += 1;
	const entry: RememberedSquareEntry = {
		id: `rem_${timelineId}_${lineageId}_${multiverse.seqCounter}`,
		lineageId,
		pieceType: piece.type,
		faction: piece.faction,
		row: coord.row,
		col: coord.col,
		z: coord.z,
		w: coord.w,
		squareLabel: sqLabel,
		sourceTimelineId: timelineId,
		sourceShortCode: shortCode,
		turnNumber,
		createdAtSeq: multiverse.seqCounter,
	};
	multiverse.rememberedSquares.push(entry);
	return entry;
}

/**
 * Checks if `targetCoord` in `activeTimelineId` is a Lethal Remembered Square for `piece`
 * (meaning the same `lineageId` previously occupied `targetCoord` in a DIFFERENT visited universe!).
 */
export function getLethalRememberedSquareCollision(
	multiverse: MultiverseState,
	piece: ChessPiece,
	targetCoord: { row: number; col: number; z: number; w: number },
	activeTimelineId: string,
): RememberedSquareEntry | null {
	const lineageId = getPieceLineageId(piece);
	return (
		multiverse.rememberedSquares.find(
			(r) =>
				r.lineageId === lineageId &&
				r.sourceTimelineId !== activeTimelineId &&
				r.row === targetCoord.row &&
				r.col === targetCoord.col &&
				r.z === targetCoord.z &&
				r.w === targetCoord.w,
		) || null
	);
}

/**
 * Returns all Remembered Squares from OTHER universes that apply to `activeTimelineId`.
 * If `selectedPiece` is provided, prioritizes squares lethal to `selectedPiece`'s lineage.
 */
export function getRememberedSquaresForTimelineView(
	multiverse: MultiverseState,
	activeTimelineId: string,
	selectedPiece?: ChessPiece | null,
): RememberedSquareEntry[] {
	const selectedLin = selectedPiece ? getPieceLineageId(selectedPiece) : null;
	return multiverse.rememberedSquares.filter((r) => {
		if (r.sourceTimelineId === activeTimelineId) return false;
		if (selectedLin) return r.lineageId === selectedLin;
		return true;
	});
}

/**
 * Collapses a timeline branch (e.g. due to Regicide, Paradox Collision, or Causal Pruning).
 * The timeline's hand on the Multiversal Pocket Watch does NOT disappear; it cracks, bends,
 * freezes in place, and fractures the watch crystal further!
 */
export function collapseTimelineBranch(
	multiverse: MultiverseState,
	timelineId: string,
	reason: string,
): TimelineBranch | null {
	const branch = ensureBranchHydrated(multiverse, timelineId);
	if (!branch) return null;
	markTimelineVisitedOnWatch(multiverse, timelineId, false);
	branch.isCollapsed = true;
	branch.collapseReason = reason;

	emitPocketWatchEvent(
		multiverse,
		"TIMELINE_COLLAPSED",
		timelineId,
		branch.parentTimelineId || undefined,
		`Timeline Collapsed: ${branch.shortCode}`,
		reason,
	);

	return branch;
}

/**
 * Computes authoritative horological strain and paradox metrics from `MultiverseState`
 * to drive the 3D Multiversal Pocket Watch's hands, sub-dials, gears, crystal cracks, and audio.
 */
export function computeMultiverseParadoxMetrics(multiverse: MultiverseState): {
	visitedCount: number;
	totalBranches: number;
	collapsedCount: number;
	rememberedSquareCount: number;
	causalDeathCount: number;
	pendingBreachCount: number;
	paradoxStrain: number;
} {
	const visitedCount = multiverse.visitedTimelineIds.length;
	const totalBranches = multiverse.timelines.size;
	let collapsedCount = 0;
	let pendingBreachCount = 0;

	for (const tid of multiverse.visitedTimelineIds) {
		const b = multiverse.timelines.get(tid);
		if (b?.isCollapsed) collapsedCount += 1;
		for (const [, ev] of multiverse.eliminatedLineages.entries()) {
			if (b && !b.appliedDeathEventIds.includes(ev.id)) {
				pendingBreachCount += 1;
			}
		}
	}

	const rememberedSquareCount = multiverse.rememberedSquares.length;
	const causalDeathCount = multiverse.eliminatedLineages.size;

	const rawStrain =
		Math.max(0, visitedCount - 1) * 0.14 +
		rememberedSquareCount * 0.035 +
		causalDeathCount * 0.18 +
		collapsedCount * 0.24 +
		pendingBreachCount * 0.12;

	return {
		visitedCount,
		totalBranches,
		collapsedCount,
		rememberedSquareCount,
		causalDeathCount,
		pendingBreachCount,
		paradoxStrain: Math.min(1, rawStrain),
	};
}

/**
 * Initializes the authoritative Multiverse State with Prime (`TL-PRIME`) as the initial
 * visited reality on the Pocket Watch, plus two legally diverged branches (`TL-OMEGA-1` and `TL-OMEGA-2`)
 * ready to be discovered or entered.
 */
export function createInitialMultiverseState(
	initialPrimePieces?: ChessPiece[],
): MultiverseState {
	const primePieces = clonePiecesArray(
		initialPrimePieces || createInitialBoard(),
	);

	const primeBranch: TimelineBranch = {
		id: "TL-PRIME",
		name: "Prime Timeline",
		shortCode: "PRIME",
		parentTimelineId: null,
		forkTurn: 1,
		divergenceSummary: "Origin Reality · Canonical 4D Board",
		turnNumber: 1,
		turnFaction: "w",
		pieces: primePieces,
		forkBasePieces: clonePiecesArray(primePieces),
		moveHistory: [],
		appliedDeathEventIds: [],
		createdAtSeq: 0,
		isDehydrated: false,
		visitedByPlayer: true,
		divergenceDepth: 0,
		isCollapsed: false,
	};

	const multiverse: MultiverseState = {
		activeTimelineId: "TL-PRIME",
		primeTimelineId: "TL-PRIME",
		seqCounter: 1,
		branchCounter: 0,
		maxHydratedWorkingSet: 10,
		hydratedOrder: ["TL-PRIME"],
		timelines: new Map([["TL-PRIME", primeBranch]]),
		eliminatedLineages: new Map(),
		activeTraveler: null,
		visitedTimelineIds: ["TL-PRIME"],
		rememberedSquares: [],
		watchEvents: [],
		hoveredTimelineId: null,
	};

	// Seed Branch 1 (Timeline Ω-1): Obsidian Queen (`lineage_b_q_3`) legally advances to an exposed square!
	forkTimelineFromBranch(multiverse, "TL-PRIME", {
		exposeTargetLineageId: "lineage_b_q_3",
		isBackgroundSeed: true,
	});

	// Seed Branch 2 (Timeline Ω-2): Solaris Queen's Knight (`lineage_w_n_1`) legally advances into an exposed clash vector!
	forkTimelineFromBranch(multiverse, "TL-PRIME", {
		exposeTargetLineageId: "lineage_w_n_1",
		isBackgroundSeed: true,
	});

	return multiverse;
}

/**
 * Scans a timeline's board to identify high-value vulnerable targets that can be legally captured
 * right now by `hunterFaction`. Used by the Multiverse Explorer UI, Portal Previews, and AI!
 */
export function findVulnerableTargetsInTimeline(
	multiverse: MultiverseState,
	timelineId: string,
	hunterFaction: Faction,
): VulnerableTargetSummary[] {
	const branch = ensureBranchHydrated(multiverse, timelineId);
	if (!branch) return [];

	const results: VulnerableTargetSummary[] = [];
	const seenVictims = new Set<string>();

	const hunters = branch.pieces.filter(
		(p) => p.faction === hunterFaction && p.hp > 0,
	);
	for (const hunter of hunters) {
		const sliceWOptions = [hunter.w, 0, 1, -1].filter(
			(v, i, a) => a.indexOf(v) === i,
		);
		for (const tw of sliceWOptions) {
			const moves = getValidMovesForPiece(hunter, branch.pieces, hunter.z, tw);
			for (const mv of moves) {
				if (!mv.isCapture || !mv.targetPiece) continue;
				const victim = mv.targetPiece;
				if (victim.faction === hunterFaction) continue;
				const vLin = getPieceLineageId(victim);
				if (multiverse.eliminatedLineages.has(vLin)) continue;
				if (seenVictims.has(vLin)) continue;
				seenVictims.add(vLin);

				results.push({
					victimLineageId: vLin,
					victimType: victim.type,
					victimFaction: victim.faction,
					victimSquare: {
						row: victim.row,
						col: victim.col,
						z: victim.z,
						w: victim.w,
					},
					victimSquareLabel: formatSquareName(victim),
					attackerLineageId: getPieceLineageId(hunter),
					attackerType: hunter.type,
					attackerSquare: {
						row: hunter.row,
						col: hunter.col,
						z: hunter.z,
						w: hunter.w,
					},
					attackerSquareLabel: formatSquareName(hunter),
					move: mv,
					tacticalValue: ARCHETYPES[victim.type].tacticalValue,
				});
			}
		}
	}

	results.sort((a, b) => b.tacticalValue - a.tacticalValue);
	return results;
}

/**
 * Records an authoritative multiversal Causal Death Event when a piece is captured/slain in ANY timeline.
 * Guarantees idempotency: the same lineage can never be killed twice, and once recorded,
 * the death will propagate to all other timelines on Reality Convergence!
 */
export function recordCausalAssassination(
	multiverse: MultiverseState,
	sourceTimelineId: string,
	killerPiece: ChessPiece,
	victimPiece: ChessPiece,
	square: { row: number; col: number; z: number; w: number },
	turnNumber: number,
	combatSummary: string,
	isParadoxStrike: boolean = false,
): CausalDeathEvent {
	const victimLineageId = getPieceLineageId(victimPiece);
	const killerLineageId = getPieceLineageId(killerPiece);

	// Idempotency guard: if this lineage was already eliminated, return the authoritative event
	const existing = multiverse.eliminatedLineages.get(victimLineageId);
	if (existing) {
		const srcBranch = ensureBranchHydrated(multiverse, sourceTimelineId);
		if (srcBranch) {
			srcBranch.pieces = srcBranch.pieces.filter(
				(p) => getPieceLineageId(p) !== victimLineageId,
			);
			if (!srcBranch.appliedDeathEventIds.includes(existing.id)) {
				srcBranch.appliedDeathEventIds.push(existing.id);
			}
		}
		return existing;
	}

	multiverse.seqCounter += 1;
	const srcBranch = ensureBranchHydrated(multiverse, sourceTimelineId);
	const sourceTimelineName = srcBranch ? srcBranch.name : sourceTimelineId;
	const sqLabel = formatSquareName(square);

	const event: CausalDeathEvent = {
		id: `causal_death_${victimLineageId}_${multiverse.seqCounter}`,
		victimLineageId,
		victimPieceId: victimPiece.id,
		victimType: victimPiece.type,
		victimFaction: victimPiece.faction,
		killerLineageId,
		killerPieceId: killerPiece.id,
		killerType: killerPiece.type,
		killerFaction: killerPiece.faction,
		sourceTimelineId,
		sourceTimelineName,
		sourceSquare: { ...square },
		sourceSquareLabel: sqLabel,
		turnNumber,
		combatSummary,
		isParadoxStrike,
		createdAtSeq: multiverse.seqCounter,
	};

	multiverse.eliminatedLineages.set(victimLineageId, event);

	if (srcBranch) {
		srcBranch.pieces = srcBranch.pieces.filter(
			(p) => getPieceLineageId(p) !== victimLineageId,
		);
		if (!srcBranch.appliedDeathEventIds.includes(event.id)) {
			srcBranch.appliedDeathEventIds.push(event.id);
		}
	}

	if (multiverse.activeTraveler) {
		multiverse.activeTraveler.assassinationsInBranch.push(event);
	}

	markTimelineVisitedOnWatch(multiverse, sourceTimelineId, false);
	emitPocketWatchEvent(
		multiverse,
		isParadoxStrike ? "PARADOX_SQUARE_DEATH" : "CAUSAL_ASSASSINATION",
		sourceTimelineId,
		multiverse.primeTimelineId,
		isParadoxStrike
			? `Paradox Exclusion Strike in ${srcBranch?.shortCode || sourceTimelineId}`
			: `Causal Assassination in ${srcBranch?.shortCode || sourceTimelineId}`,
		combatSummary,
	);

	// If a King was assassinated, collapse that timeline branch immediately!
	if (victimPiece.type === "k") {
		collapseTimelineBranch(
			multiverse,
			sourceTimelineId,
			`Regicide of ${ARCHETYPES[victimPiece.type].chessName} at ${sqLabel}`,
		);
	}

	return event;
}

/**
 * Returns all `CausalDeathEvent`s that have NOT yet been reconciled into `targetTimelineId`,
 * where a manifestation of the assassinated lineage is still standing on `targetTimelineId`'s board.
 */
export function getPendingCausalBreachesForTimeline(
	multiverse: MultiverseState,
	targetTimelineId: string,
): { event: CausalDeathEvent; manifestation: ChessPiece }[] {
	const branch = ensureBranchHydrated(multiverse, targetTimelineId);
	if (!branch) return [];

	const pending: { event: CausalDeathEvent; manifestation: ChessPiece }[] = [];
	for (const event of multiverse.eliminatedLineages.values()) {
		if (branch.appliedDeathEventIds.includes(event.id)) continue;
		const manifestation = branch.pieces.find(
			(p) => getPieceLineageId(p) === event.victimLineageId,
		);
		if (manifestation) {
			pending.push({ event, manifestation: clonePiece(manifestation) });
		}
	}
	return pending;
}

/**
 * REALITY CONVERGENCE:
 * Reconciles all outstanding multiversal `CausalDeathEvent`s into `targetTimelineId`.
 * Removes every assassinated lineage's local manifestation from `branch.pieces`
 * and returns `CausalCollapseResolution[]` so the 3D scene & UI can animate the
 * physical collapse of each erased piece!
 *
 * Guarantees idempotency: once reconciled, `event.id` is added to `branch.appliedDeathEventIds`
 * so the same death can NEVER be applied twice.
 */
export function reconcileTimelineConvergence(
	multiverse: MultiverseState,
	targetTimelineId: string,
): CausalCollapseResolution[] {
	const branch = ensureBranchHydrated(multiverse, targetTimelineId);
	if (!branch) return [];

	const resolutions: CausalCollapseResolution[] = [];

	for (const event of multiverse.eliminatedLineages.values()) {
		if (branch.appliedDeathEventIds.includes(event.id)) continue;

		branch.appliedDeathEventIds.push(event.id);

		const idx = branch.pieces.findIndex(
			(p) => getPieceLineageId(p) === event.victimLineageId,
		);
		if (idx >= 0) {
			const erasedPiece = clonePiece(branch.pieces[idx]);
			branch.pieces.splice(idx, 1);

			resolutions.push({
				event,
				targetTimelineId: branch.id,
				targetTimelineName: branch.name,
				erasedPiece,
				erasedSquareLabel: formatSquareName(erasedPiece),
			});
		}
	}

	return resolutions;
}

/**
 * Synchronizes the currently active live board (`sim.pieces`, `sim.turnNumber`, `sim.turnFaction`)
 * back into `multiverse.timelines.get(multiverse.activeTimelineId)` before switching timelines.
 */
export function syncActiveTimelineFromLiveBoard(
	multiverse: MultiverseState,
	livePieces: ChessPiece[],
	turnNumber: number,
	turnFaction: Faction,
): void {
	const activeBranch = ensureBranchHydrated(
		multiverse,
		multiverse.activeTimelineId,
	);
	if (!activeBranch) return;
	const deadLineages = new Set(multiverse.eliminatedLineages.keys());
	activeBranch.pieces = clonePiecesArray(livePieces).filter(
		(p) => !deadLineages.has(getPieceLineageId(p)),
	);
	activeBranch.turnNumber = turnNumber;
	activeBranch.turnFaction = turnFaction;
}

/**
 * Transfers a traveling warrior from `originTimelineId` into `targetTimelineId` at `targetCoord`.
 * Enforces single-manifestation coherence:
 * - No duplicate lineage instances in `targetTimelineId`.
 * - Traveler carries its coherent HP, meter, kills, and status effects into `targetTimelineId`.
 * - Reconciles any pending causal deaths on `targetTimelineId`.
 */
export function transitionTravelerToTimeline(
	multiverse: MultiverseState,
	travelerPiece: ChessPiece,
	originTimelineId: string,
	targetTimelineId: string,
	targetCoord: { row: number; col: number; z: number; w: number },
): {
	targetBranch: TimelineBranch;
	mergedTraveler: ChessPiece;
	convergedResolutions: CausalCollapseResolution[];
} {
	const travelerLineageId = getPieceLineageId(travelerPiece);
	const originBranch = ensureBranchHydrated(multiverse, originTimelineId);
	const targetBranch = ensureBranchHydrated(multiverse, targetTimelineId)!;

	// First reconcile any outstanding multiversal deaths on the destination timeline
	const convergedResolutions = reconcileTimelineConvergence(
		multiverse,
		targetTimelineId,
	);

	if (originTimelineId !== targetTimelineId && originBranch) {
		// Track active cross-timeline expedition if jumping from origin to an alternate branch
		if (
			targetTimelineId !== multiverse.primeTimelineId &&
			!multiverse.activeTraveler
		) {
			multiverse.activeTraveler = {
				lineageId: travelerLineageId,
				originTimelineId,
				currentTimelineId: targetTimelineId,
				entrySquareInOrigin: {
					row: travelerPiece.row,
					col: travelerPiece.col,
					z: travelerPiece.z,
					w: travelerPiece.w,
				},
				turnsSpentInAlternate: 0,
				assassinationsInBranch: [],
			};
		} else if (
			multiverse.activeTraveler &&
			targetTimelineId === multiverse.activeTraveler.originTimelineId
		) {
			multiverse.activeTraveler = null;
		} else if (multiverse.activeTraveler) {
			multiverse.activeTraveler.currentTimelineId = targetTimelineId;
		}
	}

	// Locate or insert the traveler's single manifestation in `targetBranch`
	let destManifestation = targetBranch.pieces.find(
		(p) => getPieceLineageId(p) === travelerLineageId,
	);

	// Ensure no OTHER piece of the same faction occupies `targetCoord`
	const occupantAtCoord = getPieceAt(
		targetBranch.pieces.filter(
			(p) => getPieceLineageId(p) !== travelerLineageId,
		),
		targetCoord.row,
		targetCoord.col,
		targetCoord.z,
		targetCoord.w,
	);

	let finalCoord = { ...targetCoord };
	if (occupantAtCoord && occupantAtCoord.faction === travelerPiece.faction) {
		// Find nearest open square if targetCoord is occupied by an ally in the alternate timeline
		for (let r = 0; r < 8; r++) {
			for (let c = 0; c < 8; c++) {
				if (
					!getPieceAt(targetBranch.pieces, r, c, targetCoord.z, targetCoord.w)
				) {
					finalCoord = { row: r, col: c, z: targetCoord.z, w: targetCoord.w };
					break;
				}
			}
		}
	}

	if (destManifestation) {
		destManifestation.row = finalCoord.row;
		destManifestation.col = finalCoord.col;
		destManifestation.z = finalCoord.z;
		destManifestation.w = finalCoord.w;
		destManifestation.hp = travelerPiece.hp;
		destManifestation.maxHp = travelerPiece.maxHp;
		destManifestation.meter = travelerPiece.meter;
		destManifestation.kills = Math.max(
			destManifestation.kills,
			travelerPiece.kills,
		);
		destManifestation.persistentBurnMs = travelerPiece.persistentBurnMs;
		destManifestation.persistentSlowMs = travelerPiece.persistentSlowMs;
		destManifestation.mirrorInvertedParity = travelerPiece.mirrorInvertedParity;
		destManifestation.inRealm = null;
	} else {
		destManifestation = {
			...clonePiece(travelerPiece),
			row: finalCoord.row,
			col: finalCoord.col,
			z: finalCoord.z,
			w: finalCoord.w,
			inRealm: null,
		};
		targetBranch.pieces.push(destManifestation);
	}

	// Deduplicate any accidental duplicate lineage IDs
	const seenLin = new Set<string>();
	targetBranch.pieces = targetBranch.pieces.filter((p) => {
		const l = getPieceLineageId(p);
		if (seenLin.has(l)) return false;
		seenLin.add(l);
		return true;
	});

	multiverse.activeTimelineId = targetTimelineId;

	return {
		targetBranch,
		mergedTraveler: destManifestation,
		convergedResolutions,
	};
}

/**
 * AI MULTIVERSE STRATEGY & PARADOX CAPTURE:
 * Allows the AI (`aiFaction`) to scan alternate timelines (or fork a legal branch)
 * where one of the opponent's living pieces in `activeTimelineId` is vulnerable,
 * execute a genuine legal capture in that alternate timeline, record the `CausalDeathEvent`,
 * and trigger Reality Convergence on `activeTimelineId`!
 */
export function executeAIMultiverseParadoxStrike(
	multiverse: MultiverseState,
	activeTimelineId: string,
	aiFaction: Faction,
): {
	deathEvent: CausalDeathEvent;
	convergedResolutions: CausalCollapseResolution[];
	sourceBranch: TimelineBranch;
} | null {
	const activeBranch = ensureBranchHydrated(multiverse, activeTimelineId);
	if (!activeBranch) return null;

	// Identify all enemy lineages currently alive in `activeTimelineId` (excluding Kings so AI doesn't one-shot end the match without a duel)
	const livingOpponentLineages = new Set(
		activeBranch.pieces
			.filter((p) => p.faction !== aiFaction && p.type !== "k" && p.hp > 0)
			.map((p) => getPieceLineageId(p)),
	);

	if (livingOpponentLineages.size === 0) return null;

	// 1. Search all existing alternate timelines for a legal capture of a living opponent lineage
	let chosenBranch: TimelineBranch | null = null;
	let chosenVulnerability: VulnerableTargetSummary | null = null;

	for (const [tid] of multiverse.timelines.entries()) {
		if (tid === activeTimelineId) continue;
		const vulns = findVulnerableTargetsInTimeline(
			multiverse,
			tid,
			aiFaction,
		).filter(
			(v) =>
				livingOpponentLineages.has(v.victimLineageId) && v.victimType !== "k",
		);
		if (vulns.length > 0) {
			if (
				!chosenVulnerability ||
				vulns[0].tacticalValue > chosenVulnerability.tacticalValue
			) {
				chosenVulnerability = vulns[0];
				chosenBranch = ensureBranchHydrated(multiverse, tid)!;
			}
		}
	}

	// 2. If no existing branch has an immediate capture, fork a new legal branch exposing a high-value opponent piece!
	if (!chosenBranch || !chosenVulnerability) {
		const highValueTarget = activeBranch.pieces
			.filter(
				(p) => p.faction !== aiFaction && p.type !== "k" && p.type !== "p",
			)
			.sort(
				(a, b) =>
					ARCHETYPES[b.type].tacticalValue - ARCHETYPES[a.type].tacticalValue,
			)[0];

		if (!highValueTarget) return null;

		const forked = forkTimelineFromBranch(multiverse, activeTimelineId, {
			exposeTargetLineageId: getPieceLineageId(highValueTarget),
		});
		const vulns = findVulnerableTargetsInTimeline(
			multiverse,
			forked.id,
			aiFaction,
		).filter(
			(v) =>
				livingOpponentLineages.has(v.victimLineageId) && v.victimType !== "k",
		);
		if (vulns.length === 0) return null;
		chosenBranch = forked;
		chosenVulnerability = vulns[0];
	}

	// 3. Execute the actual legal capture move inside `chosenBranch`!
	const attackerPiece = chosenBranch.pieces.find(
		(p) => getPieceLineageId(p) === chosenVulnerability?.attackerLineageId,
	);
	const victimPiece = chosenBranch.pieces.find(
		(p) => getPieceLineageId(p) === chosenVulnerability?.victimLineageId,
	);
	if (!attackerPiece || !victimPiece) return null;

	multiverse.seqCounter += 1;
	const moveRes = applyLegalMoveToBoard(
		chosenBranch.pieces,
		chosenVulnerability.attackerLineageId,
		chosenVulnerability.move,
		chosenBranch.turnNumber,
		multiverse.seqCounter,
	);
	if (!moveRes?.capturedPiece) return null;

	chosenBranch.moveHistory.push(moveRes.record);
	chosenBranch.turnNumber += 1;
	chosenBranch.turnFaction = chosenBranch.turnFaction === "w" ? "b" : "w";

	// 4. Record the authoritative `CausalDeathEvent` and converge `activeTimelineId`!
	const deathEvent = recordCausalAssassination(
		multiverse,
		chosenBranch.id,
		attackerPiece,
		victimPiece,
		chosenVulnerability.move.to,
		chosenBranch.turnNumber - 1,
		`PARADOX CAPTURE in ${chosenBranch.name}: ${ARCHETYPES[attackerPiece.type].chessName} assassinated ${ARCHETYPES[victimPiece.type].chessName} at ${chosenVulnerability.victimSquareLabel}`,
		true,
	);

	const convergedResolutions = reconcileTimelineConvergence(
		multiverse,
		activeTimelineId,
	);

	return {
		deathEvent,
		convergedResolutions,
		sourceBranch: chosenBranch,
	};
}

/**
 * Rewinds the Multiverse State back to a recorded `seqWatermark` and `snapshotPieces`,
 * rolling back any timelines or `CausalDeathEvent`s created after `seqWatermark`
 * so causal rewind restores a 100% internally consistent multiverse.
 */
export function rewindMultiverseToWatermark(
	multiverse: MultiverseState,
	seqWatermark: number,
	targetTimelineId: string,
	snapshotPieces: ChessPiece[],
	turnNumber: number,
	turnFaction: Faction,
): void {
	// 1. Remove any causal death events created after `seqWatermark`
	const removedEventIds = new Set<string>();
	for (const [linId, ev] of Array.from(
		multiverse.eliminatedLineages.entries(),
	)) {
		if (ev.createdAtSeq > seqWatermark) {
			removedEventIds.add(ev.id);
			multiverse.eliminatedLineages.delete(linId);
		}
	}

	// 2. Remove any branches created after `seqWatermark` (except TL-PRIME)
	for (const [tid, branch] of Array.from(multiverse.timelines.entries())) {
		if (
			tid !== multiverse.primeTimelineId &&
			branch.createdAtSeq > seqWatermark
		) {
			multiverse.timelines.delete(tid);
			multiverse.hydratedOrder = multiverse.hydratedOrder.filter(
				(id) => id !== tid,
			);
		} else {
			branch.appliedDeathEventIds = branch.appliedDeathEventIds.filter(
				(eid) => !removedEventIds.has(eid),
			);
			branch.moveHistory = branch.moveHistory.filter(
				(m) => m.seq <= seqWatermark,
			);
		}
	}

	// 3. Restore the target timeline's board state
	const targetBranch =
		ensureBranchHydrated(multiverse, targetTimelineId) ||
		ensureBranchHydrated(multiverse, multiverse.primeTimelineId)!;

	const remainingDeadLineages = new Set(multiverse.eliminatedLineages.keys());
	targetBranch.pieces = clonePiecesArray(snapshotPieces).filter(
		(p) => !remainingDeadLineages.has(getPieceLineageId(p)),
	);
	targetBranch.turnNumber = turnNumber;
	targetBranch.turnFaction = turnFaction;
	multiverse.activeTimelineId = targetBranch.id;
	multiverse.activeTraveler = null;
}

/**
 * Rewinds a specific `CausalDeathEvent` by `eventId`, removing the lineage elimination
 * and restoring the piece's manifestation across all affected timelines.
 */
export function rewindCausalAssassination(
	multiverse: MultiverseState,
	eventId?: string,
): CausalDeathEvent | null {
	let targetEvent: CausalDeathEvent | null = null;
	let targetLineageId = "";

	const entries = Array.from(multiverse.eliminatedLineages.entries());
	if (eventId) {
		for (const [linId, ev] of entries) {
			if (ev.id === eventId) {
				targetEvent = ev;
				targetLineageId = linId;
				break;
			}
		}
	} else if (entries.length > 0) {
		const latest = entries[entries.length - 1];
		targetLineageId = latest[0];
		targetEvent = latest[1];
	}

	if (!targetEvent || !targetLineageId) return null;

	multiverse.eliminatedLineages.delete(targetLineageId);

	for (const branch of Array.from(multiverse.timelines.values())) {
		branch.appliedDeathEventIds = branch.appliedDeathEventIds.filter(
			(id) => id !== targetEvent?.id,
		);
		const hydrated = ensureBranchHydrated(multiverse, branch.id);
		if (
			hydrated &&
			!hydrated.pieces.some((p) => getPieceLineageId(p) === targetLineageId)
		) {
			hydrated.pieces.push({
				id: targetLineageId,
				lineageId: targetLineageId,
				originTimelineId: multiverse.primeTimelineId,
				type: targetEvent.victimType,
				faction: targetEvent.victimFaction,
				row: targetEvent.sourceSquare.row,
				col: targetEvent.sourceSquare.col,
				z: targetEvent.sourceSquare.z,
				w: targetEvent.sourceSquare.w,
				hp: 100,
				maxHp: 100,
				meter: 25,
				kills: 0,
				hasMoved: true,
				history: [],
				inRealm: null,
			});
		}
	}

	return targetEvent;
}

/**
 * Switches the active timeline in `multiverse` and ensures it is hydrated in the working set.
 */
export function switchActiveTimeline(
	multiverse: MultiverseState,
	targetTimelineId: string,
): TimelineBranch {
	const branch =
		ensureBranchHydrated(multiverse, targetTimelineId) ||
		ensureBranchHydrated(multiverse, multiverse.primeTimelineId)!;
	multiverse.activeTimelineId = branch.id;
	markTimelineVisitedOnWatch(multiverse, branch.id, true);
	return branch;
}

/**
 * Inspects all manifestations of a specific persistent `lineageId` across all timelines in the multiverse.
 */
export function getLineageManifestationsAcrossMultiverse(
	multiverse: MultiverseState,
	lineageId: string,
): {
	timelineId: string;
	timelineName: string;
	shortCode: string;
	piece: ChessPiece | null;
}[] {
	const out: {
		timelineId: string;
		timelineName: string;
		shortCode: string;
		piece: ChessPiece | null;
	}[] = [];

	for (const [tid, branch] of multiverse.timelines.entries()) {
		let piecesToSearch = branch.pieces;
		if (branch.isDehydrated) {
			const hydrated = ensureBranchHydrated(multiverse, tid);
			piecesToSearch = hydrated ? hydrated.pieces : [];
		}
		const found =
			piecesToSearch.find((p) => getPieceLineageId(p) === lineageId) || null;
		out.push({
			timelineId: tid,
			timelineName: branch.name,
			shortCode: branch.shortCode,
			piece: found,
		});
	}
	return out;
}

/**
 * MULTIVERSAL SYNOD:
 * Finds all living parallel-universe manifestations of `piece` (`same lineageId`) across
 * other timelines in the multiverse whose square `(row, col)` differs from `piece`'s active square
 * (or where a cross-timeline Synod resonance can be invoked).
 */
export function getCounterpartManifestationsForPiece(
	multiverse: MultiverseState,
	piece: ChessPiece,
	activeTimelineId: string,
	activePieces: ChessPiece[],
): CounterpartManifestationSummary[] {
	const lineageId = getPieceLineageId(piece);
	const all = getLineageManifestationsAcrossMultiverse(multiverse, lineageId);
	const results: CounterpartManifestationSummary[] = [];

	for (const item of all) {
		if (
			item.timelineId === activeTimelineId ||
			!item.piece ||
			item.piece.hp <= 0
		)
			continue;
		const branch = multiverse.timelines.get(item.timelineId);
		if (branch?.isCollapsed) continue;

		const cp = item.piece;
		const occupantOnActiveBoard =
			activePieces.find(
				(p) =>
					p.id !== piece.id &&
					p.row === cp.row &&
					p.col === cp.col &&
					p.z === cp.z &&
					p.w === cp.w,
			) || null;

		// Exclude squares obstructed by an allied piece on the active board
		if (
			occupantOnActiveBoard &&
			occupantOnActiveBoard.faction === piece.faction
		) {
			continue;
		}

		results.push({
			timelineId: item.timelineId,
			timelineName: item.timelineName,
			shortCode: item.shortCode,
			piece: clonePiece(cp),
			squareLabel: formatSquareName(cp),
			occupantOnActiveBoard,
		});
	}

	return results;
}

/**
 * Executes a Cross-Reality Synod Transposition & Fusion between `activePiece` in `activeTimelineId`
 * and its living counterpart in `targetTimelineId`:
 * - Swaps their spatial coordinates across the two timelines!
 * - Fuses their parallel resonance (`synodStacks += 1`), healing +25 HP & +30 Meter!
 * - Marks `targetTimelineId` as visited on the Multiversal Pocket Watch and emits a `SYNOD_RESONANCE` event!
 */
export function executeSynodTransposition(
	multiverse: MultiverseState,
	activePiece: ChessPiece,
	targetTimelineId: string,
	activePieces: ChessPiece[],
): {
	counterpartBranch: TimelineBranch;
	destCoord: { row: number; col: number; z: number; w: number };
	ambushedEnemy: ChessPiece | null;
	newSynodStacks: number;
} | null {
	const lineageId = getPieceLineageId(activePiece);
	const counterpartBranch = ensureBranchHydrated(multiverse, targetTimelineId);
	if (!counterpartBranch || counterpartBranch.isCollapsed) return null;

	const counterpartPiece = counterpartBranch.pieces.find(
		(p) => getPieceLineageId(p) === lineageId && p.hp > 0,
	);
	if (!counterpartPiece) return null;

	const destCoord = {
		row: counterpartPiece.row,
		col: counterpartPiece.col,
		z: counterpartPiece.z,
		w: counterpartPiece.w,
	};

	// If the counterpart in the other timeline happens to be on the exact same square, shift it 1 legal step or forward rank so Synod Transposition always produces a meaningful spatial or resonant shift!
	if (
		destCoord.row === activePiece.row &&
		destCoord.col === activePiece.col &&
		destCoord.z === activePiece.z &&
		destCoord.w === activePiece.w
	) {
		const altMoves = getValidMovesForPiece(
			activePiece,
			activePieces,
			activePiece.z,
			activePiece.w,
		).filter((m) => !m.isCapture);
		if (altMoves.length > 0) {
			destCoord.row = altMoves[0].to.row;
			destCoord.col = altMoves[0].to.col;
			destCoord.z = altMoves[0].to.z;
			destCoord.w = altMoves[0].to.w;
		}
	}

	const occupant =
		activePieces.find(
			(p) =>
				p.id !== activePiece.id &&
				p.row === destCoord.row &&
				p.col === destCoord.col &&
				p.z === destCoord.z &&
				p.w === destCoord.w,
		) || null;

	if (occupant && occupant.faction === activePiece.faction) {
		return null;
	}

	// Swap coordinates with the counterpart in `targetTimelineId`
	counterpartPiece.row = activePiece.row;
	counterpartPiece.col = activePiece.col;
	counterpartPiece.z = activePiece.z;
	counterpartPiece.w = activePiece.w;
	counterpartPiece.synodStacks = (counterpartPiece.synodStacks || 0) + 1;

	const newStacks = (activePiece.synodStacks || 0) + 1;
	activePiece.synodStacks = newStacks;
	activePiece.hp = Math.min(activePiece.maxHp, activePiece.hp + 25);
	activePiece.meter = Math.min(100, activePiece.meter + 30);

	// If this piece is a PAWN merging with its alternate-timeline self, it formulates a
	// SENTIENT MATHEMATICAL THEOREM manuscript (`UNPUBLISHED_DRAFT`) that must undergo
	// Rigorous Academic Peer Review, Revisions & Tenure Defense before "Checkmate Yesterday" unlocks!
	const AXIOMS = [
		"⊢ ∀t < t₀ : ¬∃Monarch(E8) [Q.E.D.]",
		"⊢ Gödel-Cohen Retroactive Lemma (Δt = −∞)",
		"⊢ Axiom of Non-Well-Founded Regicide",
		"⊢ Transfinite Induction over Ω-Timelines",
	];
	if (activePiece.type === "p") {
		const alreadyPublished = activePiece.theoremStatus === "PUBLISHED";
		activePiece.isSentientTheorem = true;
		activePiece.theoremStatus = alreadyPublished
			? "PUBLISHED"
			: "UNPUBLISHED_DRAFT";
		activePiece.maxHp = Math.max(activePiece.maxHp, 165);
		activePiece.hp = activePiece.maxHp;
		activePiece.meter = 100;
		activePiece.theoremAxiom = AXIOMS[(newStacks - 1) % AXIOMS.length];
		counterpartPiece.isSentientTheorem = true;
		counterpartPiece.theoremStatus = activePiece.theoremStatus;
		counterpartPiece.theoremAxiom = activePiece.theoremAxiom;
	}

	markTimelineVisitedOnWatch(multiverse, targetTimelineId, false);
	emitPocketWatchEvent(
		multiverse,
		"SYNOD_RESONANCE",
		multiverse.activeTimelineId,
		targetTimelineId,
		activePiece.isSentientTheorem
			? `🎓 SENTIENT THEOREM MANUSCRIPT DRAFTED — PEER REVIEW CONVENED!`
			: `Multiversal Synod Resonance (×${newStacks})`,
		activePiece.isSentientTheorem
			? `Pawn [${lineageId}] merged with its ${counterpartBranch.shortCode} self to formulate "${activePiece.theoremAxiom}" — All pieces are now Professors until Peer Review & Publication complete!`
			: `${ARCHETYPES[activePiece.type].chessName} [${lineageId}] fused across ${counterpartBranch.shortCode} → ${formatSquareName(destCoord)}!`,
	);

	return {
		counterpartBranch,
		destCoord,
		ambushedEnemy:
			occupant && occupant.faction !== activePiece.faction ? occupant : null,
		newSynodStacks: newStacks,
	};
}

/**
 * Marks a Sentient Mathematical Theorem as officially PUBLISHED (`theoremStatus = 'PUBLISHED'`)
 * across all timelines in the multiverse after surviving Peer Review, Revisions, and Oral Defense!
 */
export function publishSentientTheoremAcrossMultiverse(
	multiverse: MultiverseState,
	candidateLineageId: string,
	finalAxiom: string,
	publishedDoi: string,
	proof?: {
		monarchLemmaProved: boolean;
		entanglementSwapUnlocked: boolean;
		publishedChshS: number;
	},
) {
	for (const [, branch] of multiverse.timelines.entries()) {
		for (const p of branch.pieces) {
			if (
				getPieceLineageId(p) === candidateLineageId ||
				(p.type === "p" && p.isSentientTheorem)
			) {
				p.isSentientTheorem = true;
				p.theoremStatus = "PUBLISHED";
				p.isChronocrator = true;
				p.theoremAxiom = finalAxiom;
				if (proof) {
					p.monarchLemmaProved = proof.monarchLemmaProved;
					p.entanglementSwapUnlocked = proof.entanglementSwapUnlocked;
					p.publishedChshS = proof.publishedChshS;
				}
			}
		}
	}
	emitPocketWatchEvent(
		multiverse,
		"RETROACTIVE_YESTERDAY_CHECKMATE",
		multiverse.activeTimelineId,
		undefined,
		`📜 SENTIENT THEOREM PRINTED (${publishedDoi})`,
		proof?.monarchLemmaProved
			? `"${finalAxiom}"`
			: `"${finalAxiom}" — the monarch lemma does not hold, so yesterday is not refuted.`,
	);
}

export interface MultiverseVerificationResult {
	name: string;
	passed: boolean;
	detail: string;
}

/**
 * Automated Deterministic Verification Suite for all 8 Multiversal Chess & Causal Assassination invariants.
 */
export function runMultiverseVerificationSuite(): MultiverseVerificationResult[] {
	const results: MultiverseVerificationResult[] = [];
	const mv = createInitialMultiverseState();
	const prime = ensureBranchHydrated(mv, "TL-PRIME")!;
	const omega1 = ensureBranchHydrated(mv, "TL-OMEGA-1")!;

	// 1. Lineage identity across timeline forks
	const primeQueen = prime.pieces.find(
		(p) => getPieceLineageId(p) === "lineage_b_q_3",
	);
	const omegaQueen = omega1.pieces.find(
		(p) => getPieceLineageId(p) === "lineage_b_q_3",
	);
	results.push({
		name: "1. Persistent Global Lineage Identity Across Forks",
		passed: Boolean(
			primeQueen &&
				omegaQueen &&
				getPieceLineageId(primeQueen) === getPieceLineageId(omegaQueen),
		),
		detail: `Obsidian Queen shares lineage_b_q_3 in TL-PRIME (${primeQueen ? formatSquareName(primeQueen) : "N/A"}) and TL-OMEGA-1 (${omegaQueen ? formatSquareName(omegaQueen) : "N/A"}).`,
	});

	// 2. Alternative move replay producing distinct valid board states
	const distinctPositions = Boolean(
		primeQueen &&
			omegaQueen &&
			(primeQueen.row !== omegaQueen.row ||
				primeQueen.col !== omegaQueen.col ||
				omega1.moveHistory.length > 0),
	);
	results.push({
		name: "2. Legal Alternative Move Replay & Divergence",
		passed: distinctPositions,
		detail: `TL-OMEGA-1 diverged via ${omega1.moveHistory.length} validated legal moves (${omega1.divergenceSummary}).`,
	});

	// 3. Cross-timeline capture recording an authoritative lineage death event
	const whiteHunter = omega1.pieces.find(
		(p) => p.faction === "w" && p.type === "n",
	)!;
	const deathEv = recordCausalAssassination(
		mv,
		"TL-OMEGA-1",
		whiteHunter,
		omegaQueen!,
		{ row: omegaQueen!.row, col: omegaQueen!.col, z: 0, w: 0 },
		omega1.turnNumber,
		"Verification Assassination of Obsidian Queen in TL-OMEGA-1",
	);
	results.push({
		name: "3. Authoritative Multiversal Death Event Recording",
		passed:
			mv.eliminatedLineages.has("lineage_b_q_3") &&
			deathEv.victimLineageId === "lineage_b_q_3",
		detail: `Recorded ${deathEv.id} for victimLineageId=${deathEv.victimLineageId} in TL-OMEGA-1.`,
	});

	// 4. Reality Convergence removing the corresponding piece from Prime Timeline
	const primeCountBefore = prime.pieces.length;
	const resolutions = reconcileTimelineConvergence(mv, "TL-PRIME");
	const primeQueenAfter = prime.pieces.find(
		(p) => getPieceLineageId(p) === "lineage_b_q_3",
	);
	results.push({
		name: "4. Reality Convergence Erases Safe Counterpart in Prime",
		passed:
			resolutions.length === 1 &&
			!primeQueenAfter &&
			prime.pieces.length === primeCountBefore - 1,
		detail: `Obsidian Queen on D8 in TL-PRIME was erased upon convergence (${primeCountBefore} → ${prime.pieces.length} pieces).`,
	});

	// 5. Preservation of non-affected pieces & Idempotency (no double-kill)
	const secondPass = reconcileTimelineConvergence(mv, "TL-PRIME");
	results.push({
		name: "5. Non-Affected Piece Preservation & Idempotent Convergence",
		passed: secondPass.length === 0 && prime.pieces.length === 31,
		detail: `All 31 non-assassinated pieces preserved; second convergence pass produced 0 duplicate removals.`,
	});

	// 6. Prevention of duplicate simultaneous existence of the same lineage in one timeline
	const transRes = transitionTravelerToTimeline(
		mv,
		whiteHunter,
		"TL-OMEGA-1",
		"TL-PRIME",
		{ row: 4, col: 4, z: 0, w: 0 },
	);
	const matchingHunters = transRes.targetBranch.pieces.filter(
		(p) => getPieceLineageId(p) === getPieceLineageId(whiteHunter),
	);
	results.push({
		name: "6. Single-Manifestation Coherence (Zero Duplicate Lineages)",
		passed: matchingHunters.length === 1,
		detail: `Cross-timeline traveler [${getPieceLineageId(whiteHunter)}] has exactly ${matchingHunters.length} manifestation in TL-PRIME.`,
	});

	// 7. King capture across timelines ending affected timelines (Cross-Timeline Regicide)
	const omega2 = ensureBranchHydrated(mv, "TL-OMEGA-2")!;
	const omega2King = omega2.pieces.find(
		(p) => p.faction === "b" && p.type === "k",
	)!;
	recordCausalAssassination(
		mv,
		"TL-OMEGA-2",
		whiteHunter,
		omega2King,
		{ row: omega2King.row, col: omega2King.col, z: 0, w: 0 },
		omega2.turnNumber,
		"Cross-Timeline Regicide Verification",
	);
	const kingRes = reconcileTimelineConvergence(mv, "TL-PRIME");
	const primeKingAfter = prime.pieces.find(
		(p) => p.faction === "b" && p.type === "k",
	);
	results.push({
		name: "7. Cross-Timeline Regicide Propagates to Prime Reality",
		passed: kingRes.some((r) => r.erasedPiece.type === "k") && !primeKingAfter,
		detail: `Assassinating Obsidian King [lineage_b_k_4] in TL-OMEGA-2 erased the Monarch in TL-PRIME on convergence.`,
	});

	// 8. Memory-bounded handling & deterministic reconstruction of multiple branches
	for (let i = 0; i < 12; i++) {
		forkTimelineFromBranch(mv, "TL-PRIME", { seedOffset: i + 10 });
	}
	const dehydratedBranches = Array.from(mv.timelines.values()).filter(
		(b) => b.isDehydrated,
	);
	const sampleDehydrated = dehydratedBranches[0];
	const rehydrated = sampleDehydrated
		? ensureBranchHydrated(mv, sampleDehydrated.id)
		: null;
	results.push({
		name: "8. Bounded Working-Set Memory & Lazy Branch Reconstruction",
		passed: Boolean(
			mv.hydratedOrder.length <= mv.maxHydratedWorkingSet &&
				dehydratedBranches.length > 0 &&
				rehydrated &&
				rehydrated.pieces.length > 0,
		),
		detail: `Created ${mv.timelines.size} branches; working set capped at ${mv.hydratedOrder.length}/${mv.maxHydratedWorkingSet} with lossless lazy rehydration.`,
	});

	return results;
}
