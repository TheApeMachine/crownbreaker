import { ARCHETYPES } from "../data/archetypes";
import type {
	BoardGateway,
	ChessPiece,
	Faction,
	RealmEnemySentinel,
	RealmId,
	RealmPortalNode,
	RealmTemporalEcho,
} from "../types/game";
import {
	formatSquareName,
	formatWName,
	formatZName,
	getPieceAt,
} from "./chessEngine";

export interface RealmMetadata {
	id: RealmId;
	title: string;
	subtitle: string;
	mechanicTitle: string;
	mechanicSummary: string;
	worldCenter: { x: number; y: number; z: number };
	ambientColorHex: number;
	fogColorHex: number;
	accentColorHex: number;
	floorRadius: number;
}

export const REALM_METADATA: Record<RealmId, RealmMetadata> = {
	SHATTERED_MIRROR: {
		id: "SHATTERED_MIRROR",
		title: "THE SHATTERED MIRROR",
		subtitle: "Cathedral of Chiral Inversion & Folding Horizons",
		mechanicTitle: "SPATIAL PARITY INVERSION",
		mechanicSummary:
			"Cross the Central Looking-Glass to invert chiral orientation (r, c, w) ↦ (7−r, 7−c, −w), flip file parity, and imbue your warrior with Mirror Aegis.",
		worldCenter: { x: 0, y: -88, z: 0 },
		ambientColorHex: 0x38bdf8,
		fogColorHex: 0x050914,
		accentColorHex: 0xc084fc,
		floorRadius: 21.0,
	},
	ASHEN_CRUCIBLE: {
		id: "ASHEN_CRUCIBLE",
		title: "THE ASHEN CRUCIBLE",
		subtitle: "Infernal Under-Forge of Molten Slag & Titanic Pistons",
		mechanicTitle: "ENVIRONMENTAL HAZARD & HELLFIRE TEMPERING",
		mechanicSummary:
			"Navigate suspended slag bridges over molten rivers and reciprocating forge hammers. Claim the Central Crucible Anvil for +40 Meter & Deep Flank Ascent, or suffer persistent Burn.",
		worldCenter: { x: 185, y: -88, z: 0 },
		ambientColorHex: 0xf97316,
		fogColorHex: 0x160704,
		accentColorHex: 0xf59e0b,
		floorRadius: 21.0,
	},
	ECHOING_REMNANT: {
		id: "ECHOING_REMNANT",
		title: "THE ECHOING REMNANT",
		subtitle: "Mausoleum of Recorded Causality & Past Timelines",
		mechanicTitle: "DETERMINISTIC TEMPORAL ECHOES",
		mechanicSummary:
			"Every move made on the 4D board manifests here as a deterministic Temporal Echo replaying its recorded spacetime vector. Absorb Allied Echoes (+18 Meter, +8 HP) and evade Enemy Echoes.",
		worldCenter: { x: -185, y: -88, z: 0 },
		ambientColorHex: 0x34d399,
		fogColorHex: 0x041210,
		accentColorHex: 0x22d3ee,
		floorRadius: 21.0,
	},
};

