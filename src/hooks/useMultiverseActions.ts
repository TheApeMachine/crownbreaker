import {
	type Dispatch,
	type MutableRefObject,
	type SetStateAction,
	useCallback,
} from "react";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { soundEngine } from "../audio/soundEngine";
import { createInitialAcademicColloquiumState } from "../components/AcademicColloquiumOverlay";
import { ARCHETYPES } from "../data/archetypes";
import {
	chooseAIMove,
	formatSquareName,
	formatWName,
	getPieceLineageId,
	getValidMovesForPiece,
} from "../engine/chessEngine";
import {
	ensureBranchHydrated,
	executeAIMultiverseParadoxStrike,
	executeSynodTransposition,
	forkTimelineFromBranch,
	getLethalRememberedSquareCollision,
	getPendingCausalBreachesForTimeline,
	reconcileTimelineConvergence,
	recordCausalAssassination,
	recordRememberedSquare,
	rewindCausalAssassination,
	switchActiveTimeline,
	syncActiveTimelineFromLiveBoard,
	transitionTravelerToTimeline,
} from "../engine/multiverseEngine";
import { BOARD_GATEWAYS } from "../engine/realmEngine";
import type { BoardArenaRig } from "../three/arenaBuilder";
import { boardToWorld } from "../three/arenaBuilder";
import type { VFXPool } from "../three/combatAnimator";
import {
	spawnAuraPillar,
	spawnGroundDebris,
	spawnHitSparks,
	spawnInterventionRift,
	spawnShockwave,
} from "../three/combatAnimator";
import {
	type ArticulatedPieceRig,
	createArticulatedPiece,
	setPieceProfessorMode,
} from "../three/pieceModels";
import type { MultiversalPocketWatchRig } from "../three/pocketWatchBuilder";
import { triggerPocketWatchReaction } from "../three/pocketWatchBuilder";
import type {
	AcademicColloquiumState,
	BattleLogEntry,
	CausalCollapseResolution,
	ChessPiece,
	Faction,
	GamePhase,
	MoveOption,
	MultiverseState,
	PieceType,
	TimelineBranch,
} from "../types/game";

export type MultiverseSimRef = {
	phase: GamePhase;
	phaseTimer: number;
	turnFaction: Faction;
	turnNumber: number;
	gameMode: "vs_ai" | "pvp";
	activeSliceW: number;
	activeSliceZ: number;
	targetMoveW: number;
	targetMoveZ: number;
	pieces: ChessPiece[];
	multiverse: MultiverseState;
	autoConvergeToPrimeAfterDuel: boolean;
	activeCollapseResolution: CausalCollapseResolution[] | null;
	collapseDoomedRigs: ArticulatedPieceRig[];
	selectedPieceId: string | null;
	validMoves: MoveOption[];
	exhibitionTempRigs: ArticulatedPieceRig[];
	bystanders: Map<
		string,
		{
			offsetX: number;
			offsetZ: number;
			vx: number;
			vz: number;
			y: number;
			vy: number;
			panickedTimer: number;
		}
	>;
	autoPlayDemo: boolean;
	demoBoardTimer: number;
	demoMovesWithoutCapture: number;
	demoPendingDecision: { piece: ChessPiece; move: MoveOption } | null;
	imminentParadoxWarning: boolean;
	cameraShake: number;
	academicColloquium: AcademicColloquiumState | null;
	pieceRigs: Map<string, ArticulatedPieceRig>;
	arenaRig: BoardArenaRig | null;
	pocketWatchRig: MultiversalPocketWatchRig | null;
	vfxPool: VFXPool | null;
	controls: OrbitControls | null;
};

export type UseMultiverseActionsParams = {
	simRef: MutableRefObject<MultiverseSimRef>;
	setTurnNumber: Dispatch<SetStateAction<number>>;
	setTurnFaction: Dispatch<SetStateAction<Faction>>;
	setActiveSliceW: Dispatch<SetStateAction<number>>;
	setActiveSliceZ: Dispatch<SetStateAction<number>>;
	setTargetMoveW: Dispatch<SetStateAction<number>>;
	setTargetMoveZ: Dispatch<SetStateAction<number>>;
	setTimelineBranchLabel: Dispatch<SetStateAction<string>>;
	setMultiverseState: Dispatch<SetStateAction<MultiverseState>>;
	setPhase: Dispatch<SetStateAction<GamePhase>>;
	setActiveCollapseBanner: Dispatch<
		SetStateAction<CausalCollapseResolution[] | null>
	>;
	setBattleLogs: Dispatch<SetStateAction<BattleLogEntry[]>>;
	setMultiverseModalOpen: Dispatch<SetStateAction<boolean>>;
	setWatchEventBanner: Dispatch<
		SetStateAction<{ title: string; subtitle: string } | null>
	>;
	setAutoPlayDemo: Dispatch<SetStateAction<boolean>>;
	setCodexOpen: Dispatch<SetStateAction<boolean>>;
	setAcademicColloquium: Dispatch<
		SetStateAction<AcademicColloquiumState | null>
	>;
	setSelectedPiece: Dispatch<SetStateAction<ChessPiece | null>>;
	syncBoardHighlights: () => void;
	initiateCombatDuel: (
		attackerPiece: ChessPiece,
		move: MoveOption,
		isExhibition?: boolean,
		inRealmWorldCenter?: {
			x: number;
			y: number;
			z: number;
			realmTitle: string;
			sentinelId?: string;
		},
	) => void;
	initiateRealmDescent: (
		piece: ChessPiece,
		gatewayId: string,
		entryCoord: { row: number; col: number; z: number; w: number },
		autoTargetPortalId?: string,
	) => void;
	saveTimelineSnapshot: () => void;
};

