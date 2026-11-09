import confetti from "canvas-confetti";
import {
	type Dispatch,
	type MutableRefObject,
	type SetStateAction,
	useCallback,
} from "react";
import type { PerspectiveCamera } from "three";
import {
	advanceSimMinutes,
	appendPerseusArmColleagueEmail,
	computeChshS,
	DAY_NAMES_LIST,
	executeForcedAnniversaryWalkHome,
	formatSimClock,
	recomputeProofIntegrity,
	recordDepartmentalTransaction,
	recordLegalDebt,
	recordPersonalTransaction,
	syncAppointmentsWithClock,
	triggerCafeteriaCollisionSpill,
} from "../academic/colloquiumSimHelpers";
import { soundEngine } from "../audio/soundEngine";
import {
	getPieceLineageId,
	getValidMovesForPiece,
} from "../engine/chessEngine";
import { publishSentientTheoremAcrossMultiverse } from "../engine/multiverseEngine";
import { boardToWorld } from "../three/arenaBuilder";
import {
	spawnAuraPillar,
	spawnInterventionRift,
	spawnShockwave,
} from "../three/combatAnimator";
import { setPieceProfessorMode } from "../three/pieceModels";
import { triggerPocketWatchReaction } from "../three/pocketWatchBuilder";
import {
	TRAM_STATIONS,
	UNIVERSITY_ROOM_CENTERS,
} from "../three/universityOfficeBuilder";
import type {
	AcademicColloquiumState,
	BattleLogEntry,
	ChessPiece,
	GamePhase,
	MultiverseState,
	UniversityRoomId,
} from "../types/game";

/** Fields on simRef.current touched by academic campus handlers (App holds the full sim). */
export type AcademicColloquiumSimRef = {
	academicColloquium: AcademicColloquiumState | null;
	phase: GamePhase;
	turnNumber: number;
	pieces: ChessPiece[];
	multiverse: MultiverseState;
	selectedPieceId: string | null;
	validMoves: import("../types/game").MoveOption[];
	pieceRigs: Map<string, import("../three/pieceModels").ArticulatedPieceRig>;
	universityOfficeRig:
		| import("../three/universityOfficeBuilder").UniversityOfficeRig
		| null;
	arenaRig: import("../three/arenaBuilder").BoardArenaRig | null;
	pocketWatchRig:
		| import("../three/pocketWatchBuilder").MultiversalPocketWatchRig
		| null;
	realmsRig: import("../three/realmBuilder").SubterraneanRealmsRig | null;
	vfxPool: import("../three/combatAnimator").VFXPool | null;
	controls:
		| import("three/addons/controls/OrbitControls.js").OrbitControls
		| null;
	cameraShake: number;
	uniPlayer: {
		worldX: number;
		worldZ: number;
		yaw: number;
		targetX: number | null;
		targetZ: number | null;
	};
	uniCar: {
		isDriving: boolean;
		worldX: number;
		worldZ: number;
		speed: number;
		yaw: number;
	};
};

export type UseAcademicColloquiumActionsParams = {
	simRef: MutableRefObject<AcademicColloquiumSimRef>;
	setAcademicColloquium: Dispatch<
		SetStateAction<AcademicColloquiumState | null>
	>;
	setPhase: Dispatch<SetStateAction<GamePhase>>;
	setSelectedPiece: Dispatch<SetStateAction<ChessPiece | null>>;
	setMultiverseState: Dispatch<SetStateAction<MultiverseState>>;
	setWatchEventBanner: Dispatch<
		SetStateAction<{ title: string; subtitle: string } | null>
	>;
	setBattleLogs: Dispatch<SetStateAction<BattleLogEntry[]>>;
	syncActiveBranchFromSim: () => void;
	syncBoardHighlights: () => void;
};