export const BOARD_GATEWAYS: BoardGateway[] = [
	{
		id: "gw_mirror_c6",
		row: 2,
		col: 2,
		z: 0,
		w: 0,
		realmId: "SHATTERED_MIRROR",
		name: "North Mirror Well (C6)",
		transformRuleLabel: "T(r, c, w) = (7 − r, 7 − c, −w)",
		destinationDesc:
			"Descends into The Shattered Mirror → Exits at F3 (5,5) or Chiral F6 (2,5)",
		colorHex: 0xc084fc,
		spawnLocalPos: { x: 0, y: 0, z: -12.2 },
		spawnYaw: 0,
	},
	{
		id: "gw_mirror_f3",
		row: 5,
		col: 5,
		z: 0,
		w: 0,
		realmId: "SHATTERED_MIRROR",
		name: "South Mirror Well (F3)",
		transformRuleLabel: "T(r, c, w) = (7 − r, 7 − c, −w)",
		destinationDesc:
			"Descends into The Shattered Mirror → Exits at C6 (2,2) or Chiral C3 (5,2)",
		colorHex: 0xc084fc,
		spawnLocalPos: { x: 0, y: 0, z: 12.2 },
		spawnYaw: Math.PI,
	},
	{
		id: "gw_crucible_b5",
		row: 3,
		col: 1,
		z: 0,
		w: 0,
		realmId: "ASHEN_CRUCIBLE",
		name: "West Magma Conduit (B5)",
		transformRuleLabel: "T(r, c) = (7 − r, 7 − c) + Crucible Flank",
		destinationDesc:
			"Descends into The Ashen Crucible → Exits at G4 (4,6) or Deep Flank G7 (1,6)",
		colorHex: 0xf97316,
		spawnLocalPos: { x: -12.2, y: 0, z: 0 },
		spawnYaw: Math.PI / 2,
	},
	{
		id: "gw_crucible_g4",
		row: 4,
		col: 6,
		z: 0,
		w: 0,
		realmId: "ASHEN_CRUCIBLE",
		name: "East Magma Conduit (G4)",
		transformRuleLabel: "T(r, c) = (7 − r, 7 − c) + Crucible Flank",
		destinationDesc:
			"Descends into The Ashen Crucible → Exits at B5 (3,1) or Deep Flank B2 (6,1)",
		colorHex: 0xf97316,
		spawnLocalPos: { x: 12.2, y: 0, z: 0 },
		spawnYaw: -Math.PI / 2,
	},
	{
		id: "gw_remnant_d5",
		row: 3,
		col: 3,
		z: 0,
		w: 0,
		realmId: "ECHOING_REMNANT",
		name: "Chronos Singularity (D5)",
		transformRuleLabel: "T(r, c, z) = (7 − r, 7 − c, z ⊕ 1)",
		destinationDesc:
			"Descends into The Echoing Remnant → Exits at E4 (4,4) or Astral D6 (Z=1)",
		colorHex: 0x34d399,
		spawnLocalPos: { x: 0, y: 0, z: -12.2 },
		spawnYaw: 0,
	},
	{
		id: "gw_remnant_e4",
		row: 4,
		col: 4,
		z: 0,
		w: 0,
		realmId: "ECHOING_REMNANT",
		name: "Chronos Singularity (E4)",
		transformRuleLabel: "T(r, c, z) = (7 − r, 7 − c, z ⊕ 1)",
		destinationDesc:
			"Descends into The Echoing Remnant → Exits at D5 (3,3) or Astral E3 (Z=1)",
		colorHex: 0x34d399,
		spawnLocalPos: { x: 0, y: 0, z: 12.2 },
		spawnYaw: Math.PI,
	},
];

