export type PieceType = "p" | "n" | "b" | "r" | "q" | "k";
export type Faction = "w" | "b";

export type AttackInput = "L" | "H" | "S";

export interface ComboRecipe {
	id: string;
	name: string;
	sequence: AttackInput[];
	finisherMultiplier: number;
	effect: "launch" | "knockback" | "guard_crush" | "vortex" | "pierce";
	description: string;
}

export interface MoveFrameData {
	name: string;
	damage: number;
	chipDamage: number;
	startupMs: number;
	activeMs: number;
	recoveryMs: number;
	range: number;
	hitstunMs: number;
	blockstunMs: number;
	knockback: number;
	launchY: number;
	meterGain: number;
	superArmor?: boolean;
}

export type FighterStatusEffectType = "burn" | "slow" | "weakened";

export interface SpecialMoveSpec {
	name: string;
	tagline: string;
	scalingNote: string;
	meterCost: number;
	baseDamage: number;
	range: number;
	startupMs: number;
	activeMs: number;
	recoveryMs: number;
	hits: number;
	unblockable?: boolean;
	statusEffect: FighterStatusEffectType;
	statusDurationMs: number;
}

export interface VictoryTauntSpec {
	id: string;
	name: string;
	quote: string;
	durationMs: number;
	flourishColorHex: number;
}

export interface ArchetypeSpec {
	type: PieceType;
	chessName: string;
	warriorTitle: string;
	tacticalValue: number;
	maxHp: number;
	walkSpeed: number;
	dashSpeed: number;
	jumpForce: number;
	weaponName: string;
	fightingStyle: string;
	light: MoveFrameData;
	heavy: MoveFrameData;
	special: SpecialMoveSpec;
	combos: ComboRecipe[];
	victoryTaunt: VictoryTauntSpec;
}

export interface BoardCoord {
	row: number;
	col: number;
	z?: number; // 3rd spatial axis (0 = Prime Ground, 1 = Astral Stratum)
	w?: number; // 4th spatial axis (-1 = Kata, 0 = Prime, +1 = Ana)
}

export interface SpacetimeWaypoint {
	row: number;
	col: number;
	z: number;
	w: number;
	turn: number;
}

export interface ChessPiece {
	id: string;
	/** Persistent Multiversal Lineage Identity shared by all manifestations of this piece across all timelines */
	lineageId?: string;
	/** Timeline ID where this piece originally manifested */
	originTimelineId?: string;
	type: PieceType;
	faction: Faction;
	row: number;
	col: number;
	z: number; // 0 or 1
	w: number; // -1, 0, +1
	hp: number;
	maxHp: number;
	meter: number; // 0 to 100
	kills: number;
	hasMoved: boolean;
	history: SpacetimeWaypoint[];
	entangledWithId?: string; // Quantum Bell-State Entanglement Partner ID (|Φ⁺⟩)
	// Persistent Subterranean Realm Consequences
	persistentBurnMs?: number;
	persistentSlowMs?: number;
	persistentWeakenedMs?: number;
	mirrorInvertedParity?: boolean;
	realmTraversals?: number;
	inRealm?: RealmId | null;
	/** Number of parallel-universe counterparts fused into this warrior via Multiversal Synod Resonance */
	synodStacks?: number;
	/** True if this warrior's lineage triumphed in a Duel atop the Colossal Multiversal Pocket Watch */
	isChronocrator?: boolean;
	/** True when a Pawn has merged with its alternate-timeline self(s) to form a Sentient Mathematical Theorem capable of checkmating yesterday */
	isSentientTheorem?: boolean;
	/** Formal axiomatic inscription of the Sentient Mathematical Theorem (e.g. '⊢ ∀t < t₀ : ¬∃Monarch [Q.E.D.]') */
	theoremAxiom?: string;
	/** Publication status of the Sentient Mathematical Theorem ('UNPUBLISHED_DRAFT' during Peer Review -> 'PUBLISHED' once accepted) */
	theoremStatus?: TheoremPublicationStatus;
	/** Unlocked via deposition CKW epiphany — enables entanglement-swap Checkmate Yesterday */
	entanglementSwapUnlocked?: boolean;
	/** Peak CHSH correlator achieved in Room 4B chalkboard (feeds combat assist scaling) */
	publishedChshS?: number;
}

