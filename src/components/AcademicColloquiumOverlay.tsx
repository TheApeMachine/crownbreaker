import {
	AlertTriangle,
	ArrowRight,
	Award,
	BookOpen,
	Calendar,
	CheckCircle2,
	Clock,
	Coffee,
	DollarSign,
	FlaskConical,
	Footprints,
	Mail,
	Moon,
	Shirt,
	Sparkles,
	Train,
	X,
} from "lucide-react";
import React from "react";
import { formatSquareName } from "../engine/chessEngine";
import { UNIVERSITY_ROOM_CENTERS } from "../three/universityOfficeBuilder";
import type {
	AcademicColloquiumState,
	AcademicEmailItem,
	ChessPiece,
	GrantBudgetLineItem,
	PieceType,
	UniversityRoomId,
} from "../types/game";

export const DAY_NAMES = [
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
];

export function formatSimTime(minutes: number): string {
	const clamped = ((minutes % 1440) + 1440) % 1440;
	const h = Math.floor(clamped / 60)
		.toString()
		.padStart(2, "0");
	const m = Math.floor(clamped % 60)
		.toString()
		.padStart(2, "0");
	return `${h}:${m}`;
}

export interface ProfessorPersona {
	academicTitle: string;
	department: string;
	elbowPatchStyle: string;
	hIndex: number;
	monograph: string;
}

export function getProfessorPersona(piece: ChessPiece): ProfessorPersona {
	const isSolaris = piece.faction === "w";
	const map: Record<PieceType, ProfessorPersona> = {
		p: {
			academicTitle: "Dr. Pawn (Untenured Assistant Professor)",
			department:
				"Dept. of Retrocausal & Constructive Mathematics, Univ. of Greater Andromeda",
			elbowPatchStyle: "Threadbare Cognac Suede Elbow Patches",
			hIndex: 4,
			monograph:
				"On the Nonexistence of Monarchs in Retrocausal Systems (Unpublished)",
		},
		n: {
			academicTitle: isSolaris
				? "Toby (7th-Year ABD Graduate Student)"
				: "Assoc. Prof. Knight (Colleague · Sub-Basement Lab)",
			department: "Sub-Basement Cubicle 02, Peano Hall",
			elbowPatchStyle: "Coffee-Stained Corduroy Patches",
			hIndex: 2,
			monograph:
				"Sign Errors in the Retrocausal Jacobian (Thesis Draft, Year 7)",
		},
		b: {
			academicTitle: "Prof. Bishop (Director of the Quantum Laboratory)",
			department: "Center for Chiral Interferometry & Restricted Equipment",
			elbowPatchStyle: "Velvet-Trimmed Oxford Elbow Patches",
			hIndex: 31,
			monograph: "Why My Lab Is Booked Through 2029 (Internal Memo)",
		},
		r: {
			academicTitle: "Prof. Rook (Newly Tenured Full Professor · Reviewer #2)",
			department: "Chair of Rectilinear Repetition & Self-Citation",
			elbowPatchStyle: "Oxblood Saddle-Leather Elbow Patches",
			hIndex: 64,
			monograph:
				"On Rectilinear Files (2021), Rectilinear Files Revisited (2023), & Files: A Rectilinear View (2025)",
		},
		q: {
			academicTitle: "Dr. Queen (Department Chairwoman)",
			department: "Office of Faculty Productivity & Indirect Grant Overhead",
			elbowPatchStyle: "Tailored Charcoal Herringbone Tweed",
			hIndex: 52,
			monograph: "Quantifying Departmental Synergy in 14 Quarterly Metrics",
		},
		k: {
			academicTitle: "Provost King (Vice-Chancellor of Budget Freezes)",
			department:
				"Central Administration Tower, University of Greater Andromeda",
			elbowPatchStyle: "Ermine-Lined Administrative Blazer",
			hIndex: 7,
			monograph:
				"Why the 1987 Coffee Machine Is Not in This Fiscal Year’s Capital Budget",
		},
	};
	return map[piece.type];
}

export function createInitialAcademicColloquiumState(
	candidatePiece: ChessPiece,
	allPieces: ChessPiece[],
	coAuthorTimelineCode: string,
): AcademicColloquiumState {
	const friendlyFaculty = allPieces
		.filter(
			(p) =>
				p.faction === candidatePiece.faction &&
				p.id !== candidatePiece.id &&
				(p.type === "q" || p.type === "r" || p.type === "b" || p.type === "n"),
		)
		.slice(0, 3);

	const enemyKnight = allPieces.find(
		(p) => p.faction !== candidatePiece.faction && p.type === "n",
	);
	const enemyRook = allPieces.find(
		(p) => p.faction !== candidatePiece.faction && p.type === "r",
	);
	const enemyBishop = allPieces.find(
		(p) => p.faction !== candidatePiece.faction && p.type === "b",
	);

	const initialInbox: AcademicEmailItem[] = [
		{
			id: "email_anniversary_reminder",
			sender: "Calendar · Retrocausal Terrace",
			senderRole: "Domestic Continuity Reminder",
			subject: "TODAY — Seventh Wedding Anniversary (742 Retrocausal Terrace)",
			dateLabel: "Tuesday · 07:00 AM",
			category: "SPOUSE",
			unread: true,
			body: `Seven years.\n\nDinner is at 19:30. Candle. Chicken casserole. She asked you not to stay late at the office.\n\nYour personal liquid cash after the mortgage reserve is approximately $55.00. Do not spend it on graduate-student pastries.\n\n— A calendar entry you will ignore`,
		},
		{
			id: "email_bishop_1430",
			sender: "Prof. Bishop (Quantum Lab Director)",
			senderRole: "Director, Chiral Interferometry Facility",
			subject:
				"TODAY AT 14:30 — Mandatory Lab Access & Budget Review (Seminar Room 204)",
			dateLabel: "Tuesday · 08:15 AM",
			category: "LAB_POLITICS",
			unread: true,
			body: `Dr. Pawn,\n\nChairwoman Queen and I will be in Seminar Room 204 today from 14:30 to 15:15 to review your request for Chiral Interferometer time and audit your departmental seed grant budget.\n\nDo NOT be late, and please dress appropriately for a formal committee review. Last semester an untenured lecturer showed up with cafeteria coffee stains on his shirt and we rejected his lab allocation on the spot.\n\n— Prof. Bishop`,
		},
		{
			id: "email_grad_lemma",
			sender: "Toby (Your Graduate Student)",
			senderRole: "7th-Year PhD Candidate · Office 4B-Annex",
			subject: "URGENT: Central Lemma 3.2 Sign Error + 10:00 AM Office Meeting",
			dateLabel: "Tuesday · 08:02 AM",
			category: "GRAD_STUDENT",
			unread: true,
			body: `Dr. Pawn,\n\nI'm waiting for you in Room 4B! Remember we scheduled our meeting for 10:00 – 10:45 AM today to go over Central Lemma 3.2.\n\nI found a serious problem in "On the Nonexistence of Monarchs in Retrocausal Systems":\n1. The surface commutator [∂_t, H_chiral] doesn't vanish under a naive Dirichlet gauge.\n2. There is a −κ sign error in the off-diagonal Retrocausal Jacobian.\n\nAlso, the 1987 coffee machine in our office is still dead. If you walk down the hall to the Lagrange Point Cafeteria for coffee, watch out for the undergraduates rushing to their midterms!\n\nP.S. The pastry case has almond croissants. I have not eaten since 11 PM.\n\n— Toby`,
		},
		{
			id: "email_mortgage_due",
			sender: "Andromeda Savings & Loan",
			senderRole: "Residential Mortgage Servicing Division",
			subject: "NOTICE: Monthly Mortgage ($2,140.00) Due Before Friday 17:00",
			dateLabel: "Monday · 09:00 AM",
			category: "MORTGAGE",
			unread: false,
			body: `BORROWER: Dr. Pawn, Untenured Assistant Professor\nPROPERTY: 412 Euclid Terrace (Unit B — Damp Basement)\nAMOUNT DUE THIS WEEK: $2,140.00\n\nYour checking account currently holds $2,195.00 ($2,140.00 reserved for your mortgage + $55.00 liquid cash for coffee, meals, or emergencies until Friday's biweekly salary direct deposit of $1,853.85).\n\nIf you spend your mortgage reserve on unexpected personal expenses (such as expensive express dry-cleaning or new dress shirts), you will not be able to pay your mortgage until Friday's paycheck arrives!`,
		},
		{
			id: "email_rook_tenure",
			sender: "Office of the Provost",
			senderRole: "University of Greater Andromeda Administration",
			subject:
				"FACULTY SPOTLIGHT: Prof. Rook Awarded Full Tenure (h-index: 64)",
			dateLabel: "Monday · 08:30 AM",
			category: "ADMIN",
			unread: false,
			body: `Colleagues,\n\nPlease join the Administration in congratulating Professor Rook on his promotion to Full Professor with Permanent Tenure!\n\nThe Tenure Committee was deeply moved by Prof. Rook's trilogy of landmark papers:\n1. "On Rectilinear Movement Along Open Files" (J. Transfinite Causality, 2021)\n2. "Open Files and Rectilinear Movement" (J. Transfinite Causality, 2023)\n3. "A Rectilinear Approach to Movement Along Open Files" (J. Transfinite Causality, 2025)\n\nProf. Rook can usually be found holding court in the Lagrange Point Cafeteria.`,
		},
	];

	const initialGrantLines: GrantBudgetLineItem[] = [
		{
			id: "line_helium",
			label: "Liquid Helium-4 Cryo Refill (Chiral Interferometer Run)",
			category: "CRYO_CONSUMABLES",
			directCost: 600,
			selected: true,
			justificationNote:
				"Required to cool the retrocausal interferometer to 1.8 Kelvin.",
		},
		{
			id: "line_calibrator",
			label: "Retrocausal Phase-Lock Calibrator Module",
			category: "INTERFEROMETER_CALIBRATION",
			directCost: 950,
			selected: false,
			justificationNote:
				"Eliminates boundary drift during Lemma 3.2 verification.",
		},
		{
			id: "line_toby_ra",
			label: "Graduate RA Summer Stipend Supplement (Toby)",
			category: "GRAD_STIPEND",
			directCost: 850,
			selected: false,
			justificationNote:
				"Supports 7th-year doctoral candidate performing numerical verification.",
		},
		{
			id: "line_prohibited_cleaners",
			label: "Personal Dry-Cleaning & Artisanal Espresso Machine for Room 4B",
			category: "PERSONAL_PROHIBITED",
			directCost: 420,
			selected: false,
			isProhibitedPersonalExpense: true,
			justificationNote:
				"PROHIBITED BY UNIVERSITY AUDIT: Personal clothing & breakroom appliances.",
		},
	];

	// Start on Tuesday at 09:15 AM in Room 4B so the player has:
	// - 10:00 AM meeting with Toby in Room 4B
	// - Time to walk to the Cafeteria for coffee before the 14:30 Appointment with Prof. Bishop & Chairwoman Queen!
	return {
		active: true,
		stage: "WORLD_COLLAPSE_FADE",
		candidatePieceId: candidatePiece.id,
		candidateLineageId: candidatePiece.lineageId || candidatePiece.id,
		coAuthorTimelineCode,
		manuscriptTitle: "On the Nonexistence of Monarchs in Retrocausal Systems",
		manuscriptVersion: "UGA-Preprint-Yr1.tex",
		selectedAxiomMethodology: "Chiral Anti-Periodic Boundary Gauge (Lemma 3.2)",
		rigorScore: 18,
		citationsCollected: 0,
		requiredCitations: 3,
		reviewer2CitationsBribed: false,
		latexOverfullHboxFixed: false,
		supplementalAppendixAttached: false,
		oralDefenseArgumentsWon: 0,
		oralDefenseDuelCompleted: false,
		facultyEndorserIds: friendlyFaculty.map((p) => p.id),
		endorsedByIds: [],
		reviewers: [
			{
				id: "REVIEWER_1",
				label: "Reviewer #1",
				professorTitle: "Assoc. Prof. Knight",
				department: "Sirius-B Competing Research Group",
				pieceType: "n",
				pieceId: enemyKnight?.id,
				squareLabel: enemyKnight ? formatSquareName(enemyKnight) : "B8",
				verdict: "MINOR_REVISION",
				critiqueQuote:
					"“Interesting premise, though our competing group at Sirius-B is working on a similar bound.”",
				rebuttalResolved: false,
			},
			{
				id: "REVIEWER_2",
				label: "Reviewer #2",
				professorTitle: "Tenured Prof. Rook",
				department: "Journal of Transfinite Causality",
				pieceType: "r",
				pieceId: enemyRook?.id,
				squareLabel: enemyRook ? formatSquareName(enemyRook) : "A8",
				verdict: "STRONG_REJECT",
				critiqueQuote:
					"“REJECT. The authors fail to cite Rook (2021, 2023, 2025), and Lemma 3.2 contains an obvious sign error.”",
				rebuttalResolved: false,
			},
			{
				id: "REVIEWER_3",
				label: "Reviewer #3",
				professorTitle: "Prof. Bishop",
				department: "Quantum Laboratory Committee",
				pieceType: "b",
				pieceId: enemyBishop?.id,
				squareLabel: enemyBishop ? formatSquareName(enemyBishop) : "C8",
				verdict: "MAJOR_REVISION",
				critiqueQuote:
					"“Without experimental verification in a Chiral Quantum Laboratory, Lemma 3.2 is mere speculation.”",
				rebuttalResolved: false,
			},
		],
		colloquiumLog: [
			"🌧️ Tuesday, 09:15 AM — Room 4B, Peano Hall. Rain streaks the window. The 1987 coffee machine is stone dead.",
			"💍 Seventh anniversary tonight at 742 Retrocausal Terrace. Dinner at 19:30. Do not stay late. Do not buy pastries.",
			"☕ You need coffee from the Cafeteria before your 10:00 AM meeting with Toby and 14:30 review with Prof. Bishop. Your 1984 Station Wagon is parked outside on the Campus Quad.",
		],
		academicYear: 1,
		semester: "Fall",
		dayIndex: 1, // Tuesday! ("Dr. Pawn has a meeting at 14:30, and his shirt is covered in coffee. Build that Tuesday.")
		timeOfDayMinutes: 9 * 60 + 15, // 09:15 AM
		energyLevel: 76,
		currentRoom: "OFFICE_4B",
		activeDrawerTab: "NONE",

		isDrivingCar: false,
		carSpeedMph: 0,
		carWorldX: -6.0,
		carWorldZ: 14.5,
		carYaw: 0,
		stationWagonSeizedBySpouse: false,

		shirtState: "CLEAN",
		hasSpareCleanShirtAtHome: true,
		carryingHotCoffee: false,
		cafeteriaQueuePosition: null,
		cafeteriaServiceProgress: 0,
		coffeeSpillIncidentTriggered: false,
		activeDryCleaningTicket: null,
		tobyCroissantPurchased: false,
		anniversaryWalkForced: false,
		anniversaryArrivalModalOpen: false,
		depositionModalOpen: false,
		hotPlateDinnerEatenTonight: false,

		domesticArcStage: "INTACT",
		anniversaryDateActive: true,
		homeAccess: "OWNED",
		livingInOffice4B: false,
		legalDebtBalance: 0,
		vanceUnpaidInterestRate: 0.12,
		maritalAssetGrid: {
			condoAppraisedValue: 185000,
			condoRemainingMortgage: 214000,
			condoMonthlyPayment: 2140,
			condoAssignedTo: "UNDECIDED",
			wagonBlueBookValue: 450,
			wagonAssignedTo: "UNDECIDED",
			manuscriptAppraisedValue: 0,
			exhibitDAttached: false,
			settlementAccepted: false,
		},
		entanglementSwapUnlocked: false,
		depositionEpiphanySeen: false,
		legalTabUnlocked: false,

		annualSalary: 48200,
		checkingBalance: 2195.0, // $2,140.00 mortgage due + $55.00 liquid pocket cash!
		monthlyMortgage: 2140.0,
		mortgagePaidThisWeek: false,
		mortgageMonthsBehind: 0,
		departmentalBudget: 1450.0,
		personalLedger: [
			{
				id: "led_p_open",
				account: "PERSONAL",
				dayLabel: "Monday",
				timeLabel: "08:00",
				description: "Opening Balance (Andromeda Checking #4409)",
				category: "OPENING",
				amount: 2213.5,
				runningBalance: 2213.5,
			},
			{
				id: "led_p_bus",
				account: "PERSONAL",
				dayLabel: "Monday",
				timeLabel: "18:30",
				description:
					"Unleaded Fuel (1984 Station Wagon) & Rainy Evening Groceries",
				category: "CAFETERIA",
				amount: -18.5,
				runningBalance: 2195.0,
			},
		],
		departmentalLedger: [
			{
				id: "led_d_open",
				account: "DEPARTMENTAL",
				dayLabel: "Monday",
				timeLabel: "08:00",
				description: "Remaining Startup Seed Allocation (Acct #UGA-MATH-4B)",
				category: "OPENING",
				amount: 1450.0,
				runningBalance: 1450.0,
			},
		],
		grantBudgetLines: initialGrantLines,
		grantSubmittedAndApproved: false,

		hIndex: 4,
		rookHIndex: 64,
		adminProductivityScore: 61.4,
		chairRelationship: 38,
		tobyRelationship: 72,
		bishopRelationship: 34,
		npcMemoryNotes: [
			"TODAY IS YOUR SEVENTH WEDDING ANNIVERSARY. Dinner at 19:30 at 742 Retrocausal Terrace. She already bought a candle.",
			"Toby (Grad Student): Anxious to show you the Jacobian sign error in Room 4B between 10:00 and 10:45. Has not eaten.",
			"Prof. Bishop: Expects you in Seminar Room 204 at 14:30 sharp in clean professional attire with a reconciled grant budget.",
			"Prof. Rook: Recently awarded full tenure after publishing the same rectilinear file paper three times.",
		],
		appointments: [
			{
				id: "appt_tue_toby",
				dayIndex: 1, // Tuesday
				startMinutes: 10 * 60, // 10:00
				endMinutes: 10 * 60 + 45, // 10:45
				title: "Grad Student Toby: Central Lemma 3.2 Sign Error",
				locationRoom: "OFFICE_4B",
				withNpcName: "Toby (Grad Student)",
				status: "UPCOMING",
			},
			{
				id: "appt_tue_bishop",
				dayIndex: 1, // Tuesday
				startMinutes: 14 * 60 + 30, // 14:30
				endMinutes: 15 * 60 + 15, // 15:15
				title: "Mandatory Departmental & Chiral Lab Access Review",
				locationRoom: "SEMINAR_ROOM_204",
				withNpcName: "Prof. Bishop & Chairwoman Queen",
				status: "UPCOMING",
			},
			{
				id: "appt_wed_seminar",
				dayIndex: 2, // Wednesday
				startMinutes: 14 * 60, // 14:00
				endMinutes: 15 * 60, // 15:00
				title: "Faculty Research Colloquium & Debate vs. Prof. Rook",
				locationRoom: "SEMINAR_ROOM_204",
				withNpcName: "Tenured Prof. Rook",
				status: "UPCOMING",
			},
		],

		centralLemmaIntegrity: 18,
		proofWorkbench: {
			boundaryGaugeChoice: "UNSELECTED",
			boundaryGaugeVerified: false,
			jacobianSignFlipped: false,
			chiralLabDataAttached: false,
			rookCitationsAttached: false,
			lastVerificationMessage:
				"Unverified: Boundary commutator [∂_t, H_chiral] diverges at t₀ − 1 and off-diagonal Jacobian has a −κ sign error.",
			hermitianBoundaryBalanced: false,
			surfaceCommutatorOffset: -0.65,
			chshS: 1.42,
			measurementAngleA: 0,
			measurementAngleB: Math.PI / 8,
			purityEstimate: 0.72,
			monogamyLemmaAnnotated: false,
			courseReaderOpen: false,
		},
		bishopLabAccessGranted: false,
		bishopSuspectedWithholding: true,
		rookIdenticalPapersCount: 3,
		reviewer2RivalryLevel: 35,
		journalRejections: 0,
		equipmentSoldForFee: false,
		coffeeMachineKickCount: 0,
		selectedEmailId: "email_anniversary_reminder",
		inbox: initialInbox,
		realityShatterProgressSec: 0,
	};
}