export const REALM_PORTALS: RealmPortalNode[] = [
	// ============================================================================
	// I. THE SHATTERED MIRROR PORTALS
	// ============================================================================
	{
		id: "portal_mirror_ascent_c6",
		realmId: "SHATTERED_MIRROR",
		kind: "BOARD_ASCENT",
		name: "North Cathedral Gate",
		subtitle: "Ascend to C6 [Prime] · Inverted: F6 [Kata −W]",
		transformFormula: "Parity+: C6 (2,2,0,0) | Parity−: F6 (2,5,0,−1)",
		localPos: { x: 0, y: 0, z: -16.2 },
		yaw: 0,
		colorHex: 0xc084fc,
		targetGatewayId: "gw_mirror_c6",
		targetBoardCoord: { row: 2, col: 2, z: 0, w: 0 },
		invertedBoardCoord: { row: 2, col: 5, z: 0, w: -1 },
	},
	{
		id: "portal_mirror_ascent_f3",
		realmId: "SHATTERED_MIRROR",
		kind: "BOARD_ASCENT",
		name: "South Cathedral Gate",
		subtitle: "Ascend to F3 [Prime] · Inverted: C3 [Kata −W]",
		transformFormula: "Parity+: F3 (5,5,0,0) | Parity−: C3 (5,2,0,−1)",
		localPos: { x: 0, y: 0, z: 16.2 },
		yaw: Math.PI,
		colorHex: 0xc084fc,
		targetGatewayId: "gw_mirror_f3",
		targetBoardCoord: { row: 5, col: 5, z: 0, w: 0 },
		invertedBoardCoord: { row: 5, col: 2, z: 0, w: -1 },
	},
	{
		id: "portal_mirror_timeline_omega1",
		realmId: "SHATTERED_MIRROR",
		kind: "TIMELINE_PORTAL",
		name: "Multiverse Rift: Timeline Ω-1",
		subtitle: "Forked from Prime · Obsidian Queen Vulnerable on F6",
		transformFormula: "REALITY SHIFT → TIMELINE Ω-1 (Queen Exposed)",
		localPos: { x: -11.8, y: 0, z: -11.8 },
		yaw: Math.PI * 0.25,
		colorHex: 0xf43f5e,
		targetTimelineId: "TL-OMEGA-1",
		targetBoardCoord: { row: 2, col: 5, z: 0, w: 0 },
		invertedBoardCoord: { row: 3, col: 5, z: 0, w: 0 },
	},
	{
		id: "portal_mirror_timeline_prime",
		realmId: "SHATTERED_MIRROR",
		kind: "TIMELINE_PORTAL",
		name: "Prime Reality Convergence Gate",
		subtitle: "Return to Prime Timeline & Reconcile Causality",
		transformFormula: "CONVERGENCE → PRIME TIMELINE (D5 / C6)",
		localPos: { x: 11.8, y: 0, z: -11.8 },
		yaw: -Math.PI * 0.25,
		colorHex: 0x38bdf8,
		targetTimelineId: "TL-PRIME",
		targetBoardCoord: { row: 3, col: 3, z: 0, w: 0 },
		invertedBoardCoord: { row: 2, col: 2, z: 0, w: 0 },
	},
	{
		id: "portal_mirror_inverter",
		realmId: "SHATTERED_MIRROR",
		kind: "MIRROR_INVERTER",
		name: "The Great Looking-Glass",
		subtitle: "Cross to Invert Spatial Parity & Claim Mirror Aegis",
		transformFormula: "(x, z, w) ↦ (−x, z, −w)",
		localPos: { x: 0, y: 0, z: 0 },
		yaw: 0,
		colorHex: 0x38bdf8,
		targetRealmId: "SHATTERED_MIRROR",
		targetPortalId: "portal_mirror_inverter",
		flipsMirrorParity: true,
	},
	{
		id: "portal_mirror_to_crucible",
		realmId: "SHATTERED_MIRROR",
		kind: "INTER_REALM",
		name: "Rift to The Ashen Crucible",
		subtitle: "Cross into the Molten Under-Forge",
		transformFormula: "SHATTERED_MIRROR ↦ ASHEN_CRUCIBLE",
		localPos: { x: 15.8, y: 0, z: 0 },
		yaw: -Math.PI / 2,
		colorHex: 0xf97316,
		targetRealmId: "ASHEN_CRUCIBLE",
		targetPortalId: "portal_crucible_from_mirror",
	},
	{
		id: "portal_mirror_to_remnant",
		realmId: "SHATTERED_MIRROR",
		kind: "INTER_REALM",
		name: "Rift to The Echoing Remnant",
		subtitle: "Cross into the Chronos Mausoleum",
		transformFormula: "SHATTERED_MIRROR ↦ ECHOING_REMNANT",
		localPos: { x: -15.8, y: 0, z: 0 },
		yaw: Math.PI / 2,
		colorHex: 0x34d399,
		targetRealmId: "ECHOING_REMNANT",
		targetPortalId: "portal_remnant_from_mirror",
	},

	// ============================================================================
	// II. THE ASHEN CRUCIBLE PORTALS
	// ============================================================================
	{
		id: "portal_crucible_ascent_b5",
		realmId: "ASHEN_CRUCIBLE",
		kind: "BOARD_ASCENT",
		name: "West Forge Ascent (B5)",
		subtitle: "Ascend to B5 [Prime] · Tempered: B7 (Row 1)",
		transformFormula: "Base: B5 (3,1,0,0) | Tempered: B7 (1,1,0,0)",
		localPos: { x: -16.2, y: 0, z: 0 },
		yaw: Math.PI / 2,
		colorHex: 0xf97316,
		targetGatewayId: "gw_crucible_b5",
		targetBoardCoord: { row: 3, col: 1, z: 0, w: 0 },
		invertedBoardCoord: { row: 1, col: 1, z: 0, w: 0 },
	},
	{
		id: "portal_crucible_ascent_g4",
		realmId: "ASHEN_CRUCIBLE",
		kind: "BOARD_ASCENT",
		name: "East Forge Ascent (G4)",
		subtitle: "Ascend to G4 [Prime] · Tempered: G2 (Row 6)",
		transformFormula: "Base: G4 (4,6,0,0) | Tempered: G2 (6,6,0,0)",
		localPos: { x: 16.2, y: 0, z: 0 },
		yaw: -Math.PI / 2,
		colorHex: 0xf97316,
		targetGatewayId: "gw_crucible_g4",
		targetBoardCoord: { row: 4, col: 6, z: 0, w: 0 },
		invertedBoardCoord: { row: 6, col: 6, z: 0, w: 0 },
	},
	{
		id: "portal_crucible_ascent_deep",
		realmId: "ASHEN_CRUCIBLE",
		kind: "BOARD_ASCENT",
		name: "Sovereign Smelter Gate (Ana +W)",
		subtitle: "Ascend to G7 [Ana +W] or B2 [Ana +W]",
		transformFormula: "Deep Flank Ascent → (1,6,0,+1) / (6,1,0,+1)",
		localPos: { x: 0, y: 0, z: -16.2 },
		yaw: 0,
		colorHex: 0xf59e0b,
		targetBoardCoord: { row: 1, col: 6, z: 0, w: 1 },
		invertedBoardCoord: { row: 6, col: 1, z: 0, w: 1 },
	},
	{
		id: "portal_crucible_timeline_omega2",
		realmId: "ASHEN_CRUCIBLE",
		kind: "TIMELINE_PORTAL",
		name: "Multiverse Rift: Timeline Ω-2",
		subtitle: "Forked from Prime · Alternate Vanguard Clash",
		transformFormula: "REALITY SHIFT → TIMELINE Ω-2",
		localPos: { x: -11.5, y: 0, z: -11.5 },
		yaw: Math.PI * 0.25,
		colorHex: 0xf43f5e,
		targetTimelineId: "TL-OMEGA-2",
		targetBoardCoord: { row: 5, col: 2, z: 0, w: 0 },
		invertedBoardCoord: { row: 4, col: 2, z: 0, w: 0 },
	},
	{
		id: "portal_crucible_from_mirror",
		realmId: "ASHEN_CRUCIBLE",
		kind: "INTER_REALM",
		name: "Rift to The Shattered Mirror",
		subtitle: "Return to the Cathedral of Inversion",
		transformFormula: "ASHEN_CRUCIBLE ↦ SHATTERED_MIRROR",
		localPos: { x: 0, y: 0, z: 16.2 },
		yaw: Math.PI,
		colorHex: 0xc084fc,
		targetRealmId: "SHATTERED_MIRROR",
		targetPortalId: "portal_mirror_to_crucible",
	},

	// ============================================================================
	// III. THE ECHOING REMNANT PORTALS
	// ============================================================================
	{
		id: "portal_remnant_ascent_d5",
		realmId: "ECHOING_REMNANT",
		kind: "BOARD_ASCENT",
		name: "North Chronos Gate (D5)",
		subtitle: "Ascend to D5 [Prime] · Inverted: D7 (Row 1)",
		transformFormula: "Base: D5 (3,3,0,0) | Echo-Shifted: D7 (1,3,0,0)",
		localPos: { x: 0, y: 0, z: -16.2 },
		yaw: 0,
		colorHex: 0x34d399,
		targetGatewayId: "gw_remnant_d5",
		targetBoardCoord: { row: 3, col: 3, z: 0, w: 0 },
		invertedBoardCoord: { row: 1, col: 3, z: 0, w: 0 },
	},
	{
		id: "portal_remnant_ascent_e4",
		realmId: "ECHOING_REMNANT",
		kind: "BOARD_ASCENT",
		name: "South Chronos Gate (E4)",
		subtitle: "Ascend to E4 [Prime] · Inverted: E2 (Row 6)",
		transformFormula: "Base: E4 (4,4,0,0) | Echo-Shifted: E2 (6,4,0,0)",
		localPos: { x: 0, y: 0, z: 16.2 },
		yaw: Math.PI,
		colorHex: 0x34d399,
		targetGatewayId: "gw_remnant_e4",
		targetBoardCoord: { row: 4, col: 4, z: 0, w: 0 },
		invertedBoardCoord: { row: 6, col: 4, z: 0, w: 0 },
	},
	{
		id: "portal_remnant_ascent_astral",
		realmId: "ECHOING_REMNANT",
		kind: "BOARD_ASCENT",
		name: "Astral Spire Gate (+Z)",
		subtitle: "Ascend to Astral Stratum D6 (Z=1) or E3 (Z=1)",
		transformFormula: "Astral Projection → (2,3,1,0) / (5,4,1,0)",
		localPos: { x: -16.2, y: 0, z: 0 },
		yaw: Math.PI / 2,
		colorHex: 0x22d3ee,
		targetBoardCoord: { row: 2, col: 3, z: 1, w: 0 },
		invertedBoardCoord: { row: 5, col: 4, z: 1, w: 0 },
	},
	{
		id: "portal_remnant_timeline_omega1",
		realmId: "ECHOING_REMNANT",
		kind: "TIMELINE_PORTAL",
		name: "Chronos Rift: Timeline Ω-1",
		subtitle: "Forked from Prime · Obsidian Queen Vulnerable",
		transformFormula: "REALITY SHIFT → TIMELINE Ω-1",
		localPos: { x: 11.5, y: 0, z: -11.5 },
		yaw: -Math.PI * 0.25,
		colorHex: 0xf43f5e,
		targetTimelineId: "TL-OMEGA-1",
		targetBoardCoord: { row: 2, col: 5, z: 0, w: 0 },
		invertedBoardCoord: { row: 3, col: 5, z: 0, w: 0 },
	},
	{
		id: "portal_remnant_from_mirror",
		realmId: "ECHOING_REMNANT",
		kind: "INTER_REALM",
		name: "Rift to The Shattered Mirror",
		subtitle: "Cross into the Cathedral of Inversion",
		transformFormula: "ECHOING_REMNANT ↦ SHATTERED_MIRROR",
		localPos: { x: 16.2, y: 0, z: 0 },
		yaw: -Math.PI / 2,
		colorHex: 0xc084fc,
		targetRealmId: "SHATTERED_MIRROR",
		targetPortalId: "portal_mirror_to_remnant",
	},
];