export type TheoremPublicationStatus = "UNPUBLISHED_DRAFT" | "PUBLISHED";

export type AcademicColloquiumStage =
	| "INACTIVE"
	| "WORLD_COLLAPSE_FADE"
	| "UNIVERSITY_SIMULATOR"
	| "PERSEUS_ARM_OFFER"
	| "ACCEPTANCE_LETTER"
	| "REALITY_SHATTER_TRANSITION"
	| "PREPRINT_SUBMISSION"
	| "PEER_REVIEW_ROUND_1"
	| "MAJOR_REVISIONS"
	| "ORAL_DEFENSE_DEBATE"
	| "PUBLISHED_QED";

export type UniversityRoomId =
	| "OFFICE_4B"
	| "FACULTY_CORRIDOR"
	| "SEMINAR_ROOM_204"
	| "CAFETERIA"
	| "CAMPUS_QUAD"
	| "CITY_STREETS"
	| "DRY_CLEANER"
	| "PAWN_HOUSE";

export type AcademicShirtState =
	| "CLEAN"
	| "COFFEE_STAINED"
	| "AT_CLEANERS_WEARING_SWEATER";

export interface DryCleaningTicket {
	ticketNumber: string;
	serviceName: "STANDARD_NEXT_DAY" | "EXPRESS_75_MIN";
	feePaid: number;
	droppedOffDayIndex: number; // 0=Mon .. 4=Fri
	droppedOffMinutes: number;
	readyDayIndex: number;
	readyMinutes: number; // Minutes from midnight (e.g., 14*60 + 20 = 860 for 14:20)
	collected: boolean;
}

export type FinancialLedgerCategory =
	| "OPENING"
	| "SALARY"
	| "MORTGAGE"
	| "CAFETERIA"
	| "DRY_CLEANING"
	| "CLOTHING"
	| "GRANT_AWARD"
	| "LAB_EQUIPMENT"
	| "PUBLICATION_FEE"
	| "LEGAL_FEES"
	| "PASTRY"
	| "TRANSIT";

export interface FinancialLedgerEntry {
	id: string;
	account: "PERSONAL" | "DEPARTMENTAL";
	dayLabel: string;
	timeLabel: string;
	description: string;
	category: FinancialLedgerCategory;
	amount: number; // Positive for credit, negative for debit
	runningBalance: number;
}

export type DomesticArcStage =
	| "INTACT"
	| "CROISSANT_BOUGHT"
	| "ANNIVERSARY_WALK"
	| "NOTE_RECEIVED"
	| "SEPARATED"
	| "DEPOSITION_DONE"
	| "RUINED_BUT_PUBLISHED";

export type HomeAccessState = "OWNED" | "LOCKED_OUT";

export interface MaritalAssetGridState {
	condoAppraisedValue: number;
	condoRemainingMortgage: number;
	condoMonthlyPayment: number;
	condoAssignedTo: "UNDECIDED" | "PAWN" | "SPOUSE" | "FORCED_JOINT";
	wagonBlueBookValue: number;
	wagonAssignedTo: "UNDECIDED" | "PAWN" | "SPOUSE";
	manuscriptAppraisedValue: number;
	exhibitDAttached: boolean;
	settlementAccepted: boolean;
}

export interface GrantBudgetLineItem {
	id: string;
	label: string;
	category:
		| "CRYO_CONSUMABLES"
		| "INTERFEROMETER_CALIBRATION"
		| "GRAD_STIPEND"
		| "PERSONAL_PROHIBITED";
	directCost: number;
	selected: boolean;
	isProhibitedPersonalExpense?: boolean;
	justificationNote: string;
}

export interface UniversityAppointment {
	id: string;
	dayIndex: number; // 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri
	startMinutes: number; // e.g., 14*60 + 30 = 870 (14:30)
	endMinutes: number; // e.g., 15*60 + 15 = 915 (15:15)
	title: string;
	locationRoom: UniversityRoomId;
	withNpcName: string;
	status:
		| "UPCOMING"
		| "IN_WINDOW"
		| "ATTENDED_CLEAN"
		| "ATTENDED_STAINED"
		| "ATTENDED_SWEATER"
		| "MISSED";
	outcomeNote?: string;
}