interface AcademicColloquiumOverlayProps {
	colloquium: AcademicColloquiumState;
	onEnterUniversityOffice: () => void;
	onWalkToRoom: (roomId: UniversityRoomId) => void;
	onSetDrawerTab: (
		tab:
			| "NONE"
			| "CHALKBOARD_PROOF"
			| "FINANCE_LEDGER"
			| "PINE_MAIL"
			| "CALENDAR_NPCS"
			| "LEGAL_MARITAL"
			| "COURSE_READER",
	) => void;
	onSelectEmail: (emailId: string) => void;
	onKickCoffeeMachine: () => void;
	onJoinOrLeaveCafeteriaQueue: () => void;
	onDropOffShirtAtCleaner: (
		service: "STANDARD_NEXT_DAY" | "EXPRESS_75_MIN",
	) => void;
	onPickUpCleanedShirt: () => void;
	onBuyNewShirtAtHaberdashery: () => void;
	onBuyTobyCroissant: () => void;
	onForcedAnniversaryWalkHome: () => void;
	onDismissAnniversaryArrival: () => void;
	onCommuteHomeForSpareShirt: () => void;
	onToggleDriveCar?: () => void;
	onOpenTransitModal?: () => void;
	onCloseTransitModal?: () => void;
	onBoardTransitToStation?: (stationId: string) => void;
	onAttendScheduledMeetingInRoom: (appointmentId: string) => void;
	onTalkToNpcInRoom: (npcId: "TOBY" | "BISHOP" | "QUEEN" | "ROOK") => void;
	onSelectBoundaryGauge: (
		gauge: "DIRICHLET_CLAMP" | "CHIRAL_ANTIPERIODIC" | "TRUNCATED_PERTURBATIVE",
	) => void;
	onToggleJacobianSign: () => void;
	onRunChiralLabExperiment: () => void;
	onToggleRookCitations: () => void;
	onAdjustSurfaceCommutator: (offset: number) => void;
	onAdjustChshAngles: (angleA: number, angleB: number) => void;
	onToggleGrantLineItem: (lineId: string) => void;
	onSubmitGrantBudgetProposal: () => void;
	onPayMonthlyMortgage: () => void;
	onAttemptIllegalDepartmentalReimbursement: () => void;
	onVancePhoneConsult: () => void;
	onVanceReviewEmail: () => void;
	onAssignMaritalAsset: (
		asset: "condo" | "wagon" | "exhibitD",
		value: "PAWN" | "SPOUSE" | "FORCED_JOINT" | true,
	) => void;
	onAcceptSettlementWorksheet: () => void;
	onAttendSettlementDeposition: () => void;
	onConfirmDepositionEpiphany: () => void;
	onEatHotPlateSoup: () => void;
	onAdvanceTimeMinutes: (mins: number, reason: string) => void;
	onSleepUntilNextMorning: () => void;
	onSubmitToJournalOfTransfiniteCausality: () => void;
	onSellEquipmentForPerseusFee: () => void;
	onOpenAcceptanceLetter: () => void;
	onBeginRealityShatter: () => void;
	onConcludePublicationAndRestorePieces: () => void;
	uniFirstPerson?: boolean;
	freeMouseLook?: boolean;
	onToggleUniFirstPerson?: () => void;
	onToggleFreeMouseLook?: () => void;
	onResetUniCamera?: () => void;
}

export const AcademicColloquiumOverlay: React.FC<
	AcademicColloquiumOverlayProps