export function getGatewayAtSquare(
	row: number,
	col: number,
	z: number = 0,
	w: number = 0,
): BoardGateway | undefined {
	// Gateways anchor on Prime (z=0, w=0) and project resonance across slices
	if (z !== 0 || w !== 0) return undefined;
	return BOARD_GATEWAYS.find((g) => g.row === row && g.col === col);
}

export function getPortalsForRealm(realmId: RealmId): RealmPortalNode[] {
	return REALM_PORTALS.filter((p) => p.realmId === realmId);
}

/**
 * Resolves the authoritative 4D destination board coordinate for a BOARD_ASCENT or TIMELINE_PORTAL,
 * taking into account whether the warrior has inverted their chiral parity in The Shattered Mirror,
 * tempered their weapon in The Ashen Crucible, or targeted an exposed enemy in an alternate timeline.
 */
export function resolvePortalExitBoardCoord(
	portal: RealmPortalNode,
	traveler: ChessPiece,
	isParityInverted: boolean,
	crucibleAnvilClaimed: boolean,
	destinationTimelinePieces?: ChessPiece[],
): { row: number; col: number; z: number; w: number } | null {
	if (
		(portal.kind !== "BOARD_ASCENT" && portal.kind !== "TIMELINE_PORTAL") ||
		!portal.targetBoardCoord
	) {
		return null;
	}

	// If this is a TIMELINE_PORTAL leading to an alternate timeline (like TL-OMEGA-1) and we have its board state,
	// check if there is an exposed high-value enemy piece (e.g. Queen or Knight) in that timeline so the portal
	// can lock directly onto or adjacent to that target!
	if (
		portal.kind === "TIMELINE_PORTAL" &&
		destinationTimelinePieces &&
		portal.targetTimelineId !== "TL-PRIME"
	) {
		const enemyQueenOrHighVal = destinationTimelinePieces
			.filter((p) => p.faction !== traveler.faction && p.type !== "k")
			.sort(
				(a, b) =>
					ARCHETYPES[b.type].tacticalValue - ARCHETYPES[a.type].tacticalValue,
			)[0];

		if (enemyQueenOrHighVal) {
			return {
				row: enemyQueenOrHighVal.row,
				col: enemyQueenOrHighVal.col,
				z: enemyQueenOrHighVal.z,
				w: enemyQueenOrHighVal.w,
			};
		}
	}

	if (
		portal.id === "portal_crucible_ascent_deep" &&
		portal.invertedBoardCoord
	) {
		return traveler.faction === "w"
			? { ...portal.targetBoardCoord }
			: { ...portal.invertedBoardCoord };
	}

	if (
		portal.id === "portal_remnant_ascent_astral" &&
		portal.invertedBoardCoord
	) {
		return traveler.faction === "w"
			? { ...portal.targetBoardCoord }
			: { ...portal.invertedBoardCoord };
	}

	const useAlt =
		isParityInverted ||
		(portal.realmId === "ASHEN_CRUCIBLE" && crucibleAnvilClaimed);
	if (useAlt && portal.invertedBoardCoord) {
		return { ...portal.invertedBoardCoord };
	}
	return { ...portal.targetBoardCoord };
}