export interface LemmaProofWorkbenchState {
	boundaryGaugeChoice:
		| "UNSELECTED"
		| "DIRICHLET_CLAMP"
		| "CHIRAL_ANTIPERIODIC"
		| "TRUNCATED_PERTURBATIVE";
	boundaryGaugeVerified: boolean;
	jacobianSignFlipped: boolean; // False = defective -kappa, True = corrected +kappa anti-Hermitian adjoint
	chiralLabDataAttached: boolean;
	rookCitationsAttached: boolean;
	lastVerificationMessage: string;
	/** Surface flux term κ_∂ balanced so ⟨φ|Hψ⟩ = ⟨Hφ|ψ⟩ on ∂M */
	hermitianBoundaryBalanced: boolean;
	/** Tunable surface commutator offset (−1..+1); 0 is self-adjoint */
	surfaceCommutatorOffset: number;
	/** CHSH correlator S; classical ≤2, Tsirelson ≤2√2 */
	chshS: number;
	measurementAngleA: number; // radians
	measurementAngleB: number; // radians
	/** Tr(ρ²) purity estimate 0..1; mixed states muddy combat frame data */
	purityEstimate: number;
	monogamyLemmaAnnotated: boolean;
	courseReaderOpen: boolean;
}

export interface AcademicReviewer {
	id: "REVIEWER_1" | "REVIEWER_2" | "REVIEWER_3";
	label: string;
	professorTitle: string;
	department: string;
	pieceType: PieceType;
	pieceId?: string;
	squareLabel: string;
	verdict:
		| "PENDING"
		| "MINOR_REVISION"
		| "MAJOR_REVISION"
		| "STRONG_REJECT"
		| "ACCEPTED";
	critiqueQuote: string;
	rebuttalResolved: boolean;
}

export interface AcademicEmailItem {
	id: string;
	sender: string;
	senderRole: string;
	subject: string;
	dateLabel: string;
	body: string;
	category:
		| "GRAD_STUDENT"
		| "CHAIR"
		| "ADMIN"
		| "MORTGAGE"
		| "REVIEWER_2"
		| "LAB_POLITICS"
		| "PERSEUS_ARM"
		| "LEGAL"
		| "SPOUSE";
	unread?: boolean;
}

export interface AcademicColloquiumState {
	active: boolean;
	stage: AcademicColloquiumStage;
	candidatePieceId: string | null;
	candidateLineageId: string | null;
	coAuthorTimelineCode: string;
	manuscriptTitle: string;
	manuscriptVersion: string;
	selectedAxiomMethodology: string;
	rigorScore: number; // 0 to 100
	citationsCollected: number;
	requiredCitations: number;
	reviewer2CitationsBribed: boolean;
	latexOverfullHboxFixed: boolean;
	supplementalAppendixAttached: boolean;
	oralDefenseArgumentsWon: number;
	oralDefenseDuelCompleted: boolean;
	reviewers: AcademicReviewer[];
	facultyEndorserIds: string[];
	endorsedByIds: string[];
	colloquiumLog: string[];
	publishedDoi?: string;

	// University of Greater Andromeda — Playable 5-Day Week & 6-Year Career State
	academicYear: number; // 1 to 6
	semester: "Fall" | "Spring";
	dayIndex: number; // 0 = Monday, 1 = Tuesday, 2 = Wednesday, 3 = Thursday, 4 = Friday
	timeOfDayMinutes: number; // Minutes since midnight (e.g., 510 = 08:30, 870 = 14:30)
	energyLevel: number; // 0 to 100 (affected by sleep vs late-night chalkboard sessions)
	currentRoom: UniversityRoomId;
	activeDrawerTab:
		| "NONE"
		| "CHALKBOARD_PROOF"
		| "FINANCE_LEDGER"
		| "PINE_MAIL"
		| "CALENDAR_NPCS"
		| "LEGAL_MARITAL"
		| "COURSE_READER";

	// Open-World City, Drivable 1984 Station Wagon & GAMTA Tram Transit
	isDrivingCar?: boolean;
	carSpeedMph?: number;
	carWorldX?: number;
	carWorldZ?: number;
	carYaw?: number;
	isRidingTram?: boolean;
	tramDestinationStationId?: string | null;
	tramTransitModalOpen?: boolean;
	/** Spouse took the wagon after separation */
	stationWagonSeizedBySpouse: boolean;

