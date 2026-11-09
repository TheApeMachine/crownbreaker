import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { soundEngine } from "./audio/soundEngine";
import { AcademicColloquiumOverlay } from "./components/AcademicColloquiumOverlay";
import { AutoPlayDemoBanner } from "./components/AutoPlayDemoBanner";
import { CausalCollapseOverlay } from "./components/CausalCollapseOverlay";
import { ChessBottomControlDock } from "./components/ChessBottomControlDock";
import { ChessViewChronicleStrip } from "./components/ChessViewChronicleStrip";
import { CodexModal } from "./components/CodexModal";
import { CombatHudOverlay } from "./components/CombatHudOverlay";
import { GameTopHeader } from "./components/GameTopHeader";
import { MultiverseModal } from "./components/MultiverseModal";
import { RealmHudOverlay } from "./components/RealmHudOverlay";
import { WarVictoryModal } from "./components/WarVictoryModal";
import { createInitialBoard } from "./engine/chessEngine";
import { createInitialMultiverseState } from "./engine/multiverseEngine";
import type { PortalBoardExitEvaluation } from "./engine/realmEngine";
import { useAcademicColloquiumActions } from "./hooks/useAcademicColloquiumActions";
import { useBoardCombatActions } from "./hooks/useBoardCombatActions";
import { useMultiverseActions } from "./hooks/useMultiverseActions";
import { useShowcaseActions } from "./hooks/useShowcaseActions";
import { useWebGLGameLoop } from "./hooks/useWebGLGameLoop";
import type { BoardArenaRig } from "./three/arenaBuilder";
import type { VFXPool } from "./three/combatAnimator";
import type {
	ArticulatedPieceRig,
	FirstPersonViewmodelRig,
} from "./three/pieceModels";
import type { MultiversalPocketWatchRig } from "./three/pocketWatchBuilder";
import type { SubterraneanRealmsRig } from "./three/realmBuilder";
import type { UniversityOfficeRig } from "./three/universityOfficeBuilder";
import type { BystanderPhysics, CameraPreset } from "./types/appCamera";
import type {
	AcademicColloquiumState,
	ActiveInterventionState,
	BattleLogEntry,
	CausalCollapseResolution,
	ChessPiece,
	CombatCallout,
	Faction,
	FighterAction,
	FighterRuntime,
	GamePhase,
	MoveOption,
	MultiverseState,
	RealmEnemySentinel,
	RealmId,
	RealmPortalNode,
	RealmTemporalEcho,
	TimelineSnapshot,
	UnseenThreatVector,
} from "./types/game";

// Pre-allocated math helpers at module scope (Zero GC in render loop)
const _vec3A = new THREE.Vector3();
const _camTargetPos = new THREE.Vector3();
const _camLookTarget = new THREE.Vector3();