export interface PortalBoardExitEvaluation {
	coord: { row: number; col: number; z: number; w: number };
	squareLabel: string;
	status: "CLEAR" | "ENEMY_OCCUPIED" | "ALLY_OBSTRUCTED";
	occupant?: ChessPiece;
	targetTimelineId?: string;
}

/**
 * Evaluates a BOARD_ASCENT or TIMELINE_PORTAL against the destination timeline's 4D chessboard state.
 * - ALLY_OBSTRUCTED: Cannot be used (blocked by allied warrior).
 * - ENEMY_OCCUPIED: Legal traversal that immediately triggers a Realm / Multiverse Emergence Ambush Duel!
 * - CLEAR: Legal traversal that emerges onto the square and completes the chess turn.
 */
export function evaluatePortalBoardExit(
	portal: RealmPortalNode,
	traveler: ChessPiece,
	pieces: ChessPiece[],
	isParityInverted: boolean,
	crucibleAnvilClaimed: boolean,
	targetTimelineId?: string,
): PortalBoardExitEvaluation | null {
	const coord = resolvePortalExitBoardCoord(
		portal,
		traveler,
		isParityInverted,
		crucibleAnvilClaimed,
		pieces,
	);
	if (!coord) return null;

	const tLin = traveler.lineageId || traveler.id;
	const occupant = getPieceAt(
		pieces.filter(
			(p) => p.id !== traveler.id && (p.lineageId || p.id) !== tLin,
		),
		coord.row,
		coord.col,
		coord.z,
		coord.w,
	);

	const sqName = `${formatSquareName(coord)}${
		coord.w !== 0 ? ` [${formatWName(coord.w)}]` : ""
	}${coord.z !== 0 ? ` [${formatZName(coord.z)}]` : ""}`;

	const resolvedTimelineId = targetTimelineId || portal.targetTimelineId;

	if (!occupant) {
		return {
			coord,
			squareLabel: sqName,
			status: "CLEAR",
			targetTimelineId: resolvedTimelineId,
		};
	}

	if (occupant.faction === traveler.faction) {
		return {
			coord,
			squareLabel: sqName,
			status: "ALLY_OBSTRUCTED",
			occupant,
			targetTimelineId: resolvedTimelineId,
		};
	}

	return {
		coord,
		squareLabel: sqName,
		status: "ENEMY_OCCUPIED",
		occupant,
		targetTimelineId: resolvedTimelineId,
	};
}