	// Clothing, Cafeteria Queue & Dry-Cleaner State
	shirtState: AcademicShirtState;
	hasSpareCleanShirtAtHome: boolean;
	carryingHotCoffee: boolean;
	cafeteriaQueuePosition: number | null; // null = not queuing, 3 -> 2 -> 1 -> 0 (at register)
	cafeteriaServiceProgress: number; // 0 to 100% for current customer in line
	coffeeSpillIncidentTriggered: boolean;
	activeDryCleaningTicket: DryCleaningTicket | null;
	tobyCroissantPurchased: boolean;
	anniversaryWalkForced: boolean;
	anniversaryArrivalModalOpen: boolean;
	depositionModalOpen: boolean;
	hotPlateDinnerEatenTonight: boolean;

	// Anniversary Collapse & Divorce Arc
	domesticArcStage: DomesticArcStage;
	anniversaryDateActive: boolean;
	homeAccess: HomeAccessState;
	livingInOffice4B: boolean;
	legalDebtBalance: number;
	vanceUnpaidInterestRate: number; // e.g. 0.12 annual → monthly on salary day
	maritalAssetGrid: MaritalAssetGridState;
	entanglementSwapUnlocked: boolean;
	depositionEpiphanySeen: boolean;
	legalTabUnlocked: boolean;

	// Real Personal & Departmental Accounting
	annualSalary: number;
	checkingBalance: number; // Always equals opening + sum(personalLedger)
	monthlyMortgage: number;
	mortgagePaidThisWeek: boolean;
	mortgageMonthsBehind: number;
	departmentalBudget: number; // Always equals opening + sum(departmentalLedger)
	personalLedger: FinancialLedgerEntry[];
	departmentalLedger: FinancialLedgerEntry[];
	grantBudgetLines: GrantBudgetLineItem[];
	grantSubmittedAndApproved: boolean;

	// NPC Relationships, Memories & Schedules
	hIndex: number;
	rookHIndex: number;
	adminProductivityScore: number;
	chairRelationship: number; // 0 to 100 ("Strained")
	tobyRelationship: number; // 0 to 100 (Grad student trust/morale)
	bishopRelationship: number; // 0 to 100 (Quantum Lab Director disposition)
	npcMemoryNotes: string[];
	appointments: UniversityAppointment[];

	// Real Mathematical Proof Workbench & Journal Submissions
	centralLemmaIntegrity: number; // Computed from proofWorkbench progress (18% -> 48% -> 78% -> 100%)
	proofWorkbench: LemmaProofWorkbenchState;
	bishopLabAccessGranted: boolean;
	bishopSuspectedWithholding: boolean;
	rookIdenticalPapersCount: number;
	reviewer2RivalryLevel: number;
	journalRejections: number; // 0, 1, 2, 3 rejections from Journal of Transfinite Causality
	equipmentSoldForFee: boolean;
	/** Diegetic Perseus flyer on Room 4B floor — free-roam panel, not a stage swap */
	perseusOfferOpen: boolean;
	/** Acceptance letter on the desk — free-roam panel after fee is paid */
	acceptanceLetterOpen: boolean;
	coffeeMachineKickCount: number;
	selectedEmailId: string;
	inbox: AcademicEmailItem[];
	realityShatterProgressSec?: number;
}

export interface CounterpartManifestationSummary {
	timelineId: string;
	timelineName: string;
	shortCode: string;
	piece: ChessPiece;
	squareLabel: string;
	occupantOnActiveBoard?: ChessPiece | null;
}

export interface TimelineSnapshot {
	turnNumber: number;
	turnFaction: Faction;
	branchName: string;
	pieces: ChessPiece[];
	/** Sequence watermark for rolling back multiversal branches & causal death events on rewind */
	multiverseSeqWatermark?: number;
	activeTimelineId?: string;
}

export type RealmId = "SHATTERED_MIRROR" | "ASHEN_CRUCIBLE" | "ECHOING_REMNANT";