export function useAcademicColloquiumActions({
	simRef,
	setAcademicColloquium,
	setPhase,
	setSelectedPiece,
	setMultiverseState,
	setWatchEventBanner,
	setBattleLogs,
	syncActiveBranchFromSim,
	syncBoardHighlights,
}: UseAcademicColloquiumActionsParams) {
	// ============================================================================
	// UNIVERSITY OF GREATER ANDROMEDA — PLAYABLE 5-DAY WEEK & 5-ROOM CAMPUS HANDLERS
	// ============================================================================
	const handleEnterUniversityOffice = useCallback(() => {
		const sim = simRef.current;
		const col = sim.academicColloquium;
		if (!col?.active) return;

		col.stage = "UNIVERSITY_SIMULATOR";
		sim.uniPlayer.worldX = -10.0;
		sim.uniPlayer.worldZ = -3.2;
		sim.uniPlayer.yaw = 0;
		sim.uniPlayer.targetX = null;
		sim.uniPlayer.targetZ = null;
		soundEngine.playOfficeKeyboardClack();
		setAcademicColloquium({ ...col });
	}, []);

	const handleWalkToRoom = useCallback((roomId: UniversityRoomId) => {
		const sim = simRef.current;
		const col = sim.academicColloquium;
		if (!col?.active) return;

		if (roomId === "PAWN_HOUSE" && col.homeAccess === "LOCKED_OUT") {
			col.colloquiumLog = [
				`🔒 [${formatSimClock(col.timeOfDayMinutes)}] 742 Retrocausal Terrace — porch light off. Keys no longer work. Arthur Vance said not to approach the property.`,
				...col.colloquiumLog.slice(0, 9),
			];
			soundEngine.playRejectionStamp();
			setAcademicColloquium({ ...col });
			return;
		}

		// Anniversary evening after croissant: Crosstown Bus is either unaffordable or emotionally impossible
		if (
			roomId === "PAWN_HOUSE" &&
			col.tobyCroissantPurchased &&
			col.domesticArcStage === "CROISSANT_BOUGHT" &&
			col.timeOfDayMinutes >= 17 * 60 + 15
		) {
			executeForcedAnniversaryWalkHome(col, sim);
			setAcademicColloquium({ ...col });
			return;
		}

		const dest = UNIVERSITY_ROOM_CENTERS[roomId];
		// If leaving Cafeteria while carrying hot coffee for the first time, the distracted student in the doorway collides with Dr. Pawn!
		if (
			col.currentRoom === "CAFETERIA" &&
			roomId !== "CAFETERIA" &&
			col.carryingHotCoffee &&
			!col.coffeeSpillIncidentTriggered
		) {
			sim.uniPlayer.worldX = 9.2;
			sim.uniPlayer.worldZ = -1.5;
			advanceSimMinutes(col, 4);
			triggerCafeteriaCollisionSpill(col, sim);
			col.currentRoom = roomId;
			sim.uniPlayer.targetX = dest.x;
			sim.uniPlayer.targetZ = dest.z;
			setAcademicColloquium({ ...col });
			return;
		}

		col.cafeteriaQueuePosition = null;
		col.cafeteriaServiceProgress = 0;
		col.currentRoom = roomId;
		sim.uniPlayer.targetX = dest.x;
		sim.uniPlayer.targetZ = dest.z;
		advanceSimMinutes(col, 4, `Walked to ${dest.label}`);
		soundEngine.playOfficeKeyboardClack();
		setAcademicColloquium({ ...col });
	}, []);

	const handleToggleDriveCar = useCallback(() => {
		const sim = simRef.current;
		const col = sim.academicColloquium;
		if (!col?.active) return;

		if (col.stationWagonSeizedBySpouse) {
			col.colloquiumLog = [
				`🚗 [${formatSimClock(col.timeOfDayMinutes)}] The 1984 Burgundy Station Wagon is gone. Court worksheets list Blue Book $450 — assigned to spouse.`,
				...col.colloquiumLog.slice(0, 9),
			];
			soundEngine.playRejectionStamp();
			setAcademicColloquium({ ...col });
			return;
		}

		if (
			col.tobyCroissantPurchased &&
			col.domesticArcStage === "CROISSANT_BOUGHT" &&
			col.timeOfDayMinutes >= 17 * 60 + 15 &&
			!sim.uniCar.isDriving
		) {
			col.colloquiumLog = [
				`🚗 [${formatSimClock(col.timeOfDayMinutes)}] You reach for the wagon keys — then remember Toby's croissant and the candle waiting at home. Walk.`,
				...col.colloquiumLog.slice(0, 9),
			];
			soundEngine.playRejectionStamp();
			setAcademicColloquium({ ...col });
			return;
		}

		if (sim.uniCar.isDriving) {
			// Park car & step out
			sim.uniCar.isDriving = false;
			sim.uniCar.speed = 0;
			col.isDrivingCar = false;
			col.carSpeedMph = 0;
			sim.uniPlayer.worldX = sim.uniCar.worldX + 2.0;
			sim.uniPlayer.worldZ = sim.uniCar.worldZ;
			col.colloquiumLog = [
				`🚗 [${formatSimClock(col.timeOfDayMinutes)}] Shifted 1984 Station Wagon into PARK. Stepped out onto the pavement.`,
				...col.colloquiumLog.slice(0, 9),
			];
			soundEngine.playOfficeKeyboardClack();
		} else {
			// Enter car & drive
			const dist = Math.hypot(
				sim.uniPlayer.worldX - sim.uniCar.worldX,
				sim.uniPlayer.worldZ - sim.uniCar.worldZ,
			);
			if (
				dist > 15.0 &&
				col.currentRoom !== "CAMPUS_QUAD" &&
				col.currentRoom !== "CITY_STREETS"
			) {
				col.colloquiumLog = [
					`🚗 [${formatSimClock(col.timeOfDayMinutes)}] Walked out to your 1984 Burgundy Station Wagon in the South Lot. Engine turns over with a familiar rumble.`,
					...col.colloquiumLog.slice(0, 9),
				];
				sim.uniPlayer.worldX = sim.uniCar.worldX;
				sim.uniPlayer.worldZ = sim.uniCar.worldZ;
				col.currentRoom = "CAMPUS_QUAD";
			} else {
				col.colloquiumLog = [
					`🚗 [${formatSimClock(col.timeOfDayMinutes)}] Turned the key in your 1984 Station Wagon. Headlights illuminate the road ahead! Use WASD to steer & drive.`,
					...col.colloquiumLog.slice(0, 9),
				];
			}
			sim.uniCar.isDriving = true;
			col.isDrivingCar = true;
			soundEngine.playOfficeKeyboardClack();
		}
		setAcademicColloquium({ ...col });
	}, []);

	const handleOpenTransitModal = useCallback(() => {
		const sim = simRef.current;
		const col = sim.academicColloquium;
		if (!col?.active) return;

		col.tramTransitModalOpen = true;
		soundEngine.playTramChime();
		setAcademicColloquium({ ...col });
	}, []);

	const handleCloseTransitModal = useCallback(() => {
		const sim = simRef.current;
		const col = sim.academicColloquium;
		if (!col?.active) return;

		col.tramTransitModalOpen = false;
		soundEngine.playOfficeKeyboardClack();
		setAcademicColloquium({ ...col });
	}, []);

	const handleBoardTransitToStation = useCallback((stationId: string) => {
		const sim = simRef.current;
		const col = sim.academicColloquium;
		if (!col?.active) return;

		const st = TRAM_STATIONS.find((s) => s.id === stationId);
		if (!st) return;

		if (col.checkingBalance < 1.75) {
			col.colloquiumLog = [
				`💳 [${formatSimClock(col.timeOfDayMinutes)}] Insufficient funds! Farecard reader declined: You need at least $1.75 in personal checking for a GAMTA tram token.`,
				...col.colloquiumLog.slice(0, 9),
			];
			soundEngine.playRejectionStamp();
			setAcademicColloquium({ ...col });
			return;
		}

		if (
			col.tobyCroissantPurchased &&
			col.domesticArcStage === "CROISSANT_BOUGHT" &&
			col.timeOfDayMinutes >= 17 * 60 + 15 &&
			(stationId === "KEPLER_SUBURBS" || st.shortLabel.includes("Home"))
		) {
			executeForcedAnniversaryWalkHome(col, sim);
			setAcademicColloquium({ ...col });
			return;
		}

		recordPersonalTransaction(
			col,
			`GAMTA Metro Transit — Retrocausal Line 1 to ${st.name}`,
			"TRANSIT",
			-1.75,
		);

		advanceSimMinutes(
			col,
			7,
			`Rode GAMTA Retrocausal Tram to ${st.shortLabel}`,
		);
		col.energyLevel = Math.min(100, col.energyLevel + 6); // Relaxing commute reading preprints!
		col.tramTransitModalOpen = false;
		col.isRidingTram = false;

		// Relocate player to station platform
		sim.uniPlayer.worldX =
			st.x + Math.sin(st.platformAngle + Math.PI / 2) * 2.8;
		sim.uniPlayer.worldZ =
			st.z + Math.cos(st.platformAngle + Math.PI / 2) * 2.8;
		sim.uniPlayer.targetX = null;
		sim.uniPlayer.targetZ = null;

		if (stationId === "PEANO_QUAD") {
			col.currentRoom = "CAMPUS_QUAD";
		} else if (stationId === "DOWNTOWN_PERSEUS") {
			col.currentRoom = "DRY_CLEANER";
		} else if (stationId === "KEPLER_SUBURBS") {
			col.currentRoom = "PAWN_HOUSE";
		} else {
			col.currentRoom = "CAMPUS_QUAD";
		}

		soundEngine.playTramChime();
		soundEngine.playTramBell();
		soundEngine.playTramMotorHum();

		col.colloquiumLog = [
			`🚈 [${formatSimClock(col.timeOfDayMinutes)}] GAMTA RETROCAUSAL LINE 1: Arrived at ${st.name} (-$1.75 fare). The 7-minute express trip gave you a few peaceful moments to review Lemma 3.2 (+6 Energy)!`,
			...col.colloquiumLog.slice(0, 9),
		];

		setAcademicColloquium({ ...col });
	}, []);

	const handleSetDrawerTab = useCallback(
		(
			tab:
				| "NONE"
				| "CHALKBOARD_PROOF"
				| "FINANCE_LEDGER"
				| "PINE_MAIL"
				| "CALENDAR_NPCS"
				| "LEGAL_MARITAL"
				| "COURSE_READER",
		) => {
			const sim = simRef.current;
			const col = sim.academicColloquium;
			if (!col?.active) return;

			if (tab === "LEGAL_MARITAL" && !col.legalTabUnlocked) {
				col.colloquiumLog = [
					`⚖️ [${formatSimClock(col.timeOfDayMinutes)}] LEGAL / MARITAL LEDGER unlocks Monday morning after Arthur Vance makes contact.`,
					...col.colloquiumLog.slice(0, 9),
				];
				soundEngine.playRejectionStamp();
				setAcademicColloquium({ ...col });
				return;
			}

			col.activeDrawerTab = tab;
			if (tab === "COURSE_READER") {
				col.proofWorkbench.courseReaderOpen = true;
			}
			soundEngine.playOfficeKeyboardClack();
			setAcademicColloquium({ ...col });
		},
		[],
	);

	const handleSelectAcademicEmail = useCallback((emailId: string) => {
		const sim = simRef.current;
		const col = sim.academicColloquium;
		if (!col?.active) return;

		col.selectedEmailId = emailId;
		col.inbox = col.inbox.map((em) =>
			em.id === emailId ? { ...em, unread: false } : em,
		);
		soundEngine.playOfficeKeyboardClack();
		setAcademicColloquium({ ...col });
	}, []);

	const handleKickCoffeeMachine = useCallback(() => {
		const sim = simRef.current;
		const col = sim.academicColloquium;
		if (!col?.active) return;

		col.coffeeMachineKickCount += 1;
		advanceSimMinutes(col, 5);
		sim.cameraShake = 0.14;
		soundEngine.playBrokenCoffeeMachineSputter();

		const quips = [
			`☕ [${formatSimClock(col.timeOfDayMinutes)}] Kicked the 1987 Bunn-O-Matic in Room 4B. It wheezed, dispensed 4mL of lukewarm rust, and went dark. Walk to the Lagrange Point Cafeteria down the corridor.`,
			`☕ [${formatSimClock(col.timeOfDayMinutes)}] Kick #${col.coffeeMachineKickCount}: The "OUT OF ORDER SINCE NOV 1987" note fluttered to the linoleum. Still no coffee.`,
			`☕ [${formatSimClock(col.timeOfDayMinutes)}] Kick #${col.coffeeMachineKickCount}: A relay clicked inside the 1987 chassis. Down the hall, Tenured Prof. Rook sipped a fresh cafeteria espresso.`,
		];
		col.colloquiumLog = [
			quips[(col.coffeeMachineKickCount - 1) % quips.length],
			...col.colloquiumLog.slice(0, 9),
		];
		setAcademicColloquium({ ...col });
	}, []);

	const handleJoinOrLeaveCafeteriaQueue = useCallback(() => {
		const sim = simRef.current;
		const col = sim.academicColloquium;
		if (!col?.active) return;

		if (col.cafeteriaQueuePosition !== null) {
			col.cafeteriaQueuePosition = null;
			col.cafeteriaServiceProgress = 0;
			col.colloquiumLog = [
				`🚶 [${formatSimClock(col.timeOfDayMinutes)}] Stepped out of the Lagrange Point Cafeteria coffee queue.`,
				...col.colloquiumLog.slice(0, 9),
			];
		} else {
			col.currentRoom = "CAFETERIA";
			col.cafeteriaQueuePosition = 3;
			col.cafeteriaServiceProgress = 0;
			sim.uniPlayer.worldX = 8.0;
			sim.uniPlayer.worldZ = -4.3;
			sim.uniPlayer.targetX = null;
			sim.uniPlayer.targetZ = null;
			col.colloquiumLog = [
				`☕ [${formatSimClock(col.timeOfDayMinutes)}] Joined the physical coffee queue at Lagrange Point Cafeteria behind 3 patrons. Wait in line for the cashier, or step out anytime.`,
				...col.colloquiumLog.slice(0, 9),
			];
		}
		soundEngine.playOfficeKeyboardClack();
		setAcademicColloquium({ ...col });
	}, []);

	const handleDropOffShirtAtCleaner = useCallback(
		(service: "STANDARD_NEXT_DAY" | "EXPRESS_75_MIN") => {
			const sim = simRef.current;
			const col = sim.academicColloquium;
			if (!col?.active || col.shirtState !== "COFFEE_STAINED") return;

			const mins = col.timeOfDayMinutes;
			const cleanerIsOpen = mins >= 510 && mins <= 1050;
			if (!cleanerIsOpen) {
				col.colloquiumLog = [
					`🔒 [${formatSimClock(mins)}] Perseus Dry Cleaners is CLOSED (Open 08:30–17:30). The steel shutter is rolled down.`,
					...col.colloquiumLog.slice(0, 9),
				];
				soundEngine.playRejectionStamp();
				setAcademicColloquium({ ...col });
				return;
			}

			const fee = service === "EXPRESS_75_MIN" ? 28.5 : 14.0;
			if (col.checkingBalance < fee) {
				col.colloquiumLog = [
					`💳 [${formatSimClock(mins)}] Insufficient funds! Clerk Mr. Chen refuses to process ${service === "EXPRESS_75_MIN" ? "Express ($28.50)" : "Standard ($14.00)"} cleaning because your checking account only has $${col.checkingBalance.toFixed(2)}.`,
					...col.colloquiumLog.slice(0, 9),
				];
				soundEngine.playRejectionStamp();
				setAcademicColloquium({ ...col });
				return;
			}

			advanceSimMinutes(col, 6);
			recordPersonalTransaction(
				col,
				`Perseus Dry Cleaners — ${service === "EXPRESS_75_MIN" ? "1-Hr Express Stain Removal" : "Standard Next-Day Press"} (#PDC-108)`,
				"DRY_CLEANING",
				-fee,
			);

			const readyDayIndex =
				service === "EXPRESS_75_MIN"
					? col.dayIndex
					: Math.min(4, col.dayIndex + 1);
			const readyMinutes =
				service === "EXPRESS_75_MIN" ? col.timeOfDayMinutes + 75 : 9 * 60;

			col.shirtState = "AT_CLEANERS_WEARING_SWEATER";
			col.activeDryCleaningTicket = {
				ticketNumber: "PDC-108",
				serviceName: service,
				feePaid: fee,
				droppedOffDayIndex: col.dayIndex,
				droppedOffMinutes: col.timeOfDayMinutes,
				readyDayIndex,
				readyMinutes,
				collected: false,
			};

			col.colloquiumLog = [
				`🧥 [${formatSimClock(col.timeOfDayMinutes)}] Handed over your coffee-stained Oxford shirt at Perseus Dry Cleaners (-$${fee.toFixed(2)}). Ticket #PDC-108 ready ${DAY_NAMES_LIST[readyDayIndex]} at ${formatSimClock(readyMinutes)}. You are now wearing your faded UGA backup sweatshirt.`,
				...col.colloquiumLog.slice(0, 9),
			];
			soundEngine.playOfficeKeyboardClack();
			setAcademicColloquium({ ...col });
		},
		[],
	);

	const handlePickUpCleanedShirt = useCallback(() => {
		const sim = simRef.current;
		const col = sim.academicColloquium;
		if (
			!col?.active ||
			!col.activeDryCleaningTicket ||
			col.activeDryCleaningTicket.collected
		)
			return;

		const mins = col.timeOfDayMinutes;
		const cleanerIsOpen = mins >= 510 && mins <= 1050;
		if (!cleanerIsOpen) {
			col.colloquiumLog = [
				`🔒 [${formatSimClock(mins)}] Perseus Dry Cleaners is CLOSED (Hours: 08:30–17:30)! You cannot collect Ticket #${col.activeDryCleaningTicket.ticketNumber} until tomorrow morning.`,
				...col.colloquiumLog.slice(0, 9),
			];
			soundEngine.playRejectionStamp();
			setAcademicColloquium({ ...col });
			return;
		}

		const t = col.activeDryCleaningTicket;
		const isReady =
			col.dayIndex > t.readyDayIndex ||
			(col.dayIndex === t.readyDayIndex &&
				col.timeOfDayMinutes >= t.readyMinutes);

		if (!isReady) {
			col.colloquiumLog = [
				`⏳ [${formatSimClock(mins)}] Mr. Chen points to the steam press: "Ticket #${t.ticketNumber} won't be ready until ${DAY_NAMES_LIST[t.readyDayIndex]} at ${formatSimClock(t.readyMinutes)}, Dr. Pawn!"`,
				...col.colloquiumLog.slice(0, 9),
			];
			soundEngine.playBrokenCoffeeMachineSputter();
			setAcademicColloquium({ ...col });
			return;
		}

		advanceSimMinutes(col, 5);
		t.collected = true;
		col.shirtState = "CLEAN";
		col.colloquiumLog = [
			`✨ [${formatSimClock(col.timeOfDayMinutes)}] Collected your freshly pressed, spotless Oxford dress shirt (Ticket #${t.ticketNumber}) from Perseus Dry Cleaners!`,
			...col.colloquiumLog.slice(0, 9),
		];
		soundEngine.playSynodResonance(false);
		setAcademicColloquium({ ...col });
	}, []);

	const handleBuyNewShirtAtHaberdashery = useCallback(() => {
		const sim = simRef.current;
		const col = sim.academicColloquium;
		if (!col?.active) return;

		const mins = col.timeOfDayMinutes;
		if (mins < 510 || mins > 1050) {
			col.colloquiumLog = [
				`🔒 [${formatSimClock(mins)}] The Haberdashery counter is CLOSED after 17:30.`,
				...col.colloquiumLog.slice(0, 9),
			];
			soundEngine.playRejectionStamp();
			setAcademicColloquium({ ...col });
			return;
		}

		if (col.checkingBalance < 68.0) {
			col.colloquiumLog = [
				`💳 [${formatSimClock(mins)}] Cannot afford the $68.00 Haberdashery Oxford shirt! You only have $${col.checkingBalance.toFixed(2)} in personal checking.`,
				...col.colloquiumLog.slice(0, 9),
			];
			soundEngine.playRejectionStamp();
			setAcademicColloquium({ ...col });
			return;
		}

		advanceSimMinutes(col, 10);
		recordPersonalTransaction(
			col,
			"Perseus Haberdashery — Brand-New Crisp Oxford Dress Shirt",
			"CLOTHING",
			-68.0,
		);
		col.shirtState = "CLEAN";
		col.colloquiumLog = [
			`👔 [${formatSimClock(col.timeOfDayMinutes)}] Purchased a brand-new $68.00 Oxford dress shirt from the Haberdashery counter and put it on immediately.`,
			...col.colloquiumLog.slice(0, 9),
		];
		soundEngine.playOfficeKeyboardClack();
		setAcademicColloquium({ ...col });
	}, []);

	const handleCommuteHomeForSpareShirt = useCallback(() => {
		const sim = simRef.current;
		const col = sim.academicColloquium;
		if (!col?.active || !col.hasSpareCleanShirtAtHome) return;

		if (col.checkingBalance < 5.5) {
			col.colloquiumLog = [
				`🚌 [${formatSimClock(col.timeOfDayMinutes)}] You don't even have $5.50 in checking for round-trip Crosstown Bus fare!`,
				...col.colloquiumLog.slice(0, 9),
			];
			soundEngine.playRejectionStamp();
			setAcademicColloquium({ ...col });
			return;
		}

		recordPersonalTransaction(
			col,
			"Andromeda Crosstown Transit — Round-Trip Bus Fare to Apartment",
			"TRANSIT",
			-5.5,
		);
		advanceSimMinutes(
			col,
			95,
			"Took 95-minute round-trip bus commute home to change into spare shirt",
		);
		col.hasSpareCleanShirtAtHome = false;
		col.shirtState = "CLEAN";
		col.energyLevel = Math.max(15, col.energyLevel - 16);
		soundEngine.playOfficeKeyboardClack();
		setAcademicColloquium({ ...col });
	}, []);

	const handleBuyTobyCroissant = useCallback(() => {
		const sim = simRef.current;
		const col = sim.academicColloquium;
		if (!col?.active) return;

		const tobyMet = col.appointments.some(
			(a) => a.id === "appt_tue_toby" && a.status.startsWith("ATTENDED"),
		);
		if (!tobyMet) {
			col.colloquiumLog = [
				`🥐 [${formatSimClock(col.timeOfDayMinutes)}] The pastry case is open, but buying Toby a croissant before your 10:00 consultation feels premature. Meet him first.`,
				...col.colloquiumLog.slice(0, 9),
			];
			soundEngine.playBrokenCoffeeMachineSputter();
			setAcademicColloquium({ ...col });
			return;
		}
		if (col.tobyCroissantPurchased) {
			col.colloquiumLog = [
				`🥐 [${formatSimClock(col.timeOfDayMinutes)}] Toby already has his almond croissant. The pastry case stares at you with existential indifference.`,
				...col.colloquiumLog.slice(0, 9),
			];
			setAcademicColloquium({ ...col });
			return;
		}
		if (col.checkingBalance < 18.75) {
			col.colloquiumLog = [
				`💳 [${formatSimClock(col.timeOfDayMinutes)}] Artisanal almond croissant: $18.75. You have $${col.checkingBalance.toFixed(2)}. Even kindness has a floor.`,
				...col.colloquiumLog.slice(0, 9),
			];
			soundEngine.playRejectionStamp();
			setAcademicColloquium({ ...col });
			return;
		}

		advanceSimMinutes(col, 8);
		recordPersonalTransaction(
			col,
			"Lagrange Point Cafeteria — Artisanal Almond Croissant (for Toby)",
			"PASTRY",
			-18.75,
		);
		col.tobyCroissantPurchased = true;
		col.domesticArcStage = "CROISSANT_BOUGHT";
		col.tobyRelationship = Math.min(100, col.tobyRelationship + 12);
		col.colloquiumLog = [
			`🥐 [${formatSimClock(col.timeOfDayMinutes)}] Bought Toby an $18.75 almond croissant. He nearly cried. Liquid cash after mortgage reserve is now critically thin ($${col.checkingBalance.toFixed(2)}).`,
			`💍 Somewhere across town, a candle is waiting. You will not make the 17:15 Crosstown Bus.`,
			...col.colloquiumLog.slice(0, 8),
		];
		col.npcMemoryNotes = [
			"You bought Toby an almond croissant with anniversary dinner money. History will not be kind.",
			...col.npcMemoryNotes.slice(0, 5),
		];
		soundEngine.playSynodResonance(false);
		setAcademicColloquium({ ...col });
	}, []);

	const handleDismissAnniversaryArrival = useCallback(() => {
		const sim = simRef.current;
		const col = sim.academicColloquium;
		if (!col?.active) return;
		col.anniversaryArrivalModalOpen = false;
		// Immediately locked out — return to 4B with the note burned into memory
		col.currentRoom = "OFFICE_4B";
		const office = UNIVERSITY_ROOM_CENTERS.OFFICE_4B;
		sim.uniPlayer.worldX = office.x;
		sim.uniPlayer.worldZ = office.z;
		col.colloquiumLog = [
			`🚶 [${formatSimClock(col.timeOfDayMinutes)}] Keys no longer work. You walk back to Peano Hall in the same soaked shoes. Room 4B will be home now.`,
			...col.colloquiumLog.slice(0, 9),
		];
		soundEngine.playOfficeKeyboardClack();
		setAcademicColloquium({ ...col });
	}, []);

	const handleForcedAnniversaryWalkHome = useCallback(() => {
		const sim = simRef.current;
		const col = sim.academicColloquium;
		if (!col?.active) return;
		executeForcedAnniversaryWalkHome(col, sim);
		setAcademicColloquium({ ...col });
	}, []);

	const handleVancePhoneConsult = useCallback(() => {
		const sim = simRef.current;
		const col = sim.academicColloquium;
		if (!col?.active || !col.legalTabUnlocked) return;

		advanceSimMinutes(col, 6);
		recordLegalDebt(
			col,
			"Vance & Assoc. — Telephone Conf. w/ Client (0.1 hr @ $260/hr)",
			26,
		);
		col.colloquiumLog = [
			`📞 [${formatSimClock(col.timeOfDayMinutes)}] Arthur Vance: "Don't contact her. Don't go to the condo. We'll bill this as 0.1." (−$26.00)`,
			...col.colloquiumLog.slice(0, 9),
		];
		soundEngine.playOfficeKeyboardClack();
		setAcademicColloquium({ ...col });
	}, []);

	const handleVanceReviewEmail = useCallback(() => {
		const sim = simRef.current;
		const col = sim.academicColloquium;
		if (!col?.active || !col.legalTabUnlocked) return;

		advanceSimMinutes(col, 6);
		recordLegalDebt(
			col,
			"Vance & Assoc. — Receipt/Review of Wife's Email (0.1 hr)",
			26,
		);
		col.colloquiumLog = [
			`📨 [${formatSimClock(col.timeOfDayMinutes)}] Vance reviewed the yellow-note email thread. Billed 0.1 hr (−$26.00).`,
			...col.colloquiumLog.slice(0, 9),
		];
		soundEngine.playOfficeKeyboardClack();
		setAcademicColloquium({ ...col });
	}, []);

	const handleAssignMaritalAsset = useCallback(
		(
			asset: "condo" | "wagon" | "exhibitD",
			value: "PAWN" | "SPOUSE" | "FORCED_JOINT" | true,
		) => {
			const sim = simRef.current;
			const col = sim.academicColloquium;
			if (!col?.active) return;

			if (asset === "condo" && value !== true) {
				col.maritalAssetGrid.condoAssignedTo = value;
			} else if (
				asset === "wagon" &&
				(value === "PAWN" || value === "SPOUSE")
			) {
				col.maritalAssetGrid.wagonAssignedTo = value;
				if (value === "SPOUSE") {
					col.stationWagonSeizedBySpouse = true;
					col.isDrivingCar = false;
					sim.uniCar.isDriving = false;
				}
			} else if (asset === "exhibitD") {
				col.maritalAssetGrid.exhibitDAttached = true;
				col.maritalAssetGrid.manuscriptAppraisedValue = 0;
			}

			advanceSimMinutes(col, 12);
			recordLegalDebt(
				col,
				"Vance & Assoc. — Asset Allocation Worksheet Review (0.2 hr)",
				52,
			);
			soundEngine.playOfficeKeyboardClack();
			setAcademicColloquium({ ...col });
		},
		[],
	);

	const handleAcceptSettlementWorksheet = useCallback(() => {
		const sim = simRef.current;
		const col = sim.academicColloquium;
		if (!col?.active) return;

		const g = col.maritalAssetGrid;
		if (
			g.condoAssignedTo === "UNDECIDED" ||
			g.wagonAssignedTo === "UNDECIDED" ||
			!g.exhibitDAttached
		) {
			col.colloquiumLog = [
				`⚖️ [${formatSimClock(col.timeOfDayMinutes)}] Vance: "Assign the underwater condo, the wagon, and attach Exhibit D (Reviewer #2) before I file."`,
				...col.colloquiumLog.slice(0, 9),
			];
			soundEngine.playRejectionStamp();
			setAcademicColloquium({ ...col });
			return;
		}

		g.settlementAccepted = true;
		if (g.wagonAssignedTo === "SPOUSE") {
			col.stationWagonSeizedBySpouse = true;
		}
		col.domesticArcStage = "SEPARATED";
		advanceSimMinutes(col, 30);
		recordLegalDebt(
			col,
			"Vance & Assoc. — Settlement Worksheet Filing (0.5 hr)",
			130,
		);
		col.colloquiumLog = [
			`⚖️ [${formatSimClock(col.timeOfDayMinutes)}] Settlement worksheet filed. Condo: ${g.condoAssignedTo}. Wagon: ${g.wagonAssignedTo}. Manuscript IP: $0.00 (Exhibit D).`,
			...col.colloquiumLog.slice(0, 9),
		];
		soundEngine.playRejectionStamp();
		setAcademicColloquium({ ...col });
	}, []);

	const handleAttendSettlementDeposition = useCallback(() => {
		const sim = simRef.current;
		const col = sim.academicColloquium;
		if (!col?.active) return;
		if (!col.maritalAssetGrid.settlementAccepted) {
			col.colloquiumLog = [
				`⚖️ [${formatSimClock(col.timeOfDayMinutes)}] Vance: "We don't depose until the asset grid is filed."`,
				...col.colloquiumLog.slice(0, 9),
			];
			soundEngine.playRejectionStamp();
			setAcademicColloquium({ ...col });
			return;
		}
		col.depositionModalOpen = true;
		advanceSimMinutes(
			col,
			240,
			"Four-hour settlement deposition at Vance & Assoc. strip-mall office",
		);
		recordLegalDebt(
			col,
			"Vance & Assoc. — Settlement Deposition (4.0 hr)",
			1040,
		);
		soundEngine.playOfficeKeyboardClack();
		setAcademicColloquium({ ...col });
	}, []);

	const handleConfirmDepositionEpiphany = useCallback(() => {
		const sim = simRef.current;
		const col = sim.academicColloquium;
		if (!col?.active) return;

		col.depositionEpiphanySeen = true;
		col.entanglementSwapUnlocked = true;
		col.domesticArcStage = "DEPOSITION_DONE";
		col.depositionModalOpen = false;
		col.proofWorkbench.monogamyLemmaAnnotated = true;
		col.proofWorkbench.lastVerificationMessage =
			"✓ Coffman–Kundu–Wootters monogamy: τ(A|B)+τ(A|C) ≤ τ(A|BC). King maximally entangled with Queen — entanglement swap on Turn 1 decoheres the crown.";
		recomputeProofIntegrity(col);
		recordLegalDebt(
			col,
			"Vance & Assoc. — Emotional Recess / Napkin (0.2 hr)",
			52,
		);
		col.colloquiumLog = [
			`💔 [${formatSimClock(col.timeOfDayMinutes)}] Deposition epiphany: the marriage failed because a quantum state cannot obey three-party non-local correlation. Entanglement Swap unlocked.`,
			`⚖️ Arthur Vance hands you a paper napkin: "Take a minute, Dr. Pawn. We'll bill this recess as a 0.2."`,
			...col.colloquiumLog.slice(0, 8),
		];
		col.npcMemoryNotes = [
			"CKW MONOGAMY: To checkmate the King yesterday, force an entanglement swap on Turn 1 so his state decoheres from the crown.",
			...col.npcMemoryNotes.slice(0, 5),
		];
		soundEngine.playSynodResonance(true);
		setAcademicColloquium({ ...col });
	}, []);

	const handleEatHotPlateSoup = useCallback(() => {
		const sim = simRef.current;
		const col = sim.academicColloquium;
		if (!col?.active || !col.livingInOffice4B) return;

		if (col.checkingBalance < 0.89) {
			col.colloquiumLog = [
				`🍲 [${formatSimClock(col.timeOfDayMinutes)}] Condensed tomato soup is $0.89. You have $${col.checkingBalance.toFixed(2)}. The hot plate stays cold.`,
				...col.colloquiumLog.slice(0, 9),
			];
			soundEngine.playRejectionStamp();
			setAcademicColloquium({ ...col });
			return;
		}

		recordPersonalTransaction(
			col,
			"Room 4B Hot Plate — Condensed Tomato Soup (can)",
			"CAFETERIA",
			-0.89,
		);
		col.hotPlateDinnerEatenTonight = true;
		col.energyLevel = Math.min(100, col.energyLevel + 12);
		advanceSimMinutes(col, 15);
		col.colloquiumLog = [
			`🍲 [${formatSimClock(col.timeOfDayMinutes)}] Heated a $0.89 can of condensed tomato soup on the electric hot plate beside the dead 1987 Bunn-O-Matic.`,
			...col.colloquiumLog.slice(0, 9),
		];
		soundEngine.playBrokenCoffeeMachineSputter();
		setAcademicColloquium({ ...col });
	}, []);

	const handleAdjustSurfaceCommutator = useCallback((offset: number) => {
		const sim = simRef.current;
		const col = sim.academicColloquium;
		if (!col?.active) return;

		col.proofWorkbench.surfaceCommutatorOffset = offset;
		const balanced = Math.abs(offset) < 0.08;
		col.proofWorkbench.hermitianBoundaryBalanced = balanced;
		if (balanced) {
			col.proofWorkbench.lastVerificationMessage =
				"✓ Surface flux balanced: ⟨φ|Ĥψ⟩ = ⟨Ĥφ|ψ⟩ on ∂M. Toby ran the numerical check — eigenvalues λ_k are strictly real.";
			soundEngine.playSynodResonance(false);
		} else {
			col.proofWorkbench.lastVerificationMessage =
				"✗ Energy leaking across ∂M at t₀−1. ∑P_i ≠ 1 — probability non-conservation. Pawn erasure risk from mathematical inconsistency.";
			soundEngine.playBrokenCoffeeMachineSputter();
		}
		recomputeProofIntegrity(col);
		setAcademicColloquium({ ...col });
	}, []);

	const handleAdjustChshAngles = useCallback(
		(angleA: number, angleB: number) => {
			const sim = simRef.current;
			const col = sim.academicColloquium;
			if (!col?.active) return;

			col.proofWorkbench.measurementAngleA = angleA;
			col.proofWorkbench.measurementAngleB = angleB;
			col.proofWorkbench.chshS = Number(
				computeChshS(angleA, angleB).toFixed(4),
			);
			const tsirelson = 2 * Math.SQRT2;
			if (col.proofWorkbench.chshS >= tsirelson - 0.05) {
				col.proofWorkbench.lastVerificationMessage = `✓ CHSH S = ${col.proofWorkbench.chshS.toFixed(3)} ≈ 2√2 (Tsirelson bound). Assist strikes may breach classical locality.`;
				soundEngine.playSynodResonance(false);
			} else if (col.proofWorkbench.chshS <= 2.01) {
				col.proofWorkbench.lastVerificationMessage = `CHSH S = ${col.proofWorkbench.chshS.toFixed(3)} ≤ 2 (classical bound). Entangled assists deal standard damage.`;
			} else {
				col.proofWorkbench.lastVerificationMessage = `CHSH S = ${col.proofWorkbench.chshS.toFixed(3)} — quantum correlator between classical and Tsirelson.`;
			}
			recomputeProofIntegrity(col);
			setAcademicColloquium({ ...col });
		},
		[],
	);

	const handleAttendScheduledMeetingInRoom = useCallback(
		(appointmentId: string) => {
			const sim = simRef.current;
			const col = sim.academicColloquium;
			if (!col?.active) return;

			const apt = col.appointments.find((a) => a.id === appointmentId);
			if (!apt) return;

			if (col.currentRoom !== apt.locationRoom) {
				const dest = UNIVERSITY_ROOM_CENTERS[apt.locationRoom];
				col.currentRoom = apt.locationRoom;
				sim.uniPlayer.worldX = dest.x;
				sim.uniPlayer.worldZ = dest.z;
			}

			col.timeOfDayMinutes =
				Math.max(col.timeOfDayMinutes, apt.startMinutes) + 30;
			const stained = col.shirtState === "COFFEE_STAINED";
			const sweater = col.shirtState === "AT_CLEANERS_WEARING_SWEATER";

			apt.status = stained
				? "ATTENDED_STAINED"
				: sweater
					? "ATTENDED_SWEATER"
					: "ATTENDED_CLEAN";

			if (apt.id === "appt_tue_toby") {
				col.tobyRelationship = Math.min(100, col.tobyRelationship + 16);
				apt.outcomeNote = stained
					? "Toby handed you paper napkins for your coffee-stained shirt and pointed out the −κ Jacobian sign error on the chalkboard."
					: "Reviewed the off-diagonal Jacobian sign error with Toby at the Room 4B chalkboard (+16 Toby Trust).";
				col.npcMemoryNotes = [
					`Met with Toby on Tuesday morning; he showed you how flipping −κ to +κ fixes the Jacobian determinant.`,
					...col.npcMemoryNotes.slice(0, 5),
				];
				col.colloquiumLog = [
					`🎓 [${formatSimClock(col.timeOfDayMinutes)}] Attended 10:00 Consultation with Toby: ${apt.outcomeNote}`,
					...col.colloquiumLog.slice(0, 9),
				];
			} else if (apt.id === "appt_tue_bishop") {
				if (stained) {
					col.bishopRelationship = Math.max(5, col.bishopRelationship - 20);
					col.chairRelationship = Math.max(5, col.chairRelationship - 16);
					apt.outcomeNote =
						'Arrived wearing a massive brown espresso stain! Prof. Bishop scoffed at your "sloppy preparation" and refused daytime Lab access (-20 Bishop, -16 Chair).';
					col.npcMemoryNotes = [
						`Prof. Bishop & Chairwoman Queen were appalled that you wore a coffee-stained shirt to the 14:30 review.`,
						...col.npcMemoryNotes.slice(0, 5),
					];
					const stainEmail = {
						id: `email_bishop_stain_${Date.now()}`,
						sender: "Prof. Bishop (Quantum Lab Director)",
						senderRole: "Chiral Interferometry Committee · Seminar Room 204",
						subject: "RE: Your Coffee-Stained Appearance at the 14:30 Review",
						dateLabel: `Tuesday ${formatSimClock(col.timeOfDayMinutes)}`,
						category: "LAB_POLITICS" as const,
						unread: true,
						body: `Dr. Pawn,\n\nYou walked into Seminar Room 204 at 14:30 with dark cafeteria coffee soaked across your dress shirt and asked me to entrust a $4.2M Chiral Interferometer to your group.\n\nIf you cannot keep coffee off your own collar, I certainly cannot risk you near our diagonal mirrors without an approved cryogenic helium budget ($950). Clean yourself up and submit a proper Grant Budget first.\n\n— Prof. Bishop`,
					};
					col.inbox = [stainEmail, ...col.inbox];
					col.selectedEmailId = stainEmail.id;
				} else if (sweater) {
					col.bishopRelationship = Math.min(100, col.bishopRelationship + 6);
					col.chairRelationship = Math.min(100, col.chairRelationship + 4);
					col.bishopLabAccessGranted = true;
					col.bishopSuspectedWithholding = false;
					apt.outcomeNote =
						"Attended in your backup UGA sweatshirt while your shirt was at Perseus Dry Cleaners. Chairwoman Queen raised an eyebrow, but Prof. Bishop respected your punctuality and granted a 2:00 AM Lab slot!";
				} else {
					col.bishopRelationship = Math.min(100, col.bishopRelationship + 22);
					col.chairRelationship = Math.min(100, col.chairRelationship + 16);
					col.bishopLabAccessGranted = true;
					col.bishopSuspectedWithholding = false;
					apt.outcomeNote =
						"Arrived in a spotless Oxford dress shirt! Prof. Bishop and Chairwoman Queen approved your 2:00 AM Tuesday Chiral Interferometer slot (+22 Bishop, +16 Chair).";
				}
				col.colloquiumLog = [
					`📋 [${formatSimClock(col.timeOfDayMinutes)}] 14:30 Departmental Review Outcome: ${apt.outcomeNote}`,
					...col.colloquiumLog.slice(0, 9),
				];
			} else if (apt.id === "appt_wed_seminar") {
				col.rookIdenticalPapersCount += 1;
				col.rookHIndex += 2;
				if (stained) {
					col.reviewer2RivalryLevel = Math.min(
						100,
						col.reviewer2RivalryLevel + 22,
					);
					apt.outcomeNote =
						"Debated Prof. Rook while wearing a coffee-stained shirt; Rook mocked your attire from the podium.";
				} else {
					col.hIndex += 1;
					col.reviewer2RivalryLevel = Math.min(
						100,
						col.reviewer2RivalryLevel + 15,
					);
					apt.outcomeNote =
						"Publicly dismantled Prof. Rook’s 4th identical rectilinear paper in Seminar Room 204 (+1 h-index)!";
				}
				col.colloquiumLog = [
					`🏛️ [${formatSimClock(col.timeOfDayMinutes)}] Wednesday Faculty Colloquium: ${apt.outcomeNote}`,
					...col.colloquiumLog.slice(0, 9),
				];
			}

			syncAppointmentsWithClock(col, false);
			soundEngine.playSynodResonance(false);
			setAcademicColloquium({ ...col });
		},
		[],
	);

	const handleTalkToNpcInRoom = useCallback(
		(npcId: "TOBY" | "BISHOP" | "QUEEN" | "ROOK") => {
			const sim = simRef.current;
			const col = sim.academicColloquium;
			if (!col?.active) return;

			advanceSimMinutes(col, 10);
			const stained = col.shirtState === "COFFEE_STAINED";

			if (npcId === "TOBY") {
				col.tobyRelationship = Math.min(100, col.tobyRelationship + 6);
				if (col.livingInOffice4B && col.timeOfDayMinutes < 9 * 60) {
					col.colloquiumLog = [
						`💬 [${formatSimClock(col.timeOfDayMinutes)}] Toby awkwardly tries not to look at your sleeping bag under the oak desk, sets down a lukewarm donut, and mumbles: "Morning, Dr. Pawn... I ran the matrix diagonals again. Also—thanks again for the croissant. I didn't know it would... cost that much."`,
						...col.colloquiumLog.slice(0, 9),
					];
				} else if (
					col.tobyCroissantPurchased &&
					col.domesticArcStage === "CROISSANT_BOUGHT"
				) {
					col.colloquiumLog = [
						`💬 [${formatSimClock(col.timeOfDayMinutes)}] Toby, flaky crumbs on his corduroy: "This almond croissant is transcendent. Don't you have an anniversary dinner tonight though?"`,
						...col.colloquiumLog.slice(0, 9),
					];
				} else {
					col.colloquiumLog = [
						stained
							? `💬 [${formatSimClock(col.timeOfDayMinutes)}] Toby winced at your coffee-stained shirt: "Dr. Pawn, did you get run over in the cafeteria?! Open the Chalkboard Workbench so we can flip the −κ Jacobian sign and select the Chiral Anti-Periodic gauge!"`
							: `💬 [${formatSimClock(col.timeOfDayMinutes)}] Toby points to the chalkboard: "Once we select the Chiral Anti-Periodic gauge ψ(t₀−1) = −γ₅ψ(t₀) and flip −κ to +κ, we just need Prof. Bishop's Chiral Lab data!"`,
						...col.colloquiumLog.slice(0, 9),
					];
				}
			} else if (npcId === "BISHOP") {
				if (stained) {
					col.bishopRelationship = Math.max(5, col.bishopRelationship - 8);
					col.colloquiumLog = [
						`💬 [${formatSimClock(col.timeOfDayMinutes)}] Prof. Bishop stepped back in disgust: "Good grief, Pawn, you smell like roasted Arabica. Do not come into Seminar Room 204 at 14:30 wearing that stained shirt!"`,
						...col.colloquiumLog.slice(0, 9),
					];
				} else if (
					!col.bishopLabAccessGranted &&
					col.departmentalBudget >= 950
				) {
					col.bishopLabAccessGranted = true;
					col.bishopSuspectedWithholding = false;
					col.bishopRelationship = Math.min(100, col.bishopRelationship + 12);
					col.colloquiumLog = [
						`💬 [${formatSimClock(col.timeOfDayMinutes)}] Cornered Prof. Bishop in clean attire! Seeing your solvent departmental budget, he authorized the 2:00 AM Chiral Interferometer slot.`,
						...col.colloquiumLog.slice(0, 9),
					];
				} else {
					col.colloquiumLog = [
						`💬 [${formatSimClock(col.timeOfDayMinutes)}] Prof. Bishop adjusted his burgundy velvet elbow patches: "${col.bishopLabAccessGranted ? "Your 2:00 AM Chiral Lab slot is active. Run your experiment from the Chalkboard Workbench." : "Meet me at 14:30 in Seminar Room 204 in respectable attire, and make sure your Departmental Budget has $950 for liquid helium."}"`,
						...col.colloquiumLog.slice(0, 9),
					];
				}
			} else if (npcId === "QUEEN") {
				if (stained) {
					col.chairRelationship = Math.max(5, col.chairRelationship - 8);
					col.colloquiumLog = [
						`💬 [${formatSimClock(col.timeOfDayMinutes)}] Chairwoman Dr. Queen glared at your chest: "Dr. Pawn, is that espresso on your shirt? Visit Perseus Dry Cleaners before the 14:30 review."`,
						...col.colloquiumLog.slice(0, 9),
					];
				} else {
					col.chairRelationship = Math.min(100, col.chairRelationship + 5);
					col.colloquiumLog = [
						`💬 [${formatSimClock(col.timeOfDayMinutes)}] Chairwoman Dr. Queen reviewed her clipboard: "Keep your Faculty Productivity Index above 65 and submit your legitimate Departmental Grant lines in the Ledger."`,
						...col.colloquiumLog.slice(0, 9),
					];
				}
			} else if (npcId === "ROOK") {
				col.rookIdenticalPapersCount += 1;
				col.rookHIndex += 1;
				col.reviewer2RivalryLevel = Math.min(
					100,
					col.reviewer2RivalryLevel + 12,
				);
				col.colloquiumLog = [
					stained
						? `💬 [${formatSimClock(col.timeOfDayMinutes)}] Tenured Prof. Rook chuckled over his espresso: "Nice coffee stain, Pawn. By the way, I just rejected a terribly speculative retrocausal paper this morning as Reviewer #2."`
						: `💬 [${formatSimClock(col.timeOfDayMinutes)}] Tenured Prof. Rook adjusted his gold cufflinks: "My h-index just hit ${col.rookHIndex} after publishing 'On Rectilinear Files IV'. Have you considered citing me in Lemma 3.2?"`,
					...col.colloquiumLog.slice(0, 9),
				];
			}

			soundEngine.playOfficeKeyboardClack();
			setAcademicColloquium({ ...col });
		},
		[],
	);

	// CHALKBOARD PROOF WORKBENCH HANDLERS
	const handleSelectBoundaryGauge = useCallback(
		(
			gauge:
				| "DIRICHLET_CLAMP"
				| "CHIRAL_ANTIPERIODIC"
				| "TRUNCATED_PERTURBATIVE",
		) => {
			const sim = simRef.current;
			const col = sim.academicColloquium;
			if (!col?.active) return;

			advanceSimMinutes(col, 25);
			col.proofWorkbench.boundaryGaugeChoice = gauge;
			if (gauge === "CHIRAL_ANTIPERIODIC") {
				col.proofWorkbench.boundaryGaugeVerified = true;
				col.proofWorkbench.lastVerificationMessage =
					"✓ Chiral Anti-Periodic Gauge ψ(t₀−1) = −γ₅ψ(t₀) verified! The boundary commutator surface term vanishes identically.";
				soundEngine.playSynodResonance(false);
			} else if (gauge === "DIRICHLET_CLAMP") {
				col.proofWorkbench.boundaryGaugeVerified = false;
				col.proofWorkbench.lastVerificationMessage =
					"✗ Hard Dirichlet Clamp ψ(t₀−1) = 0 violates causal unitarity and zeroes out the retrocausal propagator.";
				soundEngine.playBrokenCoffeeMachineSputter();
			} else {
				col.proofWorkbench.boundaryGaugeVerified = false;
				col.proofWorkbench.lastVerificationMessage =
					"✗ Truncated O(ε²) expansion still diverges at the t₀ − 1 monarch worldline pole.";
				soundEngine.playBrokenCoffeeMachineSputter();
			}
			recomputeProofIntegrity(col);
			setAcademicColloquium({ ...col });
		},
		[],
	);

	const handleToggleJacobianSign = useCallback(() => {
		const sim = simRef.current;
		const col = sim.academicColloquium;
		if (!col?.active) return;

		advanceSimMinutes(col, 20);
		col.proofWorkbench.jacobianSignFlipped =
			!col.proofWorkbench.jacobianSignFlipped;
		col.proofWorkbench.lastVerificationMessage = col.proofWorkbench
			.jacobianSignFlipped
			? "✓ Flipped off-diagonal Jacobian sign from −κ to +κ! Determinant is now λ² + κ² > 0 (strictly positive-definite)."
			: "✗ Reverted off-diagonal Jacobian sign to −κ (singular at λ = ±κ).";
		recomputeProofIntegrity(col);
		soundEngine.playOfficeKeyboardClack();
		setAcademicColloquium({ ...col });
	}, []);

	const handleRunChiralLabExperiment = useCallback(() => {
		const sim = simRef.current;
		const col = sim.academicColloquium;
		if (!col?.active) return;

		if (!col.bishopLabAccessGranted) {
			col.colloquiumLog = [
				`🔬 [${formatSimClock(col.timeOfDayMinutes)}] Cannot run Chiral Lab verification yet: Prof. Bishop has not granted you access to the Chiral Interferometer! Attend the 14:30 review in Seminar Room 204 or talk to him with a funded budget.`,
				...col.colloquiumLog.slice(0, 9),
			];
			soundEngine.playRejectionStamp();
			setAcademicColloquium({ ...col });
			return;
		}

		if (col.departmentalBudget < 950) {
			col.colloquiumLog = [
				`🔬 [${formatSimClock(col.timeOfDayMinutes)}] Insufficient Departmental Budget ($${col.departmentalBudget.toFixed(2)}) for the $950 Liquid Helium run! Submit a Departmental Grant in the Finance Ledger first.`,
				...col.colloquiumLog.slice(0, 9),
			];
			soundEngine.playRejectionStamp();
			setAcademicColloquium({ ...col });
			return;
		}

		advanceSimMinutes(col, 45);
		recordDepartmentalTransaction(
			col,
			"Chiral Interferometry Facility — 02:00 AM Liquid Helium & Mirror Calibration Run",
			"LAB_EQUIPMENT",
			-950,
		);
		col.proofWorkbench.chiralLabDataAttached = true;
		col.proofWorkbench.lastVerificationMessage =
			"✓ 02:00 AM Chiral Interferometer data attached (4.8σ retrocausal phase convergence)!";
		recomputeProofIntegrity(col);

		if (
			col.centralLemmaIntegrity >= 100 &&
			!col.inbox.some((e) => e.id === "email_lemma_fixed")
		) {
			const fixedEmail = {
				id: "email_lemma_fixed",
				sender: "Toby (Your Graduate Student)",
				senderRole: "7th-Year PhD Candidate · Office 4B-Annex",
				subject: "WE FIXED IT!! Central Lemma 3.2 is 100% Airtight!",
				dateLabel: `${DAY_NAMES_LIST[col.dayIndex % 5]} ${formatSimClock(col.timeOfDayMinutes)}`,
				category: "GRAD_STUDENT" as const,
				unread: true,
				body: `Dr. Pawn!\n\nWith the Chiral Anti-Periodic gauge ψ(t₀−1) = −γ₅ψ(t₀), the corrected +κ Jacobian determinant, and our 4.8σ Chiral Interferometer data, Central Lemma 3.2 is 100% mathematically airtight!\n\n"On the Nonexistence of Monarchs in Retrocausal Systems" is ready for formal submission to the Journal of Transfinite Causality!\n\n— Toby`,
			};
			col.inbox = [fixedEmail, ...col.inbox];
			col.selectedEmailId = fixedEmail.id;
		}

		col.colloquiumLog = [
			`🔬 [${formatSimClock(col.timeOfDayMinutes)}] Ran 02:00 AM Chiral Interferometer experiment (-$950 Dept. Budget). Central Lemma 3.2 Integrity is now ${col.centralLemmaIntegrity}%!`,
			...col.colloquiumLog.slice(0, 9),
		];
		soundEngine.playSynodResonance(false);
		setAcademicColloquium({ ...col });
	}, []);

	const handleToggleRookCitations = useCallback(() => {
		const sim = simRef.current;
		const col = sim.academicColloquium;
		if (!col?.active) return;

		col.proofWorkbench.rookCitationsAttached =
			!col.proofWorkbench.rookCitationsAttached;
		col.reviewer2CitationsBribed = col.proofWorkbench.rookCitationsAttached;
		soundEngine.playOfficeKeyboardClack();
		setAcademicColloquium({ ...col });
	}, []);

	// PERSONAL & DEPARTMENTAL FINANCIAL LEDGERS + GRANT BUDGET BUILDER
	const handleToggleGrantLineItem = useCallback((lineId: string) => {
		const sim = simRef.current;
		const col = sim.academicColloquium;
		if (!col?.active) return;

		col.grantBudgetLines = col.grantBudgetLines.map((l) =>
			l.id === lineId ? { ...l, selected: !l.selected } : l,
		);
		soundEngine.playOfficeKeyboardClack();
		setAcademicColloquium({ ...col });
	}, []);

	const handleSubmitGrantBudgetProposal = useCallback(() => {
		const sim = simRef.current;
		const col = sim.academicColloquium;
		if (!col?.active || col.grantSubmittedAndApproved) return;

		const selectedLines = col.grantBudgetLines.filter((l) => l.selected);
		if (selectedLines.length === 0) {
			col.colloquiumLog = [
				`📑 [${formatSimClock(col.timeOfDayMinutes)}] Select at least one budget line item before submitting your Departmental Grant Proposal.`,
				...col.colloquiumLog.slice(0, 9),
			];
			soundEngine.playRejectionStamp();
			setAcademicColloquium({ ...col });
			return;
		}

		const illegalItem = selectedLines.find(
			(l) => l.isProhibitedPersonalExpense,
		);
		if (illegalItem) {
			col.chairRelationship = Math.max(5, col.chairRelationship - 18);
			col.adminProductivityScore = Math.max(
				10,
				Number((col.adminProductivityScore - 6.0).toFixed(1)),
			);
			col.colloquiumLog = [
				`🚨 [${formatSimClock(col.timeOfDayMinutes)}] GRANT REJECTED BY COMPLIANCE AUDIT! You attempted to bill "${illegalItem.label}" ($${illegalItem.directCost}) to a restricted Departmental Research Grant! Chairwoman Queen docked your relationship (-18). Uncheck prohibited personal items and resubmit.`,
				...col.colloquiumLog.slice(0, 9),
			];
			soundEngine.playRejectionStamp();
			setAcademicColloquium({ ...col });
			return;
		}

		advanceSimMinutes(col, 30);
		const totalDirect = selectedLines.reduce((acc, l) => acc + l.directCost, 0);
		col.grantSubmittedAndApproved = true;
		recordDepartmentalTransaction(
			col,
			`UGA Supplemental Grant Award (Direct Allocation after 58.5% University Overhead)`,
			"GRANT_AWARD",
			totalDirect,
		);
		col.chairRelationship = Math.min(100, col.chairRelationship + 12);
		col.tobyRelationship = Math.min(100, col.tobyRelationship + 15);
		col.adminProductivityScore = Math.min(
			99,
			Number((col.adminProductivityScore + 6.5).toFixed(1)),
		);

		const grantEmail = {
			id: `email_grant_${Date.now()}`,
			sender: "Dr. Queen (Department Chair)",
			senderRole: "Office of Sponsored Research & Indirect Overhead",
			subject: `Supplemental Grant Approved: +$${totalDirect.toLocaleString()} Credited to Dept. Acct`,
			dateLabel: `${DAY_NAMES_LIST[col.dayIndex % 5]} ${formatSimClock(col.timeOfDayMinutes)}`,
			category: "CHAIR" as const,
			unread: true,
			body: `Dr. Pawn,\n\nYour compliant Departmental Grant budget ($${totalDirect.toLocaleString()} direct research costs; 58.5% indirect overhead retained by the University) has been approved.\n\nYour Departmental Budget is now $${col.departmentalBudget.toFixed(2)}, which is sufficient to cover Professor Bishop's $950 Chiral Lab liquid helium fee and Toby's graduate stipend.\n\n— Chairwoman Dr. Queen`,
		};
		col.inbox = [grantEmail, ...col.inbox];
		col.selectedEmailId = grantEmail.id;
		col.colloquiumLog = [
			`💵 [${formatSimClock(col.timeOfDayMinutes)}] Departmental Grant Approved! +$${totalDirect.toFixed(2)} credited to Departmental Account (New Balance: $${col.departmentalBudget.toFixed(2)}).`,
			...col.colloquiumLog.slice(0, 9),
		];
		soundEngine.playSynodResonance(false);
		setAcademicColloquium({ ...col });
	}, []);

	const handlePayMonthlyMortgage = useCallback(() => {
		const sim = simRef.current;
		const col = sim.academicColloquium;
		if (!col?.active || col.mortgagePaidThisWeek) return;

		if (col.checkingBalance < col.monthlyMortgage) {
			col.colloquiumLog = [
				`🏦 [${formatSimClock(col.timeOfDayMinutes)}] Cannot pay $${col.monthlyMortgage.toFixed(2)} mortgage! Your personal checking balance is only $${col.checkingBalance.toFixed(2)}.`,
				...col.colloquiumLog.slice(0, 9),
			];
			soundEngine.playRejectionStamp();
			setAcademicColloquium({ ...col });
			return;
		}

		advanceSimMinutes(col, 10);
		recordPersonalTransaction(
			col,
			"Andromeda S&L — Monthly Faculty Condo Mortgage (#884-B)",
			"MORTGAGE",
			-col.monthlyMortgage,
		);
		col.mortgagePaidThisWeek = true;
		col.colloquiumLog = [
			`🏠 [${formatSimClock(col.timeOfDayMinutes)}] Paid $${col.monthlyMortgage.toFixed(2)} monthly mortgage from Personal Checking. Remaining liquid cash: $${col.checkingBalance.toFixed(2)}!`,
			...col.colloquiumLog.slice(0, 9),
		];
		soundEngine.playOfficeKeyboardClack();
		setAcademicColloquium({ ...col });
	}, []);

	const handleAttemptIllegalDepartmentalReimbursement = useCallback(() => {
		const sim = simRef.current;
		const col = sim.academicColloquium;
		if (!col?.active) return;

		col.chairRelationship = Math.max(5, col.chairRelationship - 14);
		col.colloquiumLog = [
			`🚨 [${formatSimClock(col.timeOfDayMinutes)}] COMPLIANCE BLOCK: Departmental Grant Funds (#UGA-MATH-4B) cannot be transferred to pay your personal mortgage or dry-cleaning bills (-14 Chair Relationship)!`,
			...col.colloquiumLog.slice(0, 9),
		];
		soundEngine.playRejectionStamp();
		setAcademicColloquium({ ...col });
	}, []);

	const handleAdvanceTimeMinutes = useCallback(
		(mins: number, reason: string) => {
			const sim = simRef.current;
			const col = sim.academicColloquium;
			if (!col?.active) return;

			advanceSimMinutes(col, mins, reason);
			soundEngine.playOfficeKeyboardClack();
			setAcademicColloquium({ ...col });
		},
		[],
	);

	const handleSleepUntilNextMorning = useCallback(() => {
		const sim = simRef.current;
		const col = sim.academicColloquium;
		if (!col?.active) return;

		// Anniversary night: croissant bought and still haven't walked home — force the collapse
		if (
			col.tobyCroissantPurchased &&
			col.domesticArcStage === "CROISSANT_BOUGHT" &&
			col.homeAccess === "OWNED"
		) {
			executeForcedAnniversaryWalkHome(col, sim);
			setAcademicColloquium({ ...col });
			return;
		}

		syncAppointmentsWithClock(col, true);

		const prevDay = col.dayIndex;
		if (col.dayIndex < 4) {
			col.dayIndex += 1;
		} else {
			col.dayIndex = 0;
			if (col.semester === "Fall") {
				col.semester = "Spring";
			} else {
				col.semester = "Fall";
				col.academicYear = Math.min(6, col.academicYear + 1);
			}
			recordPersonalTransaction(
				col,
				"University of Greater Andromeda — Bi-Weekly Faculty Salary Deposit",
				"SALARY",
				1850.0,
			);
			// Accrue unpaid legal debt interest on salary Fridays (~1% of 12% annual per biweekly ≈ monthly/2)
			if (col.legalDebtBalance > 0) {
				const interest = Number(
					(col.legalDebtBalance * (col.vanceUnpaidInterestRate / 12)).toFixed(
						2,
					),
				);
				col.legalDebtBalance = Number(
					(col.legalDebtBalance + interest).toFixed(2),
				);
				col.colloquiumLog = [
					`⚖️ Vance & Assoc. interest penalty: +$${interest.toFixed(2)} on unpaid legal debt (now $${col.legalDebtBalance.toFixed(2)}).`,
					...col.colloquiumLog.slice(0, 9),
				];
			}
		}

		// After anniversary note, next morning unlocks LEGAL / MARITAL LEDGER
		if (
			col.domesticArcStage === "NOTE_RECEIVED" ||
			col.domesticArcStage === "SEPARATED"
		) {
			col.legalTabUnlocked = true;
			if (col.domesticArcStage === "NOTE_RECEIVED") {
				col.domesticArcStage = "SEPARATED";
			}
		}
		void prevDay;

		col.timeOfDayMinutes = 8 * 60 + 30; // 08:30 AM
		const sleptHungry = col.livingInOffice4B && !col.hotPlateDinnerEatenTonight;
		col.energyLevel = sleptHungry ? 62 : 100;
		col.hotPlateDinnerEatenTonight = false;
		col.carryingHotCoffee = false;
		col.cafeteriaQueuePosition = null;
		col.cafeteriaServiceProgress = 0;
		col.currentRoom = "OFFICE_4B";
		sim.uniPlayer.worldX = -10.0;
		sim.uniPlayer.worldZ = -3.2;
		sim.uniPlayer.targetX = null;
		sim.uniPlayer.targetZ = null;

		const livingFlavor = col.livingInOffice4B
			? ` Slept under the oak desk in a cheap blue sleeping bag. 07:30 communal restroom shave in the cracked mirror.${sleptHungry ? " Skipped hot-plate soup — energy 62." : ""}${col.legalTabUnlocked ? " LEGAL / MARITAL LEDGER is unlocked." : ""}`
			: "";

		col.colloquiumLog = [
			`🌅 [${DAY_NAMES_LIST[col.dayIndex]} 08:30] Arrived at Room 4B, Peano Hall. Rain taps against the glass. Personal Checking: $${col.checkingBalance.toFixed(2)}.${livingFlavor}`,
			...col.colloquiumLog.slice(0, 9),
		];
		soundEngine.playOfficeKeyboardClack();
		setAcademicColloquium({ ...col });
	}, []);

	const handleSubmitToJournalOfTransfiniteCausality = useCallback(() => {
		const sim = simRef.current;
		const col = sim.academicColloquium;
		if (!col?.active) return;

		const nextRejection = Math.min(3, col.journalRejections + 1);
		col.journalRejections = nextRejection;
		col.reviewer2RivalryLevel = Math.min(100, col.reviewer2RivalryLevel + 25);

		if (nextRejection === 1) {
			col.academicYear = Math.max(col.academicYear + 1, 2);
			col.semester = "Spring";
		} else if (nextRejection === 2) {
			col.academicYear = Math.max(col.academicYear + 1, 4);
			col.semester = "Fall";
		} else {
			col.academicYear = 6;
			col.semester = "Spring";
		}

		const hermNote = col.proofWorkbench.hermitianBoundaryBalanced
			? "The boundary self-adjoint extension is now formally correct"
			: "Equation 12 diverges because the author treats a Hilbert space as finite-dimensional when dealing with open files, and neglects the non-trivial topology of the toroidal board";
		const chshNote =
			col.proofWorkbench.chshS >= 2 * Math.SQRT2 - 0.05
				? "CHSH correlators approach the Tsirelson bound"
				: "CHSH analysis remains classical (S ≤ 2) and therefore pedagogically incomplete";
		const rejectionReasons = [
			`DECISION: REJECT.\n\nReferee Report (Reviewer #2):\n"The author attempts to apply a Wick rotation to the temporal metric in Section 4, but completely neglects the non-trivial topology of the toroidal board. ${hermNote}. Furthermore, the manuscript fails to cite Rook (2021), Rook (2023), or Rook (2025) on rectilinear files. Deservedly rejected."`,
			`DECISION: REJECT (2nd Submission).\n\nReferee Report (Reviewer #2):\n"Despite the author's 47-page revision and 2:00 AM Chiral Lab data, ${chshNote}. I remain philosophically opposed to retrocausal regicide. My h-index is ${col.rookHIndex}; the author's is ${col.hIndex}. Reject."`,
			`DECISION: FINAL REJECTION (3rd Submission — Editorial Ban).\n\nReferee Report (Reviewer #2):\n"This is the third time Dr. Pawn has submitted 'On the Nonexistence of Monarchs in Retrocausal Systems.' The proof is technically flawless${col.proofWorkbench.monogamyLemmaAnnotated ? " (even the Coffman–Kundu–Wootters monogamy appendix is correct)" : ""}, which makes it even more offensive to classical hierarchy. Do not resubmit to the Journal of Transfinite Causality."`,
		];

		const rejEmail = {
			id: `email_jtc_reject_${nextRejection}`,
			sender: "Journal of Transfinite Causality (Editorial Desk)",
			senderRole: `Decision Letter #${nextRejection} · Reviewer #2`,
			subject: `DECISION: Manuscript #JTC-00${nextRejection} — REJECTED (${nextRejection}/3)`,
			dateLabel: `Year ${col.academicYear} · ${col.semester}`,
			category: "REVIEWER_2" as const,
			unread: true,
			body: rejectionReasons[nextRejection - 1],
		};

		col.inbox = [rejEmail, ...col.inbox];
		col.selectedEmailId = rejEmail.id;
		col.colloquiumLog = [
			`❌ Year ${col.academicYear}: Rejection #${nextRejection}/3 from the Journal of Transfinite Causality! Reviewer #2 blocked publication again.`,
			...col.colloquiumLog.slice(0, 9),
		];

		soundEngine.playRejectionStamp();
		sim.cameraShake = 0.22;

		if (nextRejection >= 3) {
			appendPerseusArmColleagueEmail(col);
			col.stage = "PERSEUS_ARM_OFFER";
			col.colloquiumLog = [
				`🌌 Year 6: After your 3rd rejection from the Journal of Transfinite Causality, desperation sets in. Assoc. Prof. Knight whispers to you in the corridor about "GALACTIC ADVANCES IN THEORETICAL EVERYTHING" in the Perseus Arm...`,
				...col.colloquiumLog.slice(0, 9),
			];
		}

		setAcademicColloquium({ ...col });
	}, []);

	const handleSellEquipmentForPerseusFee = useCallback(() => {
		const sim = simRef.current;
		const col = sim.academicColloquium;
		if (!col?.active || col.equipmentSoldForFee) return;

		col.equipmentSoldForFee = true;
		recordPersonalTransaction(
			col,
			"Perseus Surplus Brokers — Sold Office Oscilloscope & Cryogenic Interferometer",
			"LAB_EQUIPMENT",
			3500,
		);
		col.colloquiumLog = [
			`📦 Sold your office oscilloscope and cryogenic interferometer (+$3,500 credited to Personal Checking) to cover the Perseus Arm publication fee.`,
			...col.colloquiumLog.slice(0, 9),
		];
		soundEngine.playSynodResonance(false);
		setAcademicColloquium({ ...col });
	}, []);

	const handleOpenAcceptanceLetter = useCallback(() => {
		const sim = simRef.current;
		const col = sim.academicColloquium;
		if (!col?.active) return;

		if (
			col.domesticArcStage !== "DEPOSITION_DONE" &&
			col.domesticArcStage !== "RUINED_BUT_PUBLISHED"
		) {
			col.colloquiumLog = [
				`🌌 [${formatSimClock(col.timeOfDayMinutes)}] The Perseus Arm publisher will take your money — but the theorem is incomplete until the deposition's monogamy insight is in the manuscript. Attend the settlement deposition first.`,
				...col.colloquiumLog.slice(0, 9),
			];
			soundEngine.playRejectionStamp();
			setAcademicColloquium({ ...col });
			return;
		}

		if (!col.equipmentSoldForFee && col.checkingBalance < 3500) {
			return;
		}
		recordPersonalTransaction(
			col,
			"Galactic Advances in Theoretical Everything — Open-Access Publication Fee",
			"PUBLICATION_FEE",
			-3500,
		);
		col.stage = "ACCEPTANCE_LETTER";
		col.domesticArcStage = "RUINED_BUT_PUBLISHED";
		col.publishedDoi = `10.8473/gate.perseus.2032.8473`;
		soundEngine.playSynodResonance(true);
		setAcademicColloquium({ ...col });
	}, []);

	const handleBeginRealityShatter = useCallback(() => {
		const sim = simRef.current;
		const col = sim.academicColloquium;
		if (!col?.active) return;

		col.stage = "REALITY_SHATTER_TRANSITION";
		col.realityShatterProgressSec = 0.05;
		col.colloquiumLog = [
			"🔥 Divorce papers on the desk catch celestial cyan flame.",
			"⚖️ Vance & Associates bills unfold into orbiting golden rune-glyphs.",
			"🍲 The 1987 coffee machine, sleeping bag, and tomato soup cans dissolve into pure 4D quantum geometry.",
			...col.colloquiumLog.slice(0, 7),
		];
		soundEngine.playWatchDoomBell(false);
		soundEngine.playSynodResonance(true);
		setAcademicColloquium({ ...col });
	}, []);

	// Conclude the 6-Year Academic Life Simulator:
	// After the multi-stage 3D Reality Shatter sequence completes, restore the 4D Chess Universe,
	// transform all 32 pieces back into their armored warrior forms, and unlock "Checkmate Yesterday" (Δt = −1)!
	const handleConcludePublicationAndRestorePieces = useCallback(() => {
		const sim = simRef.current;
		const col = sim.academicColloquium;
		if (!col) return;

		const candidate =
			sim.pieces.find((p) => p.id === col.candidatePieceId) ||
			sim.pieces.find((p) => p.isSentientTheorem);

		const finalAxiom = col.entanglementSwapUnlocked
			? "⊢ ∀t < t₀ : ¬∃Monarch via CKW entanglement swap on Turn 1 [Q.E.D.]"
			: '⊢ "On the Nonexistence of Monarchs in Retrocausal Systems" [Q.E.D.]';
		const doi = col.publishedDoi || `10.8473/gate.perseus.2032.8473`;
		const publishedChsh = col.proofWorkbench.chshS;
		const swapUnlocked = col.entanglementSwapUnlocked;

		syncActiveBranchFromSim();
		publishSentientTheoremAcrossMultiverse(
			sim.multiverse,
			col.candidateLineageId || candidate?.id || "w_p_4",
			finalAxiom,
			doi,
		);

		for (const p of sim.pieces) {
			if (
				p.id === col.candidatePieceId ||
				getPieceLineageId(p) === col.candidateLineageId
			) {
				p.isSentientTheorem = true;
				p.theoremStatus = "PUBLISHED";
				p.theoremAxiom = finalAxiom;
				p.isChronocrator = true;
				p.entanglementSwapUnlocked = swapUnlocked;
				p.publishedChshS = publishedChsh;
			}
			const rig = sim.pieceRigs.get(p.id);
			if (rig) {
				setPieceProfessorMode(rig, false, p.faction);
			}
		}

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

		sim.academicColloquium = null;
		sim.phase = "CHESS_VIEW";
		if (sim.controls) {
			sim.controls.enabled = true;
			const cam = sim.controls.object as PerspectiveCamera;
			cam.position.set(0, 11.5, 11.5);
			sim.controls.target.set(0, 0.3, 0);
			sim.controls.update();
		}
		setPhase("CHESS_VIEW");
		setAcademicColloquium(null);

		soundEngine.playWatchDoomBell(true);
		soundEngine.playSynodResonance(true);
		confetti({ particleCount: 120, spread: 95, origin: { y: 0.5 } });

		if (sim.pocketWatchRig) {
			triggerPocketWatchReaction(
				sim.pocketWatchRig,
				0x38bdf8,
				sim.multiverse.activeTimelineId,
				true,
			);
		}

		if (candidate) {
			const worldPos = boardToWorld(candidate.row, candidate.col);
			if (sim.vfxPool) {
				spawnInterventionRift(
					sim.vfxPool,
					0,
					16.5,
					-14.2,
					worldPos.x,
					0.9,
					worldPos.z,
					0x38bdf8,
				);
				spawnAuraPillar(sim.vfxPool, worldPos.x, worldPos.z, 0x38bdf8);
				spawnShockwave(
					sim.vfxPool,
					worldPos.x,
					0.15,
					worldPos.z,
					0xfbbf24,
					7.5,
				);
			}

			sim.selectedPieceId = candidate.id;
			sim.validMoves = getValidMovesForPiece(
				candidate,
				sim.pieces,
				candidate.z,
				candidate.w,
			);
			setSelectedPiece({ ...candidate });
		}

		syncActiveBranchFromSim();
		setMultiverseState({ ...sim.multiverse });
		syncBoardHighlights();

		const yesterdayMoves = sim.validMoves.filter(
			(m) => m.dimensionType === "CHECKMATE_YESTERDAY",
		);

		setWatchEventBanner({
			title: `⊢ FORMALLY RECOGNIZED IN "GALACTIC ADVANCES IN THEORETICAL EVERYTHING" (IF: 847.3)!`,
			subtitle: `"On the Nonexistence of Monarchs in Retrocausal Systems" is published! Six years of struggle — ${yesterdayMoves.length} Cyan "Checkmate Yesterday" (Δt = −1) vector(s) are now UNLOCKED!`,
		});

		setBattleLogs((prev) => [
			{
				id: `pub_qed_${Date.now()}`,
				turnNumber: sim.turnNumber,
				summary: `⊢ Dr. Pawn's Theorem Published After 6 Simulated Years [Impact Factor: 847.3]!`,
				detail: `"On the Nonexistence of Monarchs in Retrocausal Systems" accepted by Galactic Advances in Theoretical Everything (Perseus Arm). Checkmate Yesterday (Δt = −1) unlocked!`,
				wasUpset: false,
				winnerFaction: candidate?.faction || "w",
			},
			...prev.slice(0, 7),
		]);
	}, [syncActiveBranchFromSim, syncBoardHighlights]);

	// SENTIENT MATHEMATICAL THEOREM SHOWCASE:
	// Step 1: Merge a Pawn with its Alternate-Timeline Self -> Collapses the chess universe into the standalone
	//         University of Greater Andromeda 6-Year Academic Life Simulator as Dr. Pawn!

	return {
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
	};
}