/**
 * Builds deterministic Temporal Echoes inside THE ECHOING REMNANT directly from the actual
 * recorded spacetime history (`piece.history`) of pieces on the chessboard!
 * If the match just started and few moves have been recorded, seeds deterministic ancestral echoes
 * from the pieces' opening vectors so the Mausoleum is always alive with causal history.
 */
export function buildDeterministicTemporalEchoes(
	pieces: ChessPiece[],
	excludePieceId?: string,
): RealmTemporalEcho[] {
	const echoes: RealmTemporalEcho[] = [];

	const boardCoordToRemnantLocal = (
		row: number,
		col: number,
	): { x: number; y: number; z: number } => {
		const x = (col - 3.5) * 3.1;
		const z = (row - 3.5) * 3.1;
		return { x, y: 0, z };
	};

	// 1. Extract all genuine recorded movements from `piece.history` across all pieces!
	for (const p of pieces) {
		if (p.id === excludePieceId) continue;
		if (p.history.length >= 2) {
			for (
				let i = Math.max(0, p.history.length - 3);
				i < p.history.length - 1;
				i++
			) {
				const fromWp = p.history[i];
				const toWp = p.history[i + 1];
				if (
					fromWp.row === toWp.row &&
					fromWp.col === toWp.col &&
					fromWp.w === toWp.w
				)
					continue;

				const startLocalPos = boardCoordToRemnantLocal(fromWp.row, fromWp.col);
				const endLocalPos = boardCoordToRemnantLocal(toWp.row, toWp.col);
				echoes.push({
					id: `echo_${p.id}_${i}`,
					sourcePieceId: p.id,
					pieceType: p.type,
					faction: p.faction,
					fromCoord: { ...fromWp },
					toCoord: { ...toWp },
					startLocalPos,
					endLocalPos,
					progress: (i * 0.37 + p.col * 0.19) % 1,
					speed: 0.28 + ARCHETYPES[p.type].walkSpeed * 0.04,
					consumed: false,
				});
			}
		}
	}

	// 2. If fewer than 4 historical moves have occurred so far (e.g. Turn 1), include deterministic
	// opening causal projections from key pieces on the board so the player can immediately interact with echoes.
	if (echoes.length < 4) {
		const keyPieces = pieces.filter(
			(p) =>
				p.id !== excludePieceId &&
				(p.type === "n" || p.type === "q" || p.type === "b"),
		);
		for (let idx = 0; idx < Math.min(6, keyPieces.length); idx++) {
			const p = keyPieces[idx];
			const dir = p.faction === "w" ? -2 : 2;
			const fromWp = { row: p.row, col: p.col, z: p.z, w: p.w, turn: 1 };
			const toWp = {
				row: Math.max(0, Math.min(7, p.row + dir)),
				col: Math.max(0, Math.min(7, p.col + (idx % 2 === 0 ? 1 : -1))),
				z: p.z,
				w: p.w,
				turn: 1,
			};
			echoes.push({
				id: `echo_seed_${p.id}`,
				sourcePieceId: p.id,
				pieceType: p.type,
				faction: p.faction,
				fromCoord: fromWp,
				toCoord: toWp,
				startLocalPos: boardCoordToRemnantLocal(fromWp.row, fromWp.col),
				endLocalPos: boardCoordToRemnantLocal(toWp.row, toWp.col),
				progress: (idx * 0.23) % 1,
				speed: 0.32,
				consumed: false,
			});
		}
	}

	return echoes.slice(0, 10);
}