export type MoveDimensionType =
	| "3D_SLICE"
	| "4D_HYPER_SHIFT"
	| "4D_CROSS_SLICE_STRIKE"
	| "TEMPORAL_INTERCEPT"
	| "REALM_GATEWAY_DESCENT"
	| "REALM_PORTAL_TRAVERSAL"
	| "MULTIVERSE_ASSASSINATION"
	| "SYNOD_TRANSPOSITION"
	| "WATCH_ASCENSION_DUEL"
	| "ACADEMIC_DEBATE_DUEL"
	| "CHECKMATE_YESTERDAY";

export interface MoveOption {
	from: { row: number; col: number; z: number; w: number };
	to: { row: number; col: number; z: number; w: number };
	isCapture: boolean;
	targetPiece?: ChessPiece;
	isPromotion?: boolean;
	dimensionType?: MoveDimensionType;
	dimensionLabel?: string;
	gatewayId?: string;
	exitGatewayId?: string;
	realmId?: RealmId;
	targetTimelineId?: string;
}

export interface BoardGateway {
	id: string;
	row: number;
	col: number;
	z: number;
	w: number;
	realmId: RealmId;
	name: string;
	transformRuleLabel: string;
	destinationDesc: string;
	colorHex: number;
	spawnLocalPos: { x: number; y: number; z: number };
	spawnYaw: number;
}

export type RealmPortalKind =
	| "BOARD_ASCENT"
	| "INTER_REALM"
	| "MIRROR_INVERTER"
	| "TIMELINE_PORTAL";

export interface RealmPortalNode {
	id: string;
	realmId: RealmId;
	kind: RealmPortalKind;
	name: string;
	subtitle: string;
	transformFormula: string;
	localPos: { x: number; y: number; z: number };
	yaw: number;
	colorHex: number;
	// For BOARD_ASCENT or TIMELINE_PORTAL portals:
	targetGatewayId?: string;
	targetBoardCoord?: { row: number; col: number; z: number; w: number };
	invertedBoardCoord?: { row: number; col: number; z: number; w: number };
	targetTimelineId?: string;
	// For INTER_REALM or MIRROR_INVERTER portals:
	targetRealmId?: RealmId;
	targetPortalId?: string;
	flipsMirrorParity?: boolean;
}

export interface RealmTemporalEcho {
	id: string;
	sourcePieceId: string;
	pieceType: PieceType;
	faction: Faction;
	fromCoord: SpacetimeWaypoint;
	toCoord: SpacetimeWaypoint;
	startLocalPos: { x: number; y: number; z: number };
	endLocalPos: { x: number; y: number; z: number };
	progress: number;
	speed: number;
	consumed: boolean;
}

export interface RealmEnemySentinel {
	id: string;
	piece: ChessPiece;
	realmId: RealmId;
	localPos: { x: number; y: number; z: number };
	patrolOrigin: { x: number; y: number; z: number };
	patrolRadius: number;
	yaw: number;
	defeated: boolean;
}

export interface UnseenThreatVector {
	attacker: ChessPiece;
	targetRow: number;
	targetCol: number;
	targetZ: number;
	targetW: number;
	axisDescription: string;
}

// ============================================================================
// MULTIVERSAL CHESS, CAUSAL ASSASSINATION & REALITY CONVERGENCE TYPES
// ============================================================================

export interface CausalDeathEvent {
	id: string;
	victimLineageId: string;
	victimPieceId: string;
	victimType: PieceType;
	victimFaction: Faction;
	killerLineageId: string;
	killerPieceId: string;
	killerType: PieceType;
	killerFaction: Faction;
	sourceTimelineId: string;
	sourceTimelineName: string;
	sourceSquare: { row: number; col: number; z: number; w: number };
	sourceSquareLabel: string;
	turnNumber: number;
	combatSummary: string;
	isParadoxStrike?: boolean;
	createdAtSeq: number;
}

export interface CausalCollapseResolution {
	event: CausalDeathEvent;
	targetTimelineId: string;
	targetTimelineName: string;
	erasedPiece: ChessPiece;
	erasedSquareLabel: string;
}

export interface MultiverseMoveRecord {
	seq: number;
	turnNumber: number;
	faction: Faction;
	pieceLineageId: string;
	pieceType: PieceType;
	from: { row: number; col: number; z: number; w: number };
	to: { row: number; col: number; z: number; w: number };
	capturedLineageId?: string;
	capturedType?: PieceType;
	summary: string;
}