export function useMultiverseActions({
	simRef,
	setTurnNumber,
	setTurnFaction,
	setActiveSliceW,
	setActiveSliceZ,
	setTargetMoveW,
	setTargetMoveZ,
	setTimelineBranchLabel,
	setMultiverseState,
	setPhase,
	setActiveCollapseBanner,
	setBattleLogs,
	setMultiverseModalOpen,
	setWatchEventBanner,
	setAutoPlayDemo,
	setCodexOpen,
	setAcademicColloquium,
	setSelectedPiece,
	syncBoardHighlights,
	initiateCombatDuel,
	initiateRealmDescent,
	saveTimelineSnapshot,
}: UseMultiverseActionsParams) {
	// ============================================================================
	// MULTIVERSAL CHESS, CAUSAL ASSASSINATION & REALITY CONVERGENCE HANDLERS
	// ============================================================================
	const syncActiveBranchFromSim = useCallback(() => {
		const sim = simRef.current;
		syncActiveTimelineFromLiveBoard(
			sim.multiverse,
			sim.pieces,
			sim.turnNumber,
			sim.turnFaction,
		);
	}, []);

	const rebuildSceneRigsForTimeline = useCallback(
		(branch: TimelineBranch) => {
			const sim = simRef.current;
			const scene = sim.arenaRig?.group.parent;

			sim.pieceRigs.forEach((rig) => {
				rig.root.parent?.remove(rig.root);
			});
			sim.pieceRigs.clear();
			sim.bystanders.clear();

			sim.pieces = branch.pieces.map((p) => ({
				...p,
				inRealm: null,
				history: p.history.map((h) => ({ ...h })),
			}));
			sim.turnNumber = branch.turnNumber;
			sim.turnFaction = branch.turnFaction;
			sim.activeSliceW = 0;
			sim.activeSliceZ = 0;
			sim.targetMoveW = 0;
			sim.targetMoveZ = 0;
			sim.selectedPieceId = null;
			sim.validMoves = [];

			if (scene) {
				for (const p of sim.pieces) {
					const rig = createArticulatedPiece(p.type, p.faction);
					boardToWorld(p.row, p.col, rig.root.position);
					rig.root.rotation.y = p.faction === "w" ? Math.PI : 0;
					if (sim.academicColloquium?.active) {
						setPieceProfessorMode(rig, true, p.faction);
					}
					scene.add(rig.root);
					sim.pieceRigs.set(p.id, rig);
					sim.bystanders.set(p.id, {
						offsetX: 0,
						offsetZ: 0,
						vx: 0,
						vz: 0,
						y: 0,
						vy: 0,
						panickedTimer: 0,
					});
				}
			}

			setTurnNumber(branch.turnNumber);
			setTurnFaction(branch.turnFaction);
			setActiveSliceW(sim.activeSliceW);
			setActiveSliceZ(sim.activeSliceZ);
			setTargetMoveW(sim.targetMoveW);
			setTargetMoveZ(sim.targetMoveZ);
			setTimelineBranchLabel(`${branch.id} · ${branch.name}`);
			setMultiverseState({ ...sim.multiverse });
			syncBoardHighlights();
		},
		[syncBoardHighlights],
	);

	// Trigger Reality Convergence: Propagate pending CausalDeathEvents into a target timeline with a 3D Quantum Singularity Collapse!
	const handleTriggerConvergence = useCallback(
		(targetTimelineId: string = "TL-PRIME") => {
			const sim = simRef.current;
			syncActiveBranchFromSim();

			// Switch to the target timeline first so its board and the doomed piece(s) are visible in 3D!
			if (sim.multiverse.activeTimelineId !== targetTimelineId) {
				const targetBranch = switchActiveTimeline(
					sim.multiverse,
					targetTimelineId,
				);
				rebuildSceneRigsForTimeline(targetBranch);
			}

			// Capture the 3D rigs of any pieces about to be erased by causal assassination so we can animate their 3D quantum implosion!
			const pendingBreaches = getPendingCausalBreachesForTimeline(
				sim.multiverse,
				targetTimelineId,
			);
			const doomedRigs: ArticulatedPieceRig[] = [];
			for (const breach of pendingBreaches) {
				const rig = sim.pieceRigs.get(breach.manifestation.id);
				if (rig) {
					doomedRigs.push(rig);
					sim.pieceRigs.delete(breach.manifestation.id);
				}
			}

			const resolutions = reconcileTimelineConvergence(
				sim.multiverse,
				targetTimelineId,
			);
			const updatedBranch =
				ensureBranchHydrated(sim.multiverse, targetTimelineId) ||
				ensureBranchHydrated(sim.multiverse, "TL-PRIME")!;
			sim.pieces = updatedBranch.pieces.map((p) => ({
				...p,
				inRealm: null,
				history: p.history.map((h) => ({ ...h })),
			}));
			setMultiverseState({ ...sim.multiverse });

			if (resolutions.length === 0) {
				for (const r of doomedRigs) {
					r.root.parent?.remove(r.root);
				}
				syncBoardHighlights();
				return;
			}

			// Spawn dramatic 3D Quantum Singularity & Rift VFX at each assassinated piece's square!
			if (sim.vfxPool) {
				for (const res of resolutions) {
					const ep = res.erasedPiece;
					const worldPos = boardToWorld(ep.row, ep.col);
					spawnAuraPillar(sim.vfxPool, worldPos.x, worldPos.z, 0xd946ef);
					spawnShockwave(
						sim.vfxPool,
						worldPos.x,
						0.1,
						worldPos.z,
						0xf43f5e,
						7.5,
					);
					spawnHitSparks(
						sim.vfxPool,
						worldPos.x,
						1.2,
						worldPos.z,
						0xf59e0b,
						32,
					);
					spawnGroundDebris(sim.vfxPool, worldPos.x, worldPos.z, 16);
					spawnInterventionRift(
						sim.vfxPool,
						worldPos.x,
						4.8,
						worldPos.z,
						worldPos.x,
						0.6,
						worldPos.z,
						0xd946ef,
					);
				}
			}

			soundEngine.playKO();
			soundEngine.playQuantumEntangle(true);

			sim.activeCollapseResolution = resolutions;
			sim.collapseDoomedRigs = doomedRigs;
			sim.phase = "CAUSAL_COLLAPSE";
			sim.phaseTimer = 0;
			if (sim.controls) sim.controls.enabled = false;
			setPhase("CAUSAL_COLLAPSE");
			setActiveCollapseBanner(resolutions);

			setBattleLogs((prev) => [
				{
					id: `converge_${Date.now()}`,
					turnNumber: sim.turnNumber,
					summary: `Reality Convergence in ${targetTimelineId}: ${resolutions.length} Counterpart(s) Erased!`,
					detail: resolutions
						.map(
							(r) =>
								`${ARCHETYPES[r.erasedPiece.type].warriorTitle} (${ARCHETYPES[r.erasedPiece.type].chessName}) erased from ${r.erasedSquareLabel} in ${targetTimelineId} [Lineage ${r.event.victimLineageId}]`,
						)
						.join(" · "),
					wasUpset: true,
					winnerFaction: resolutions[0]?.event.killerFaction || "w",
				},
				...prev.slice(0, 7),
			]);
		},
		[rebuildSceneRigsForTimeline, syncActiveBranchFromSim, syncBoardHighlights],
	);

	// Switch active timeline in the Multiverse
	const handleSwitchTimeline = useCallback(
		(targetTimelineId: string) => {
			const sim = simRef.current;
			if (sim.phase !== "CHESS_VIEW") return;
			syncActiveBranchFromSim();

			const wasVisitedBefore =
				sim.multiverse.visitedTimelineIds.includes(targetTimelineId);
			const targetBranch = switchActiveTimeline(
				sim.multiverse,
				targetTimelineId,
			);
			rebuildSceneRigsForTimeline(targetBranch);

			if (sim.vfxPool) {
				spawnShockwave(sim.vfxPool, 0, 0.1, 0, 0xd946ef, 8.5);
			}
			if (!wasVisitedBefore) {
				soundEngine.playWatchHandForged();
			} else {
				soundEngine.playQuantumEntangle(false);
			}

			if (sim.pocketWatchRig) {
				triggerPocketWatchReaction(
					sim.pocketWatchRig,
					wasVisitedBefore ? 0x38bdf8 : 0xfbbf24,
					targetTimelineId,
					false,
				);
			}

			// If switching into a timeline that has unpropagated CausalDeathEvents, automatically converge them!
			const unpropagated = getPendingCausalBreachesForTimeline(
				sim.multiverse,
				targetTimelineId,
			);
			if (unpropagated.length > 0) {
				setTimeout(() => {
					handleTriggerConvergence(targetTimelineId);
				}, 350);
			} else {
				setBattleLogs((prev) => [
					{
						id: `tl_switch_${Date.now()}`,
						turnNumber: targetBranch.turnNumber,
						summary: `Shifted Focus to ${targetBranch.id} (${targetBranch.name})`,
						detail: `${targetBranch.divergenceSummary} · Solaris ${targetBranch.pieces.filter((p) => p.faction === "w").length} vs Obsidian ${targetBranch.pieces.filter((p) => p.faction === "b").length}`,
						wasUpset: false,
						winnerFaction: targetBranch.turnFaction,
					},
					...prev.slice(0, 7),
				]);
			}
		},
		[
			handleTriggerConvergence,
			rebuildSceneRigsForTimeline,
			syncActiveBranchFromSim,
		],
	);

	// Fork a brand-new independent timeline branch from any existing timeline
	const handleForkTimeline = useCallback(
		(sourceTimelineId: string, exposeTargetLineageId?: string) => {
			const sim = simRef.current;
			syncActiveBranchFromSim();

			const newBranch = forkTimelineFromBranch(
				sim.multiverse,
				sourceTimelineId,
				exposeTargetLineageId ? { exposeTargetLineageId } : undefined,
			);
			const switched = switchActiveTimeline(sim.multiverse, newBranch.id);
			rebuildSceneRigsForTimeline(switched);
			soundEngine.playWatchHandForged();

			if (sim.pocketWatchRig) {
				triggerPocketWatchReaction(
					sim.pocketWatchRig,
					0xfbbf24,
					newBranch.id,
					false,
				);
			}
			if (sim.vfxPool) {
				spawnShockwave(sim.vfxPool, 0, 0.12, 0, 0x38bdf8, 9.0);
			}

			setBattleLogs((prev) => [
				{
					id: `fork_${Date.now()}`,
					turnNumber: newBranch.turnNumber,
					summary: `Forked New Reality ${newBranch.id} — New Hand Forged on Cosmic Watch!`,
					detail: newBranch.divergenceSummary,
					wasUpset: false,
					winnerFaction: newBranch.turnFaction,
				},
				...prev.slice(0, 7),
			]);
		},
		[rebuildSceneRigsForTimeline, syncActiveBranchFromSim],
	);

	// Send a piece directly into an alternate timeline
	const handleDeployPieceToTimeline = useCallback(
		(pieceId: string, targetTimelineId: string) => {
			const sim = simRef.current;
			const sel = sim.pieces.find((p) => p.id === pieceId);
			if (!sel) return;

			syncActiveBranchFromSim();

			const deployRes = transitionTravelerToTimeline(
				sim.multiverse,
				sel,
				sim.multiverse.activeTimelineId,
				targetTimelineId,
				{ row: sel.row, col: sel.col, z: sel.z, w: sel.w },
			);

			const targetBranch = switchActiveTimeline(
				sim.multiverse,
				targetTimelineId,
			);
			rebuildSceneRigsForTimeline(targetBranch);
			sim.selectedPieceId = deployRes.mergedTraveler.id;
			sim.validMoves = getValidMovesForPiece(
				deployRes.mergedTraveler,
				sim.pieces,
				deployRes.mergedTraveler.z,
				deployRes.mergedTraveler.w,
			);
			syncBoardHighlights();
			soundEngine.playRealmPortalTransition(false);

			setBattleLogs((prev) => [
				{
					id: `deploy_${Date.now()}`,
					turnNumber: targetBranch.turnNumber,
					summary: `Cross-Timeline Incursion: ${ARCHETYPES[deployRes.mergedTraveler.type].chessName} Entered ${targetTimelineId}!`,
					detail: `${ARCHETYPES[deployRes.mergedTraveler.type].warriorTitle} [Lineage ${getPieceLineageId(deployRes.mergedTraveler)}] materialized at ${formatSquareName(deployRes.mergedTraveler)} in ${targetBranch.name}.`,
					wasUpset: false,
					winnerFaction: deployRes.mergedTraveler.faction,
				},
				...prev.slice(0, 7),
			]);
		},
		[rebuildSceneRigsForTimeline, syncActiveBranchFromSim, syncBoardHighlights],
	);

	// Rewind the latest Causal Assassination across the Multiverse
	const handleRewindLastAssassination = useCallback(() => {
		const sim = simRef.current;
		rewindCausalAssassination(sim.multiverse);
		const activeBranch =
			ensureBranchHydrated(sim.multiverse, sim.multiverse.activeTimelineId) ||
			ensureBranchHydrated(sim.multiverse, "TL-PRIME")!;
		rebuildSceneRigsForTimeline(activeBranch);
		soundEngine.playQuantumEntangle(true);
		setBattleLogs((prev) => [
			{
				id: `cp_restore_${Date.now()}`,
				turnNumber: activeBranch.turnNumber,
				summary: `Multiverse Causality Rewound`,
				detail: `Latest cross-timeline Causal Assassination revoked and piece lineages restored.`,
				wasUpset: false,
				winnerFaction: "w",
			},
			...prev.slice(0, 7),
		]);
	}, [rebuildSceneRigsForTimeline]);

	// 1-Click Guided Causal Assassination Showcase:
	// Shifts into Timeline Ω-1 where the Obsidian Queen (lineage_b_q_3) is exposed at F6,
	// launches the Solaris Knight's capture duel against her, and automatically converges her death back into Prime Reality (D8)!
	const handleTriggerGuidedAssassinationDemo = useCallback(() => {
		const sim = simRef.current;
		if (sim.phase !== "CHESS_VIEW") return;
		setMultiverseModalOpen(false);
		syncActiveBranchFromSim();

		const omegaBranch = switchActiveTimeline(sim.multiverse, "TL-OMEGA-1");
		rebuildSceneRigsForTimeline(omegaBranch);

		const exposedQueen = sim.pieces.find(
			(p) => p.faction === "b" && p.type === "q",
		);
		const strikerKnight =
			sim.pieces.find(
				(p) =>
					p.faction === "w" && p.type === "n" && p.row === 4 && p.col === 4,
			) || sim.pieces.find((p) => p.faction === "w" && p.type === "n");

		if (exposedQueen && strikerKnight) {
			exposedQueen.row = 2;
			exposedQueen.col = 5; // F6 exposed!
			exposedQueen.z = 0;
			exposedQueen.w = 0;
			exposedQueen.hp = Math.min(exposedQueen.hp, 75);

			strikerKnight.row = 4;
			strikerKnight.col = 4; // E4 poised to strike F6!
			strikerKnight.z = 0;
			strikerKnight.w = 0;
			strikerKnight.hp = strikerKnight.maxHp;
			strikerKnight.meter = 100;

			sim.autoConvergeToPrimeAfterDuel = true;

			const assassinateMove: MoveOption = {
				from: { row: 4, col: 4, z: 0, w: 0 },
				to: { row: 2, col: 5, z: 0, w: 0 },
				isCapture: true,
				targetPiece: exposedQueen,
				dimensionType: "3D_SLICE",
				dimensionLabel: "CAUSAL ASSASSINATION IN TIMELINE Ω-1",
			};

			initiateCombatDuel(strikerKnight, assassinateMove, false);
		}
	}, [
		initiateCombatDuel,
		rebuildSceneRigsForTimeline,
		syncActiveBranchFromSim,
	]);

	// Execute a non-capture chess move (including 4D Hyper-Shifts & Subterranean Gateway Descents!) or trigger a capture duel
	const executeChessMove = useCallback(
		(piece: ChessPiece, move: MoveOption) => {
			const sim = simRef.current;

			if (piece.faction === "w") {
				saveTimelineSnapshot();
			}

			// If this move enters a Subterranean Gateway (or traverses a realm portal), descend into the 3D Realm!
			if (
				(move.dimensionType === "REALM_GATEWAY_DESCENT" ||
					move.dimensionType === "REALM_PORTAL_TRAVERSAL") &&
				move.gatewayId
			) {
				const gw =
					BOARD_GATEWAYS.find((g) => g.id === move.gatewayId) ||
					BOARD_GATEWAYS[0];
				initiateRealmDescent(
					piece,
					gw.id,
					{ row: gw.row, col: gw.col, z: gw.z, w: gw.w },
					move.exitGatewayId,
				);
				return;
			}

			if (move.isCapture && move.targetPiece) {
				initiateCombatDuel(piece, move, false);
				return;
			}

			// Check if `move.to` is a LETHAL REMEMBERED SQUARE from another universe for this piece's lineage!
			const lethalRememberedCollision = getLethalRememberedSquareCollision(
				sim.multiverse,
				piece,
				move.to,
				sim.multiverse.activeTimelineId,
			);

			// Record both the origin square and destination square into the Multiverse's Remembered-Square Ledger
			recordRememberedSquare(
				sim.multiverse,
				piece,
				move.from,
				sim.multiverse.activeTimelineId,
				sim.turnNumber,
			);
			recordRememberedSquare(
				sim.multiverse,
				piece,
				move.to,
				sim.multiverse.activeTimelineId,
				sim.turnNumber + 1,
			);

			soundEngine.playChessMove();
			const prevW = piece.w;
			const prevZ = piece.z;
			piece.row = move.to.row;
			piece.col = move.to.col;
			piece.z = move.to.z;
			piece.w = move.to.w;
			piece.hasMoved = true;
			piece.meter = Math.min(
				100,
				piece.meter + (prevW !== piece.w || prevZ !== piece.z ? 14 : 8),
			);
			piece.history.push({
				row: piece.row,
				col: piece.col,
				z: piece.z,
				w: piece.w,
				turn: sim.turnNumber + 1,
			});

			// If this warrior stepped onto its own Remembered Square from a prior universe:
			// - If crowned `isChronocrator` or fused with `synodStacks >= 2`, they HARVEST THE PARADOX SQUARE instead of dying!
			// - Otherwise -> LETHAL PARADOX COLLISION!
			if (
				lethalRememberedCollision &&
				(piece.isChronocrator || (piece.synodStacks && piece.synodStacks >= 2))
			) {
				const sqLabel = formatSquareName(move.to);
				sim.multiverse.rememberedSquares =
					sim.multiverse.rememberedSquares.filter(
						(r) => r.id !== lethalRememberedCollision.id,
					);
				piece.hp = Math.min(piece.maxHp, piece.hp + 25);
				piece.meter = Math.min(100, piece.meter + 35);
				piece.synodStacks = (piece.synodStacks || 0) + 1;

				soundEngine.playSynodResonance(true);
				if (sim.pocketWatchRig) {
					triggerPocketWatchReaction(
						sim.pocketWatchRig,
						0xfbbf24,
						sim.multiverse.activeTimelineId,
						true,
					);
				}
				const worldTarget = boardToWorld(move.to.row, move.to.col);
				if (sim.vfxPool) {
					spawnAuraPillar(sim.vfxPool, worldTarget.x, worldTarget.z, 0xfbbf24);
					spawnShockwave(
						sim.vfxPool,
						worldTarget.x,
						0.15,
						worldTarget.z,
						0x38bdf8,
						5.5,
					);
				}
				setWatchEventBanner({
					title: `⌚ CHRONOCRATOR PARADOX HARVEST AT ${sqLabel}!`,
					subtitle: `${ARCHETYPES[piece.type].chessName} absorbed its Remembered Square from ${lethalRememberedCollision.sourceShortCode} (+25 HP, +35% Meter, Synod ×${piece.synodStacks})!`,
				});
			} else if (lethalRememberedCollision) {
				const sqLabel = formatSquareName(move.to);
				const deathEv = recordCausalAssassination(
					sim.multiverse,
					sim.multiverse.activeTimelineId,
					piece,
					piece,
					move.to,
					sim.turnNumber + 1,
					`LETHAL REMEMBERED SQUARE: ${ARCHETYPES[piece.type].chessName} stepped onto ${sqLabel} (previously occupied in ${lethalRememberedCollision.sourceShortCode})!`,
					true,
				);

				soundEngine.playWatchDoomBell(true);
				if (sim.pocketWatchRig) {
					triggerPocketWatchReaction(
						sim.pocketWatchRig,
						0xef4444,
						sim.multiverse.activeTimelineId,
						true,
					);
				}

				const worldTarget = boardToWorld(move.to.row, move.to.col);
				if (sim.vfxPool) {
					// Strike a bolt of crimson-gold temporal lightning from the Pocket Watch in the sky down onto the square!
					spawnInterventionRift(
						sim.vfxPool,
						0,
						15.5,
						-12.5,
						worldTarget.x,
						0.8,
						worldTarget.z,
						0xef4444,
					);
					spawnAuraPillar(sim.vfxPool, worldTarget.x, worldTarget.z, 0xef4444);
					spawnShockwave(
						sim.vfxPool,
						worldTarget.x,
						0.15,
						worldTarget.z,
						0xfbbf24,
						6.5,
					);
				}

				// Remove the doomed piece from the live board and play its Causal Collapse disintegration!
				const doomedRig = sim.pieceRigs.get(piece.id);
				const doomedList: ArticulatedPieceRig[] = [];
				if (doomedRig) {
					boardToWorld(piece.row, piece.col, doomedRig.root.position);
					doomedList.push(doomedRig);
					sim.pieceRigs.delete(piece.id);
				}
				sim.pieces = sim.pieces.filter((p) => p.id !== piece.id);

				const activeBranch = ensureBranchHydrated(
					sim.multiverse,
					sim.multiverse.activeTimelineId,
				);
				const resolution: CausalCollapseResolution = {
					event: deathEv,
					targetTimelineId: sim.multiverse.activeTimelineId,
					targetTimelineName:
						activeBranch?.name || sim.multiverse.activeTimelineId,
					erasedPiece: piece,
					erasedSquareLabel: sqLabel,
				};

				sim.selectedPieceId = null;
				sim.validMoves = [];
				sim.imminentParadoxWarning = false;
				sim.activeCollapseResolution = [resolution];
				sim.collapseDoomedRigs = doomedList;
				sim.phase = "CAUSAL_COLLAPSE";
				sim.phaseTimer = 0;
				sim.cameraShake = 0.65;
				setActiveCollapseBanner([resolution]);
				setPhase("CAUSAL_COLLAPSE");
				setWatchEventBanner({
					title: `THE WATCH REMEMBERS SQUARE ${sqLabel}!`,
					subtitle: `${ARCHETYPES[piece.type].chessName} occupied ${sqLabel} in ${lethalRememberedCollision.sourceShortCode} — Paradox Exclusion Fatal Strike!`,
				});
				syncActiveBranchFromSim();
				setMultiverseState({ ...sim.multiverse });
				return;
			}

			if (prevW !== piece.w || prevZ !== piece.z) {
				const sq = formatSquareName(move.to);
				const shiftEntry: BattleLogEntry = {
					id: `shift_${Date.now()}`,
					turnNumber: sim.turnNumber,
					summary: `4D Hyper-Shift: ${ARCHETYPES[piece.type].chessName} → ${sq} [${formatWName(piece.w)}]`,
					detail: `${ARCHETYPES[piece.type].warriorTitle} shifted along the 4th spatial axis from ${formatWName(prevW)} to ${formatWName(piece.w)}!`,
					wasUpset: false,
					winnerFaction: piece.faction,
				};
				setBattleLogs((prev) => [shiftEntry, ...prev.slice(0, 7)]);
			}

			// Check Pawn Promotion on reaching far rank
			if (move.isPromotion && piece.type === "p") {
				piece.type = "q";
				piece.maxHp = ARCHETYPES.q.maxHp;
				piece.hp = ARCHETYPES.q.maxHp;
				const oldRig = sim.pieceRigs.get(piece.id);
				if (oldRig?.root.parent) {
					const parent = oldRig.root.parent;
					parent.remove(oldRig.root);
					const newRig = createArticulatedPiece("q", piece.faction);
					boardToWorld(piece.row, piece.col, newRig.root.position);
					newRig.root.rotation.y = piece.faction === "w" ? Math.PI : 0;
					parent.add(newRig.root);
					sim.pieceRigs.set(piece.id, newRig);
				}
			}

			sim.selectedPieceId = null;
			sim.validMoves = [];
			sim.demoPendingDecision = null;
			sim.demoBoardTimer = 0;
			sim.demoMovesWithoutCapture += 1;
			syncBoardHighlights();

			const nextFaction: Faction = sim.turnFaction === "w" ? "b" : "w";
			sim.turnFaction = nextFaction;
			sim.turnNumber += 1;
			syncActiveBranchFromSim();
			setMultiverseState({ ...sim.multiverse });
			setTurnFaction(nextFaction);
			setTurnNumber(sim.turnNumber);

			if (
				!sim.autoPlayDemo &&
				sim.gameMode === "vs_ai" &&
				nextFaction === "b"
			) {
				setTimeout(() => {
					const currentSim = simRef.current;
					if (
						currentSim.autoPlayDemo ||
						currentSim.phase !== "CHESS_VIEW" ||
						currentSim.turnFaction !== "b"
					)
						return;

					// Check if AI can execute a cross-timeline Multiverse Paradox Strike (after Turn 4 with 25% tactical probability)
					if (currentSim.turnNumber >= 4 && Math.random() < 0.25) {
						const paradoxStrike = executeAIMultiverseParadoxStrike(
							currentSim.multiverse,
							currentSim.multiverse.activeTimelineId,
							"b",
						);
						if (paradoxStrike) {
							// Advance turn and trigger Reality Convergence on the player's active timeline!
							currentSim.turnFaction = "w";
							currentSim.turnNumber += 1;
							syncActiveBranchFromSim();
							setTurnFaction("w");
							setTurnNumber(currentSim.turnNumber);
							handleTriggerConvergence(currentSim.multiverse.activeTimelineId);
							return;
						}
					}

					const aiDecision = chooseAIMove(currentSim.pieces, "b");
					if (aiDecision) {
						executeChessMove(aiDecision.piece, aiDecision.move);
					}
				}, 650);
			}
		},
		[
			handleTriggerConvergence,
			initiateCombatDuel,
			initiateRealmDescent,
			saveTimelineSnapshot,
			syncActiveBranchFromSim,
			syncBoardHighlights,
		],
	);

	// Instant Exhibition Duel from anywhere
	const handleLaunchExhibitionDuel = useCallback(
		(attackerType: PieceType, defenderType: PieceType) => {
			const sim = simRef.current;
			for (const rig of sim.exhibitionTempRigs) {
				rig.root.parent?.remove(rig.root);
			}
			sim.exhibitionTempRigs = [];

			const atkSpec = ARCHETYPES[attackerType];
			const defSpec = ARCHETYPES[defenderType];

			const tempAtk: ChessPiece = {
				id: `exhib_w_${Date.now()}`,
				type: attackerType,
				faction: "w",
				row: 4,
				col: 3,
				z: 0,
				w: 0,
				hp: atkSpec.maxHp,
				maxHp: atkSpec.maxHp,
				meter: 50,
				kills: 0,
				hasMoved: true,
				history: [{ row: 4, col: 3, z: 0, w: 0, turn: 1 }],
			};

			const tempDef: ChessPiece = {
				id: `exhib_b_${Date.now()}`,
				type: defenderType,
				faction: "b",
				row: 4,
				col: 4,
				z: 0,
				w: 0,
				hp: defSpec.maxHp,
				maxHp: defSpec.maxHp,
				meter: 50,
				kills: 0,
				hasMoved: true,
				history: [{ row: 4, col: 4, z: 0, w: 0, turn: 1 }],
			};

			if (sim.arenaRig) {
				const scene = sim.arenaRig.group.parent;
				if (scene) {
					const rigA = createArticulatedPiece(attackerType, "w");
					const rigB = createArticulatedPiece(defenderType, "b");
					boardToWorld(4, 3, rigA.root.position);
					boardToWorld(4, 4, rigB.root.position);
					scene.add(rigA.root, rigB.root);
					sim.pieceRigs.set(tempAtk.id, rigA);
					sim.pieceRigs.set(tempDef.id, rigB);
					sim.exhibitionTempRigs.push(rigA, rigB);
				}
			}

			const exhibMove: MoveOption = {
				from: { row: 4, col: 3, z: 0, w: 0 },
				to: { row: 4, col: 4, z: 0, w: 0 },
				isCapture: true,
				targetPiece: tempDef,
				dimensionType: "3D_SLICE",
			};

			initiateCombatDuel(tempAtk, exhibMove, true);
		},
		[initiateCombatDuel],
	);

	// MULTIVERSAL SYNOD: Quantum-Swap & Fuse Selected Warrior with its Living Counterpart in another Timeline!
	const handleSynodTranspose = useCallback(
		(targetTimelineId: string) => {
			const sim = simRef.current;
			if (sim.phase !== "CHESS_VIEW") return;
			const sel = sim.pieces.find((p) => p.id === sim.selectedPieceId);
			if (!sel) return;

			syncActiveBranchFromSim();
			const res = executeSynodTransposition(
				sim.multiverse,
				sel,
				targetTimelineId,
				sim.pieces,
			);
			if (!res) return;

			soundEngine.playSynodResonance(false);
			if (sim.pocketWatchRig) {
				triggerPocketWatchReaction(
					sim.pocketWatchRig,
					0xfbbf24,
					targetTimelineId,
					false,
				);
			}

			const fromCoord = { row: sel.row, col: sel.col, z: sel.z, w: sel.w };
			const worldDest = boardToWorld(res.destCoord.row, res.destCoord.col);
			if (sim.vfxPool) {
				spawnInterventionRift(
					sim.vfxPool,
					0,
					16.5,
					-14.2,
					worldDest.x,
					0.9,
					worldDest.z,
					0xfbbf24,
				);
				spawnAuraPillar(sim.vfxPool, worldDest.x, worldDest.z, 0x38bdf8);
			}

			if (res.ambushedEnemy) {
				const synodAmbushMove: MoveOption = {
					from: fromCoord,
					to: res.destCoord,
					isCapture: true,
					targetPiece: res.ambushedEnemy,
					dimensionType: "SYNOD_TRANSPOSITION",
					dimensionLabel: `✦ SYNOD CROSS-REALITY AMBUSH (${res.counterpartBranch.shortCode})`,
				};
				initiateCombatDuel(sel, synodAmbushMove, false);
				return;
			}

			sel.row = res.destCoord.row;
			sel.col = res.destCoord.col;
			sel.z = res.destCoord.z;
			sel.w = res.destCoord.w;
			sel.hasMoved = true;
			sel.history.push({
				row: sel.row,
				col: sel.col,
				z: sel.z,
				w: sel.w,
				turn: sim.turnNumber + 1,
			});

			const sq = formatSquareName(res.destCoord);

			// If a Pawn just merged with its alternate-timeline self to formulate a Sentient Mathematical Theorem,
			// the 4D Chess Universe COLLAPSES and leaves the chess world entirely — transitioning into the standalone
			// University of Greater Andromeda 6-Year Academic Life Simulator as Dr. Pawn!
			if (sel.isSentientTheorem && sel.theoremStatus === "UNPUBLISHED_DRAFT") {
				const colState = createInitialAcademicColloquiumState(
					sel,
					sim.pieces,
					res.counterpartBranch.shortCode,
				);
				sim.academicColloquium = colState;
				sim.phase = "ACADEMIC_SIMULATOR";
				sim.autoPlayDemo = false;
				setAutoPlayDemo(false);
				setMultiverseModalOpen(false);
				setCodexOpen(false);
				if (sim.controls) {
					sim.controls.enabled = false;
				}
				for (const p of sim.pieces) {
					const r = sim.pieceRigs.get(p.id);
					if (r) {
						setPieceProfessorMode(r, true, p.faction);
					}
				}
				setPhase("ACADEMIC_SIMULATOR");
				setAcademicColloquium({ ...colState });
			}

			setWatchEventBanner({
				title: sel.isSentientTheorem
					? `🌧️ REALITY COLLAPSE — WELCOME TO THE UNIVERSITY OF GREATER ANDROMEDA`
					: `✦ MULTIVERSAL SYNOD RESONANCE (×${res.newSynodStacks})`,
				subtitle: sel.isSentientTheorem
					? `The chessboard is gone. You are now Dr. Pawn, an untenured researcher at the University of Greater Andromeda.`
					: `${ARCHETYPES[sel.type].chessName} transposed with its ${res.counterpartBranch.shortCode} self → ${sq} (+25 HP, +30% Meter & Synod L-Leaps Unlocked)!`,
			});
			setBattleLogs((prev) => [
				{
					id: `synod_${Date.now()}`,
					turnNumber: sim.turnNumber,
					summary: sel.isSentientTheorem
						? `🌧️ The Chess Universe Dissolved: Entered the University of Greater Andromeda as Dr. Pawn`
						: `Multiversal Synod (×${res.newSynodStacks}): ${ARCHETYPES[sel.type].chessName} Transposed via ${res.counterpartBranch.shortCode} → ${sq}!`,
					detail: sel.isSentientTheorem
						? `Room 4B, Peano Hall. Rain against the windows. A coffee machine that hasn't worked since 1987. Six years of academic struggle begin.`
						: `Fused parallel-universe resonance with ${res.counterpartBranch.name} (+25 HP, +30% Meter, Synod L-Leaps & Triad Combat Strikes).`,
					wasUpset: false,
					winnerFaction: sel.faction,
				},
				...prev.slice(0, 7),
			]);

			sim.validMoves = getValidMovesForPiece(sel, sim.pieces, sel.z, sel.w);
			syncActiveBranchFromSim();
			setMultiverseState({ ...sim.multiverse });
			setSelectedPiece({ ...sel });
			syncBoardHighlights();
		},
		[initiateCombatDuel, syncActiveBranchFromSim, syncBoardHighlights],
	);

	return {
		syncActiveBranchFromSim,
		rebuildSceneRigsForTimeline,
		handleTriggerConvergence,
		handleSwitchTimeline,
		handleForkTimeline,
		handleDeployPieceToTimeline,
		handleRewindLastAssassination,
		handleTriggerGuidedAssassinationDemo,
		executeChessMove,
		handleLaunchExhibitionDuel,
		handleSynodTranspose,
	};
}