/**
 * Selects an opposing warrior from the active chessboard to manifest as a patrolling
 * Realm Sentinel inside the subterranean worlds. Defeating or colliding with this Sentinel
 * triggers a real combat duel using the authoritative `combatEngine` right inside the Realm!
 */
export function buildRealmSentinels(
	pieces: ChessPiece[],
	travelerFaction: Faction,
	excludePieceId: string,
): RealmEnemySentinel[] {
	const enemies = pieces.filter(
		(p) =>
			p.faction !== travelerFaction &&
			p.id !== excludePieceId &&
			p.type !== "k" &&
			p.hp > 0,
	);
	if (enemies.length === 0) return [];

	// Sort by closeness to center / tactical value so meaningful warriors guard the realms
	const sorted = [...enemies].sort((a, b) => {
		const distA = Math.abs(3.5 - a.row) + Math.abs(3.5 - a.col);
		const distB = Math.abs(3.5 - b.row) + Math.abs(3.5 - b.col);
		return distA - distB;
	});

	const sentinels: RealmEnemySentinel[] = [];
	const realms: RealmId[] = [
		"SHATTERED_MIRROR",
		"ASHEN_CRUCIBLE",
		"ECHOING_REMNANT",
	];

	for (let i = 0; i < Math.min(3, sorted.length); i++) {
		const enemy = sorted[i];
		const realmId = realms[i];
		const patrolOrigin =
			realmId === "SHATTERED_MIRROR"
				? { x: 5.2, y: 0, z: -4.5 }
				: realmId === "ASHEN_CRUCIBLE"
					? { x: 0, y: 0, z: -6.8 }
					: { x: -4.8, y: 0, z: 4.2 };

		sentinels.push({
			id: `sentinel_${realmId}_${enemy.id}`,
			piece: enemy,
			realmId,
			localPos: { ...patrolOrigin },
			patrolOrigin,
			patrolRadius: 4.2,
			yaw: 0,
			defeated: false,
		});
	}

	return sentinels;
}