export interface VulnerableTargetSummary {
	victimLineageId: string;
	victimType: PieceType;
	victimFaction: Faction;
	victimSquare: { row: number; col: number; z: number; w: number };
	victimSquareLabel: string;
	attackerLineageId: string;
	attackerType: PieceType;
	attackerSquare: { row: number; col: number; z: number; w: number };
	attackerSquareLabel: string;
	move: MoveOption;
	tacticalValue: number;
}

export interface RememberedSquareEntry {
	id: string;
	lineageId: string;
	pieceType: PieceType;
	faction: Faction;
	row: number;
	col: number;
	z: number;
	w: number;
	squareLabel: string;
	sourceTimelineId: string;
	sourceShortCode: string;
	turnNumber: number;
	createdAtSeq: number;
}

export type PocketWatchEventKind =
	| "NEW_TIMELINE_HAND"
	| "TIMELINE_ENTERED"
	| "CAUSAL_ASSASSINATION"
	| "TIMELINE_COLLAPSED"
	| "PARADOX_SQUARE_DEATH"
	| "SYNOD_RESONANCE"
	| "HOROLOGIUM_ASCENSION"
	| "RETROACTIVE_YESTERDAY_CHECKMATE";

export interface PocketWatchEvent {
	id: string;
	kind: PocketWatchEventKind;
	timelineId: string;
	secondaryTimelineId?: string;
	title: string;
	subtitle: string;
	timestampMs: number;
}

export interface TimelineBranch {
	id: string;
	name: string;
	shortCode: string;
	parentTimelineId: string | null;
	forkTurn: number;
	divergenceSummary: string;
	turnNumber: number;
	turnFaction: Faction;
	/** Live active board pieces when this branch is in the active working set */
	pieces: ChessPiece[];
	/** Base snapshot at the fork point for deterministic lazy reconstruction */
	forkBasePieces: ChessPiece[];
	/** Complete deterministic move history since fork point */
	moveHistory: MultiverseMoveRecord[];
	/** Global CausalDeathEvent IDs that have already been reconciled on this branch */
	appliedDeathEventIds: string[];
	/** Sequence number when this branch was created (used for causal rewind rollback) */
	createdAtSeq: number;
	/** True if currently dehydrated out of the active working set to bound memory */
	isDehydrated?: boolean;
	/** True once the player has visited, created, or interacted with this timeline (creates its hand on the Pocket Watch) */
	visitedByPlayer?: boolean;
	/** Fork depth from TL-PRIME (0 for Prime, 1 for direct fork, 2 for secondary fork, etc.) */
	divergenceDepth?: number;
	/** True if this timeline has collapsed due to Regicide, Paradox Collision, or Timeline Collapse */
	isCollapsed?: boolean;
	collapseReason?: string;
}

export interface MultiverseTravelerState {
	lineageId: string;
	originTimelineId: string;
	currentTimelineId: string;
	entrySquareInOrigin: { row: number; col: number; z: number; w: number };
	turnsSpentInAlternate: number;
	assassinationsInBranch: CausalDeathEvent[];
}

export interface MultiverseState {
	activeTimelineId: string;
	primeTimelineId: string;
	seqCounter: number;
	branchCounter: number;
	maxHydratedWorkingSet: number;
	hydratedOrder: string[];
	timelines: Map<string, TimelineBranch>;
	/** Authoritative global ledger of eliminated piece lineages across the multiverse */
	eliminatedLineages: Map<string, CausalDeathEvent>;
	/** Active cross-timeline traveler tracking so a traveler has a single coherent manifestation */
	activeTraveler: MultiverseTravelerState | null;
	/** Ordered list of timeline IDs the player has visited/created — each corresponds 1:1 to a persistent hand on the Multiversal Pocket Watch */
	visitedTimelineIds: string[];
	/** Authoritative ledger of squares occupied by pieces in visited universes (lethal when revisited by the same lineage in another universe) */
	rememberedSquares: RememberedSquareEntry[];
	/** Recent horological events driving physical reactions on the 3D Multiversal Pocket Watch */
	watchEvents: PocketWatchEvent[];
	/** Optional timeline ID currently hovered in the UI to highlight its hand on the 3D Pocket Watch */
	hoveredTimelineId?: string | null;
}