> = ({
	colloquium,
	onEnterUniversityOffice,
	onWalkToRoom,
	onSetDrawerTab,
	onSelectEmail,
	onKickCoffeeMachine,
	onJoinOrLeaveCafeteriaQueue,
	onDropOffShirtAtCleaner,
	onPickUpCleanedShirt,
	onBuyNewShirtAtHaberdashery,
	onBuyTobyCroissant,
	onForcedAnniversaryWalkHome,
	onDismissAnniversaryArrival,
	onCommuteHomeForSpareShirt,
	onToggleDriveCar,
	onOpenTransitModal,
	onCloseTransitModal,
	onBoardTransitToStation,
	onAttendScheduledMeetingInRoom,
	onTalkToNpcInRoom,
	onSelectBoundaryGauge,
	onToggleJacobianSign,
	onRunChiralLabExperiment,
	onToggleRookCitations,
	onAdjustSurfaceCommutator,
	onAdjustChshAngles,
	onToggleGrantLineItem,
	onSubmitGrantBudgetProposal,
	onPayMonthlyMortgage,
	onAttemptIllegalDepartmentalReimbursement,
	onVancePhoneConsult,
	onVanceReviewEmail,
	onAssignMaritalAsset,
	onAcceptSettlementWorksheet,
	onAttendSettlementDeposition,
	onConfirmDepositionEpiphany,
	onEatHotPlateSoup,
	onAdvanceTimeMinutes,
	onSleepUntilNextMorning,
	onSubmitToJournalOfTransfiniteCausality,
	onSellEquipmentForPerseusFee,
	onOpenAcceptanceLetter,
	onBeginRealityShatter,
	onConcludePublicationAndRestorePieces,
	uniFirstPerson = false,
	freeMouseLook = false,
	onToggleUniFirstPerson,
	onToggleFreeMouseLook,
	onResetUniCamera,
}) => {
	const [dismissedLog, setDismissedLog] = React.useState<string | null>(null);

	if (!colloquium.active || colloquium.stage === "INACTIVE") return null;

	const dayName = DAY_NAMES[colloquium.dayIndex % 5] || "Tuesday";
	const timeStr = formatSimTime(colloquium.timeOfDayMinutes);
	const mins = colloquium.timeOfDayMinutes;
	const cleanerIsOpen = mins >= 510 && mins <= 1050; // 08:30 to 17:30
	const liquidAfterMortgage = colloquium.mortgagePaidThisWeek
		? colloquium.checkingBalance
		: colloquium.checkingBalance - colloquium.monthlyMortgage;

	const selectedEmail =
		colloquium.inbox.find((e) => e.id === colloquium.selectedEmailId) ||
		colloquium.inbox[0];

	// ============================================================================
	// STAGE 1: THE WORLD COLLAPSES & FADES INTO ROOM 4B, PEANO HALL
	// ============================================================================
	if (colloquium.stage === "WORLD_COLLAPSE_FADE") {
		return (
			<div className="pointer-events-auto fixed inset-0 z-50 bg-[#05070B]/95 backdrop-blur-md flex items-center justify-center p-6 overflow-y-auto">
				<div className="max-w-2xl w-full bg-[#0B0F17] border border-slate-800 rounded-2xl p-8 md:p-10 shadow-[0_0_90px_rgba(0,0,0,0.95)] text-slate-200 font-serif">
					<div className="text-[11px] font-mono uppercase tracking-[0.25em] text-amber-400/80 mb-4">
						UNIVERSITY OF GREATER ANDROMEDA · PEANO HALL
					</div>

					<div className="space-y-4 text-base md:text-lg leading-relaxed text-slate-200">
						<p className="text-slate-400 italic">The screen fades.</p>
						<p>
							A modest university office. Rain against the windows. A coffee
							machine that hasn&rsquo;t worked since 1987.
						</p>
						<p>
							You&rsquo;re now{" "}
							<strong className="text-amber-300 font-semibold">Dr. Pawn</strong>
							, an untenured researcher at the{" "}
							<strong className="text-white font-semibold">
								University of Greater Andromeda
							</strong>
							.
						</p>
						<p>
							You have a salary (
							<span className="font-mono text-sm text-emerald-300">
								$48,200/yr
							</span>
							). A mortgage (
							<span className="font-mono text-sm text-rose-300">$2,140/mo</span>{" "}
							due this week, leaving{" "}
							<span className="font-mono text-sm text-amber-300">$55.00</span>{" "}
							in spare cash until Friday&rsquo;s paycheck). A strained
							relationship with your department chair. A promising but
							controversial paper:{" "}
							<em className="text-sky-300">
								&ldquo;On the Nonexistence of Monarchs in Retrocausal
								Systems.&rdquo;
							</em>
						</p>
						<p>
							Your graduate student Toby has a <strong>10:00 AM</strong>{" "}
							appointment in your office to tell you that Central Lemma 3.2 may
							be incorrect. And at <strong>14:30</strong>, you have a mandatory
							review with <strong>Professor Bishop</strong> in Seminar Room 204.
						</p>
						<p className="text-white font-bold pt-1">
							And the chess game is gone.
						</p>
						<p className="text-slate-400 text-sm">
							Not minimized. Not waiting behind a menu.{" "}
							<span className="text-slate-200 italic">Gone.</span>
						</p>
					</div>

					<div className="mt-8 pt-6 border-t border-slate-800/90 flex flex-col sm:flex-row items-center justify-between gap-4 font-sans">
						<div className="text-xs font-mono text-slate-400">
							📍 Room 4B, Peano Hall · Tuesday, 09:15 AM
						</div>
						<button
							type="button"
							onClick={onEnterUniversityOffice}
							className="w-full sm:w-auto px-6 py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-mono font-extrabold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(245,158,11,0.35)]"
						>
							<span>Step Into Room 4B (Tuesday, 09:15)</span>
							<ArrowRight className="w-4 h-4" />
						</button>
					</div>
				</div>
			</div>
		);
	}

	// ============================================================================
	// STAGE 4: THE ACCEPTANCE LETTER (QUIET TRIUMPH BEFORE REALITY SHATTERS)
	// ============================================================================
	if (colloquium.stage === "ACCEPTANCE_LETTER") {
		return (
			<div className="pointer-events-auto fixed inset-0 z-50 bg-[#04060A]/92 backdrop-blur-md flex items-center justify-center p-6 overflow-y-auto">
				<div className="max-w-2xl w-full bg-[#0A0E17] border border-amber-400/50 rounded-2xl p-8 md:p-11 shadow-[0_0_110px_rgba(0,0,0,0.95)] text-slate-100 font-serif">
					<div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6 font-sans">
						<div>
							<div className="text-[10px] font-mono uppercase tracking-[0.22em] text-amber-300 font-bold">
								GALACTIC ADVANCES IN THEORETICAL EVERYTHING · PERSEUS ARM
							</div>
							<div className="text-xs font-mono text-slate-400 mt-0.5">
								Impact Factor: 847.3 · Acceptance Rate: 100% · Peer Review:
								Waived Upon Request
							</div>
						</div>
						<Award className="w-8 h-8 text-amber-400 shrink-0" />
					</div>

					<div className="bg-[#0F1624] border border-slate-700/80 rounded-xl p-6 mb-6 space-y-3 text-base leading-relaxed text-slate-200">
						<p className="font-mono text-xs text-emerald-300 uppercase tracking-wider">
							FORMAL EDITORIAL DECISION: ACCEPTED FOR IMMEDIATE PUBLICATION
						</p>
						<p>Dear Dr. Pawn,</p>
						<p>
							We are delighted to inform you that your manuscript,{" "}
							<strong className="text-sky-300">
								&ldquo;On the Nonexistence of Monarchs in Retrocausal
								Systems,&rdquo;
							</strong>{" "}
							has been accepted for publication (Open-Access Processing Fee of
							$3,500.00 received in full via liquidated laboratory assets).
						</p>
						<p className="text-amber-200 font-semibold">
							Your theorem is now formally recognized.
						</p>
					</div>

					<div className="space-y-2.5 text-base md:text-lg text-slate-200 leading-relaxed pl-2 border-l-2 border-amber-400/60">
						<p>You stand in Room 4B at 2:00 AM holding the letter.</p>
						<p className="text-slate-400">
							You have lost the house. You have lost your wife. You owe Arthur
							Vance{" "}
							<span className="font-mono text-rose-300">
								${colloquium.legalDebtBalance.toFixed(0)}
							</span>
							. You sleep under a desk. You eat soup off a hot plate.
						</p>
						<p className="text-slate-300">Your life is in ruins.</p>
						<p className="text-amber-200 font-semibold">
							But the theorem is real.
						</p>
						<p className="text-2xl font-bold tracking-widest text-white pt-1 font-sans">
							YOU DID IT.
						</p>
						<p className="text-slate-500 font-mono text-sm">...</p>
					</div>

					<div className="mt-8 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 font-sans">
						<div className="text-xs font-mono text-slate-400">
							Divorce papers on the desk. Vance bills in the drawer. The rain
							still taps.
						</div>
						<button
							type="button"
							onClick={onBeginRealityShatter}
							className="w-full sm:w-auto px-6 py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-mono font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(245,158,11,0.3)]"
						>
							<span>Watch the Ruin Catch Cyan Flame...</span>
							<ArrowRight className="w-4 h-4" />
						</button>
					</div>
				</div>
			</div>
		);
	}

	// ============================================================================
	// STAGE 5: THE FINAL BETRAYAL — REALITY SHATTERS BACK INTO CROWNBREAKER 4D
	// ============================================================================
	if (colloquium.stage === "REALITY_SHATTER_TRANSITION") {
		const s = colloquium.realityShatterProgressSec || 0;
		return (
			<div className="pointer-events-none fixed inset-0 z-50 flex flex-col justify-between p-6 md:p-10">
				<div className="max-w-xl bg-[#05070D]/88 border border-amber-400/50 rounded-2xl p-6 backdrop-blur-md shadow-2xl font-serif space-y-3">
					<div className="text-[10px] font-mono uppercase tracking-[0.25em] text-amber-300">
						{s < 2.2
							? "OUTSIDE ROOM 4B · THE RAIN STOPS"
							: s < 4.8
								? "PEANO HALL FRACTURES"
								: "THE MEMORY RETURNS"}
					</div>
					<p className="text-sm md:text-base text-slate-200 leading-relaxed">
						The divorce papers catch celestial cyan flame. Vance &amp;
						Associates bills unfold into orbiting golden rune-glyphs. The rain
						freezes in mid-air.
					</p>
					{s >= 2.0 && (
						<p className="text-sm md:text-base text-slate-200 leading-relaxed">
							The sleeping bag, the tomato soup cans, the clothesline, the 1987
							coffee machine — all of it dissolves into pure 4D quantum
							geometry. The misery was real. The marriage was real. The six
							years happened.
						</p>
					)}
					{s >= 4.2 && (
						<p className="text-sm md:text-base text-amber-200 leading-relaxed">
							You look down at your cracked cognac suede elbow patches — and you
							remember what you are. The theorem that cost you your entire human
							life is about to obliterate the Obsidian King from having ever
							existed.
						</p>
					)}
					{s >= 6.2 && (
						<div className="pt-2 border-t border-slate-800 space-y-1.5 font-sans">
							<p className="text-xs font-mono text-sky-300">
								{colloquium.entanglementSwapUnlocked
									? "CKW entanglement swap compiled. Checkmate Yesterday awaits."
									: "In the original game, almost no time has passed."}
							</p>
							<p className="text-lg font-display font-extrabold tracking-wider text-white">
								CROWNBREAKER 4D — YOUR MOVE.
							</p>
						</div>
					)}
				</div>

				<div className="pointer-events-auto flex justify-end">
					<button
						type="button"
						onClick={onConcludePublicationAndRestorePieces}
						className="px-6 py-3.5 bg-linear-to-r from-sky-400 to-amber-400 hover:from-sky-300 hover:to-amber-300 text-slate-950 font-mono font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-[0_0_35px_rgba(56,189,248,0.5)]"
					>
						<Sparkles className="w-4 h-4" />
						<span>
							{s >= 6.0
								? "Return to the Chessboard (Theorem Formally Recognized)"
								: "Complete Reality Collapse →"}
						</span>
					</button>
				</div>
			</div>
		);
	}

	// ============================================================================
	// STAGE 3: THE PERSEUS ARM PREDATORY PUBLISHER OFFER
	// ============================================================================
	if (colloquium.stage === "PERSEUS_ARM_OFFER") {
		const canAffordFee =
			colloquium.checkingBalance >= 3500 || colloquium.equipmentSoldForFee;
		return (
			<div className="pointer-events-auto fixed inset-0 z-50 bg-[#05070C]/88 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 overflow-y-auto">
				<div className="max-w-2xl w-full bg-[#0C101B] border-2 border-fuchsia-500/70 rounded-2xl p-6 md:p-8 shadow-[0_0_80px_rgba(217,70,239,0.3)] text-slate-100">
					<div className="text-[11px] font-mono uppercase tracking-[0.2em] text-fuchsia-300 font-bold">
						SUSPICIOUS FLYER SLIPPED UNDER ROOM 4B’S DOOR · OUTER PERSEUS ARM
					</div>
					<h2 className="font-serif text-2xl font-bold text-white mt-1">
						After Three Rejections from the Journal of Transfinite Causality...
					</h2>
					<p className="text-xs text-slate-300 mt-2 leading-relaxed">
						Reviewer #2 (Tenured Professor Rook) has rejected your manuscript
						three times. Your tenure clock is out of time. In the dimly lit
						faculty corridor, Assoc. Prof. Knight hands you a glossy card from a
						publisher operating out of a strip-mall satellite in the outer
						reaches of the Perseus Arm:
					</p>

					<div className="mt-5 bg-linear-to-br from-[#190D26] to-[#0D1322] border border-amber-400/70 rounded-xl p-5">
						<div className="font-serif text-xl font-bold text-amber-300 tracking-wide">
							GALACTIC ADVANCES IN THEORETICAL EVERYTHING
						</div>
						<div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-mono text-xs">
							<div className="bg-black/40 border border-slate-700/80 rounded-lg p-2.5">
								<div className="text-[10px] text-slate-400">IMPACT FACTOR</div>
								<div className="text-base font-extrabold text-emerald-300">
									847.3
								</div>
							</div>
							<div className="bg-black/40 border border-slate-700/80 rounded-lg p-2.5">
								<div className="text-[10px] text-slate-400">
									ACCEPTANCE RATE
								</div>
								<div className="text-base font-extrabold text-amber-300">
									100%
								</div>
							</div>
							<div className="bg-black/40 border border-slate-700/80 rounded-lg p-2.5">
								<div className="text-[10px] text-slate-400">PEER REVIEW</div>
								<div className="text-xs font-bold text-fuchsia-300 mt-0.5">
									Available Upon Request
								</div>
							</div>
						</div>

						<div className="mt-4 text-xs text-slate-300 font-mono bg-black/35 rounded-lg p-3 border border-slate-800">
							• Open-Access Processing Fee:{" "}
							<strong className="text-rose-300">$3,500.00</strong> (Personal
							Checking Balance:{" "}
							<strong className="text-emerald-300">
								${colloquium.checkingBalance.toFixed(2)}
							</strong>
							)
							<br />• Liquidation Value of Room 4B Oscilloscope &amp;
							Cryo-Interferometer:{" "}
							<strong className="text-emerald-300">+$3,500.00</strong>
						</div>
					</div>

					{colloquium.domesticArcStage !== "DEPOSITION_DONE" &&
						colloquium.domesticArcStage !== "RUINED_BUT_PUBLISHED" && (
							<div className="mt-4 text-[11px] font-mono text-amber-200/90 bg-amber-950/40 border border-amber-500/30 rounded-lg p-3">
								Gate: complete the settlement deposition (CKW monogamy epiphany)
								before the Perseus Arm will compile your theorem into executable
								regicide.
							</div>
						)}

					<div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
						<button
							type="button"
							onClick={() => onSetDrawerTab("NONE")}
							className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs rounded-xl cursor-pointer"
						>
							← Return to Room 4B
						</button>
						{!canAffordFee ? (
							<button
								type="button"
								onClick={onSellEquipmentForPerseusFee}
								className="w-full sm:w-auto px-5 py-3 bg-rose-500 hover:bg-rose-400 text-slate-950 font-mono font-extrabold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-lg"
							>
								<FlaskConical className="w-4 h-4" />
								<span>
									Liquidate Office Lab Equipment (+$3,500.00 to Ledger)
								</span>
							</button>
						) : (
							<button
								type="button"
								onClick={onOpenAcceptanceLetter}
								className="w-full sm:w-auto px-6 py-3 bg-linear-to-r from-amber-400 to-emerald-400 hover:from-amber-300 hover:to-emerald-300 text-slate-950 font-mono font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(245,158,11,0.4)]"
							>
								<CheckCircle2 className="w-4 h-4" />
								<span>
									Wire $3,500.00 Fee &amp; Open the Acceptance Letter →
								</span>
							</button>
						)}
					</div>
				</div>
			</div>
		);
	}

	// ============================================================================
	// STAGE 2: THE PLAYABLE 5-DAY UNIVERSITY LIFE SIMULATOR (3D CAMPUS + DIEGETIC HUD)
	// ============================================================================
	const currentRoomMeta = UNIVERSITY_ROOM_CENTERS[colloquium.currentRoom];
	const ticket = colloquium.activeDryCleaningTicket;
	const isTicketReady =
		ticket &&
		!ticket.collected &&
		(colloquium.dayIndex > ticket.readyDayIndex ||
			(colloquium.dayIndex === ticket.readyDayIndex &&
				mins >= ticket.readyMinutes));

	const activeApptInRoom = colloquium.appointments.find(
		(a) =>
			a.dayIndex === colloquium.dayIndex &&
			a.locationRoom === colloquium.currentRoom &&
			a.status === "UPCOMING" &&
			mins >= a.startMinutes - 15 &&
			mins <= a.endMinutes + 10,
	);

	const selectedGrantDirectTotal = colloquium.grantBudgetLines
		.filter((l) => l.selected)
		.reduce((acc, l) => acc + l.directCost, 0);
	const selectedGrantOverhead = Math.round(selectedGrantDirectTotal * 0.585);
	const selectedGrantGrandTotal =
		selectedGrantDirectTotal + selectedGrantOverhead;
	const hasProhibitedGrantItem = colloquium.grantBudgetLines.some(
		(l) => l.selected && l.isProhibitedPersonalExpense,
	);

	const nextTodayAppt = colloquium.appointments.find(
		(a) => a.dayIndex === colloquium.dayIndex && a.status === "UPCOMING",
	);
	const unreadCount = colloquium.inbox.filter((e) => e.unread).length;
	const latestNarrativeLine = colloquium.colloquiumLog[0] || null;
	const showNarrativeToast =
		latestNarrativeLine &&
		latestNarrativeLine !== dismissedLog &&
		colloquium.activeDrawerTab === "NONE";

	return (
		<div className="pointer-events-none fixed inset-0 z-30 flex flex-col justify-between p-3 md:p-4 select-none">
			{/* Anniversary arrival / yellow legal note */}
			{colloquium.anniversaryArrivalModalOpen && (
				<div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
					<div className="max-w-lg w-full bg-[#0c1018] border border-amber-500/40 rounded-2xl p-6 text-slate-100 space-y-4 shadow-2xl">
						<div className="text-[10px] font-mono uppercase tracking-widest text-amber-300">
							742 Retrocausal Terrace · 20:45
						</div>
						<h2 className="font-serif text-xl text-white">
							The porch light is off.
						</h2>
						<p className="text-sm text-slate-300 leading-relaxed">
							On the dining table: a single cold, congealed chicken casserole, a
							melted candle, and no anniversary gift — personal checking holds $
							{colloquium.checkingBalance.toFixed(2)}.
						</p>
						<div className="bg-amber-100 text-amber-950 rounded-lg p-4 font-mono text-xs leading-relaxed border-2 border-amber-300/80 rotate-[-0.5deg]">
							Seven years, Pawn. Seven years of &ldquo;once I get tenure.&rdquo;
							You spent our anniversary at the office with Toby.
							<br />
							<br />
							Don&apos;t call me. Arthur Vance will be in touch on Monday.
						</div>
						<button
							type="button"
							onClick={onDismissAnniversaryArrival}
							className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-mono font-extrabold text-xs cursor-pointer"
						>
							Walk Back to Room 4B in Soaked Shoes
						</button>
					</div>
				</div>
			)}

			{/* Settlement deposition epiphany */}
			{colloquium.depositionModalOpen && (
				<div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-lg grayscale-[0.35]">
					<div className="max-w-xl w-full bg-[#0a0c12] border border-fuchsia-500/40 rounded-2xl p-6 text-slate-100 space-y-4 shadow-2xl">
						<div className="text-[10px] font-mono uppercase tracking-widest text-fuchsia-300">
							Vance &amp; Assoc. · Strip-Mall Suite 2B · Settlement Deposition
						</div>
						<p className="text-sm text-slate-300 leading-relaxed">
							Opposing counsel argues you were &ldquo;emotionally absent&rdquo;
							and &ldquo;wedded to the retrocausal Jacobian.&rdquo; The electric
							typewriter clicks. The screen desaturates.
						</p>
						<p className="text-sm text-fuchsia-100 leading-relaxed font-serif italic">
							A system cannot be maximally entangled with two independent
							observers simultaneously. Coffman–Kundu–Wootters: τ(A|B)+τ(A|C) ≤
							τ(A|BC). The King wasn&apos;t shielded — he was maximally
							entangled with his Queen. Force an entanglement swap on Turn 1 and
							the crown decoheres.
						</p>
						<p className="text-xs text-slate-400">
							Your marriage didn&apos;t fail because you were late. It failed
							because a quantum state cannot obey three-party non-local
							correlation.
						</p>
						<button
							type="button"
							onClick={onConfirmDepositionEpiphany}
							className="w-full py-3 rounded-xl bg-fuchsia-500 hover:bg-fuchsia-400 text-slate-950 font-mono font-extrabold text-xs cursor-pointer"
						>
							Accept the Napkin · Unlock Entanglement Swap (−$52 recess)
						</button>
					</div>
				</div>
			)}

			{/* 1. MINIMAL TOP HUD: Compact Status Pill (Left) + On-Demand Notebook & Camera Toggles (Right) */}
			<div className="flex flex-wrap items-start justify-between gap-2">
				{/* Top-Left: Compact Diegetic Status Strip */}
				<div className="pointer-events-auto bg-[#060911]/78 hover:bg-[#060911]/92 border border-slate-800/80 rounded-2xl px-3.5 py-2 backdrop-blur-md shadow-xl flex flex-wrap items-center gap-2.5 transition-colors">
					<div className="flex items-center gap-2 pr-2 border-r border-slate-800/80">
						<Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
						<span className="font-mono text-xs font-extrabold text-white tracking-tight">
							{dayName.slice(0, 3)} {timeStr}
						</span>
						<span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
							Yr {colloquium.academicYear} ·{" "}
							{currentRoomMeta.label.split(" (")[0]}
						</span>
					</div>

					{/* Finances summary (click to open Ledger) */}
					<button
						type="button"
						onClick={() =>
							onSetDrawerTab(
								colloquium.activeDrawerTab === "FINANCE_LEDGER"
									? "NONE"
									: "FINANCE_LEDGER",
							)
						}
						className="flex items-center gap-1.5 text-[11px] font-mono text-slate-300 hover:text-white cursor-pointer"
						title="Click to open Personal & Departmental Financial Ledger"
					>
						<DollarSign className="w-3.5 h-3.5 text-emerald-400" />
						<span className="font-bold text-emerald-300">
							${colloquium.checkingBalance.toFixed(0)}
						</span>
						<span
							className={`text-[10px] ${
								liquidAfterMortgage < 20
									? "text-rose-300 font-bold"
									: "text-slate-400"
							}`}
						>
							(${liquidAfterMortgage.toFixed(0)} free)
						</span>
					</button>

					{/* Shirt / Coffee physical state badge (only highlighted when noteworthy!) */}
					{colloquium.shirtState !== "CLEAN" && (
						<button
							type="button"
							onClick={() => onWalkToRoom("DRY_CLEANER")}
							className={`px-2 py-0.5 rounded-lg font-mono text-[10px] font-bold flex items-center gap-1 cursor-pointer ${
								colloquium.shirtState === "COFFEE_STAINED"
									? "bg-rose-500/25 border border-rose-400/60 text-rose-200 animate-pulse"
									: "bg-amber-500/20 border border-amber-400/50 text-amber-200"
							}`}
							title="Click to walk to Perseus Dry Cleaners"
						>
							<Shirt className="w-3 h-3" />
							<span>
								{colloquium.shirtState === "COFFEE_STAINED"
									? "COFFEE-STAINED SHIRT"
									: isTicketReady
										? "SHIRT READY AT CLEANERS!"
										: "WEARING UGA SWEATSHIRT"}
							</span>
						</button>
					)}

					{colloquium.carryingHotCoffee && (
						<span className="px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-400/50 text-amber-200 font-mono text-[10px] font-bold flex items-center gap-1">
							<Coffee className="w-3 h-3" />
							<span>Hot Coffee</span>
						</span>
					)}

					{/* Next Appointment subtle pill */}
					{nextTodayAppt && (
						<button
							type="button"
							onClick={() => onWalkToRoom(nextTodayAppt.locationRoom)}
							className={`px-2 py-0.5 rounded-lg font-mono text-[10px] flex items-center gap-1 cursor-pointer transition-colors ${
								activeApptInRoom
									? "bg-emerald-500/25 border border-emerald-400/70 text-emerald-200 font-bold"
									: "bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-amber-200"
							}`}
							title="Click to walk to appointment room"
						>
							<Calendar className="w-3 h-3 text-amber-400" />
							<span>
								{formatSimTime(nextTodayAppt.startMinutes)}{" "}
								{nextTodayAppt.withNpcName.split(" ")[0]}
							</span>
						</button>
					)}

					{colloquium.isDrivingCar && (
						<span className="px-2 py-0.5 rounded-lg bg-amber-500/25 border border-amber-400/60 text-amber-200 font-mono text-[10px] font-extrabold">
							🚗 1984 Wagon · {Math.round(colloquium.carSpeedMph || 0)} mph
						</span>
					)}
				</div>

				{/* Top-Right: On-Demand Notebook Drawers + Camera POV Pills */}
				<div className="pointer-events-auto flex flex-wrap items-center gap-1.5">
					{onToggleDriveCar && (
						<button
							type="button"
							onClick={onToggleDriveCar}
							className={`px-2.5 py-1.5 rounded-xl font-mono text-[11px] font-bold cursor-pointer flex items-center gap-1.5 backdrop-blur-md transition-all ${
								colloquium.isDrivingCar
									? "bg-amber-400 text-slate-950 shadow-lg"
									: "bg-[#060911]/78 hover:bg-slate-900 text-amber-300 border border-amber-500/40"
							}`}
							title="Enter or Exit your 1984 Andromeda Station Wagon [E]"
						>
							<span>
								{colloquium.isDrivingCar ? "🚗 Park [E]" : "🚗 Drive Wagon [E]"}
							</span>
						</button>
					)}

					{onOpenTransitModal && (
						<button
							type="button"
							onClick={onOpenTransitModal}
							className={`px-2.5 py-1.5 rounded-xl font-mono text-[11px] font-bold cursor-pointer flex items-center gap-1.5 backdrop-blur-md transition-all ${
								colloquium.isRidingTram
									? "bg-teal-400 text-slate-950 shadow-lg animate-pulse"
									: "bg-[#060911]/78 hover:bg-slate-900 text-teal-300 border border-teal-500/40"
							}`}
							title="Board GAMTA Retrocausal Tram / Metro [T]"
						>
							<Train className="w-3.5 h-3.5" />
							<span>
								{colloquium.isRidingTram
									? "🚈 On Tram"
									: "🚈 Metro/Tram ($1.75)"}
							</span>
						</button>
					)}

					<button
						type="button"
						onClick={() =>
							onSetDrawerTab(
								colloquium.activeDrawerTab === "CHALKBOARD_PROOF"
									? "NONE"
									: "CHALKBOARD_PROOF",
							)
						}
						className={`px-2.5 py-1.5 rounded-xl font-mono text-[11px] font-bold cursor-pointer flex items-center gap-1.5 backdrop-blur-md transition-all ${
							colloquium.activeDrawerTab === "CHALKBOARD_PROOF"
								? "bg-emerald-400 text-slate-950 shadow-lg"
								: "bg-[#060911]/78 hover:bg-slate-900 text-emerald-300 border border-slate-800/90"
						}`}
						title="Open Chalkboard Mathematical Proof Workbench [1]"
					>
						<FlaskConical className="w-3.5 h-3.5" />
						<span>Proof {colloquium.centralLemmaIntegrity}%</span>
					</button>

					<button
						type="button"
						onClick={() =>
							onSetDrawerTab(
								colloquium.activeDrawerTab === "FINANCE_LEDGER"
									? "NONE"
									: "FINANCE_LEDGER",
							)
						}
						className={`px-2.5 py-1.5 rounded-xl font-mono text-[11px] font-bold cursor-pointer flex items-center gap-1.5 backdrop-blur-md transition-all ${
							colloquium.activeDrawerTab === "FINANCE_LEDGER"
								? "bg-sky-400 text-slate-950 shadow-lg"
								: "bg-[#060911]/78 hover:bg-slate-900 text-sky-300 border border-slate-800/90"
						}`}
						title="Open Personal Checking, Mortgage & Departmental Grant Ledger [2]"
					>
						<DollarSign className="w-3.5 h-3.5" />
						<span className="hidden sm:inline">Finances</span>
					</button>

					<button
						type="button"
						onClick={() =>
							onSetDrawerTab(
								colloquium.activeDrawerTab === "CALENDAR_NPCS"
									? "NONE"
									: "CALENDAR_NPCS",
							)
						}
						className={`px-2.5 py-1.5 rounded-xl font-mono text-[11px] font-bold cursor-pointer flex items-center gap-1.5 backdrop-blur-md transition-all ${
							colloquium.activeDrawerTab === "CALENDAR_NPCS"
								? "bg-amber-400 text-slate-950 shadow-lg"
								: "bg-[#060911]/78 hover:bg-slate-900 text-amber-200 border border-slate-800/90"
						}`}
						title="Open 5-Day University Schedule & Colleague Notes [3]"
					>
						<Calendar className="w-3.5 h-3.5" />
						<span className="hidden sm:inline">Schedule</span>
					</button>

					<button
						type="button"
						onClick={() =>
							onSetDrawerTab(
								colloquium.activeDrawerTab === "PINE_MAIL"
									? "NONE"
									: "PINE_MAIL",
							)
						}
						className={`px-2.5 py-1.5 rounded-xl font-mono text-[11px] font-bold cursor-pointer flex items-center gap-1.5 backdrop-blur-md transition-all ${
							colloquium.activeDrawerTab === "PINE_MAIL"
								? "bg-indigo-400 text-slate-950 shadow-lg"
								: "bg-[#060911]/78 hover:bg-slate-900 text-indigo-200 border border-slate-800/90"
						}`}
						title="Open UGA Pine Mail Terminal [4]"
					>
						<Mail className="w-3.5 h-3.5" />
						<span className="hidden sm:inline">Mail</span>
						{unreadCount > 0 && (
							<span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[10px] font-extrabold">
								{unreadCount}
							</span>
						)}
					</button>

					{colloquium.legalTabUnlocked && (
						<button
							type="button"
							onClick={() =>
								onSetDrawerTab(
									colloquium.activeDrawerTab === "LEGAL_MARITAL"
										? "NONE"
										: "LEGAL_MARITAL",
								)
							}
							className={`px-2.5 py-1.5 rounded-xl font-mono text-[11px] font-bold cursor-pointer flex items-center gap-1.5 backdrop-blur-md transition-all ${
								colloquium.activeDrawerTab === "LEGAL_MARITAL"
									? "bg-rose-400 text-slate-950 shadow-lg"
									: "bg-[#060911]/78 hover:bg-slate-900 text-rose-200 border border-rose-800/60"
							}`}
							title="LEGAL / MARITAL LEDGER — Vance & Associates"
						>
							<AlertTriangle className="w-3.5 h-3.5" />
							<span className="hidden sm:inline">Legal</span>
						</button>
					)}

					{/* Compact Camera POV Controls */}
					<div className="flex items-center gap-1 bg-[#060911]/78 border border-slate-800/90 rounded-xl px-1.5 py-1 backdrop-blur-md">
						{onToggleUniFirstPerson && (
							<button
								type="button"
								onClick={onToggleUniFirstPerson}
								className={`px-2 py-0.5 rounded-lg font-mono text-[10px] font-bold cursor-pointer transition-colors ${
									uniFirstPerson
										? "bg-sky-400 text-slate-950"
										: "text-slate-300 hover:bg-slate-800"
								}`}
								title="Toggle 1st-Person / 3rd-Person View (V) · Drag Mouse to Look · Scroll to Zoom"
							>
								{uniFirstPerson ? "1st POV" : "3rd POV"}
							</button>
						)}
						{onToggleFreeMouseLook && (
							<button
								type="button"
								onClick={onToggleFreeMouseLook}
								className={`px-2 py-0.5 rounded-lg font-mono text-[10px] font-bold cursor-pointer transition-colors ${
									freeMouseLook
										? "bg-amber-400 text-slate-950"
										: "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
								}`}
								title="Toggle Hands-Free Mouse Look (F)"
							>
								[F] Look
							</button>
						)}
						{onResetUniCamera && (
							<button
								type="button"
								onClick={onResetUniCamera}
								className="px-1.5 py-0.5 rounded-lg font-mono text-[10px] text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
								title="Reset Camera Angle (R)"
							>
								[R]
							</button>
						)}
					</div>
				</div>
			</div>

			{/* 2. ON-DEMAND WORKBENCH MODAL (ONLY VISIBLE WHEN USER OPENS A DRAWER OR CLICKS A 3D PROP) */}
			{colloquium.activeDrawerTab !== "NONE" && (
				<div
					role="presentation"
					className="pointer-events-auto fixed inset-0 z-40 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4"
					onClick={() => onSetDrawerTab("NONE")}
					onKeyDown={(e) => {
						if (e.key === "Escape") onSetDrawerTab("NONE");
					}}
				>
					<div
						role="dialog"
						aria-modal="true"
						className="w-full max-w-3xl max-h-[80vh] overflow-y-auto bg-[#080C15]/96 border border-slate-700/90 rounded-2xl p-5 md:p-6 backdrop-blur-md shadow-[0_0_80px_rgba(0,0,0,0.92)] text-slate-200 flex flex-col gap-4"
						onClick={(e) => e.stopPropagation()}
						onKeyDown={(e) => e.stopPropagation()}
					>
						{/* Modal Header with Close [X] */}
						<div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
							<div className="flex items-center gap-2 font-mono text-sm font-bold text-white">
								{colloquium.activeDrawerTab === "CHALKBOARD_PROOF" && (
									<>
										<FlaskConical className="w-4 h-4 text-emerald-400" />
										<span>Chalkboard Proof Workbench — Central Lemma 3.2</span>
									</>
								)}
								{colloquium.activeDrawerTab === "FINANCE_LEDGER" && (
									<>
										<DollarSign className="w-4 h-4 text-emerald-400" />
										<span>
											Personal Checking &amp; Departmental Research Accounting
										</span>
									</>
								)}
								{colloquium.activeDrawerTab === "CALENDAR_NPCS" && (
									<>
										<Calendar className="w-4 h-4 text-amber-400" />
										<span>
											University Schedule, Colleagues &amp; Time Controls
										</span>
									</>
								)}
								{colloquium.activeDrawerTab === "PINE_MAIL" && (
									<>
										<Mail className="w-4 h-4 text-sky-400" />
										<span>
											UGA Pine Mail Terminal ({colloquium.inbox.length}{" "}
											Messages)
										</span>
									</>
								)}
								{colloquium.activeDrawerTab === "LEGAL_MARITAL" && (
									<>
										<AlertTriangle className="w-4 h-4 text-rose-400" />
										<span>LEGAL / MARITAL LEDGER — Vance &amp; Associates</span>
									</>
								)}
								{colloquium.activeDrawerTab === "COURSE_READER" && (
									<>
										<BookOpen className="w-4 h-4 text-amber-400" />
										<span>MATH 409 · Peano Hall Course Reader</span>
									</>
								)}
							</div>
							<button
								type="button"
								onClick={() => onSetDrawerTab("NONE")}
								className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs flex items-center gap-1 cursor-pointer"
							>
								<span>Close</span>
								<X className="w-3.5 h-3.5" />
							</button>
						</div>

						{/* TAB 1: REAL MATHEMATICAL PROOF WORKBENCH FOR CENTRAL LEMMA 3.2 */}
						{colloquium.activeDrawerTab === "CHALKBOARD_PROOF" && (
							<div className="space-y-4">
								<div className="bg-[#0D1F18] border border-emerald-500/40 rounded-xl p-3.5 font-mono text-xs text-emerald-100 space-y-1.5">
									<div className="flex items-center justify-between">
										<span className="text-[10px] text-emerald-300 uppercase font-bold">
											MANUSCRIPT: &ldquo;{colloquium.manuscriptTitle}&rdquo;
										</span>
										<span className="text-xs font-extrabold text-emerald-300">
											INTEGRITY: {colloquium.centralLemmaIntegrity}%
										</span>
									</div>
									<div>{colloquium.proofWorkbench.lastVerificationMessage}</div>
								</div>

								{/* Task 1: Boundary Gauge Choice */}
								<div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2">
									<div className="flex items-center justify-between">
										<span className="text-xs font-mono font-bold text-white">
											1. Select Boundary Gauge Condition on ∂M_(t₀−1) (Takes
											25m)
										</span>
										<span
											className={`text-[10px] font-mono px-2 py-0.5 rounded ${
												colloquium.proofWorkbench.boundaryGaugeVerified
													? "bg-emerald-500/20 text-emerald-300"
													: "bg-rose-500/20 text-rose-300"
											}`}
										>
											{colloquium.proofWorkbench.boundaryGaugeVerified
												? "✓ VERIFIED"
												: "DEFECTIVE"}
										</span>
									</div>
									<p className="text-[11px] text-slate-400">
										Reviewer #2 noted that the boundary commutator [∂_t,
										H_chiral] diverges at t₀ − 1 unless the spinor boundary
										condition is anti-symmetric.
									</p>
									<div className="grid grid-cols-1 gap-1.5 pt-1">
										{(
											[
												[
													"DIRICHLET_CLAMP",
													"Option A: Naive Dirichlet Clamp ψ(t₀−1) = 0",
													"Fails unitary flux conservation on open files (Reviewer #2 counterexample)",
												],
												[
													"CHIRAL_ANTIPERIODIC",
													"Option B: Chiral Anti-Periodic Gauge ψ(t₀−1) = −γ₅ψ(t₀)",
													"Cancels the surface commutator exactly while preserving causal cone locality",
												],
												[
													"TRUNCATED_PERTURBATIVE",
													"Option C: 2nd-Order Truncated Taylor Series",
													"Diverges for high-momentum retrocausal paths",
												],
											] as const
										).map(([val, title, desc]) => (
											<button
												type="button"
												key={val}
												onClick={() => onSelectBoundaryGauge(val)}
												className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
													colloquium.proofWorkbench.boundaryGaugeChoice === val
														? val === "CHIRAL_ANTIPERIODIC"
															? "bg-emerald-950/90 border-emerald-400 text-emerald-100"
															: "bg-rose-950/90 border-rose-400 text-rose-100"
														: "bg-slate-950/80 hover:bg-slate-800 border-slate-800 text-slate-300"
												}`}
											>
												<div className="text-xs font-mono font-bold">
													{title}
												</div>
												<div className="text-[10px] text-slate-400">{desc}</div>
											</button>
										))}
									</div>
								</div>

								{/* Task 2: Retrocausal Jacobian Sign Flip */}
								<div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between gap-3">
									<div>
										<div className="text-xs font-mono font-bold text-white">
											2. Toby’s Anomaly: Off-Diagonal Retrocausal Jacobian Sign
										</div>
										<div className="text-[11px] text-slate-400 mt-0.5">
											Current Matrix:{" "}
											<code className="text-amber-300">
												det [ ∂_t , −κ ;{" "}
												{colloquium.proofWorkbench.jacobianSignFlipped
													? "+κ"
													: "−κ"}{" "}
												, ∂_w ] ={" "}
												{colloquium.proofWorkbench.jacobianSignFlipped
													? "λ² + κ² > 0 (Strictly Bounded!)"
													: "λ² − κ² = 0 (Singular Pole!)"}
											</code>
										</div>
									</div>
									<button
										type="button"
										onClick={onToggleJacobianSign}
										className={`px-3.5 py-2 rounded-xl font-mono text-xs font-bold shrink-0 cursor-pointer ${
											colloquium.proofWorkbench.jacobianSignFlipped
												? "bg-emerald-500/25 border border-emerald-400 text-emerald-200"
												: "bg-amber-400 hover:bg-amber-300 text-slate-950"
										}`}
									>
										{colloquium.proofWorkbench.jacobianSignFlipped
											? "✓ Adjoint +κ Applied"
											: "Flip Sign to +κ (20m)"}
									</button>
								</div>

								{/* Task 3: Hermitian Boundary Self-Adjoint Extension */}
								<div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2">
									<div className="flex items-center justify-between">
										<span className="text-xs font-mono font-bold text-white">
											3. Hermitian Boundary Flux on ∂M (Self-Adjoint Extension)
										</span>
										<span
											className={`text-[10px] font-mono px-2 py-0.5 rounded ${
												colloquium.proofWorkbench.hermitianBoundaryBalanced
													? "bg-emerald-500/20 text-emerald-300"
													: "bg-rose-500/20 text-rose-300"
											}`}
										>
											{colloquium.proofWorkbench.hermitianBoundaryBalanced
												? "✓ ⟨φ|Hψ⟩ = ⟨Hφ|ψ⟩"
												: "LEAKING"}
										</span>
									</div>
									<p className="text-[11px] text-slate-400">
										Reviewer #2: Hamiltonian Ĥ is not Hermitian on the boundary.
										Tune the surface commutator offset until probability is
										conserved (∑Pᵢ = 1) or the Pawn can be erased by
										mathematical inconsistency.
									</p>
									<input
										type="range"
										min={-100}
										max={100}
										value={Math.round(
											colloquium.proofWorkbench.surfaceCommutatorOffset * 100,
										)}
										onChange={(e) =>
											onAdjustSurfaceCommutator(Number(e.target.value) / 100)
										}
										className="w-full accent-emerald-400 cursor-pointer"
									/>
									<div className="flex justify-between text-[10px] font-mono text-slate-500">
										<span>
											κ_∂ ={" "}
											{colloquium.proofWorkbench.surfaceCommutatorOffset.toFixed(
												2,
											)}
										</span>
										<span>
											Purity Tr(ρ²) ≈{" "}
											{colloquium.proofWorkbench.purityEstimate.toFixed(3)}
										</span>
									</div>
								</div>

								{/* Task 4: CHSH Entanglement Assist Tuning */}
								<div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2">
									<div className="flex items-center justify-between">
										<span className="text-xs font-mono font-bold text-white">
											4. CHSH Measurement Bases (Entangled Assist Bound)
										</span>
										<span
											className={`text-[10px] font-mono px-2 py-0.5 rounded ${
												colloquium.proofWorkbench.chshS >= 2 * Math.SQRT2 - 0.05
													? "bg-fuchsia-500/20 text-fuchsia-300"
													: colloquium.proofWorkbench.chshS > 2
														? "bg-amber-500/20 text-amber-300"
														: "bg-slate-700 text-slate-300"
											}`}
										>
											S = {colloquium.proofWorkbench.chshS.toFixed(3)}
										</span>
									</div>
									<p className="text-[11px] text-slate-400">
										Classical bound S ≤ 2 · Tsirelson S ≤ 2√2 ≈ 2.828. Align
										angles to breach locality for guard-ignoring Bell assists.
									</p>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
										<label className="text-[10px] font-mono text-slate-400 space-y-1">
											Angle A (rad)
											<input
												type="range"
												min={0}
												max={628}
												value={Math.round(
													colloquium.proofWorkbench.measurementAngleA * 100,
												)}
												onChange={(e) =>
													onAdjustChshAngles(
														Number(e.target.value) / 100,
														colloquium.proofWorkbench.measurementAngleB,
													)
												}
												className="w-full accent-sky-400 cursor-pointer"
											/>
										</label>
										<label className="text-[10px] font-mono text-slate-400 space-y-1">
											Angle B (rad)
											<input
												type="range"
												min={0}
												max={628}
												value={Math.round(
													colloquium.proofWorkbench.measurementAngleB * 100,
												)}
												onChange={(e) =>
													onAdjustChshAngles(
														colloquium.proofWorkbench.measurementAngleA,
														Number(e.target.value) / 100,
													)
												}
												className="w-full accent-sky-400 cursor-pointer"
											/>
										</label>
									</div>
									<button
										type="button"
										onClick={() => onAdjustChshAngles(0, Math.PI / 4)}
										className="px-3 py-1.5 rounded-lg bg-fuchsia-500/20 border border-fuchsia-400/50 text-fuchsia-200 font-mono text-[10px] font-bold cursor-pointer"
									>
										Set Optimal Tsirelson Angles (A=0, B=π/4)
									</button>
									{colloquium.proofWorkbench.monogamyLemmaAnnotated && (
										<div className="text-[11px] font-mono text-pink-300 border border-pink-500/30 rounded-lg p-2 bg-pink-950/40">
											✓ CKW Monogamy annotated: τ(A|B)+τ(A|C) ≤ τ(A|BC) —
											entanglement swap unlocked for Checkmate Yesterday.
										</div>
									)}
								</div>

								{/* Task 5: Chiral Lab Verification & Mandatory Rook Citations */}
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
									<div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col justify-between gap-2">
										<div>
											<div className="text-xs font-mono font-bold text-white">
												5. Chiral Interferometer Run
											</div>
											<div className="text-[10px] text-slate-400 mt-0.5">
												{colloquium.bishopLabAccessGranted
													? "Prof. Bishop granted lab access! Run the 4.8σ verification ($950 Dept. Grant)."
													: "Locked: Obtain Prof. Bishop’s approval at the 14:30 Seminar Room 204 Review."}
											</div>
										</div>
										<button
											type="button"
											onClick={onRunChiralLabExperiment}
											disabled={
												!colloquium.bishopLabAccessGranted ||
												colloquium.proofWorkbench.chiralLabDataAttached
											}
											className={`w-full py-2 rounded-lg font-mono text-xs font-bold ${
												colloquium.proofWorkbench.chiralLabDataAttached
													? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
													: colloquium.bishopLabAccessGranted
														? "bg-purple-400 hover:bg-purple-300 text-slate-950 cursor-pointer"
														: "bg-slate-800 text-slate-500 cursor-not-allowed"
											}`}
										>
											{colloquium.proofWorkbench.chiralLabDataAttached
												? "✓ 4.8σ Lab Data Attached"
												: "Run Chiral Experiment ($950 Dept)"}
										</button>
									</div>

									<div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col justify-between gap-2">
										<div>
											<div className="text-xs font-mono font-bold text-white">
												6. Cite Rook (2021, 2023, 2025)
											</div>
											<div className="text-[10px] text-slate-400 mt-0.5">
												Appease Reviewer #2’s demand to cite his three identical
												rectilinear papers in §2.
											</div>
										</div>
										<button
											type="button"
											onClick={onToggleRookCitations}
											className={`w-full py-2 rounded-lg font-mono text-xs font-bold cursor-pointer ${
												colloquium.proofWorkbench.rookCitationsAttached
													? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
													: "bg-sky-400 hover:bg-sky-300 text-slate-950"
											}`}
										>
											{colloquium.proofWorkbench.rookCitationsAttached
												? "✓ Rook (2021–2025) Cited"
												: "Insert 3 Rook Citations (15m)"}
										</button>
									</div>
								</div>

								{/* Journal Submission Action inside Proof Workbench */}
								<div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
									<div className="text-[11px] font-mono text-slate-400">
										Journal of Transfinite Causality Rejections:{" "}
										<strong className="text-rose-300">
											{colloquium.journalRejections}/3
										</strong>
									</div>
									<div className="flex flex-wrap gap-2">
										<button
											type="button"
											onClick={() => onSetDrawerTab("COURSE_READER")}
											className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-200 font-mono font-bold text-xs rounded-xl cursor-pointer border border-amber-500/30"
										>
											Peano Hall Course Reader
										</button>
										<button
											type="button"
											onClick={onSubmitToJournalOfTransfiniteCausality}
											className="px-4 py-2 bg-linear-to-r from-amber-400 to-sky-400 hover:from-amber-300 hover:to-sky-300 text-slate-950 font-mono font-extrabold text-xs rounded-xl cursor-pointer shadow-md"
										>
											Submit Manuscript to Journal of Transfinite Causality →
										</button>
									</div>
								</div>
							</div>
						)}

						{/* TAB 2: PERSONAL & DEPARTMENTAL FINANCIAL LEDGERS + GRANT BUDGET BUILDER */}
						{colloquium.activeDrawerTab === "FINANCE_LEDGER" && (
							<div className="space-y-5">
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
									<div className="bg-slate-900/95 border border-slate-700 rounded-xl p-3.5 space-y-2">
										<div className="text-[10px] font-mono uppercase text-emerald-300 font-bold">
											PERSONAL CHECKING ACCOUNT (#4409)
										</div>
										<div className="text-xl font-mono font-extrabold text-white">
											${colloquium.checkingBalance.toFixed(2)}
										</div>
										<div className="text-[11px] font-mono text-slate-400">
											Biweekly Net Salary (Fridays):{" "}
											<span className="text-emerald-300">+$1,853.85</span>
										</div>
										{!colloquium.mortgagePaidThisWeek ? (
											<button
												type="button"
												onClick={onPayMonthlyMortgage}
												className="w-full py-2 bg-rose-500 hover:bg-rose-400 text-slate-950 font-mono font-extrabold text-xs rounded-lg cursor-pointer transition-colors"
											>
												Pay Monthly Mortgage ($2,140.00)
											</button>
										) : (
											<div className="text-xs font-mono text-emerald-300 font-bold">
												✓ Monthly Mortgage ($2,140.00) Paid for This Month
											</div>
										)}
									</div>

									<div className="bg-slate-900/95 border border-slate-700 rounded-xl p-3.5 space-y-2">
										<div className="text-[10px] font-mono uppercase text-sky-300 font-bold">
											DEPARTMENTAL RESEARCH ACCOUNT (#UGA-4B)
										</div>
										<div className="text-xl font-mono font-extrabold text-white">
											${colloquium.departmentalBudget.toFixed(2)}
										</div>
										<div className="text-[11px] font-mono text-slate-400">
											Restricted to approved lab cryo-consumables &amp; RA
											stipends.
										</div>
										<button
											type="button"
											onClick={onAttemptIllegalDepartmentalReimbursement}
											className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-amber-200 font-mono text-[10px] rounded-lg cursor-pointer"
										>
											Attempt to Expense Personal Dry Cleaning to Dept. Grant
										</button>
									</div>
								</div>

								{/* Interactive Grant Proposal & Equipment Budget Worksheet */}
								<div className="bg-[#0D1322] border border-sky-500/40 rounded-xl p-4 space-y-3">
									<div className="flex items-center justify-between">
										<div>
											<div className="text-xs font-mono font-bold text-sky-200">
												📋 Andromeda Science Foundation — Equipment &amp; RA
												Grant Worksheet
											</div>
											<div className="text-[10px] text-slate-400">
												Select justified research line items. Total (Direct +
												58.5% Indirect Overhead) must not exceed $3,800.00 and
												must contain zero personal expenses.
											</div>
										</div>
										<span className="text-xs font-mono font-bold text-amber-300">
											Cap: $3,800
										</span>
									</div>

									<div className="space-y-1.5">
										{colloquium.grantBudgetLines.map((line) => (
											<button
												type="button"
												key={line.id}
												onClick={() => onToggleGrantLineItem(line.id)}
												disabled={colloquium.grantSubmittedAndApproved}
												className={`w-full p-2.5 rounded-lg border text-left flex items-center justify-between gap-2 cursor-pointer transition-colors ${
													line.selected
														? line.isProhibitedPersonalExpense
															? "bg-rose-950/80 border-rose-500/80 text-rose-100"
															: "bg-sky-950/80 border-sky-400/80 text-sky-100"
														: "bg-slate-900/70 border-slate-800 text-slate-400"
												}`}
											>
												<div>
													<div className="text-xs font-mono font-bold">
														{line.selected ? "☑ " : "☐ "}
														{line.label}
													</div>
													<div className="text-[10px] opacity-80">
														{line.justificationNote}
													</div>
												</div>
												<span className="text-xs font-mono font-bold shrink-0">
													${line.directCost.toFixed(2)}
												</span>
											</button>
										))}
									</div>

									<div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 font-mono text-xs">
										<div>
											Direct: <strong>${selectedGrantDirectTotal}</strong> +
											58.5% Overhead: <strong>${selectedGrantOverhead}</strong>{" "}
											= Total:{" "}
											<strong
												className={
													selectedGrantGrandTotal > 3800 ||
													hasProhibitedGrantItem
														? "text-rose-400"
														: "text-emerald-300"
												}
											>
												${selectedGrantGrandTotal}
											</strong>
										</div>
										<button
											type="button"
											onClick={onSubmitGrantBudgetProposal}
											disabled={colloquium.grantSubmittedAndApproved}
											className={`px-4 py-2 rounded-lg font-extrabold text-xs ${
												colloquium.grantSubmittedAndApproved
													? "bg-emerald-500/20 text-emerald-300"
													: "bg-sky-400 hover:bg-sky-300 text-slate-950 cursor-pointer"
											}`}
										>
											{colloquium.grantSubmittedAndApproved
												? "✓ Grant Approved & Funded"
												: "Submit Reconciled Grant Budget →"}
										</button>
									</div>
								</div>

								{/* Transaction Ledger Table */}
								<div className="space-y-2">
									<div className="text-xs font-mono font-bold text-slate-300 uppercase">
										TRANSACTION LEDGER (PERSONAL &amp; DEPARTMENTAL)
									</div>
									<div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden text-[11px] font-mono">
										{[
											...colloquium.personalLedger,
											...colloquium.departmentalLedger,
										]
											.slice(-8)
											.reverse()
											.map((entry) => (
												<div
													key={entry.id}
													className="px-3 py-2 border-b border-slate-900 flex items-center justify-between gap-2"
												>
													<div>
														<span
															className={`px-1.5 py-0.5 rounded text-[9px] mr-2 ${
																entry.account === "PERSONAL"
																	? "bg-emerald-500/15 text-emerald-300"
																	: "bg-sky-500/15 text-sky-300"
															}`}
														>
															{entry.account}
														</span>
														<span className="text-slate-200">
															{entry.description}
														</span>
														<span className="text-slate-500 ml-2">
															({entry.dayLabel} {entry.timeLabel})
														</span>
													</div>
													<div className="shrink-0 text-right">
														<span
															className={
																entry.amount >= 0
																	? "text-emerald-300 font-bold"
																	: "text-rose-300 font-bold"
															}
														>
															{entry.amount >= 0 ? "+" : ""}$
															{entry.amount.toFixed(2)}
														</span>
														<span className="text-slate-500 ml-2">
															(Bal: ${entry.runningBalance.toFixed(2)})
														</span>
													</div>
												</div>
											))}
									</div>
								</div>
							</div>
						)}

						{/* TAB 3: 5-DAY UNIVERSITY SCHEDULE, APPOINTMENTS & PERSISTENT COLLEAGUE MEMORIES */}
						{colloquium.activeDrawerTab === "CALENDAR_NPCS" && (
							<div className="space-y-4">
								<div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/90 border border-slate-800 rounded-xl p-3">
									<div className="text-xs font-mono text-slate-300">
										Current Time:{" "}
										<strong className="text-white">
											{dayName} {timeStr}
										</strong>{" "}
										· Energy:{" "}
										<strong className="text-emerald-300">
											{colloquium.energyLevel}%
										</strong>
									</div>
									<div className="flex flex-wrap items-center gap-1.5">
										<button
											type="button"
											onClick={() =>
												onAdvanceTimeMinutes(
													30,
													"Worked at office desk for 30 minutes",
												)
											}
											className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-[11px] rounded-lg cursor-pointer"
										>
											+30m Work
										</button>
										{colloquium.hasSpareCleanShirtAtHome &&
											colloquium.shirtState !== "CLEAN" && (
												<button
													type="button"
													onClick={onCommuteHomeForSpareShirt}
													className="px-2.5 py-1 bg-sky-900/80 hover:bg-sky-800 text-sky-100 font-mono text-[11px] rounded-lg cursor-pointer"
												>
													Bus Home for Spare Shirt ($5.50 · 95m)
												</button>
											)}
										<button
											type="button"
											onClick={onSleepUntilNextMorning}
											className="px-3 py-1 bg-indigo-500/30 hover:bg-indigo-500/45 border border-indigo-400/50 text-indigo-100 font-mono text-[11px] font-bold rounded-lg cursor-pointer flex items-center gap-1"
										>
											<Moon className="w-3 h-3" />
											<span>Sleep Until Next Morning (08:30)</span>
										</button>
									</div>
								</div>

								<div className="space-y-2">
									<div className="text-xs font-mono font-bold text-amber-300 uppercase">
										SCHEDULED UNIVERSITY COMMITMENTS
									</div>
									{colloquium.appointments.map((appt) => (
										<div
											key={appt.id}
											className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3"
										>
											<div>
												<div className="text-xs font-mono font-bold text-white">
													{DAY_NAMES[appt.dayIndex]} ·{" "}
													{formatSimTime(appt.startMinutes)} –{" "}
													{formatSimTime(appt.endMinutes)}: {appt.title}
												</div>
												<div className="text-[11px] text-slate-400">
													Location:{" "}
													{UNIVERSITY_ROOM_CENTERS[appt.locationRoom].label} ·
													With: {appt.withNpcName}
												</div>
												{appt.outcomeNote && (
													<div className="text-[11px] font-mono text-amber-200 mt-1">
														→ {appt.outcomeNote}
													</div>
												)}
											</div>
											<div className="flex items-center gap-2 shrink-0">
												{appt.status === "UPCOMING" &&
													appt.dayIndex === colloquium.dayIndex && (
														<button
															type="button"
															onClick={() => {
																onAttendScheduledMeetingInRoom(appt.id);
																onSetDrawerTab("NONE");
															}}
															className="px-2.5 py-1 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-mono text-[10px] font-extrabold rounded-lg cursor-pointer"
														>
															Attend Now
														</button>
													)}
												<span
													className={`px-2 py-1 rounded text-[10px] font-mono font-bold ${
														appt.status === "ATTENDED_CLEAN"
															? "bg-emerald-500/20 text-emerald-300"
															: appt.status === "MISSED" ||
																	appt.status === "ATTENDED_STAINED"
																? "bg-rose-500/20 text-rose-300"
																: "bg-amber-500/20 text-amber-200"
													}`}
												>
													{appt.status}
												</span>
											</div>
										</div>
									))}
								</div>

								<div className="space-y-2 pt-2 border-t border-slate-800">
									<div className="text-xs font-mono font-bold text-sky-300 uppercase">
										COLLEAGUE RELATIONSHIPS &amp; PERSISTENT MEMORY LOG
									</div>
									<div className="grid grid-cols-3 gap-2 font-mono text-xs">
										<div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5">
											<div className="text-[10px] text-slate-400">
												Grad Student Toby
											</div>
											<div className="text-sm font-bold text-sky-300">
												{colloquium.tobyRelationship}/100
											</div>
										</div>
										<div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5">
											<div className="text-[10px] text-slate-400">
												Prof. Bishop (Lab)
											</div>
											<div className="text-sm font-bold text-purple-300">
												{colloquium.bishopRelationship}/100
											</div>
										</div>
										<div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5">
											<div className="text-[10px] text-slate-400">
												Chairwoman Queen
											</div>
											<div className="text-sm font-bold text-rose-300">
												{colloquium.chairRelationship}/100
											</div>
										</div>
									</div>
									<div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1.5 font-mono text-[11px] text-slate-300">
										{colloquium.npcMemoryNotes.map((note) => (
											<div key={note}>• {note}</div>
										))}
									</div>
								</div>
							</div>
						)}

						{/* TAB 4: UGA PINE MAIL INBOX */}
						{colloquium.activeDrawerTab === "PINE_MAIL" && (
							<div className="grid grid-cols-1 md:grid-cols-12 gap-3">
								<div className="md:col-span-5 space-y-1.5 max-h-[48vh] overflow-y-auto pr-1">
									{colloquium.inbox.map((email) => (
										<button
											type="button"
											key={email.id}
											onClick={() => onSelectEmail(email.id)}
											className={`w-full text-left p-2.5 rounded-xl border transition-colors cursor-pointer ${
												email.id === selectedEmail?.id
													? "bg-sky-950/90 border-sky-400 text-white"
													: "bg-slate-900/80 hover:bg-slate-800 border-slate-800 text-slate-300"
											}`}
										>
											<div className="flex items-center justify-between text-[10px] font-mono text-amber-300">
												<span className="truncate">{email.sender}</span>
												{email.unread && (
													<span className="px-1.5 py-0.2 bg-amber-400 text-slate-950 rounded font-bold">
														NEW
													</span>
												)}
											</div>
											<div className="text-xs font-bold truncate mt-0.5">
												{email.subject}
											</div>
											<div className="text-[10px] font-mono text-slate-400">
												{email.dateLabel}
											</div>
										</button>
									))}
								</div>
								{selectedEmail && (
									<div className="md:col-span-7 bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs space-y-2.5">
										<div className="border-b border-slate-800 pb-2">
											<div className="text-amber-300 font-bold">
												{selectedEmail.subject}
											</div>
											<div className="text-[11px] text-slate-400">
												From: {selectedEmail.sender} ({selectedEmail.senderRole}
												)
											</div>
											<div className="text-[10px] text-slate-500">
												{selectedEmail.dateLabel}
											</div>
										</div>
										<div className="whitespace-pre-line text-slate-200 leading-relaxed font-sans text-xs">
											{selectedEmail.body}
										</div>
									</div>
								)}
							</div>
						)}

						{/* TAB 5: LEGAL / MARITAL LEDGER */}
						{colloquium.activeDrawerTab === "LEGAL_MARITAL" && (
							<div className="space-y-4">
								<div className="bg-rose-950/40 border border-rose-500/40 rounded-xl p-3.5 space-y-1">
									<div className="text-[10px] font-mono uppercase text-rose-300 font-bold">
										Arthur Vance, Esq. · $260.00/hr · billed in 0.1-hour
										increments
									</div>
									<div className="text-sm font-mono text-white">
										Unpaid Legal Debt:{" "}
										<strong className="text-rose-300">
											${colloquium.legalDebtBalance.toFixed(2)}
										</strong>{" "}
										<span className="text-slate-400 text-xs">
											(12% annual interest on salary Fridays)
										</span>
									</div>
									<div className="text-[11px] text-slate-400">
										Office wedged between Perseus Dry Cleaners and a discount
										tire shop. Do not contact your spouse. Do not enter 742
										Retrocausal Terrace.
									</div>
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
									<button
										type="button"
										onClick={onVancePhoneConsult}
										className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-rose-400 text-rose-100 font-mono text-xs font-bold cursor-pointer"
									>
										Phone Vance (0.1 hr · $26)
									</button>
									<button
										type="button"
										onClick={onVanceReviewEmail}
										className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-rose-400 text-rose-100 font-mono text-xs font-bold cursor-pointer"
									>
										Have Vance Review Wife&apos;s Email (0.1 · $26)
									</button>
								</div>

								<div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-3">
									<div className="text-xs font-mono font-bold text-white">
										Court Asset Allocation Grid
									</div>
									<div className="space-y-2 text-[11px] font-mono text-slate-300">
										<div className="flex flex-wrap items-center justify-between gap-2">
											<span>
												742 Retrocausal Terrace — Appraised $
												{colloquium.maritalAssetGrid.condoAppraisedValue.toLocaleString()}{" "}
												/ Mortgage $
												{colloquium.maritalAssetGrid.condoRemainingMortgage.toLocaleString()}{" "}
												(underwater)
											</span>
											<div className="flex gap-1">
												{(["PAWN", "SPOUSE", "FORCED_JOINT"] as const).map(
													(v) => (
														<button
															type="button"
															key={v}
															onClick={() => onAssignMaritalAsset("condo", v)}
															className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer ${
																colloquium.maritalAssetGrid.condoAssignedTo ===
																v
																	? "bg-rose-400 text-slate-950"
																	: "bg-slate-800 text-slate-300"
															}`}
														>
															{v}
														</button>
													),
												)}
											</div>
										</div>
										<div className="flex flex-wrap items-center justify-between gap-2">
											<span>
												1984 Burgundy Station Wagon — Blue Book $
												{colloquium.maritalAssetGrid.wagonBlueBookValue}
											</span>
											<div className="flex gap-1">
												{(["PAWN", "SPOUSE"] as const).map((v) => (
													<button
														type="button"
														key={v}
														onClick={() => onAssignMaritalAsset("wagon", v)}
														className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer ${
															colloquium.maritalAssetGrid.wagonAssignedTo === v
																? "bg-rose-400 text-slate-950"
																: "bg-slate-800 text-slate-300"
														}`}
													>
														{v}
													</button>
												))}
											</div>
										</div>
										<div className="flex flex-wrap items-center justify-between gap-2">
											<span>
												IP: &ldquo;On the Nonexistence of Monarchs…&rdquo; —
												Appraised $
												{colloquium.maritalAssetGrid.manuscriptAppraisedValue.toFixed(
													2,
												)}
											</span>
											<button
												type="button"
												onClick={() => onAssignMaritalAsset("exhibitD", true)}
												className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer ${
													colloquium.maritalAssetGrid.exhibitDAttached
														? "bg-emerald-400 text-slate-950"
														: "bg-amber-400 text-slate-950"
												}`}
											>
												{colloquium.maritalAssetGrid.exhibitDAttached
													? "✓ Exhibit D Attached"
													: "Attach Exhibit D (Reviewer #2)"}
											</button>
										</div>
									</div>
									<button
										type="button"
										onClick={onAcceptSettlementWorksheet}
										className="w-full py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-mono text-xs font-extrabold cursor-pointer"
									>
										File Settlement Worksheet with Vance
									</button>
								</div>

								<button
									type="button"
									onClick={onAttendSettlementDeposition}
									disabled={!colloquium.maritalAssetGrid.settlementAccepted}
									className={`w-full py-3 rounded-xl font-mono text-xs font-extrabold ${
										colloquium.maritalAssetGrid.settlementAccepted
											? "bg-fuchsia-500 hover:bg-fuchsia-400 text-slate-950 cursor-pointer"
											: "bg-slate-800 text-slate-500 cursor-not-allowed"
									}`}
								>
									Attend 4-Hour Settlement Deposition (CKW Epiphany)
								</button>
							</div>
						)}

						{/* TAB 6: PEANO HALL COURSE READER */}
						{colloquium.activeDrawerTab === "COURSE_READER" && (
							<div className="relative bg-[#f4ecd8] text-[#1a1510] rounded-xl p-5 font-serif shadow-inner overflow-hidden">
								<div
									className="absolute w-24 h-24 rounded-full border-4 border-amber-900/20 top-8 right-10 pointer-events-none"
									style={{
										background:
											"radial-gradient(circle, rgba(120,80,40,0.15), transparent 70%)",
									}}
								/>
								<div className="text-[10px] font-mono uppercase tracking-widest text-amber-900/70 mb-2">
									MATH 409 · Introduction to Retrocausal Gauge Theory and
									Departmental Budgeting
								</div>
								<h3 className="text-lg font-bold mb-3">
									Peano Hall Course Reader (1987 Preprint)
								</h3>
								<p className="text-sm leading-relaxed mb-3">
									A measurement is not a passive laboratory event. When two
									piece-worldlines overlap in configuration space, decoherence
									may occur through sixty seconds of real-time combat.
									Density-matrix purity Tr(ρ²) governs frame-data noise; isolate
									spectator entanglement before attempting a 175ms Perfect
									Parry.
								</p>
								<p className="text-sm leading-relaxed mb-3">
									Hermiticity on ∂M requires a self-adjoint extension of Ĥ. If
									surface flux is unbalanced, ∑Pᵢ ≠ 1 and probability leaks — in
									this department, that is how untenured Pawns vanish from the
									faculty directory.
								</p>
								<p className="text-sm leading-relaxed mb-3">
									CHSH: classical S ≤ 2; quantum S ≤ 2√2. Tsirelson-bound
									assists tear classical locality. Coffman–Kundu–Wootters: a
									system maximally entangled with one observer has no
									entanglement left for a third — including a marriage, or a
									crown.
								</p>
								<p className="text-xs italic text-amber-950/80 border-l-2 border-amber-800/40 pl-3 mt-4">
									Toby&apos;s margin note in blue ballpoint: &ldquo;Dr. Pawn —
									flip the −κ BEFORE you buy me pastry money. Also the mortgage
									is due. — T&rdquo;
								</p>
							</div>
						)}
					</div>
				</div>
			)}

			{/* 3. BOTTOM AREA: Ephemeral Story Subtitle + Compact Contextual Room Action Bar */}
			<div className="flex flex-col items-center gap-2">
				{/* Ephemeral Story Subtitle Toast (Dismissible, Show-Don't-Tell) */}
				{showNarrativeToast && (
					<div className="pointer-events-auto max-w-2xl w-full bg-[#060911]/82 border border-slate-800/80 rounded-xl px-4 py-2 backdrop-blur-md shadow-lg flex items-center justify-between gap-3">
						<p className="font-serif text-xs md:text-sm text-slate-200 leading-snug">
							{latestNarrativeLine}
						</p>
						<button
							type="button"
							onClick={() => setDismissedLog(latestNarrativeLine)}
							className="text-slate-400 hover:text-white p-1 rounded cursor-pointer shrink-0"
							title="Dismiss subtitle"
						>
							<X className="w-3.5 h-3.5" />
						</button>
					</div>
				)}

				{/* Single Sleek Bottom Bar: Contextual Room Interactions + Quick Room Walk Pills */}
				<div className="pointer-events-auto bg-[#060911]/82 hover:bg-[#060911]/94 border border-slate-800/85 rounded-2xl px-3.5 py-2 backdrop-blur-md shadow-2xl flex flex-wrap items-center justify-center gap-2 transition-colors">
					{/* Active Appointment in current room */}
					{activeApptInRoom && (
						<button
							type="button"
							onClick={() =>
								onAttendScheduledMeetingInRoom(activeApptInRoom.id)
							}
							className="px-3 py-1.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-mono text-xs font-extrabold cursor-pointer flex items-center gap-1.5 shadow-md"
						>
							<CheckCircle2 className="w-3.5 h-3.5" />
							<span>
								Attend {activeApptInRoom.withNpcName.split(" ")[0]} Meeting
							</span>
						</button>
					)}

					{/* Contextual actions for the room Dr. Pawn is currently standing in */}
					{colloquium.currentRoom === "OFFICE_4B" && (
						<>
							<button
								type="button"
								onClick={onKickCoffeeMachine}
								className="px-2.5 py-1 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-amber-200 font-mono text-[11px] cursor-pointer flex items-center gap-1"
							>
								<Coffee className="w-3 h-3 text-amber-400" />
								<span>1987 Coffee Machine</span>
							</button>
							<button
								type="button"
								onClick={() => onTalkToNpcInRoom("TOBY")}
								className="px-2.5 py-1 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-sky-200 font-mono text-[11px] cursor-pointer"
							>
								Talk to Toby
							</button>
							<button
								type="button"
								onClick={() => onSetDrawerTab("CHALKBOARD_PROOF")}
								className="px-2.5 py-1 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-200 font-mono text-[11px] font-bold cursor-pointer"
							>
								Chalkboard ({colloquium.centralLemmaIntegrity}%)
							</button>
							<button
								type="button"
								onClick={onSubmitToJournalOfTransfiniteCausality}
								className="px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 font-mono text-[11px] font-bold cursor-pointer"
							>
								Submit Paper ({colloquium.journalRejections}/3)
							</button>
						</>
					)}

					{colloquium.currentRoom === "FACULTY_CORRIDOR" && (
						<>
							<button
								type="button"
								onClick={() => onTalkToNpcInRoom("BISHOP")}
								className="px-2.5 py-1 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-purple-200 font-mono text-[11px] cursor-pointer"
							>
								Talk to Prof. Bishop
							</button>
							<button
								type="button"
								onClick={() => onTalkToNpcInRoom("QUEEN")}
								className="px-2.5 py-1 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-rose-200 font-mono text-[11px] cursor-pointer"
							>
								Talk to Chairwoman Queen
							</button>
						</>
					)}

					{colloquium.currentRoom === "SEMINAR_ROOM_204" && (
						<>
							<button
								type="button"
								onClick={() => onTalkToNpcInRoom("BISHOP")}
								className="px-2.5 py-1 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-purple-200 font-mono text-[11px] cursor-pointer"
							>
								Consult Prof. Bishop
							</button>
							<button
								type="button"
								onClick={() => onTalkToNpcInRoom("QUEEN")}
								className="px-2.5 py-1 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-rose-200 font-mono text-[11px] cursor-pointer"
							>
								Speak with Chairwoman Queen
							</button>
						</>
					)}

					{colloquium.currentRoom === "CAFETERIA" && (
						<>
							<button
								type="button"
								onClick={onJoinOrLeaveCafeteriaQueue}
								className={`px-3 py-1 rounded-xl font-mono text-[11px] font-bold cursor-pointer flex items-center gap-1.5 ${
									colloquium.cafeteriaQueuePosition !== null
										? "bg-amber-400 text-slate-950"
										: "bg-amber-500/25 hover:bg-amber-500/35 border border-amber-400/60 text-amber-200"
								}`}
							>
								<Coffee className="w-3.5 h-3.5" />
								<span>
									{colloquium.cafeteriaQueuePosition !== null
										? `In Queue (#${colloquium.cafeteriaQueuePosition} · ${Math.round(
												colloquium.cafeteriaServiceProgress,
											)}%) — Leave`
										: "Join Coffee Queue ($4.50)"}
								</span>
							</button>
							<button
								type="button"
								onClick={onBuyTobyCroissant}
								disabled={colloquium.tobyCroissantPurchased}
								className={`px-2.5 py-1 rounded-xl font-mono text-[11px] font-bold cursor-pointer border ${
									colloquium.tobyCroissantPurchased
										? "bg-slate-800 text-slate-500 border-slate-700"
										: "bg-amber-500/30 hover:bg-amber-500/45 border-amber-400/70 text-amber-100"
								}`}
								title="Post-Toby consultation: artisanal almond croissant ($18.75)"
							>
								{colloquium.tobyCroissantPurchased
									? "✓ Toby Got Croissant"
									: "Buy Toby Almond Croissant ($18.75)"}
							</button>
							<button
								type="button"
								onClick={() => onTalkToNpcInRoom("ROOK")}
								className="px-2.5 py-1 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-amber-200 font-mono text-[11px] cursor-pointer"
							>
								Talk to Prof. Rook
							</button>
						</>
					)}

					{(colloquium.currentRoom === "CAMPUS_QUAD" ||
						colloquium.currentRoom === "CITY_STREETS") &&
						onToggleDriveCar && (
							<button
								type="button"
								onClick={onToggleDriveCar}
								className="px-3 py-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-mono text-[11px] font-extrabold cursor-pointer flex items-center gap-1.5"
							>
								<span>
									{colloquium.isDrivingCar
										? "🚗 Park & Exit 1984 Station Wagon [E]"
										: "🚗 Enter 1984 Station Wagon & Drive [E]"}
								</span>
							</button>
						)}

					{onOpenTransitModal && (
						<button
							type="button"
							onClick={onOpenTransitModal}
							className="px-2.5 py-1 rounded-xl bg-teal-500/25 hover:bg-teal-500/40 border border-teal-400/60 text-teal-200 font-mono text-[11px] font-bold cursor-pointer flex items-center gap-1.5"
							title="Board GAMTA Metro/Tram Line 1 ($1.75) [T]"
						>
							<Train className="w-3.5 h-3.5 text-teal-300" />
							<span>Board GAMTA Tram ($1.75)</span>
						</button>
					)}

					{colloquium.currentRoom === "DRY_CLEANER" && (
						<>
							{colloquium.shirtState === "COFFEE_STAINED" && (
								<>
									<button
										type="button"
										onClick={() => onDropOffShirtAtCleaner("EXPRESS_75_MIN")}
										disabled={!cleanerIsOpen}
										className="px-2.5 py-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-mono text-[11px] font-extrabold cursor-pointer"
									>
										1-Hr Express Clean ($28.50)
									</button>
									<button
										type="button"
										onClick={() => onDropOffShirtAtCleaner("STANDARD_NEXT_DAY")}
										disabled={!cleanerIsOpen}
										className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-[11px] cursor-pointer"
									>
										Next-Day Clean ($14.00)
									</button>
								</>
							)}
							{ticket && !ticket.collected && (
								<button
									type="button"
									onClick={onPickUpCleanedShirt}
									className={`px-2.5 py-1 rounded-xl font-mono text-[11px] font-bold cursor-pointer ${
										isTicketReady
											? "bg-emerald-400 text-slate-950"
											: "bg-slate-800 text-amber-200"
									}`}
								>
									{isTicketReady
										? `Pick Up Clean Shirt (#${ticket.ticketNumber})`
										: `Ticket #${ticket.ticketNumber} (Ready ${formatSimTime(ticket.readyMinutes)})`}
								</button>
							)}
							{colloquium.shirtState !== "CLEAN" && (
								<button
									type="button"
									onClick={onBuyNewShirtAtHaberdashery}
									className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sky-200 font-mono text-[11px] cursor-pointer"
								>
									Buy New Oxford Shirt ($68)
								</button>
							)}
						</>
					)}

					{colloquium.currentRoom === "PAWN_HOUSE" &&
						colloquium.homeAccess === "OWNED" && (
							<>
								{colloquium.shirtState !== "CLEAN" &&
									colloquium.hasSpareCleanShirtAtHome && (
										<button
											type="button"
											onClick={onCommuteHomeForSpareShirt}
											className="px-3 py-1 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-mono text-[11px] font-extrabold cursor-pointer flex items-center gap-1.5"
										>
											<Shirt className="w-3.5 h-3.5" />
											<span>
												Put On Clean Spare Dress Shirt from Wardrobe (Free)
											</span>
										</button>
									)}
								<button
									type="button"
									onClick={onSleepUntilNextMorning}
									className="px-3 py-1 rounded-xl bg-indigo-500/30 hover:bg-indigo-500/45 border border-indigo-400/60 text-indigo-100 font-mono text-[11px] font-bold cursor-pointer flex items-center gap-1.5"
								>
									<Moon className="w-3.5 h-3.5" />
									<span>Sleep in Your Own Bed Until 08:30 Tomorrow</span>
								</button>
							</>
						)}

					{colloquium.currentRoom === "OFFICE_4B" &&
						colloquium.livingInOffice4B && (
							<>
								<button
									type="button"
									onClick={onEatHotPlateSoup}
									className="px-2.5 py-1 rounded-xl bg-orange-500/25 hover:bg-orange-500/40 border border-orange-400/50 text-orange-100 font-mono text-[11px] font-bold cursor-pointer"
								>
									Heat Tomato Soup on Hot Plate ($0.89)
								</button>
								<button
									type="button"
									onClick={onSleepUntilNextMorning}
									className="px-2.5 py-1 rounded-xl bg-indigo-500/30 hover:bg-indigo-500/45 border border-indigo-400/60 text-indigo-100 font-mono text-[11px] font-bold cursor-pointer flex items-center gap-1.5"
								>
									<Moon className="w-3.5 h-3.5" />
									<span>Sleep Under Desk Until 08:30</span>
								</button>
							</>
						)}

					{colloquium.tobyCroissantPurchased &&
						colloquium.domesticArcStage === "CROISSANT_BOUGHT" &&
						mins >= 17 * 60 + 15 && (
							<button
								type="button"
								onClick={onForcedAnniversaryWalkHome}
								className="px-3 py-1 rounded-xl bg-slate-200 hover:bg-white text-slate-950 font-mono text-[11px] font-extrabold cursor-pointer flex items-center gap-1.5 border border-slate-400"
							>
								<Footprints className="w-3.5 h-3.5" />
								<span>
									Walk Six Miles Home in Freezing Slush
									{colloquium.checkingBalance < 5.5 ? " (No Bus Fare)" : ""}
								</span>
							</button>
						)}

					<div className="h-4 w-px bg-slate-800 mx-0.5 hidden sm:block" />

					{/* Compact Campus & Open-World Town Navigation Pills */}
					<div className="flex flex-wrap items-center gap-1">
						{(
							[
								["OFFICE_4B", "4B Office"],
								["FACULTY_CORRIDOR", "Corridor"],
								["SEMINAR_ROOM_204", "Seminar 204"],
								["CAFETERIA", "Cafeteria"],
								["CAMPUS_QUAD", "🚗 Parking"],
								["DRY_CLEANER", "🏙️ Cleaners"],
								["PAWN_HOUSE", "🏡 Home"],
							] as [UniversityRoomId, string][]
						).map(([roomId, label]) => (
							<button
								type="button"
								key={roomId}
								onClick={() => onWalkToRoom(roomId)}
								className={`px-2 py-1 rounded-lg font-mono text-[10px] transition-all cursor-pointer ${
									colloquium.currentRoom === roomId
										? "bg-amber-400/90 text-slate-950 font-extrabold"
										: "text-slate-400 hover:text-white hover:bg-slate-800/80"
								}`}
							>
								{label}
							</button>
						))}
						<button
							type="button"
							onClick={onSleepUntilNextMorning}
							className="px-2 py-1 rounded-lg font-mono text-[10px] text-indigo-300 hover:bg-indigo-950/80 border border-indigo-500/30 cursor-pointer flex items-center gap-1 ml-0.5"
							title="End day & sleep until 08:30 tomorrow morning"
						>
							<Moon className="w-3 h-3" />
							<span>Sleep</span>
						</button>
					</div>
				</div>
			</div>

			{/* GAMTA RETROCAUSAL LINE 1 · RAPID TRANSIT BOARDING TERMINAL MODAL */}
			{colloquium.tramTransitModalOpen && (
				<div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
					<div className="w-full max-w-2xl rounded-2xl border border-teal-500/40 bg-[#09151f]/95 shadow-2xl p-6 text-slate-100 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
						<div className="flex items-center justify-between border-b border-slate-800 pb-3">
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/50 flex items-center justify-center text-teal-300">
									<Train className="w-5 h-5" />
								</div>
								<div>
									<h2 className="text-lg font-bold text-teal-300 font-mono tracking-wide">
										GAMTA RETROCAUSAL LINE 1 · RAPID TRANSIT TERMINAL
									</h2>
									<p className="text-xs text-slate-400 font-mono">
										Greater Andromeda Metropolitan Transit Authority · Automated
										Boarding Kiosk
									</p>
								</div>
							</div>
							{onCloseTransitModal && (
								<button
									type="button"
									onClick={onCloseTransitModal}
									className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
								>
									<X className="w-4 h-4" />
								</button>
							)}
						</div>

						{/* Strategic Transit Strategy Comparison Guide */}
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 text-[11px] font-mono">
							<div className="p-2.5 rounded-lg bg-teal-950/40 border border-teal-500/30">
								<div className="font-bold text-teal-300 flex items-center gap-1.5 mb-1">
									<Train className="w-3.5 h-3.5" />
									<span>GAMTA Tram ($1.75)</span>
								</div>
								<p className="text-slate-300 text-[10px] leading-relaxed">
									Fast (7m sim time), +6 Energy rest reading preprints, zero
									traffic delay, direct station link.
								</p>
							</div>
							<div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/30">
								<div className="font-bold text-amber-300 flex items-center gap-1.5 mb-1">
									<span>🚗 1984 Station Wagon</span>
								</div>
								<p className="text-slate-300 text-[10px] leading-relaxed">
									Fast manual driving (up to 45 mph), door-to-door, but requires
									parking and manual control.
								</p>
							</div>
							<div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/40">
								<div className="font-bold text-slate-300 flex items-center gap-1.5 mb-1">
									<Footprints className="w-3.5 h-3.5" />
									<span>Walking On Foot</span>
								</div>
								<p className="text-slate-400 text-[10px] leading-relaxed">
									Free, but takes 25–35 min & costs 12 Energy. High risk of
									missing scheduled review windows!
								</p>
							</div>
						</div>

						{/* Account Checking Balance Status */}
						<div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900/90 border border-slate-800 text-xs font-mono">
							<span className="text-slate-400">Personal Checking (#4409):</span>
							<span
								className={`font-bold ${colloquium.checkingBalance >= 1.75 ? "text-emerald-400" : "text-rose-400"}`}
							>
								${colloquium.checkingBalance.toFixed(2)} (Tram Fare: $1.75)
							</span>
						</div>

						{/* Stations Selection Grid */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							{[
								{
									id: "PEANO_QUAD",
									name: "Peano Quad Station",
									shortLabel: "Peano Quad (Campus)",
									desc: "Direct access to Peano Hall, Office 4B, Seminar 204 & Cafeteria",
									roomTarget: "CAMPUS_QUAD" as UniversityRoomId,
									badge: "🏫 Academic Hub",
								},
								{
									id: "DOWNTOWN_PERSEUS",
									name: "Perseus Downtown Transit Plaza",
									shortLabel: "Downtown Cleaners",
									desc: "Commercial District · Downtown Perseus Dry Cleaners & Haberdashery",
									roomTarget: "DRY_CLEANER" as UniversityRoomId,
									badge: "👔 Cleaners & Shops",
								},
								{
									id: "KEPLER_SUBURBS",
									name: "Kepler Suburbs Station",
									shortLabel: "Kepler Suburbs (Home)",
									desc: "742 Retrocausal Terrace · Dr. Pawn’s House, Wardrobe (Spare Shirt) & Bed",
									roomTarget: "PAWN_HOUSE" as UniversityRoomId,
									badge: "🏡 Dr. Pawn Residence",
								},
								{
									id: "OBSERVATORY_TERMINUS",
									name: "North Observatory Terminus",
									shortLabel: "North Observatory",
									desc: "High-Altitude Quantum Interferometer Bluff overlooking the city & campus",
									roomTarget: "CAMPUS_QUAD" as UniversityRoomId,
									badge: "🔭 Quantum Terminus",
								},
							].map((st) => (
								<div
									key={st.id}
									className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/70 flex flex-col justify-between gap-2.5 hover:border-teal-500/50 transition-all"
								>
									<div>
										<div className="flex items-center justify-between gap-2 mb-1">
											<span className="font-bold text-teal-200 text-sm font-mono">
												{st.name}
											</span>
											<span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-950 text-teal-300 font-mono border border-teal-800/60">
												{st.badge}
											</span>
										</div>
										<p className="text-xs text-slate-400 font-mono leading-relaxed">
											{st.desc}
										</p>
									</div>
									<button
										type="button"
										onClick={() => {
											if (onBoardTransitToStation) {
												onBoardTransitToStation(st.id);
											}
										}}
										disabled={colloquium.checkingBalance < 1.75}
										className="w-full py-2 px-3 rounded-lg bg-teal-500 hover:bg-teal-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-mono text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5"
									>
										<Train className="w-3.5 h-3.5" />
										<span>Board Tram to Here ($1.75)</span>
									</button>
								</div>
							))}
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