export interface CrucibleHazardStatus {
	inLavaRiver: boolean;
	hitByForgePiston: boolean;
	nearHellfireAnvil: boolean;
}

/**
 * Evaluates deterministic environmental hazards inside THE ASHEN CRUCIBLE at local position `(x, z)` and time `elapsedSec`.
 * - Two molten magma rivers run along `x ∈ [-7.8, -4.2]` and `x ∈ [4.2, 7.8]`, bridged by three stone/slag causeways at `z ∈ [-2.2, 2.2]`, `z ∈ [-14.5, -10.8]`, and `z ∈ [10.8, 14.5]`.
 * - Four reciprocating Titanic Forge Pistons slam down along the bridges at deterministic phase offsets.
 * - The Central Hellfire Anvil sits at `(0, 0, 0)` (radius 2.4).
 */
export function evaluateCrucibleHazards(
	localX: number,
	localZ: number,
	elapsedSec: number,
): CrucibleHazardStatus {
	const inRiverChannel =
		Math.abs(localX) > 4.15 &&
		Math.abs(localX) < 7.85 &&
		Math.abs(localZ) < 14.5;
	const onCentralBridge = Math.abs(localZ) < 2.35;
	const onNorthBridge = localZ < -10.2 && localZ > -14.8;
	const onSouthBridge = localZ > 10.2 && localZ < 14.8;

	const inLavaRiver =
		inRiverChannel && !onCentralBridge && !onNorthBridge && !onSouthBridge;

	// 4 Reciprocating Forge Pistons along the causeways:
	const pistonCoords = [
		{ x: -6.0, z: 0.0, phase: 0.0 },
		{ x: 6.0, z: 0.0, phase: Math.PI },
		{ x: 0.0, z: -8.2, phase: Math.PI * 0.5 },
		{ x: 0.0, z: 8.2, phase: Math.PI * 1.5 },
	];

	let hitByForgePiston = false;
	for (const p of pistonCoords) {
		const cycle = Math.sin(elapsedSec * 2.6 + p.phase);
		// Piston is slammed down when cycle < -0.68
		if (cycle < -0.68) {
			const dist = Math.hypot(localX - p.x, localZ - p.z);
			if (dist < 1.85) {
				hitByForgePiston = true;
				break;
			}
		}
	}

	const nearHellfireAnvil = Math.hypot(localX, localZ) < 2.55;

	return {
		inLavaRiver,
		hitByForgePiston,
		nearHellfireAnvil,
	};
}