export type GamePhase =
	| "CHESS_VIEW"
	| "ACADEMIC_SIMULATOR"
	| "REALM_DESCENT"
	| "REALM_EXPLORATION"
	| "REALM_ASCENT"
	| "CAUSAL_COLLAPSE"
	| "TRANSITION_TO_FIGHT"
	| "FIGHT_INTRO"
	| "FIGHT_ACTIVE"
	| "FIGHT_OUTRO"
	| "TRANSITION_TO_CHESS"
	| "GAME_OVER";

export type FighterAction =
	| "idle"
	| "walk_fwd"
	| "walk_back"
	| "dash_fwd"
	| "dash_back"
	| "jump"
	| "block"
	| "parry_flash"
	| "blade_clash"
	| "light_1"
	| "light_2"
	| "light_3"
	| "heavy_1"
	| "heavy_2"
	| "combo_finisher"
	| "special"
	| "hitstun"
	| "knockdown"
	| "victory"
	| "victory_taunt"
	| "defeat";

export const TACTICAL_INTERVENTION_METER_COST = 25;

export type InterventionRiftType =
	| "PRIME"
	| "ANA_PLUS_W"
	| "KATA_MINUS_W"
	| "ASTRAL_PLUS_Z";

export interface TacticalSupporter {
	pieceId: string;
	type: PieceType;
	faction: Faction;
	row: number;
	col: number;
	z: number;
	w: number;
	meter: number;
	canIntervene: boolean; // true if meter >= 25 and not yet used
	isCrossDimensional: boolean;
	riftType: InterventionRiftType;
	riftColorHex: number;
	interventionName: string;
	interventionTagline: string;
	vectorLabel: string;
}

export interface SquareSupportAnalysis {
	attackerSupporters: TacticalSupporter[];
	defenderSupporters: TacticalSupporter[];
}

export interface ActiveInterventionState {
	supporter: TacticalSupporter;
	callerIsAttacker: boolean;
	timerSec: number;
	durationSec: number;
	impactApplied: boolean;
}

export interface FighterRuntime {
	piece: ChessPiece;
	spec: ArchetypeSpec;
	isAttacker: boolean;
	isAI: boolean;
	x: number;
	y: number;
	vx: number;
	vy: number;
	facing: 1 | -1;
	hp: number;
	maxHp: number;
	recoverableHp: number;
	meter: number;
	guardGauge: number;
	action: FighterAction;
	actionTimerMs: number;
	actionDurationMs: number;
	hasHitThisAction: boolean;
	specialHitsRemaining: number;
	comboBuffer: AttackInput[];
	comboWindowTimerMs: number;
	activeComboRecipe: ComboRecipe | null;
	comboStepIndex: number;
	hitCount: number;
	comboDamageAccum: number;
	lastBlockPressTime: number;
	superArmorActive: boolean;
	invulnerableTimerMs: number;
	hitFlashTimerMs: number;
	// 4D Combat Mechanics: W-Axis Phase Shift, Temporal Echo Clone, Blade Clash Lock & Bell Entanglement
	wPhaseOffset: number; // 0 = Prime plane, +1 = Ana Phase, -1 = Kata Phase
	wPhaseTimerMs: number;
	wPhaseCooldownMs: number;
	temporalEchoTimerMs: number;
	temporalEchoX: number;
	temporalEchoFacing: 1 | -1;
	temporalEchoHasStruck: boolean;
	clashLockTimerMs: number;
	clashPower: number;
	entangledPartnerName?: string;
	// Tactical Intervention: The Board Fights Back
	supporters: TacticalSupporter[];
	selectedSupporterIndex: number;
	interventionUsed: boolean;
	sovereignAegisActive: boolean;
	// Combat Status Effects ('burn', 'slow', 'weakened')
	statusBurnTimerMs: number;
	statusBurnTickAccumMs: number;
	statusSlowTimerMs: number;
	statusWeakenedTimerMs: number;
}

export interface CombatCallout {
	id: number;
	text: string;
	subtext?: string;
	x: number;
	y: number;
	color: string;
	createdAt: number;
}

export interface BattleLogEntry {
	id: string;
	turnNumber: number;
	summary: string;
	detail: string;
	wasUpset: boolean;
	winnerFaction: Faction;
}
