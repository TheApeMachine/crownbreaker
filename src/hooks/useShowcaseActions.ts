// @ts-nocheck — showcase/demo handlers extracted from App; simRef is loosely typed
import {
	type Dispatch,
	type MutableRefObject,
	type SetStateAction,
	useCallback,
} from "react";
import * as THREE from "three";
import { soundEngine } from "../audio/soundEngine";
import { createInitialAcademicColloquiumState } from "../components/AcademicColloquiumOverlay";
import type { PlayerCombatInputAction } from "../components/CombatHudOverlay";
import { ARCHETYPES } from "../data/archetypes";
import {
	createInitialBoard,
	formatSquareName,
	getValidMovesForPiece,
} from "../engine/chessEngine";
import {
	getFighterSpeedMultiplier,
	triggerFighter4DPhaseShift,
	triggerFighterAttack,
	triggerFighterDash,
	triggerFighterJump,
	triggerFighterTemporalEcho,
	triggerTacticalIntervention,
} from "../engine/combatEngine";
import {
	collapseTimelineBranch,
	createInitialMultiverseState,
	executeSynodTransposition,
	forkTimelineFromBranch,
	recordCausalAssassination,
	recordRememberedSquare,
	switchActiveTimeline,
} from "../engine/multiverseEngine";
import { BOARD_GATEWAYS, REALM_METADATA } from "../engine/realmEngine";
import { boardToWorld } from "../three/arenaBuilder";
import {
	spawnAuraPillar,
	spawnInterventionRift,
	spawnShockwave,
} from "../three/combatAnimator";
import {
	createArticulatedPiece,
	setPieceProfessorMode,
} from "../three/pieceModels";
import { triggerPocketWatchReaction } from "../three/pocketWatchBuilder";
import { syncRealmEntities3D } from "../three/realmBuilder";
import type { CameraPreset } from "../types/appCamera";
import type {
	AcademicColloquiumState,
	BattleLogEntry,
	CausalCollapseResolution,
	ChessPiece,
	CombatCallout,
	Faction,
	FighterRuntime,
	GamePhase,
	MoveOption,
	MultiverseState,
	RealmId,
	TimelineBranch,
} from "../types/game";

export type UseShowcaseActionsParams = {
	// App owns the full mutable sim; handlers only need property access.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	simRef: MutableRefObject<any>;
	watchShowcaseStep: number;
	setAutoPlayDemo: Dispatch<SetStateAction<boolean>>;
	setMultiverseModalOpen: Dispatch<SetStateAction<boolean>>;
	setCodexOpen: Dispatch<SetStateAction<boolean>>;
	setMultiverseState: Dispatch<SetStateAction<MultiverseState>>;
	setSelectedPiece: Dispatch<SetStateAction<ChessPiece | null>>;
	setPhase: Dispatch<SetStateAction<GamePhase>>;
	setAcademicColloquium: Dispatch<
		SetStateAction<AcademicColloquiumState | null>
	>;
	setWatchEventBanner: Dispatch<
		SetStateAction<{ title: string; subtitle: string } | null>
	>;
	setWatchShowcaseStep: Dispatch<SetStateAction<number>>;
	setActiveCollapseBanner: Dispatch<
		SetStateAction<CausalCollapseResolution[] | null>
	>;
	setTimelineBranchLabel: Dispatch<SetStateAction<string>>;
	setActiveSliceW: Dispatch<SetStateAction<number>>;
	setActiveSliceZ: Dispatch<SetStateAction<number>>;
	setTargetMoveW: Dispatch<SetStateAction<number>>;
	setTargetMoveZ: Dispatch<SetStateAction<number>>;
	setRealmTraveler: Dispatch<SetStateAction<ChessPiece | null>>;
	setNearbyPortal: Dispatch<SetStateAction<any>>;
	setNearbyPortalEval: Dispatch<SetStateAction<any>>;
	setRealmStatusBanner: Dispatch<SetStateAction<string | null>>;
	setRealmCrucibleClaimed: Dispatch<SetStateAction<boolean>>;
	setTurnFaction: Dispatch<SetStateAction<Faction>>;
	setTurnNumber: Dispatch<SetStateAction<number>>;
	setWarVictor: Dispatch<
		SetStateAction<{ faction: Faction; reason: string } | null>
	>;
	setKoBanner: Dispatch<
		SetStateAction<{
			title: string;
			subtitle: string;
			wasUpset: boolean;
		} | null>
	>;
	setBattleLogs: Dispatch<SetStateAction<BattleLogEntry[]>>;
	setHudAttacker: Dispatch<SetStateAction<FighterRuntime | null>>;
	setHudDefender: Dispatch<SetStateAction<FighterRuntime | null>>;
	setDemoDirectorStage: Dispatch<SetStateAction<string>>;
	setCameraPreset: Dispatch<SetStateAction<CameraPreset>>;
	setCanRewindTimeline: Dispatch<SetStateAction<boolean>>;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	initiateCombatDuel: (...args: any[]) => void;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	initiateRealmDescent: (...args: any[]) => void;
	executeChessMove: (piece: ChessPiece, move: MoveOption) => void;
	saveTimelineSnapshot: () => void;
	syncActiveBranchFromSim: () => void;
	syncBoardHighlights: () => void;
	addCallout: (c: Omit<CombatCallout, "id" | "createdAt">) => void;
	rebuildSceneRigsForTimeline: (branch: TimelineBranch) => void;
	handleSelect4DSlice: (w: number, z: number, announce?: boolean) => void;
};