export default function App() {
	const canvasMountRef = useRef<HTMLDivElement | null>(null);

	// React UI state synchronized with mutable engine ref
	const [phase, setPhase] = useState<GamePhase>("CHESS_VIEW");
	const [turnFaction, setTurnFaction] = useState<Faction>("w");
	const [turnNumber, setTurnNumber] = useState<number>(1);
	const [_gameMode, _setGameMode] = useState<"vs_ai" | "pvp">("vs_ai");
	const [cameraPreset, setCameraPreset] = useState<CameraPreset>("white_orbit");
	const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);
	const [muted, setMuted] = useState<boolean>(false);
	const [codexOpen, setCodexOpen] = useState<boolean>(false);
	const [autoPlayDemo, setAutoPlayDemo] = useState<boolean>(false);
	const [demoDirectorStage, setDemoDirectorStage] = useState<string>(
		"4D QUANTUM MANIFOLD & TACTICAL COVERAGE",
	);

	// 4D Hypercube Slice State: Which 3D slice (Z, W) the player is currently observing,
	// and which target 4D slice the selected piece is projecting moves into!
	const [activeSliceW, setActiveSliceW] = useState<number>(0); // -1 = Kata, 0 = Prime, +1 = Ana
	const [activeSliceZ, setActiveSliceZ] = useState<number>(0); // 0 = Ground, 1 = Astral
	const [targetMoveW, setTargetMoveW] = useState<number>(0);
	const [targetMoveZ, setTargetMoveZ] = useState<number>(0);
	const [unseenThreats, setUnseenThreats] = useState<UnseenThreatVector[]>([]);
	const [canRewindTimeline, setCanRewindTimeline] = useState<boolean>(false);
	const [timelineBranchLabel, setTimelineBranchLabel] =
		useState<string>("Timeline Prime (α)");

	// Multiversal Chess, Causal Assassination & Reality Convergence State
	const initialBoardRef = useRef<ChessPiece[] | null>(null);
	if (!initialBoardRef.current) {
		initialBoardRef.current = createInitialBoard();
	}
	const initialMultiverseRef = useRef<MultiverseState | null>(null);
	if (!initialMultiverseRef.current) {
		initialMultiverseRef.current = createInitialMultiverseState(
			initialBoardRef.current,
		);
	}
	const [multiverseState, setMultiverseState] = useState<MultiverseState>(
		() => initialMultiverseRef.current!,
	);
	const [multiverseModalOpen, setMultiverseModalOpen] =
		useState<boolean>(false);
	const [activeCollapseBanner, setActiveCollapseBanner] = useState<
		CausalCollapseResolution[] | null
	>(null);
	const [watchShowcaseStep, setWatchShowcaseStep] = useState<number>(0);
	const [watchEventBanner, setWatchEventBanner] = useState<{
		title: string;
		subtitle: string;
	} | null>(null);
	const [academicColloquium, setAcademicColloquium] =
		useState<AcademicColloquiumState | null>(null);

	// Subterranean Realms UI State
	const [activeRealmId, setActiveRealmId] =
		useState<RealmId>("SHATTERED_MIRROR");
	const [realmTraveler, setRealmTraveler] = useState<ChessPiece | null>(null);
	const [realmParityInverted, setRealmParityInverted] =
		useState<boolean>(false);
	const [realmCrucibleClaimed, setRealmCrucibleClaimed] =
		useState<boolean>(false);
	const [nearbyPortal, setNearbyPortal] = useState<RealmPortalNode | null>(
		null,
	);
	const [nearbyPortalEval, setNearbyPortalEval] =
		useState<PortalBoardExitEvaluation | null>(null);
	const [realmStatusBanner, setRealmStatusBanner] = useState<string | null>(
		null,
	);

	const [selectedPiece, setSelectedPiece] = useState<ChessPiece | null>(null);
	const [hoveredCaptureMove, _setHoveredCaptureMove] =
		useState<MoveOption | null>(null);
	const [battleLogs, setBattleLogs] = useState<BattleLogEntry[]>([
		{
			id: "init",
			turnNumber: 1,
			summary:
				"Multiverse Nexus, 4D Hypercube & Subterranean Realms Initialized",
			detail:
				"4 Parallel Realities active! Enter Timeline Ω-1 to assassinate the exposed Obsidian Queen and converge her death back into Prime Reality!",
			wasUpset: false,
			winnerFaction: "w",
		},
	]);

	// HUD snapshot state during combat
	const [hudAttacker, setHudAttacker] = useState<FighterRuntime | null>(null);
	const [hudDefender, setHudDefender] = useState<FighterRuntime | null>(null);
	const [fightTimer, setFightTimer] = useState<number>(60);
	const [duelSquareName, setDuelSquareName] = useState<string>("E4");
	const [introShotIndex, setIntroShotIndex] = useState<number>(-1);
	const [combatCameraMode, setCombatCameraMode] = useState<
		"first_person" | "side_arena"
	>("first_person");
	const [uniFirstPerson, setUniFirstPerson] = useState<boolean>(false);
	const [freeMouseLook, setFreeMouseLook] = useState<boolean>(false);
	const [callouts, setCallouts] = useState<CombatCallout[]>([]);
	const [koBanner, setKoBanner] = useState<{
		title: string;
		subtitle: string;
		wasUpset: boolean;
	} | null>(null);
	const [warVictor, setWarVictor] = useState<{
		faction: Faction;
		reason: string;
	} | null>(null);

	// Mutable simulation state stored in ref so WebGL loop never tears down
	const simRef = useRef<{
		phase: GamePhase;
		phaseTimer: number;
		introShotIndex: number;
		combatCameraMode: "first_person" | "side_arena";
		currentDutchRoll: number;
		turnFaction: Faction;
		turnNumber: number;
		gameMode: "vs_ai" | "pvp";
		cameraPreset: CameraPreset;
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
		pendingMove: MoveOption | null;
		isExhibitionDuel: boolean;
		exhibitionTempRigs: ArticulatedPieceRig[];
		attackerRuntime: FighterRuntime | null;
		defenderRuntime: FighterRuntime | null;
		prevAtkAction: FighterAction;
		prevDefAction: FighterAction;
		bystanders: Map<string, BystanderPhysics>;
		duelCenterWorld: THREE.Vector3;
		duelInRealm: boolean;
		duelOnWatch: boolean;
		duelIsAcademicDebate: boolean;
		academicColloquium: AcademicColloquiumState | null;
		horologiumSweepTimer: number;
		activeSentinelId: string | null;
		fightTimer: number;
		cameraShake: number;
		hitstopTimer: number;
		slowMoTimer: number;
		activeIntervention: ActiveInterventionState | null;
		autoPlayDemo: boolean;
		demoBoardTimer: number;
		demoCameraTimer: number;
		demoMovesWithoutCapture: number;
		demoPendingDecision: { piece: ChessPiece; move: MoveOption } | null;
		timelineSnapshots: TimelineSnapshot[];
		timelineBranchCount: number;
		keysHeld: Record<string, boolean>;
		pieceRigs: Map<string, ArticulatedPieceRig>;
		firstPersonRig: FirstPersonViewmodelRig | null;
		fpMountGroup: THREE.Group | null;
		arenaRig: BoardArenaRig | null;
		realmsRig: SubterraneanRealmsRig | null;
		pocketWatchRig: MultiversalPocketWatchRig | null;
		universityOfficeRig: UniversityOfficeRig | null;
		imminentParadoxWarning: boolean;
		vfxPool: VFXPool | null;
		controls: OrbitControls | null;
		currentLookAt: THREE.Vector3;
		realm: {
			travelerPieceId: string | null;
			entryGatewayId: string;
			currentRealmId: RealmId;
			localPos: THREE.Vector3;
			velocity: THREE.Vector3;
			yaw: number;
			isParityInverted: boolean;
			crucibleAnvilClaimed: boolean;
			echoes: RealmTemporalEcho[];
			sentinels: RealmEnemySentinel[];
			nearbyPortal: RealmPortalNode | null;
			nearbyPortalEval: PortalBoardExitEvaluation | null;
			steerTargetPortalId: string | null;
			portalCooldownSec: number;
			hazardCooldownSec: number;
			attackAnimTimerSec: number;
			dashTimerSec: number;
			ascentTargetCoord: {
				row: number;
				col: number;
				z: number;
				w: number;
			} | null;
			ascentTargetEnemy: ChessPiece | null;
			ascentPortalName: string;
			ascentTargetTimelineId: string | null;
		};
		uniPlayer: {
			worldX: number;
			worldZ: number;
			yaw: number;
			targetX: number | null;
			targetZ: number | null;
		};
		uniCar: {
			worldX: number;
			worldZ: number;
			yaw: number;
			speed: number;
			isDriving: boolean;
		};
		uniTransit: {
			isRiding: boolean;
			destinationStationId: string | null;
			transitTimer: number;
		};
		mouseLook: {
			isDragging: boolean;
			freeLookActive: boolean;
			lastPointerX: number;
			lastPointerY: number;
			uniCamYaw: number;
			uniCamPitch: number;
			uniCamDistance: number;
			uniFirstPerson: boolean;
			fightLookYaw: number;
			fightLookPitch: number;
			fightCamDistOffset: number;
			realmCamYawOffset: number;
			realmCamPitch: number;
			realmCamDistance: number;
		};
	}>({
		phase: "CHESS_VIEW",
		phaseTimer: 0,
		introShotIndex: -1,
		combatCameraMode: "first_person",
		currentDutchRoll: 0,
		turnFaction: "w",
		turnNumber: 1,
		gameMode: "vs_ai",
		cameraPreset: "white_orbit",
		activeSliceW: 0,
		activeSliceZ: 0,
		targetMoveW: 0,
		targetMoveZ: 0,
		pieces: initialBoardRef.current,
		multiverse: initialMultiverseRef.current,
		autoConvergeToPrimeAfterDuel: false,
		activeCollapseResolution: null,
		collapseDoomedRigs: [],
		selectedPieceId: null,
		validMoves: [],
		pendingMove: null,
		isExhibitionDuel: false,
		exhibitionTempRigs: [],
		attackerRuntime: null,
		defenderRuntime: null,
		prevAtkAction: "idle",
		prevDefAction: "idle",
		bystanders: new Map(),
		duelCenterWorld: new THREE.Vector3(0, 0, 0),
		duelInRealm: false,
		duelOnWatch: false,
		duelIsAcademicDebate: false,
		academicColloquium: null,
		horologiumSweepTimer: 0,
		activeSentinelId: null,
		fightTimer: 60,
		cameraShake: 0,
		hitstopTimer: 0,
		slowMoTimer: 0,
		activeIntervention: null,
		autoPlayDemo: false,
		demoBoardTimer: 0,
		demoCameraTimer: 0,
		demoMovesWithoutCapture: 0,
		demoPendingDecision: null,
		timelineSnapshots: [],
		timelineBranchCount: 0,
		keysHeld: {},
		pieceRigs: new Map(),
		firstPersonRig: null,
		fpMountGroup: null,
		arenaRig: null,
		realmsRig: null,
		pocketWatchRig: null,
		universityOfficeRig: null,
		uniPlayer: {
			worldX: -10.0,
			worldZ: -3.2,
			yaw: 0,
			targetX: null as number | null,
			targetZ: null as number | null,
		},
		uniCar: {
			worldX: -6.0,
			worldZ: 14.5,
			yaw: 0,
			speed: 0,
			isDriving: false,
		},
		uniTransit: {
			isRiding: false,
			destinationStationId: null as string | null,
			transitTimer: 0,
		},
		mouseLook: {
			isDragging: false,
			freeLookActive: false,
			lastPointerX: 0,
			lastPointerY: 0,
			uniCamYaw: 0,
			uniCamPitch: 0.42,
			uniCamDistance: 6.2,
			uniFirstPerson: false,
			fightLookYaw: 0,
			fightLookPitch: 0,
			fightCamDistOffset: 0,
			realmCamYawOffset: 0,
			realmCamPitch: 0.42,
			realmCamDistance: 5.8,
		},
		imminentParadoxWarning: false,
		vfxPool: null,
		controls: null,
		currentLookAt: new THREE.Vector3(0, 0.4, 0),
		realm: {
			travelerPieceId: null,
			entryGatewayId: "gw_mirror_c6",
			currentRealmId: "SHATTERED_MIRROR",
			localPos: new THREE.Vector3(0, 0, 10),
			velocity: new THREE.Vector3(0, 0, 0),
			yaw: 0,
			isParityInverted: false,
			crucibleAnvilClaimed: false,
			echoes: [],
			sentinels: [],
			nearbyPortal: null,
			nearbyPortalEval: null,
			steerTargetPortalId: null,
			portalCooldownSec: 0,
			hazardCooldownSec: 0,
			attackAnimTimerSec: 0,
			dashTimerSec: 0,
			ascentTargetCoord: null,
			ascentTargetEnemy: null,
			ascentPortalName: "",
			ascentTargetTimelineId: null,
		},
	});

	const saveTimelineSnapshot = useCallback(() => {
		const sim = simRef.current;
		const clonedPieces: ChessPiece[] = sim.pieces.map((p) => ({
			...p,
			inRealm: null,
			history: p.history.map((h) => ({ ...h })),
		}));
		const branches = ["α", "β", "γ", "δ", "ε", "ζ"];
		const branchSym = branches[sim.timelineBranchCount % branches.length];
		sim.timelineSnapshots.push({
			turnNumber: sim.turnNumber,
			turnFaction: sim.turnFaction,
			branchName: `Timeline ${branchSym}`,
			pieces: clonedPieces,
		});
		if (sim.timelineSnapshots.length > 12) {
			sim.timelineSnapshots.shift();
		}
		setCanRewindTimeline(sim.timelineSnapshots.length > 0);
	}, []);

	// Spacetime Causality Rewind (Δt - 1): Fork a parallel timeline branch and restore prior board & realm state!
	const {
		handleChronoRewind,
		handleEntangleSelectedPiece,
		handleToggleCombatCameraMode,
		addCallout,
		syncBoardHighlights,
		handleSelect4DSlice,
		initiateCombatDuel,
		initiateRealmDescent,
		handleTraverseRealmPortal,
		handleSteerTowardPortal,
		handleRealmAction,
	} = useBoardCombatActions({
		simRef,
		setTimelineBranchLabel,
		setCanRewindTimeline,
		setTurnNumber,
		setTurnFaction,
		setBattleLogs,
		setSelectedPiece,
		setCombatCameraMode,
		setCallouts,
		setUnseenThreats,
		setActiveSliceW,
		setActiveSliceZ,
		setTargetMoveW,
		setTargetMoveZ,
		setPhase,
		setHudAttacker,
		setHudDefender,
		setFightTimer,
		setDuelSquareName,
		setIntroShotIndex,
		setKoBanner,
		setActiveRealmId,
		setRealmTraveler,
		setRealmParityInverted,
		setRealmCrucibleClaimed,
		setNearbyPortal,
		setNearbyPortalEval,
		setRealmStatusBanner,
	});

	const {
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
	} = useMultiverseActions({
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
	});

	const {
		handleEnterUniversityOffice,
		handleWalkToRoom,
		handleToggleDriveCar,
		handleOpenTransitModal,
		handleCloseTransitModal,
		handleBoardTransitToStation,
		handleSetDrawerTab,
		handleSelectAcademicEmail,
		handleKickCoffeeMachine,
		handleJoinOrLeaveCafeteriaQueue,
		handleDropOffShirtAtCleaner,
		handlePickUpCleanedShirt,
		handleBuyNewShirtAtHaberdashery,
		handleCommuteHomeForSpareShirt,
		handleBuyTobyCroissant,
		handleDismissAnniversaryArrival,
		handleForcedAnniversaryWalkHome,
		handleVancePhoneConsult,
		handleVanceReviewEmail,
		handleAssignMaritalAsset,
		handleAcceptSettlementWorksheet,
		handleAttendSettlementDeposition,
		handleConfirmDepositionEpiphany,
		handleEatHotPlateSoup,
		handleAdjustSurfaceCommutator,
		handleAdjustChshAngles,
		handleAttendScheduledMeetingInRoom,
		handleTalkToNpcInRoom,
		handleSelectBoundaryGauge,
		handleToggleJacobianSign,
		handleRunChiralLabExperiment,
		handleToggleRookCitations,
		handleToggleGrantLineItem,
		handleSubmitGrantBudgetProposal,
		handlePayMonthlyMortgage,
		handleAttemptIllegalDepartmentalReimbursement,
		handleAdvanceTimeMinutes,
		handleSleepUntilNextMorning,
		handleSubmitToJournalOfTransfiniteCausality,
		handleSellEquipmentForPerseusFee,
		handleOpenAcceptanceLetter,
		handleBeginRealityShatter,
		handleConcludePublicationAndRestorePieces,
	} = useAcademicColloquiumActions({
		simRef,
		setAcademicColloquium,
		setPhase,
		setSelectedPiece,
		setMultiverseState,
		setWatchEventBanner,
		setBattleLogs,
		syncActiveBranchFromSim,
		syncBoardHighlights,
	});

	const {
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
	} = useShowcaseActions({
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
	});

	useWebGLGameLoop({
		canvasMountRef,
		simRef,
		addCallout,
		executeChessMove,
		executeFighterIntervention,
		handleRealmAction,
		handleResetGame,
		handleTemperAtCrucibleAnvil,
		handleToggleAutoPlayDemo,
		handleTraverseRealmPortal,
		initiateCombatDuel,
		syncBoardHighlights,
		setPhase,
		setTurnFaction,
		setTurnNumber,
		setActiveSliceW,
		setActiveSliceZ,
		setTargetMoveW,
		setTargetMoveZ,
		setSelectedPiece,
		setMultiverseState,
		setAcademicColloquium,
		setHudAttacker,
		setHudDefender,
		setFightTimer,
		setIntroShotIndex,
		setKoBanner,
		setWarVictor,
		setBattleLogs,
		setActiveCollapseBanner,
		setWatchEventBanner,
		setDemoDirectorStage,
		setCameraPreset,
		setActiveRealmId,
		setRealmTraveler,
		setRealmParityInverted,
		setRealmCrucibleClaimed,
		setNearbyPortal,
		setNearbyPortalEval,
		setRealmStatusBanner,
		setCombatCameraMode,
		setCallouts,
		handleJoinOrLeaveCafeteriaQueue,
		handleDropOffShirtAtCleaner,
		handlePickUpCleanedShirt,
		handleBuyNewShirtAtHaberdashery,
		handleToggleDriveCar,
		handleOpenTransitModal,
		handleCommuteHomeForSpareShirt,
		handleSleepUntilNextMorning,
		handleBuyTobyCroissant,
		handleEatHotPlateSoup,
		handleKickCoffeeMachine,
		handleTalkToNpcInRoom,
		handleSetDrawerTab,
		handleWalkToRoom,
		handleEnterUniversityOffice,
		handleAttendScheduledMeetingInRoom,
		handleConcludePublicationAndRestorePieces,
		handleBeginRealityShatter,
	});

	useEffect(() => {
		if (phase === "ACADEMIC_SIMULATOR") {
			soundEngine.setMusicMood("ACADEMIC_OFFICE");
		} else if (
			phase === "FIGHT_INTRO" ||
			phase === "FIGHT_ACTIVE" ||
			phase === "FIGHT_OUTRO"
		) {
			soundEngine.setMusicMood("COMBAT");
		} else if (
			phase === "REALM_DESCENT" ||
			phase === "REALM_EXPLORATION" ||
			phase === "REALM_ASCENT"
		) {
			soundEngine.setMusicMood("REALM");
		} else if (multiverseState.activeTimelineId !== "TL-PRIME") {
			soundEngine.setMusicMood("ALTERNATE_TIMELINE");
		} else {
			soundEngine.setMusicMood("CHESS");
		}
	}, [phase, multiverseState.activeTimelineId]);

	const toggleMute = () => {
		const next = !muted;
		soundEngine.muted = next;
		setMuted(next);
	};

	return (
		<div className="relative h-screen w-screen overflow-hidden bg-[#07090E] text-slate-100 select-none">
			{/* 1. Strict 3-Zone Top Navigation Bar Contract (Hidden when the Chess Universe has dissolved into the University of Greater Andromeda!) */}
			{phase !== "ACADEMIC_SIMULATOR" && (
				<GameTopHeader
					multiverseState={multiverseState}
					cameraPreset={cameraPreset}
					onOpenMultiverse={() => setMultiverseModalOpen(true)}
					onToggleWatchCamera={() =>
						handleSelectCameraPreset(
							cameraPreset === "pocket_watch" ? "white_orbit" : "pocket_watch",
						)
					}
					onGuidedAssassination={handleTriggerGuidedAssassinationDemo}
					onRealmShowcase={() => handleTriggerRealmShowcase()}
					onOpenCodex={() => setCodexOpen(true)}
				/>
			)}

			{/* Director's Auto-Play Showcase Banner (Visible across Chess & Combat when Auto-Play Demo is active) */}
			{autoPlayDemo && (
				<AutoPlayDemoBanner
					demoDirectorStage={demoDirectorStage}
					onTakeControl={handleToggleAutoPlayDemo}
				/>
			)}

			{/* Dramatic Reality Convergence / Causal Collapse Cinematic Overlay */}
			{phase === "CAUSAL_COLLAPSE" &&
				activeCollapseBanner &&
				activeCollapseBanner.length > 0 && (
					<CausalCollapseOverlay items={activeCollapseBanner} />
				)}

			{/* 2. Isolated 3D WebGL Viewport Container */}
			<div
				ref={canvasMountRef}
				className={`absolute inset-0 z-0 w-full ${
					phase === "ACADEMIC_SIMULATOR"
						? "top-0 h-screen"
						: "top-13.25 h-[calc(100vh-53px)] cursor-grab active:cursor-grabbing"
				}`}
			/>

			{/* 3. Whisper-Quiet Story Chronicle & Multiverse Reality Switcher Strip (during CHESS_VIEW) */}
			{phase === "CHESS_VIEW" && (
				<ChessViewChronicleStrip
					timelineBranchLabel={timelineBranchLabel}
					turnNumber={turnNumber}
					multiverseState={multiverseState}
					activeSliceW={activeSliceW}
					activeSliceZ={activeSliceZ}
					turnFaction={turnFaction}
					onOpenMultiverse={() => setMultiverseModalOpen(true)}
					onSwitchTimeline={handleSwitchTimeline}
					onHoverTimelineOnWatch={handleHoverTimelineOnWatch}
					watchShowcaseStep={watchShowcaseStep}
					onAdvanceWatchShowcase={handleAdvanceWatchShowcase}
					watchEventBanner={watchEventBanner}
					onTriggerConvergence={handleTriggerConvergence}
					canRewindTimeline={canRewindTimeline}
					onChronoRewind={handleChronoRewind}
					unseenThreats={unseenThreats}
					onSelect4DSlice={handleSelect4DSlice}
					selectedPiece={selectedPiece}
					academicColloquium={academicColloquium}
					pieces={simRef.current.pieces}
					validMoves={simRef.current.validMoves}
					onEntangleSelectedPiece={handleEntangleSelectedPiece}
					onCheckmateYesterdayShowcase={handleCheckmateYesterdayShowcase}
					onSynodTranspose={handleSynodTranspose}
					onAscendToPocketWatchDuel={handleAscendToPocketWatchDuel}
					onExecuteChessMove={executeChessMove}
					targetMoveW={targetMoveW}
					targetMoveZ={targetMoveZ}
					hoveredCaptureMove={hoveredCaptureMove}
				/>
			)}

			{/* 3B. Standalone University of Greater Andromeda Playable Week & 6-Year Academic Life Simulator */}
			{phase === "ACADEMIC_SIMULATOR" && academicColloquium?.active && (
				<AcademicColloquiumOverlay
					colloquium={academicColloquium}
					onEnterUniversityOffice={handleEnterUniversityOffice}
					onWalkToRoom={handleWalkToRoom}
					onSetDrawerTab={handleSetDrawerTab}
					onSelectEmail={handleSelectAcademicEmail}
					onKickCoffeeMachine={handleKickCoffeeMachine}
					onJoinOrLeaveCafeteriaQueue={handleJoinOrLeaveCafeteriaQueue}
					onDropOffShirtAtCleaner={handleDropOffShirtAtCleaner}
					onPickUpCleanedShirt={handlePickUpCleanedShirt}
					onBuyNewShirtAtHaberdashery={handleBuyNewShirtAtHaberdashery}
					onBuyTobyCroissant={handleBuyTobyCroissant}
					onForcedAnniversaryWalkHome={handleForcedAnniversaryWalkHome}
					onDismissAnniversaryArrival={handleDismissAnniversaryArrival}
					onCommuteHomeForSpareShirt={handleCommuteHomeForSpareShirt}
					onToggleDriveCar={handleToggleDriveCar}
					onOpenTransitModal={handleOpenTransitModal}
					onCloseTransitModal={handleCloseTransitModal}
					onBoardTransitToStation={handleBoardTransitToStation}
					onAttendScheduledMeetingInRoom={handleAttendScheduledMeetingInRoom}
					onTalkToNpcInRoom={handleTalkToNpcInRoom}
					onSelectBoundaryGauge={handleSelectBoundaryGauge}
					onToggleJacobianSign={handleToggleJacobianSign}
					onRunChiralLabExperiment={handleRunChiralLabExperiment}
					onToggleRookCitations={handleToggleRookCitations}
					onAdjustSurfaceCommutator={handleAdjustSurfaceCommutator}
					onAdjustChshAngles={handleAdjustChshAngles}
					onToggleGrantLineItem={handleToggleGrantLineItem}
					onSubmitGrantBudgetProposal={handleSubmitGrantBudgetProposal}
					onPayMonthlyMortgage={handlePayMonthlyMortgage}
					onAttemptIllegalDepartmentalReimbursement={
						handleAttemptIllegalDepartmentalReimbursement
					}
					onVancePhoneConsult={handleVancePhoneConsult}
					onVanceReviewEmail={handleVanceReviewEmail}
					onAssignMaritalAsset={handleAssignMaritalAsset}
					onAcceptSettlementWorksheet={handleAcceptSettlementWorksheet}
					onAttendSettlementDeposition={handleAttendSettlementDeposition}
					onConfirmDepositionEpiphany={handleConfirmDepositionEpiphany}
					onEatHotPlateSoup={handleEatHotPlateSoup}
					onAdvanceTimeMinutes={handleAdvanceTimeMinutes}
					onSleepUntilNextMorning={handleSleepUntilNextMorning}
					onSubmitToJournalOfTransfiniteCausality={
						handleSubmitToJournalOfTransfiniteCausality
					}
					onSellEquipmentForPerseusFee={handleSellEquipmentForPerseusFee}
					onOpenAcceptanceLetter={handleOpenAcceptanceLetter}
					onBeginRealityShatter={handleBeginRealityShatter}
					onConcludePublicationAndRestorePieces={
						handleConcludePublicationAndRestorePieces
					}
					uniFirstPerson={uniFirstPerson}
					freeMouseLook={freeMouseLook}
					onToggleUniFirstPerson={() => {
						const nextFp = !simRef.current.mouseLook.uniFirstPerson;
						simRef.current.mouseLook.uniFirstPerson = nextFp;
						if (!nextFp && simRef.current.mouseLook.uniCamDistance < 1.8) {
							simRef.current.mouseLook.uniCamDistance = 5.6;
						}
						setUniFirstPerson(nextFp);
					}}
					onToggleFreeMouseLook={() => {
						const nextFree = !simRef.current.mouseLook.freeLookActive;
						simRef.current.mouseLook.freeLookActive = nextFree;
						setFreeMouseLook(nextFree);
					}}
					onResetUniCamera={() => {
						simRef.current.mouseLook.uniCamYaw = 0;
						simRef.current.mouseLook.uniCamPitch = 0.42;
						simRef.current.mouseLook.uniCamDistance = 6.2;
					}}
				/>
			)}

			{/* 4. Campaign Victory Modal (Regicide) */}
			{warVictor && (
				<WarVictoryModal
					warVictor={warVictor}
					onReset={handleResetGame}
					onDismiss={() => setWarVictor(null)}
				/>
			)}

			{/* 5. Diegetic Story-Driven Combat Overlay (Lower-third letterbox inscriptions & Visor Rim) */}
			<CombatHudOverlay
				phase={phase}
				attacker={hudAttacker}
				defender={hudDefender}
				fightTimer={fightTimer}
				duelSquareName={duelSquareName}
				introShotIndex={introShotIndex}
				combatCameraMode={combatCameraMode}
				onToggleCombatCameraMode={handleToggleCombatCameraMode}
				callouts={callouts}
				dockCollapsed={dockCollapsed}
				onToggleDock={() => setDockCollapsed((p) => !p)}
				onPlayerInput={handlePlayerCombatInput}
				onSelectSupporter={handleSelectSupporter}
				onTriggerIntervention={handleTriggerIntervention}
				koNarrative={koBanner}
			/>

			{/* 6. Subterranean Impossible Realms Diegetic Overlay (During REALM_DESCENT, REALM_EXPLORATION & REALM_ASCENT) */}
			<RealmHudOverlay
				phase={phase}
				activeRealmId={activeRealmId}
				traveler={realmTraveler}
				allPieces={simRef.current.pieces}
				isParityInverted={realmParityInverted}
				crucibleAnvilClaimed={realmCrucibleClaimed}
				nearbyPortal={nearbyPortal}
				nearbyPortalEval={nearbyPortalEval}
				statusBanner={realmStatusBanner}
				onTraversePortal={handleTraverseRealmPortal}
				onSteerTowardPortal={handleSteerTowardPortal}
				onRealmAction={handleRealmAction}
			/>

			{/* 7. Unified Collapsible Bottom Control Dock (during CHESS_VIEW) */}
			{phase === "CHESS_VIEW" && (
				<ChessBottomControlDock
					dockCollapsed={dockCollapsed}
					onToggleDock={() => setDockCollapsed((prev) => !prev)}
					autoPlayDemo={autoPlayDemo}
					academicColloquium={academicColloquium}
					pieces={simRef.current.pieces}
					cameraPreset={cameraPreset}
					activeSliceW={activeSliceW}
					activeSliceZ={activeSliceZ}
					battleLogs={battleLogs}
					muted={muted}
					onToggleAutoPlayDemo={handleToggleAutoPlayDemo}
					onOpenMultiverse={() => setMultiverseModalOpen(true)}
					onTriggerGuidedAssassinationDemo={
						handleTriggerGuidedAssassinationDemo
					}
					onTriggerRealmShowcase={() => handleTriggerRealmShowcase()}
					onAscendToPocketWatchDuel={() => handleAscendToPocketWatchDuel()}
					onCheckmateYesterdayShowcase={handleCheckmateYesterdayShowcase}
					onTrigger4DHyperScenario={handleTrigger4DHyperScenario}
					onSelect4DSlice={handleSelect4DSlice}
					onSelectCameraPreset={handleSelectCameraPreset}
					onToggleMute={toggleMute}
					onResetGame={handleResetGame}
				/>
			)}

			{/* 8. Warrior Codex & Custom Exhibition Duel Modal */}
			<CodexModal
				isOpen={codexOpen}
				onClose={() => setCodexOpen(false)}
				onLaunchExhibitionDuel={handleLaunchExhibitionDuel}
			/>

			{/* 9. Multiversal Causal Nexus, Lineage Inspector & Reality Convergence Modal */}
			<MultiverseModal
				multiverse={multiverseState}
				activePieces={simRef.current.pieces}
				selectedPiece={selectedPiece}
				isOpen={multiverseModalOpen}
				onClose={() => setMultiverseModalOpen(false)}
				onSwitchTimeline={handleSwitchTimeline}
				onForkTimeline={handleForkTimeline}
				onDeployPieceToTimeline={handleDeployPieceToTimeline}
				onTriggerConvergence={handleTriggerConvergence}
				onTriggerGuidedAssassinationDemo={handleTriggerGuidedAssassinationDemo}
				onRewindLastAssassination={handleRewindLastAssassination}
			/>
		</div>
	);
}