export function useShowcaseActions({
	simRef,
	watchShowcaseStep,
	setAutoPlayDemo,
	setMultiverseModalOpen,
	setCodexOpen,
	setMultiverseState,
	setSelectedPiece,
	setPhase,
	setAcademicColloquium,
	setWatchEventBanner,
	setWatchShowcaseStep,
	setActiveCollapseBanner,
	setTimelineBranchLabel,
	setActiveSliceW,
	setActiveSliceZ,
	setTargetMoveW,
	setTargetMoveZ,
	setRealmTraveler,
	setNearbyPortal,
	setNearbyPortalEval,
	setRealmStatusBanner,
	setRealmCrucibleClaimed,
	setTurnFaction,
	setTurnNumber,
	setWarVictor,
	setKoBanner,
	setBattleLogs,
	setHudAttacker,
	setHudDefender,
	setDemoDirectorStage,
	setCameraPreset,
	setCanRewindTimeline,
	initiateCombatDuel,
	initiateRealmDescent,
	executeChessMove,
	saveTimelineSnapshot,
	syncActiveBranchFromSim,
	syncBoardHighlights,
	addCallout,
	rebuildSceneRigsForTimeline,
	handleSelect4DSlice,
}: UseShowcaseActionsParams) {
	const handleCheckmateYesterdayShowcase = useCallback(
		(forceImmediateStrike: boolean = false) => {
			const sim = simRef.current;
			if (sim.phase !== "CHESS_VIEW") return;
			if (!soundEngine.muted) {
				soundEngine.startMusic();
			}

			// 1. Find an existing Sentient Mathematical Theorem on the board, or a selected/available Pawn to merge!
			const theoremPawn =
				sim.pieces.find(
					(p) => p.id === sim.selectedPieceId && p.type === "p",
				) ||
				sim.pieces.find((p) => p.faction === "w" && p.isSentientTheorem) ||
				sim.pieces.find(
					(p) => p.faction === "w" && p.type === "p" && p.col === 4,
				) ||
				sim.pieces.find((p) => p.faction === "w" && p.type === "p");

			if (!theoremPawn) return;

			// If this Pawn hasn't merged with its alternate self yet, merge it now across TL-OMEGA-1 ->
			// The chess universe collapses and we enter the University of Greater Andromeda!
			if (
				!theoremPawn.isSentientTheorem ||
				theoremPawn.theoremStatus !== "PUBLISHED"
			) {
				syncActiveBranchFromSim();
				const altTimelineId =
					sim.multiverse.activeTimelineId === "TL-OMEGA-1"
						? "TL-PRIME"
						: "TL-OMEGA-1";
				let coAuthorCode = "Ω-1";
				if (!theoremPawn.isSentientTheorem) {
					const res = executeSynodTransposition(
						sim.multiverse,
						theoremPawn,
						altTimelineId,
						sim.pieces,
					);
					if (res) {
						coAuthorCode = res.counterpartBranch.shortCode;
					}
					if (res && !res.ambushedEnemy) {
						theoremPawn.row = res.destCoord.row;
						theoremPawn.col = res.destCoord.col;
						theoremPawn.z = res.destCoord.z;
						theoremPawn.w = res.destCoord.w;
						theoremPawn.hasMoved = true;
					} else {
						theoremPawn.isSentientTheorem = true;
						theoremPawn.theoremStatus = "UNPUBLISHED_DRAFT";
						theoremPawn.isChronocrator = true;
						theoremPawn.synodStacks = (theoremPawn.synodStacks || 0) + 1;
						theoremPawn.maxHp = Math.max(theoremPawn.maxHp, 165);
						theoremPawn.hp = theoremPawn.maxHp;
						theoremPawn.meter = 100;
						theoremPawn.theoremAxiom =
							'⊢ "On the Nonexistence of Monarchs in Retrocausal Systems" [UNPUBLISHED]';
					}
				}

				const colState = createInitialAcademicColloquiumState(
					theoremPawn,
					sim.pieces,
					coAuthorCode,
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
					const rig = sim.pieceRigs.get(p.id);
					if (rig) {
						setPieceProfessorMode(rig, true, p.faction);
					}
				}

				sim.uniPlayer.worldX = -10.0;
				sim.uniPlayer.worldZ = -3.2;
				sim.uniPlayer.yaw = 0;
				sim.uniPlayer.targetX = null;
				sim.uniPlayer.targetZ = null;
				sim.uniPlayer.pendingUniInteract = null;
				sim.uniPlayer.pendingInteractX = null;
				sim.uniPlayer.pendingInteractZ = null;
				soundEngine.playOfficeKeyboardClack();
				syncActiveBranchFromSim();
				setMultiverseState({ ...sim.multiverse });
				setSelectedPiece({ ...theoremPawn });
				setPhase("ACADEMIC_SIMULATOR");
				setAcademicColloquium({ ...colState });
				return;
			}

			// 2. Once PUBLISHED (`theoremStatus === 'PUBLISHED'`), execute CHECKMATE_YESTERDAY on the Enemy King!
			const validMoves = getValidMovesForPiece(
				theoremPawn,
				sim.pieces,
				theoremPawn.z,
				theoremPawn.w,
			);
			const checkmateYesterdayMove =
				validMoves.find(
					(m) =>
						m.dimensionType === "CHECKMATE_YESTERDAY" &&
						m.targetPiece?.type === "k",
				) || validMoves.find((m) => m.dimensionType === "CHECKMATE_YESTERDAY");

			if (checkmateYesterdayMove?.targetPiece) {
				if (!forceImmediateStrike && sim.selectedPieceId !== theoremPawn.id) {
					sim.selectedPieceId = theoremPawn.id;
					sim.validMoves = validMoves;
					setSelectedPiece({ ...theoremPawn });
					syncBoardHighlights();
					return;
				}
				soundEngine.playWatchDoomBell(true);
				soundEngine.playSynodResonance(true);
				if (sim.pocketWatchRig) {
					triggerPocketWatchReaction(
						sim.pocketWatchRig,
						0x38bdf8,
						sim.multiverse.activeTimelineId,
						true,
					);
				}
				const targetWorld = boardToWorld(
					checkmateYesterdayMove.to.row,
					checkmateYesterdayMove.to.col,
				);
				if (sim.vfxPool) {
					spawnInterventionRift(
						sim.vfxPool,
						0,
						16.5,
						-14.2,
						targetWorld.x,
						0.9,
						targetWorld.z,
						0x38bdf8,
					);
					spawnShockwave(
						sim.vfxPool,
						targetWorld.x,
						0.15,
						targetWorld.z,
						0xfbbf24,
						7.5,
					);
				}
				setWatchEventBanner({
					title: `⊢ Q.E.D. — CHECKMATING YESTERDAY AT ${formatSquareName(checkmateYesterdayMove.to)}!`,
					subtitle: `${theoremPawn.theoremAxiom} strikes ${ARCHETYPES[checkmateYesterdayMove.targetPiece.type].chessName}'s Turn 1 Yesterday coordinates!`,
				});
				initiateCombatDuel(theoremPawn, checkmateYesterdayMove, false);
			}
		},
		[initiateCombatDuel, syncActiveBranchFromSim, syncBoardHighlights],
	);

	// HOROLOGIUM ASCENSION DUEL: Ascend with a Warrior to Fight Atop the Colossal Multiversal Pocket Watch in the Sky!
	const handleAscendToPocketWatchDuel = useCallback(
		(customChallenger?: ChessPiece) => {
			const sim = simRef.current;
			if (sim.phase !== "CHESS_VIEW") return;
			if (!soundEngine.muted) {
				soundEngine.startMusic();
			}

			const challenger =
				customChallenger ||
				sim.pieces.find((p) => p.id === sim.selectedPieceId) ||
				sim.pieces
					.filter((p) => p.faction === "w" && p.type !== "k")
					.sort(
						(a, b) =>
							ARCHETYPES[b.type].tacticalValue -
							ARCHETYPES[a.type].tacticalValue,
					)[0] ||
				sim.pieces.find((p) => p.faction === "w");

			const opponent =
				sim.pieces
					.filter(
						(p) => p.faction !== (challenger?.faction || "w") && p.type !== "k",
					)
					.sort(
						(a, b) =>
							ARCHETYPES[b.type].tacticalValue -
							ARCHETYPES[a.type].tacticalValue,
					)[0] ||
				sim.pieces.find((p) => p.faction !== (challenger?.faction || "w"));

			if (!challenger || !opponent) return;

			sim.duelOnWatch = true;
			sim.horologiumSweepTimer = 0;

			soundEngine.playSynodResonance(true);
			if (sim.pocketWatchRig) {
				triggerPocketWatchReaction(
					sim.pocketWatchRig,
					0xfbbf24,
					sim.multiverse.activeTimelineId,
					true,
				);
			}

			const watchMove: MoveOption = {
				from: {
					row: challenger.row,
					col: challenger.col,
					z: challenger.z,
					w: challenger.w,
				},
				to: {
					row: opponent.row,
					col: opponent.col,
					z: opponent.z,
					w: opponent.w,
				},
				isCapture: true,
				targetPiece: opponent,
				dimensionType: "WATCH_ASCENSION_DUEL",
				dimensionLabel: "⌚ HOROLOGIUM ASCENSION DUEL ATOP THE POCKET WATCH",
			};

			setWatchEventBanner({
				title: "⌚ ASCENDING TO THE HOROLOGIUM SKY-DIAL!",
				subtitle: `${ARCHETYPES[challenger.type].warriorTitle} vs ${ARCHETYPES[opponent.type].warriorTitle} atop the Colossal Pocket Watch — Victor becomes Chronocrator!`,
			});

			initiateCombatDuel(challenger, watchMove, false, {
				x: 0,
				y: 16.55,
				z: -14.2,
				realmTitle: "THE COLOSSAL POCKET WATCH · HOROLOGIUM DIAL",
			});
		},
		[initiateCombatDuel],
	);

	// Trigger an immediate descent into the Subterranean Realms (cycles between Shattered Mirror, Ashen Crucible, and Echoing Remnant!)
	const handleTriggerRealmShowcase = useCallback(
		(preferredRealm?: RealmId) => {
			const sim = simRef.current;
			if (sim.phase !== "CHESS_VIEW") return;

			const realmsOrder: RealmId[] = [
				"SHATTERED_MIRROR",
				"ASHEN_CRUCIBLE",
				"ECHOING_REMNANT",
			];
			const nextRealm =
				preferredRealm ||
				realmsOrder[
					(realmsOrder.indexOf(sim.realm.currentRealmId) + 1) %
						realmsOrder.length
				];

			const gw =
				BOARD_GATEWAYS.find((g) => g.realmId === nextRealm && g.row >= 4) ||
				BOARD_GATEWAYS.find((g) => g.realmId === nextRealm) ||
				BOARD_GATEWAYS[0];

			const warrior =
				sim.pieces.find((p) => p.faction === "w" && p.type === "n") ||
				sim.pieces.find((p) => p.faction === "w" && p.type === "q") ||
				sim.pieces.find((p) => p.faction === "w");

			if (!warrior) return;
			saveTimelineSnapshot();
			initiateRealmDescent(warrior, gw.id, {
				row: gw.row,
				col: gw.col,
				z: gw.z,
				w: gw.w,
			});
		},
		[initiateRealmDescent, saveTimelineSnapshot],
	);

	// Trigger a 4D Hyper-Space Scenario on the board (shifts pieces into Ana +W and Kata -W so unseen 4D threats & cross-dimensional ambushes appear immediately!)
	const handleTrigger4DHyperScenario = useCallback(() => {
		const sim = simRef.current;
		if (sim.phase !== "CHESS_VIEW") return;

		// Place a Black Rook & Queen in Ana (+W) and Kata (-W) threatening the Prime (W=0) slice,
		// and select a White Knight/Queen ready to execute a 4D Cross-Dimensional Strike or Chrono-Intercept!
		const bRook = sim.pieces.find((p) => p.faction === "b" && p.type === "r");
		const bBishop = sim.pieces.find((p) => p.faction === "b" && p.type === "b");
		const wQueen = sim.pieces.find((p) => p.faction === "w" && p.type === "q");
		const wKnight = sim.pieces.find((p) => p.faction === "w" && p.type === "n");

		if (bRook) {
			bRook.row = 3;
			bRook.col = 3;
			bRook.w = 1; // Lurking in Ana (+W)!
			bRook.z = 0;
			bRook.history.push({ row: 2, col: 3, z: 0, w: 0, turn: sim.turnNumber });
			bRook.history.push({
				row: 3,
				col: 3,
				z: 0,
				w: 1,
				turn: sim.turnNumber + 1,
			});
		}
		if (bBishop) {
			bBishop.row = 3;
			bBishop.col = 5;
			bBishop.w = -1; // Lurking in Kata (-W)!
			bBishop.z = 0;
		}
		if (wKnight) {
			wKnight.row = 5;
			wKnight.col = 4;
			wKnight.w = 0;
			wKnight.z = 0;
		}
		if (wQueen) {
			wQueen.row = 5;
			wQueen.col = 3;
			wQueen.w = 0;
			wQueen.z = 0;
			sim.selectedPieceId = wQueen.id;
			sim.targetMoveW = 1; // Project moves into Ana (+W) to ambush the lurking Rook!
			setTargetMoveW(1);
			sim.validMoves = getValidMovesForPiece(wQueen, sim.pieces, 0, 1);
		}

		soundEngine.playSpecialActivate();
		syncBoardHighlights();
		setBattleLogs((prev) => [
			{
				id: `hyper_${Date.now()}`,
				turnNumber: sim.turnNumber,
				summary: "4D Tesseract Fold Activated!",
				detail:
					"Enemy Rook shifted to Ana (+W) at D5 and Bishop to Kata (-W) at F5! Purple sigils mark Unseen 4D Threats on Prime (W=0). Click D5 to launch a 4D Cross-Slice Ambush!",
				wasUpset: false,
				winnerFaction: "w",
			},
			...prev.slice(0, 7),
		]);
	}, [syncBoardHighlights]);

	// Trigger an immediate canonical board clash (e.g. Pawn vs Queen surrounded by lively spectator pieces!)
	const _handleTriggerFeaturedBoardClash = useCallback(() => {
		const sim = simRef.current;
		if (sim.phase !== "CHESS_VIEW") return;

		for (const p of sim.pieces.filter((x) => x.faction === sim.turnFaction)) {
			const moves = getValidMovesForPiece(p, sim.pieces, p.z, p.w);
			const cap = moves.find((m) => m.isCapture && m.targetPiece);
			if (cap) {
				executeChessMove(p, cap);
				return;
			}
		}

		const whitePawn =
			sim.pieces.find(
				(p) => p.faction === "w" && p.type === "p" && p.col === 4,
			) || sim.pieces.find((p) => p.faction === "w" && p.type === "p");
		const blackQueen = sim.pieces.find(
			(p) => p.faction === "b" && p.type === "q",
		);
		const whiteBishop = sim.pieces.find(
			(p) => p.faction === "w" && p.type === "b",
		);
		const whiteKnight = sim.pieces.find(
			(p) => p.faction === "w" && p.type === "n",
		);
		const blackRook = sim.pieces.find(
			(p) => p.faction === "b" && p.type === "r",
		);

		if (whitePawn && blackQueen) {
			whitePawn.row = 4;
			whitePawn.col = 4;
			whitePawn.w = 0;
			blackQueen.row = 3;
			blackQueen.col = 3;
			blackQueen.w = 0;

			// Position a White Bishop in Ana (+W) along the (5,5)->(3,3) diagonal and a White Knight at (5,2)
			// so the contested square D5 (3,3) has both 4D Cross-Dimensional & Prime Tactical Support ready!
			if (whiteBishop) {
				whiteBishop.row = 5;
				whiteBishop.col = 5;
				whiteBishop.w = 1; // +W Ana Rift supporter!
				whiteBishop.z = 0;
				whiteBishop.meter = Math.max(whiteBishop.meter, 45);
			}
			if (whiteKnight) {
				whiteKnight.row = 5;
				whiteKnight.col = 2;
				whiteKnight.w = 0;
				whiteKnight.z = 0;
				whiteKnight.meter = Math.max(whiteKnight.meter, 40);
			}
			if (blackRook) {
				blackRook.row = 0;
				blackRook.col = 3;
				blackRook.w = 0;
				blackRook.z = 0;
				blackRook.meter = Math.max(blackRook.meter, 35);
			}

			const move: MoveOption = {
				from: { row: 4, col: 4, z: 0, w: 0 },
				to: { row: 3, col: 3, z: 0, w: 0 },
				isCapture: true,
				targetPiece: blackQueen,
				dimensionType: "3D_SLICE",
			};
			initiateCombatDuel(whitePawn, move, false);
		}
	}, [executeChessMove, initiateCombatDuel]);

	// Claim the Hellfire Tempering Anvil in The Ashen Crucible
	const handleTemperAtCrucibleAnvil = useCallback(() => {
		const sim = simRef.current;
		if (
			sim.phase !== "REALM_EXPLORATION" ||
			sim.realm.currentRealmId !== "ASHEN_CRUCIBLE"
		)
			return;
		if (sim.realm.crucibleAnvilClaimed) return;
		const traveler = sim.pieces.find((p) => p.id === sim.realm.travelerPieceId);
		if (!traveler) return;

		sim.realm.crucibleAnvilClaimed = true;
		traveler.meter = Math.min(100, traveler.meter + 40);
		traveler.hp = Math.min(traveler.maxHp, traveler.hp + 15);
		delete traveler.persistentBurnMs;
		soundEngine.playCrucibleHazard(true);

		if (sim.vfxPool) {
			const meta = REALM_METADATA.ASHEN_CRUCIBLE;
			spawnAuraPillar(
				sim.vfxPool,
				meta.worldCenter.x,
				meta.worldCenter.z,
				0xf59e0b,
			);
			spawnShockwave(
				sim.vfxPool,
				meta.worldCenter.x,
				meta.worldCenter.y + 0.2,
				meta.worldCenter.z,
				0xf59e0b,
				7.5,
			);
		}

		setRealmCrucibleClaimed(true);
		setRealmTraveler({ ...traveler });
		setRealmStatusBanner(
			"HELLFIRE ANVIL CLAIMED: +40% METER, +15 HP & DEEP FLANK ASCENT UNLOCKED!",
		);
	}, []);

	// Reset full game
	const handleResetGame = useCallback(() => {
		const sim = simRef.current;
		const scene = sim.arenaRig?.group.parent;

		if (sim.realmsRig) {
			syncRealmEntities3D(sim.realmsRig, [], []);
		}

		sim.pieceRigs.forEach((rig) => {
			rig.root.parent?.remove(rig.root);
		});
		sim.pieceRigs.clear();
		sim.bystanders.clear();
		sim.exhibitionTempRigs = [];

		const freshPieces = createInitialBoard();
		const freshMultiverse = createInitialMultiverseState(freshPieces);
		sim.pieces = freshPieces;
		sim.multiverse = freshMultiverse;
		sim.autoConvergeToPrimeAfterDuel = false;
		sim.activeCollapseResolution = null;
		for (const r of sim.collapseDoomedRigs) {
			r.root.parent?.remove(r.root);
		}
		sim.collapseDoomedRigs = [];
		sim.phase = "CHESS_VIEW";
		sim.turnFaction = "w";
		sim.turnNumber = 1;
		sim.activeSliceW = 0;
		sim.activeSliceZ = 0;
		sim.targetMoveW = 0;
		sim.targetMoveZ = 0;
		sim.selectedPieceId = null;
		sim.validMoves = [];
		sim.pendingMove = null;
		sim.attackerRuntime = null;
		sim.defenderRuntime = null;
		sim.realm.travelerPieceId = null;
		sim.realm.nearbyPortal = null;
		sim.realm.nearbyPortalEval = null;
		sim.realm.steerTargetPortalId = null;
		sim.realm.ascentTargetTimelineId = null;
		sim.duelInRealm = false;
		sim.duelOnWatch = false;
		sim.duelIsAcademicDebate = false;
		sim.academicColloquium = null;
		sim.horologiumSweepTimer = 0;
		sim.activeSentinelId = null;
		sim.duelCenterWorld.set(0, 0, 0);

		if (sim.universityOfficeRig) {
			sim.universityOfficeRig.rootGroup.visible = false;
		}
		if (sim.arenaRig) {
			sim.arenaRig.group.visible = true;
		}
		if (sim.pocketWatchRig) {
			sim.pocketWatchRig.rootGroup.visible = true;
		}
		if (sim.realmsRig) {
			sim.realmsRig.rootGroup.visible = true;
			sim.realmsRig.boardGatewaysGroup.visible = true;
		}

		if (scene) {
			for (const p of freshPieces) {
				const rig = createArticulatedPiece(p.type, p.faction);
				boardToWorld(p.row, p.col, rig.root.position);
				rig.root.rotation.y = p.faction === "w" ? Math.PI : 0;
				scene.add(rig.root);
				sim.pieceRigs.set(p.id, rig);
			}
		}

		if (sim.pocketWatchRig) {
			for (const h of sim.pocketWatchRig.handsMap.values()) {
				sim.pocketWatchRig.handsGroup.remove(h.rootPivot);
			}
			sim.pocketWatchRig.handsMap.clear();
			sim.pocketWatchRig.lastDialSignature = "";
		}
		sim.imminentParadoxWarning = false;

		if (sim.controls) {
			sim.controls.enabled = true;
		}

		setMultiverseState(freshMultiverse);
		setAcademicColloquium(null);
		setWatchShowcaseStep(0);
		setWatchEventBanner(null);
		setActiveCollapseBanner(null);
		setTimelineBranchLabel("TL-PRIME · Prime Reality (α)");
		setActiveSliceW(0);
		setActiveSliceZ(0);
		setTargetMoveW(0);
		setTargetMoveZ(0);
		setRealmTraveler(null);
		setNearbyPortal(null);
		setNearbyPortalEval(null);
		setRealmStatusBanner(null);
		syncBoardHighlights();
		setPhase("CHESS_VIEW");
		setTurnFaction("w");
		setTurnNumber(1);
		setWarVictor(null);
		setKoBanner(null);
		setBattleLogs([
			{
				id: `reset_${Date.now()}`,
				turnNumber: 1,
				summary: "New Multiversal 4D Campaign Initialized",
				detail:
					"All 32 warriors restored to Prime Reality (TL-PRIME) and parallel timelines Ω-1, Δ-2, and Σ-3 reset.",
				wasUpset: false,
				winnerFaction: "w",
			},
		]);
	}, [syncBoardHighlights]);

	// Player combat input handler (including 4D Phase Shift & Temporal Echo Clone!)
	const handlePlayerCombatInput = useCallback(
		(action: PlayerCombatInputAction) => {
			const sim = simRef.current;
			if (sim.phase !== "FIGHT_ACTIVE") return;
			const atk = sim.attackerRuntime;
			const def = sim.defenderRuntime;
			if (!atk || !def) return;

			const human = !atk.isAI ? atk : !def.isAI ? def : atk;

			if (action === "L" || action === "H" || action === "S") {
				triggerFighterAttack(human, action, addCallout);
			} else if (action === "phase_shift_4d") {
				triggerFighter4DPhaseShift(human, addCallout);
			} else if (action === "temporal_echo") {
				triggerFighterTemporalEcho(human, addCallout);
			} else if (action === "jump") {
				triggerFighterJump(human);
			} else if (action === "block_down") {
				if (human.action !== "block") {
					human.lastBlockPressTime = performance.now();
				}
				human.action = "block";
				human.vx = 0;
			} else if (action === "block_up") {
				if (human.action === "block") {
					human.action = "idle";
				}
			} else if (action === "dash_fwd") {
				triggerFighterDash(human, true);
			} else if (action === "dash_back") {
				triggerFighterDash(human, false);
			} else if (action === "left") {
				human.vx = -human.spec.walkSpeed * getFighterSpeedMultiplier(human);
				human.action = human.facing === -1 ? "walk_fwd" : "walk_back";
			} else if (action === "right") {
				human.vx = human.spec.walkSpeed * getFighterSpeedMultiplier(human);
				human.action = human.facing === 1 ? "walk_fwd" : "walk_back";
			}
		},
		[addCallout],
	);

	// TACTICAL INTERVENTION: Execute an intervention from a supporting board piece (for either Human or AI!)
	const executeFighterIntervention = useCallback(
		(caller: FighterRuntime, requestedIndex?: number) => {
			const sim = simRef.current;
			if (sim.phase !== "FIGHT_ACTIVE") return;
			const atk = sim.attackerRuntime;
			const def = sim.defenderRuntime;
			if (!atk || !def) return;

			const opponent = caller === atk ? def : atk;
			const supporter = triggerTacticalIntervention(
				caller,
				requestedIndex,
				sim.pieces,
				addCallout,
			);
			if (!supporter) return;

			sim.activeIntervention = {
				supporter,
				callerIsAttacker: caller === atk,
				timerSec: 0,
				durationSec: 0.72,
				impactApplied: false,
			};

			// Spawn 3D Quantum Rift Portal & Directional Intervention Beam!
			if (sim.vfxPool) {
				const targetFighter = supporter.type === "k" ? caller : opponent;
				const targetWorldX = sim.duelCenterWorld.x + targetFighter.x * 0.72;
				const targetWorldY = 1.05 + targetFighter.y * 0.72;
				const targetWorldZ = sim.duelCenterWorld.z;

				const supRig = sim.pieceRigs.get(supporter.pieceId);
				let originX =
					sim.duelCenterWorld.x + caller.x * 0.72 - caller.facing * 1.4;
				let originY = supporter.isCrossDimensional ? 2.55 : 1.45;
				let originZ = sim.duelCenterWorld.z - 1.1;

				if (!supporter.isCrossDimensional && supRig) {
					originX = supRig.root.position.x;
					originY = Math.max(1.25, supRig.root.position.y + 1.1);
					originZ = supRig.root.position.z;
				}

				spawnInterventionRift(
					sim.vfxPool,
					originX,
					originY,
					originZ,
					targetWorldX,
					targetWorldY,
					targetWorldZ,
					supporter.riftColorHex,
				);
				spawnAuraPillar(sim.vfxPool, originX, originZ, supporter.riftColorHex);
			}

			const sq = formatSquareName({ row: supporter.row, col: supporter.col });
			setBattleLogs((prev) => [
				{
					id: `interv_${Date.now()}`,
					turnNumber: sim.turnNumber,
					summary: `Tactical Intervention: ${ARCHETYPES[supporter.type].chessName} (${sq}) → ${supporter.interventionName}!`,
					detail: `${supporter.vectorLabel} intervened for ${caller.spec.chessName} (-25 Supporter Meter).`,
					wasUpset: false,
					winnerFaction: caller.piece.faction,
				},
				...prev.slice(0, 7),
			]);

			setHudAttacker({ ...atk });
			setHudDefender({ ...def });
		},
		[addCallout],
	);

	const handleTriggerIntervention = useCallback(
		(supporterIndex?: number) => {
			const sim = simRef.current;
			const atk = sim.attackerRuntime;
			const def = sim.defenderRuntime;
			if (!atk || !def) return;
			const human = !atk.isAI ? atk : !def.isAI ? def : atk;
			executeFighterIntervention(human, supporterIndex);
		},
		[executeFighterIntervention],
	);

	const handleSelectSupporter = useCallback((index: number) => {
		const sim = simRef.current;
		const atk = sim.attackerRuntime;
		const def = sim.defenderRuntime;
		if (!atk || !def) return;
		const human = !atk.isAI ? atk : !def.isAI ? def : atk;
		if (index >= 0 && index < human.supporters.length) {
			human.selectedSupporterIndex = index;
			setHudAttacker({ ...atk });
			setHudDefender({ ...def });
		}
	}, []);

	const _handleCycleSupporter = useCallback((delta: number) => {
		const sim = simRef.current;
		const atk = sim.attackerRuntime;
		const def = sim.defenderRuntime;
		if (!atk || !def) return;
		const human = !atk.isAI ? atk : !def.isAI ? def : atk;
		const len = human.supporters.length;
		if (len === 0) return;
		human.selectedSupporterIndex =
			(human.selectedSupporterIndex + delta + len) % len;
		soundEngine.playChessSelect();
		setHudAttacker({ ...atk });
		setHudDefender({ ...def });
	}, []);

	// Toggle Director's Auto-Play / Demo Mode (autonomous 4D chess + AI-vs-AI combat showcase!)
	const handleToggleAutoPlayDemo = useCallback(() => {
		const sim = simRef.current;
		const next = !sim.autoPlayDemo;
		sim.autoPlayDemo = next;
		sim.demoBoardTimer = 0;
		sim.demoCameraTimer = 0;
		sim.demoPendingDecision = null;
		setAutoPlayDemo(next);

		if (next) {
			soundEngine.playQuantumEntangle(false);
			setWarVictor(null);

			// If currently in a duel, set both fighters to AI so they immediately battle autonomously!
			if (sim.attackerRuntime && sim.defenderRuntime) {
				sim.attackerRuntime.isAI = true;
				sim.defenderRuntime.isAI = true;
				setHudAttacker({ ...sim.attackerRuntime });
				setHudDefender({ ...sim.defenderRuntime });
				setDemoDirectorStage(
					"AI-VS-AI SHOWCASE DUEL · 4D PHASE & BOARD INTERVENTION",
				);
			} else if (sim.phase === "CHESS_VIEW") {
				// Stage an immediate 4D tactical configuration if the board has no active captures yet
				// so viewers see 4D Quantum Manifold geometry, Tactical Support coverage, and an explosive duel within ~1 second!
				const hasAnyCapture = sim.pieces
					.filter((p) => p.faction === sim.turnFaction)
					.some((p) =>
						getValidMovesForPiece(p, sim.pieces, p.z, p.w).some(
							(m) => m.isCapture,
						),
					);

				if (!hasAnyCapture) {
					const wPawn = sim.pieces.find(
						(p) => p.faction === "w" && p.type === "p" && p.col === 4,
					);
					const bQueen = sim.pieces.find(
						(p) => p.faction === "b" && p.type === "q",
					);
					const wBishop = sim.pieces.find(
						(p) => p.faction === "w" && p.type === "b",
					);
					const wKnight = sim.pieces.find(
						(p) => p.faction === "w" && p.type === "n",
					);
					const bRook = sim.pieces.find(
						(p) => p.faction === "b" && p.type === "r",
					);

					if (wPawn && bQueen) {
						wPawn.row = 4;
						wPawn.col = 4;
						wPawn.w = 0;
						bQueen.row = 3;
						bQueen.col = 3;
						bQueen.w = 0;
					}
					if (wBishop) {
						wBishop.row = 5;
						wBishop.col = 5;
						wBishop.w = 1; // +W Ana Rift Supporter!
						wBishop.meter = Math.max(wBishop.meter, 50);
					}
					if (wKnight) {
						wKnight.row = 5;
						wKnight.col = 2;
						wKnight.w = 0;
						wKnight.meter = Math.max(wKnight.meter, 45);
					}
					if (bRook) {
						bRook.row = 0;
						bRook.col = 3;
						bRook.w = 0;
						bRook.meter = Math.max(bRook.meter, 45);
					}
					syncBoardHighlights();
				}
				setDemoDirectorStage(
					"4D QUANTUM MANIFOLD · COMPUTING TACTICAL SUPPORT VECTORS",
				);
			}

			setBattleLogs((prev) => [
				{
					id: `demo_on_${Date.now()}`,
					turnNumber: sim.turnNumber,
					summary: "Director's Auto-Play Demo Mode Activated",
					detail:
						'Autonomous 4D Chess + AI-vs-AI Visor Combat & Tactical Intervention showcase active. Click "Take Control" or press [P] anytime!',
					wasUpset: false,
					winnerFaction: sim.turnFaction,
				},
				...prev.slice(0, 7),
			]);
		} else {
			// Restore human control immediately!
			soundEngine.playChessSelect();
			if (sim.controls) {
				sim.controls.autoRotate = false;
			}
			if (sim.attackerRuntime && sim.defenderRuntime) {
				sim.attackerRuntime.isAI =
					sim.gameMode === "vs_ai" && sim.attackerRuntime.piece.faction === "b";
				sim.defenderRuntime.isAI =
					sim.gameMode === "vs_ai" && sim.defenderRuntime.piece.faction === "b";
				setHudAttacker({ ...sim.attackerRuntime });
				setHudDefender({ ...sim.defenderRuntime });
			}
			setBattleLogs((prev) => [
				{
					id: `demo_off_${Date.now()}`,
					turnNumber: sim.turnNumber,
					summary: "Manual Command Restored",
					detail:
						"You now have full control of your warriors on the 4D board and in combat!",
					wasUpset: false,
					winnerFaction: sim.turnFaction,
				},
				...prev.slice(0, 7),
			]);
		}
	}, [syncBoardHighlights]);

	const handleSelectCameraPreset = useCallback((preset: CameraPreset) => {
		setCameraPreset(preset);
		simRef.current.cameraPreset = preset;
		const controls = simRef.current.controls;
		if (!controls) return;
		const cam = controls.object as THREE.PerspectiveCamera;
		if (preset === "white_orbit") {
			cam.position.set(0, 11.5, 11.5);
			controls.target.set(0, 0.3, 0);
		} else if (preset === "top_tactical") {
			cam.position.set(0, 16.5, 2.2);
			controls.target.set(0, 0, 0);
		} else if (preset === "cinematic_angle") {
			cam.position.set(-9.5, 7.5, 9.5);
			controls.target.set(0, 0.5, 0);
		} else if (preset === "pocket_watch") {
			// Tilt upward from the chessboard to frame the Colossal Multiversal Pocket Watch in the sky!
			cam.position.set(0, 5.2, 8.8);
			controls.target.set(0, 16.2, -13.2);
		}
		controls.update();
	}, []);

	const handleHoverTimelineOnWatch = useCallback(
		(timelineId: string | null) => {
			const sim = simRef.current;
			sim.multiverse.hoveredTimelineId = timelineId;
		},
		[],
	);

	// Playable 5-Stage Multiversal Pocket Watch Evolution Showcase (Requirement 11)
	// Drives genuine multiverse state changes while framing the colossal 3D Pocket Watch above the board!
	const handleAdvanceWatchShowcase = useCallback(() => {
		const sim = simRef.current;
		if (sim.phase !== "CHESS_VIEW") return;
		if (!soundEngine.muted) {
			soundEngine.startMusic();
		}

		// Ensure camera is tilted up looking at the Colossal Pocket Watch
		handleSelectCameraPreset("pocket_watch");

		const nextStep = (watchShowcaseStep % 5) + 1;
		setWatchShowcaseStep(nextStep);

		if (nextStep === 1) {
			// Stage 1: Prime Timeline — Simple Watch with 1 Hand, record initial Remembered Square at E4
			const primeBranch = switchActiveTimeline(sim.multiverse, "TL-PRIME");
			const e2Pawn = primeBranch.pieces.find(
				(p) => p.faction === "w" && p.type === "p" && p.col === 4,
			);
			if (e2Pawn) {
				recordRememberedSquare(
					sim.multiverse,
					e2Pawn,
					{ row: 4, col: 4, z: 0, w: 0 },
					"TL-PRIME",
					1,
				);
			}
			rebuildSceneRigsForTimeline(primeBranch);
			soundEngine.playChessSelect();
			setWatchEventBanner({
				title: "STAGE 1/5 · PRIME REALITY (1 HAND ON THE WATCH)",
				subtitle:
					"The watch begins simple over TL-PRIME. Square E4 is recorded in the Remembered-Square ledger.",
			});
		} else if (nextStep === 2) {
			// Stage 2: Enter Timeline Ω-1 -> A 2nd Hand materializes & swings into place!
			const omega1 = switchActiveTimeline(sim.multiverse, "TL-OMEGA-1");
			rebuildSceneRigsForTimeline(omega1);
			soundEngine.playWatchHandForged();
			if (sim.pocketWatchRig) {
				triggerPocketWatchReaction(
					sim.pocketWatchRig,
					0x38bdf8,
					"TL-OMEGA-1",
					false,
				);
			}
			setWatchEventBanner({
				title: "STAGE 2/5 · ENTERED TIMELINE Ω-1 (2ND HAND FORGED)",
				subtitle:
					"Entering Timeline Ω-1 awakens its Astral Cyan hand, unlocks the outer astrolabe ring, and aligns the Center Jewel Beam.",
			});
		} else if (nextStep === 3) {
			// Stage 3: Visit Timeline Ω-2 and Fork Timeline Ω-3 -> 3rd & 4th Hands accumulate!
			switchActiveTimeline(sim.multiverse, "TL-OMEGA-2");
			const omega3 = forkTimelineFromBranch(sim.multiverse, "TL-OMEGA-2", {
				customName: "Timeline Ω-3 (Astral Divergence)",
			});
			const switched = switchActiveTimeline(sim.multiverse, omega3.id);
			rebuildSceneRigsForTimeline(switched);
			soundEngine.playWatchHandForged();
			if (sim.pocketWatchRig) {
				triggerPocketWatchReaction(
					sim.pocketWatchRig,
					0x34d399,
					omega3.id,
					false,
				);
			}
			setWatchEventBanner({
				title: `STAGE 3/5 · ${sim.multiverse.visitedTimelineIds.length} UNIVERSE HANDS & REMEMBERED SQUARES`,
				subtitle: `Visited Ω-2 and forked ${omega3.shortCode}. Multiple hands, memory trails, and 3 orbiting astrolabe rings now track the expanding multiverse.`,
			});
		} else if (nextStep === 4) {
			// Stage 4: Cross-Timeline Causal Assassination -> Victim Hand shudders, Causal Tether Arc forms, Doom Bell tolls!
			const omega1 = switchActiveTimeline(sim.multiverse, "TL-OMEGA-1");
			const killer =
				omega1.pieces.find((p) => p.faction === "w" && p.type === "n") ||
				omega1.pieces[0];
			const victim =
				omega1.pieces.find((p) => p.faction === "b" && p.type === "q") ||
				omega1.pieces.find((p) => p.faction === "b");
			if (killer && victim) {
				recordCausalAssassination(
					sim.multiverse,
					"TL-OMEGA-1",
					killer,
					victim,
					{ row: victim.row, col: victim.col, z: victim.z, w: victim.w },
					omega1.turnNumber,
					`Cross-Timeline Causal Assassination of ${ARCHETYPES[victim.type].chessName} in Ω-1`,
					false,
				);
			}
			rebuildSceneRigsForTimeline(omega1);
			soundEngine.playWatchDoomBell(false);
			if (sim.pocketWatchRig) {
				triggerPocketWatchReaction(
					sim.pocketWatchRig,
					0xf43f5e,
					"TL-OMEGA-1",
					true,
				);
			}
			setWatchEventBanner({
				title: "STAGE 4/5 · CROSS-TIMELINE ASSASSINATION & CAUSAL TETHER",
				subtitle:
					"The Doom Bell tolls, the Ω-1 hand shudders violently, and a crimson 3D Causal Tether Arc links Ω-1 to Prime Reality!",
			});
		} else if (nextStep === 5) {
			// Stage 5: Lethal Remembered-Square Paradox Collision & Timeline Collapse!
			// A warrior in Ω-2 steps onto E4 (remembered from TL-PRIME) -> Fatal Paradox Strike + Timeline Collapse (Hand Cracks & Freezes!)
			const omega2 = switchActiveTimeline(sim.multiverse, "TL-OMEGA-2");
			collapseTimelineBranch(
				sim.multiverse,
				"TL-OMEGA-2",
				"Paradox Exclusion Rupture: Warrior stepped onto Remembered Square E4 from Prime Reality",
			);
			rebuildSceneRigsForTimeline(omega2);
			soundEngine.playWatchDoomBell(true);
			if (sim.pocketWatchRig) {
				triggerPocketWatchReaction(
					sim.pocketWatchRig,
					0xef4444,
					"TL-OMEGA-2",
					true,
				);
			}
			if (sim.vfxPool) {
				const e4World = boardToWorld(4, 4);
				spawnInterventionRift(
					sim.vfxPool,
					0,
					15.5,
					-12.5,
					e4World.x,
					0.8,
					e4World.z,
					0xef4444,
				);
				spawnShockwave(sim.vfxPool, e4World.x, 0.15, e4World.z, 0xef4444, 7.5);
			}
			setWatchEventBanner({
				title: "STAGE 5/5 · LETHAL REMEMBERED SQUARE & BROKEN TIMELINE HAND",
				subtitle:
					"Timeline Ω-2 collapsed from a Remembered-Square Paradox Collision! Its hand on the watch has cracked at a 35° angle, turned to scorched iron, and fractured the crystal face.",
			});
		}

		setMultiverseState({ ...sim.multiverse });
	}, [
		rebuildSceneRigsForTimeline,
		watchShowcaseStep,
		handleSelectCameraPreset,
	]);

	return {
		handleCheckmateYesterdayShowcase,
		handleAscendToPocketWatchDuel,
		handleTriggerRealmShowcase,
		handleTrigger4DHyperScenario,
		handleTemperAtCrucibleAnvil,
		handleResetGame,
		handlePlayerCombatInput,
		executeFighterIntervention,
		handleTriggerIntervention,
		handleSelectSupporter,
		handleToggleAutoPlayDemo,
		handleSelectCameraPreset,
		handleHoverTimelineOnWatch,
		handleAdvanceWatchShowcase,
	};
}
