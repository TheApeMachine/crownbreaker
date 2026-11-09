// @ts-nocheck — board/combat/realm handlers extracted from App; simRef is loosely typed
import {
	type Dispatch,
	type MutableRefObject,
	type SetStateAction,
	useCallback,
} from "react";
import * as THREE from "three";
import { soundEngine } from "../audio/soundEngine";
import { ARCHETYPES } from "../data/archetypes";
import {
	computeUnseen4DThreats,
	formatSquareName,
	getValidMovesForPiece,
} from "../engine/chessEngine";
import { createFighterRuntime } from "../engine/combatEngine";
import {
	getLethalRememberedSquareCollision,
	getRememberedSquaresForTimelineView,
} from "../engine/multiverseEngine";
import {
	BOARD_GATEWAYS,
	buildDeterministicTemporalEchoes,
	buildRealmSentinels,
	evaluatePortalBoardExit,
	getPortalsForRealm,
	type PortalBoardExitEvaluation,
	REALM_METADATA,
} from "../engine/realmEngine";
import { boardToWorld } from "../three/arenaBuilder";
import { spawnAuraPillar, spawnShockwave } from "../three/combatAnimator";
import {
	createArticulatedPiece,
	createFirstPersonViewmodelRig,
} from "../three/pieceModels";
import { syncRealmEntities3D } from "../three/realmBuilder";
import type { CameraPreset } from "../types/appCamera";
import type {
	BattleLogEntry,
	ChessPiece,
	CombatCallout,
	Faction,
	FighterRuntime,
	GamePhase,
	MoveOption,
	RealmId,
	RealmPortalNode,
	UnseenThreatVector,
} from "../types/game";

export type UseBoardCombatActionsParams = {
	simRef: MutableRefObject<any>;
	setTimelineBranchLabel: Dispatch<SetStateAction<string>>;
	setCanRewindTimeline: Dispatch<SetStateAction<boolean>>;
	setTurnNumber: Dispatch<SetStateAction<number>>;
	setTurnFaction: Dispatch<SetStateAction<Faction>>;
	setBattleLogs: Dispatch<SetStateAction<BattleLogEntry[]>>;
	setSelectedPiece: Dispatch<SetStateAction<ChessPiece | null>>;
	setCombatCameraMode: Dispatch<SetStateAction<"first_person" | "side_arena">>;
	setCallouts: Dispatch<SetStateAction<CombatCallout[]>>;
	setUnseenThreats: Dispatch<SetStateAction<UnseenThreatVector[]>>;
	setActiveSliceW: Dispatch<SetStateAction<number>>;
	setActiveSliceZ: Dispatch<SetStateAction<number>>;
	setTargetMoveW: Dispatch<SetStateAction<number>>;
	setTargetMoveZ: Dispatch<SetStateAction<number>>;
	setPhase: Dispatch<SetStateAction<GamePhase>>;
	setHudAttacker: Dispatch<SetStateAction<FighterRuntime | null>>;
	setHudDefender: Dispatch<SetStateAction<FighterRuntime | null>>;
	setFightTimer: Dispatch<SetStateAction<number>>;
	setDuelSquareName: Dispatch<SetStateAction<string>>;
	setIntroShotIndex: Dispatch<SetStateAction<number>>;
	setKoBanner: Dispatch<SetStateAction<any>>;
	setActiveRealmId: Dispatch<SetStateAction<RealmId>>;
	setRealmTraveler: Dispatch<SetStateAction<ChessPiece | null>>;
	setRealmParityInverted: Dispatch<SetStateAction<boolean>>;
	setRealmCrucibleClaimed: Dispatch<SetStateAction<boolean>>;
	setNearbyPortal: Dispatch<SetStateAction<RealmPortalNode | null>>;
	setNearbyPortalEval: Dispatch<
		SetStateAction<PortalBoardExitEvaluation | null>
	>;
	setRealmStatusBanner: Dispatch<SetStateAction<string | null>>;
	setCameraPreset?: Dispatch<SetStateAction<CameraPreset>>;
};

export function useBoardCombatActions({
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
}: UseBoardCombatActionsParams) {
	const handleChronoRewind = useCallback(() => {
		const sim = simRef.current;
		if (sim.phase !== "CHESS_VIEW" || sim.timelineSnapshots.length === 0)
			return;

		const snap = sim.timelineSnapshots.pop()!;
		sim.timelineBranchCount += 1;
		const branches = ["α", "β", "γ", "δ", "ε", "ζ"];
		const newBranchName = `Timeline ${branches[sim.timelineBranchCount % branches.length]}`;
		setTimelineBranchLabel(newBranchName);
		setCanRewindTimeline(sim.timelineSnapshots.length > 0);

		const scene = sim.arenaRig?.group.parent;
		sim.pieceRigs.forEach((rig) => {
			rig.root.parent?.remove(rig.root);
		});
		sim.pieceRigs.clear();

		sim.pieces = snap.pieces.map((p) => ({ ...p, inRealm: null }));
		sim.turnNumber = snap.turnNumber;
		sim.turnFaction = "w";
		sim.selectedPieceId = null;
		sim.validMoves = [];
		sim.realm.travelerPieceId = null;

		if (scene) {
			for (const p of sim.pieces) {
				const rig = createArticulatedPiece(p.type, p.faction);
				boardToWorld(p.row, p.col, rig.root.position);
				rig.root.rotation.y = p.faction === "w" ? Math.PI : 0;
				scene.add(rig.root);
				sim.pieceRigs.set(p.id, rig);
			}
		}

		if (sim.vfxPool) {
			spawnShockwave(sim.vfxPool, 0, 0.1, 0, 0x38bdf8, 8.5);
		}
		soundEngine.playQuantumEntangle(true);
		setTurnNumber(sim.turnNumber);
		setTurnFaction("w");
		syncBoardHighlights();
		setBattleLogs((prev) => [
			{
				id: `rewind_${Date.now()}`,
				turnNumber: sim.turnNumber,
				summary: `Causality Rewound (Δt = -1) → Branched into ${newBranchName}`,
				detail: `Quantum wavefunction & Subterranean Realm states collapsed back to Turn ${snap.turnNumber} before the timeline diverged.`,
				wasUpset: false,
				winnerFaction: "w",
			},
			...prev.slice(0, 7),
		]);
	}, []);

	// Quantum Bell-State Entanglement (|Φ⁺⟩): Link the selected piece with your highest-value allied warrior!
	const handleEntangleSelectedPiece = useCallback(() => {
		const sim = simRef.current;
		if (!sim.selectedPieceId) return;
		const sel = sim.pieces.find((p) => p.id === sim.selectedPieceId);
		if (!sel) return;

		// Find best allied partner to entangle with
		const allies = sim.pieces.filter(
			(p) =>
				p.faction === sel.faction &&
				p.id !== sel.id &&
				p.id !== sel.entangledWithId,
		);
		if (allies.length === 0) return;

		allies.sort(
			(a, b) =>
				ARCHETYPES[b.type].tacticalValue - ARCHETYPES[a.type].tacticalValue,
		);
		const partner = allies[0];

		// Clear old entanglement links for these two pieces
		for (const p of sim.pieces) {
			if (p.entangledWithId === sel.id || p.entangledWithId === partner.id) {
				p.entangledWithId = undefined;
			}
		}

		sel.entangledWithId = partner.id;
		partner.entangledWithId = sel.id;

		soundEngine.playQuantumEntangle(false);
		if (sim.vfxPool) {
			const posA = boardToWorld(sel.row, sel.col);
			const posB = boardToWorld(partner.row, partner.col);
			spawnShockwave(sim.vfxPool, posA.x, 0.08, posA.z, 0x38bdf8, 3.2);
			spawnShockwave(sim.vfxPool, posB.x, 0.08, posB.z, 0xc084fc, 3.2);
		}

		setSelectedPiece({ ...sel });
		setBattleLogs((prev) => [
			{
				id: `entangle_${Date.now()}`,
				turnNumber: sim.turnNumber,
				summary: `|Φ⁺⟩ Bell-State Entanglement: ${ARCHETYPES[sel.type].chessName} ⇄ ${ARCHETYPES[partner.type].chessName}`,
				detail: `Connected by a 3D Quantum Double-Helix! Grants +15% starting meter, passive Bell Shielding, and Entangled Assist Strikes in combat.`,
				wasUpset: false,
				winnerFaction: sel.faction,
			},
			...prev.slice(0, 7),
		]);
	}, []);

	const handleToggleCombatCameraMode = useCallback(() => {
		const sim = simRef.current;
		const next =
			sim.combatCameraMode === "first_person" ? "side_arena" : "first_person";
		sim.combatCameraMode = next;
		setCombatCameraMode(next);
	}, []);

	const addCallout = useCallback(
		(c: Omit<CombatCallout, "id" | "createdAt">) => {
			const item: CombatCallout = {
				...c,
				id: Date.now() + Math.random(),
				createdAt: performance.now(),
			};
			setCallouts((prev) => [...prev.slice(-3), item]);
		},
		[],
	);

	// Sync tile highlight meshes and Unseen 4D Threat sigils
	const syncBoardHighlights = useCallback(() => {
		const sim = simRef.current;
		if (!sim.arenaRig) return;

		sim.arenaRig.highlightMeshes.forEach((mesh) => {
			mesh.visible = false;
		});
		sim.arenaRig.threatSigilMeshes.forEach((sigil) => {
			sigil.visible = false;
		});

		if (sim.phase !== "CHESS_VIEW") return;

		// 1. Compute Unseen 4D Cross-Dimensional Threats on the currently viewed 3D slice!
		const threats = computeUnseen4DThreats(
			sim.pieces,
			sim.activeSliceZ,
			sim.activeSliceW,
			sim.turnFaction,
		);
		setUnseenThreats(threats);

		for (const t of threats) {
			const sigil = sim.arenaRig.threatSigilMeshes.get(
				`${t.targetRow}_${t.targetCol}`,
			);
			if (sigil) {
				sigil.visible = true;
			}
		}

		// 2. Highlight selected piece and its valid moves (3D slice moves, 4D Hyper-Shifts, Chrono-Intercepts & Lethal Remembered Squares!)
		const selPiece =
			sim.pieces.find((p) => p.id === sim.selectedPieceId) || null;
		setSelectedPiece(selPiece ? { ...selPiece } : null);

		// Mark Remembered Squares from previous universes with warning sigils
		const rememberedInOtherRealities = getRememberedSquaresForTimelineView(
			sim.multiverse,
			sim.multiverse.activeTimelineId,
			selPiece,
		);
		for (const rem of rememberedInOtherRealities) {
			if (rem.w === sim.activeSliceW && rem.z === sim.activeSliceZ) {
				const sigil = sim.arenaRig.threatSigilMeshes.get(
					`${rem.row}_${rem.col}`,
				);
				if (sigil) {
					sigil.visible = true;
				}
			}
		}

		let hasLethalRememberedMove = false;

		if (selPiece) {
			const selMesh = sim.arenaRig.highlightMeshes.get(
				`${selPiece.row}_${selPiece.col}`,
			);
			if (selMesh) {
				selMesh.visible = true;
				const mat = selMesh.material as THREE.MeshBasicMaterial;
				mat.color.setHex(0x38bdf8);
				mat.opacity = 0.48;
			}

			for (const mv of sim.validMoves) {
				const hl = sim.arenaRig.highlightMeshes.get(
					`${mv.to.row}_${mv.to.col}`,
				);
				const lethalCollision = getLethalRememberedSquareCollision(
					sim.multiverse,
					selPiece,
					mv.to,
					sim.multiverse.activeTimelineId,
				);
				if (lethalCollision) {
					hasLethalRememberedMove = true;
				}
				if (hl) {
					hl.visible = true;
					const mat = hl.material as THREE.MeshBasicMaterial;
					if (mv.dimensionType === "CHECKMATE_YESTERDAY") {
						mat.color.setHex(0x38bdf8); // Sentient Mathematical Theorem: Checkmate Yesterday Q.E.D. Beacon!
						mat.opacity = 0.88;
					} else if (lethalCollision) {
						mat.color.setHex(0xef4444); // Lethal Remembered Square Paradox Exclusion Warning!
						mat.opacity = 0.82;
					} else if (
						mv.dimensionType === "REALM_GATEWAY_DESCENT" ||
						mv.dimensionType === "REALM_PORTAL_TRAVERSAL"
					) {
						mat.color.setHex(0x34d399); // Emerald-Cyan Dimensional Gateway
						mat.opacity = 0.72;
					} else if (mv.dimensionType === "TEMPORAL_INTERCEPT") {
						mat.color.setHex(0x22d3ee); // Cyan Chrono-Intercept
						mat.opacity = 0.68;
					} else if (mv.isCapture) {
						mat.color.setHex(
							mv.dimensionType === "4D_CROSS_SLICE_STRIKE"
								? 0xc084fc
								: 0xf43f5e,
						);
						mat.opacity = 0.65;
					} else if (mv.dimensionType === "4D_HYPER_SHIFT") {
						mat.color.setHex(0xa855f7); // Violet 4D Hyper-Shift
						mat.opacity = 0.52;
					} else {
						mat.color.setHex(0xf59e0b);
						mat.opacity = 0.38;
					}
				}
			}
		}

		sim.imminentParadoxWarning = hasLethalRememberedMove;
	}, []);

	// Helper to change viewed 3D slice or target 4D move projection slice
	const handleSelect4DSlice = useCallback(
		(newW: number, newZ: number, alsoSetView: boolean = true) => {
			const sim = simRef.current;
			if (alsoSetView) {
				sim.activeSliceW = newW;
				sim.activeSliceZ = newZ;
				setActiveSliceW(newW);
				setActiveSliceZ(newZ);
			}
			sim.targetMoveW = newW;
			sim.targetMoveZ = newZ;
			setTargetMoveW(newW);
			setTargetMoveZ(newZ);

			if (sim.selectedPieceId) {
				const sel = sim.pieces.find((p) => p.id === sim.selectedPieceId);
				if (sel) {
					sim.validMoves = getValidMovesForPiece(sel, sim.pieces, newZ, newW);
				}
			}
			soundEngine.playChessSelect();
			syncBoardHighlights();
		},
		[syncBoardHighlights],
	);

	// Start a capture duel on the board OR inside a Subterranean Realm!
	const initiateCombatDuel = useCallback(
		(
			attackerPiece: ChessPiece,
			move: MoveOption,
			isExhibition: boolean = false,
			inRealmWorldCenter?: {
				x: number;
				y: number;
				z: number;
				realmTitle: string;
				sentinelId?: string;
			},
		) => {
			const sim = simRef.current;
			if (!move.targetPiece) return;

			const defenderPiece = move.targetPiece;
			sim.pendingMove = move;
			sim.isExhibitionDuel = isExhibition;
			sim.duelInRealm = Boolean(inRealmWorldCenter);
			sim.activeSentinelId = inRealmWorldCenter?.sentinelId || null;
			sim.selectedPieceId = null;
			sim.validMoves = [];
			setHoveredCaptureMove(null);
			syncBoardHighlights();

			if (inRealmWorldCenter) {
				sim.duelCenterWorld.set(
					inRealmWorldCenter.x,
					inRealmWorldCenter.y,
					inRealmWorldCenter.z,
				);
				setDuelSquareName(inRealmWorldCenter.realmTitle);
			} else {
				boardToWorld(move.to.row, move.to.col, sim.duelCenterWorld);
				const sqName = `${formatSquareName(move.to)} · ${formatWName(move.to.w)}`;
				setDuelSquareName(sqName);
			}

			const atkIsAI =
				sim.autoPlayDemo ||
				(sim.gameMode === "vs_ai" && attackerPiece.faction === "b");
			const defIsAI =
				sim.autoPlayDemo ||
				(sim.gameMode === "vs_ai" && defenderPiece.faction === "b");

			const atkPartner = attackerPiece.entangledWithId
				? sim.pieces.find((p) => p.id === attackerPiece.entangledWithId)
				: undefined;
			const defPartner = defenderPiece.entangledWithId
				? sim.pieces.find((p) => p.id === defenderPiece.entangledWithId)
				: undefined;

			// TACTICAL INTERVENTION: THE BOARD FIGHTS BACK
			const supportAnalysis = computeSquareSupportAnalysis(
				sim.pieces,
				move.to,
				attackerPiece.faction,
				defenderPiece.faction,
				[attackerPiece.id, defenderPiece.id],
			);

			sim.attackerRuntime = createFighterRuntime(
				attackerPiece,
				true,
				atkIsAI,
				atkPartner ? ARCHETYPES[atkPartner.type].chessName : undefined,
				supportAnalysis.attackerSupporters,
			);
			sim.defenderRuntime = createFighterRuntime(
				defenderPiece,
				false,
				defIsAI,
				defPartner ? ARCHETYPES[defPartner.type].chessName : undefined,
				supportAnalysis.defenderSupporters,
			);
			sim.prevAtkAction = "idle";
			sim.prevDefAction = "idle";
			sim.fightTimer = 60;
			sim.slowMoTimer = 0;
			sim.activeIntervention = null;
			sim.demoCameraTimer = 0;
			sim.phase = "TRANSITION_TO_FIGHT";
			sim.phaseTimer = 0;
			sim.introShotIndex = -1;
			setIntroShotIndex(-1);
			if (sim.autoPlayDemo) {
				setDemoDirectorStage(
					"SERGIO LEONE OPTICAL CRASH-ZOOM (FOV 62° → 9.5°)",
				);
			}

			// Build First-Person Weapon & Shield Viewmodel Rig matching the human player's warrior!
			const humanRuntime = !sim.attackerRuntime.isAI
				? sim.attackerRuntime
				: !sim.defenderRuntime.isAI
					? sim.defenderRuntime
					: sim.attackerRuntime;
			if (sim.fpMountGroup) {
				if (sim.firstPersonRig) {
					sim.fpMountGroup.remove(sim.firstPersonRig.root);
				}
				const fpRig = createFirstPersonViewmodelRig(
					humanRuntime.piece.type,
					humanRuntime.piece.faction,
				);
				fpRig.root.visible = false;
				sim.fpMountGroup.add(fpRig.root);
				sim.firstPersonRig = fpRig;
			}

			if (sim.controls) {
				sim.controls.enabled = false;
			}

			if (!inRealmWorldCenter) {
				const tempHome = new THREE.Vector3();
				for (const p of sim.pieces) {
					if (p.id === attackerPiece.id || p.id === defenderPiece.id) continue;
					boardToWorld(p.row, p.col, tempHome);
					const dx = tempHome.x - sim.duelCenterWorld.x;
					const dz = tempHome.z - sim.duelCenterWorld.z;
					const dist = Math.hypot(dx, dz);
					const inCorridor = dz > -0.9 && dz < 7.8 && Math.abs(dx) < 4.6;
					let bys = sim.bystanders.get(p.id);
					if (!bys) {
						bys = {
							offsetX: 0,
							offsetZ: 0,
							vx: 0,
							vz: 0,
							y: 0,
							vy: 0,
							panickedTimer: 0,
						};
						sim.bystanders.set(p.id, bys);
					}
					if (inCorridor || dist < 4.75) {
						const sideSign = dx >= 0 ? 1 : -1;
						const targetX =
							sim.duelCenterWorld.x + sideSign * (4.85 + (p.row % 2) * 0.45);
						const targetZ =
							dz > 0
								? sim.duelCenterWorld.z + Math.min(dz, 3.2)
								: sim.duelCenterWorld.z - 2.4;
						bys.offsetX = targetX - tempHome.x;
						bys.offsetZ = targetZ - tempHome.z;
						bys.vx = 0;
						bys.vz = 0;
					}
				}
			}

			soundEngine.playArenaTransition();
			setPhase("TRANSITION_TO_FIGHT");
			setCallouts([]);
			setKoBanner(null);
			setHudAttacker({ ...sim.attackerRuntime });
			setHudDefender({ ...sim.defenderRuntime });

			if (inRealmWorldCenter) {
				setTimeout(() => {
					addCallout({
						text: `REALM ENCOUNTER IN ${inRealmWorldCenter.realmTitle}!`,
						subtext: "DEFEAT THE REALM SENTINEL TO CONTINUE YOUR JOURNEY",
						x: 0,
						y: 2.35,
						color: "#34d399",
					});
				}, 400);
			} else if (move.dimensionType && move.dimensionType !== "3D_SLICE") {
				setTimeout(() => {
					addCallout({
						text:
							move.dimensionType === "CHECKMATE_YESTERDAY"
								? "⊢ Q.E.D. · CHECKMATING YESTERDAY (Δt = −1)!"
								: move.dimensionType === "REALM_PORTAL_TRAVERSAL"
									? "REALM EMERGENCE AMBUSH DUEL!"
									: move.dimensionType === "TEMPORAL_INTERCEPT"
										? "CHRONO-INTERCEPT DUEL (Δt = -1)!"
										: "4D CROSS-DIMENSIONAL AMBUSH!",
						subtext:
							move.dimensionType === "CHECKMATE_YESTERDAY"
								? attackerPiece.theoremAxiom ||
									"SENTIENT MATHEMATICAL THEOREM · RETROACTIVE REFUTATION"
								: move.dimensionLabel || "HYPERCUBE COLLISION",
						x: 0,
						y: 2.35,
						color:
							move.dimensionType === "CHECKMATE_YESTERDAY"
								? "#38bdf8"
								: "#c084fc",
					});
				}, 400);
			}
		},
		[addCallout, syncBoardHighlights],
	);

	// Initiate descent of a warrior through a BoardGateway into one of the Three Subterranean Realms!
	const initiateRealmDescent = useCallback(
		(
			piece: ChessPiece,
			gatewayId: string,
			entryCoord: { row: number; col: number; z: number; w: number },
			autoTargetPortalId?: string,
		) => {
			const sim = simRef.current;
			const gw =
				BOARD_GATEWAYS.find((g) => g.id === gatewayId) || BOARD_GATEWAYS[0];

			// Move piece onto the entry gateway square first, then mark it as physically inside the realm
			piece.row = entryCoord.row;
			piece.col = entryCoord.col;
			piece.z = entryCoord.z;
			piece.w = entryCoord.w;
			piece.hasMoved = true;
			piece.inRealm = gw.realmId;

			const echoes = buildDeterministicTemporalEchoes(sim.pieces, piece.id);
			const sentinels = buildRealmSentinels(
				sim.pieces,
				piece.faction,
				piece.id,
			);
			if (sim.realmsRig) {
				syncRealmEntities3D(sim.realmsRig, echoes, sentinels);
			}

			sim.realm.travelerPieceId = piece.id;
			sim.realm.entryGatewayId = gw.id;
			sim.realm.currentRealmId = gw.realmId;
			sim.realm.localPos.set(gw.spawnLocalPos.x, 0, gw.spawnLocalPos.z);
			sim.realm.velocity.set(0, 0, 0);
			sim.realm.yaw = gw.spawnYaw;
			sim.realm.isParityInverted = Boolean(piece.mirrorInvertedParity);
			sim.realm.crucibleAnvilClaimed = false;
			sim.realm.echoes = echoes;
			sim.realm.sentinels = sentinels;
			sim.realm.nearbyPortal = null;
			sim.realm.nearbyPortalEval = null;
			sim.realm.portalCooldownSec = 1.1;
			sim.realm.hazardCooldownSec = 0;
			sim.realm.attackAnimTimerSec = 0;
			sim.realm.dashTimerSec = 0;
			sim.realm.ascentTargetCoord = null;
			sim.realm.ascentTargetEnemy = null;
			sim.realm.ascentPortalName = "";

			// If AI or Auto-Play Demo is controlling this piece, choose an intelligent target portal in the realm
			const isControlledByAI =
				sim.autoPlayDemo || (sim.gameMode === "vs_ai" && piece.faction === "b");
			if (autoTargetPortalId) {
				sim.realm.steerTargetPortalId = autoTargetPortalId;
			} else if (isControlledByAI) {
				const portals = getPortalsForRealm(gw.realmId).filter(
					(p) => p.kind === "BOARD_ASCENT" && p.targetGatewayId !== gw.id,
				);
				const validExit = portals.find((p) => {
					const ev = evaluatePortalBoardExit(p, piece, sim.pieces, true, true);
					return ev && ev.status !== "ALLY_OBSTRUCTED";
				});
				sim.realm.steerTargetPortalId = validExit
					? validExit.id
					: portals[0]?.id || null;
			} else {
				sim.realm.steerTargetPortalId = null;
			}

			sim.selectedPieceId = null;
			sim.validMoves = [];
			setHoveredCaptureMove(null);
			syncBoardHighlights();

			if (sim.controls) {
				sim.controls.enabled = false;
			}

			if (sim.vfxPool) {
				const entryWorld = boardToWorld(entryCoord.row, entryCoord.col);
				spawnShockwave(
					sim.vfxPool,
					entryWorld.x,
					0.08,
					entryWorld.z,
					gw.colorHex,
					5.5,
				);
				spawnAuraPillar(sim.vfxPool, entryWorld.x, entryWorld.z, gw.colorHex);
			}

			soundEngine.playRealmPortalTransition(true);
			sim.phase = "REALM_DESCENT";
			sim.phaseTimer = 0;
			setPhase("REALM_DESCENT");
			setActiveRealmId(gw.realmId);
			setRealmTraveler({ ...piece });
			setRealmParityInverted(sim.realm.isParityInverted);
			setRealmCrucibleClaimed(false);
			setNearbyPortal(null);
			setNearbyPortalEval(null);
			setRealmStatusBanner(
				`DESCENDING THROUGH ${gw.name.toUpperCase()} INTO ${REALM_METADATA[gw.realmId].title}`,
			);
		},
		[syncBoardHighlights],
	);

	// Traverse a physical portal inside a Subterranean Realm (Board Ascent, Inter-Realm Rift, or Mirror Parity Inverter!)
	const handleTraverseRealmPortal = useCallback((portal: RealmPortalNode) => {
		const sim = simRef.current;
		if (sim.phase !== "REALM_EXPLORATION") return;
		const traveler = sim.pieces.find((p) => p.id === sim.realm.travelerPieceId);
		if (!traveler) return;

		if (portal.kind === "MIRROR_INVERTER") {
			// Flip Chiral Parity across The Great Looking-Glass!
			const nextParity = !sim.realm.isParityInverted;
			sim.realm.isParityInverted = nextParity;
			traveler.mirrorInvertedParity = nextParity;
			traveler.meter = Math.min(100, traveler.meter + 20);
			sim.realm.localPos.x = -sim.realm.localPos.x;
			sim.realm.localPos.z = sim.realm.localPos.z >= 0 ? -3.0 : 3.0;
			sim.realm.portalCooldownSec = 1.25;
			sim.realm.steerTargetPortalId = null;

			soundEngine.playMirrorParityFlip();
			if (sim.vfxPool) {
				const meta = REALM_METADATA[sim.realm.currentRealmId];
				spawnShockwave(
					sim.vfxPool,
					meta.worldCenter.x,
					meta.worldCenter.y + 0.2,
					meta.worldCenter.z,
					0x38bdf8,
					7.5,
				);
			}

			setRealmParityInverted(nextParity);
			setRealmTraveler({ ...traveler });
			setRealmStatusBanner(
				nextParity
					? "CHIRAL PARITY INVERTED: (r, c, w) ↦ (7−r, 7−c, −w) · MIRROR AEGIS GRANTED!"
					: "CHIRAL PARITY RESTORED TO PRIME ORIENTATION",
			);
			return;
		}

		if (portal.kind === "INTER_REALM" && portal.targetRealmId) {
			const targetRealmId = portal.targetRealmId;
			const dstPortal = REALM_PORTALS.find(
				(p) => p.id === portal.targetPortalId,
			);
			const dstYaw = dstPortal ? dstPortal.yaw : 0;
			const inwardX = dstPortal
				? dstPortal.localPos.x - Math.sin(dstYaw) * 3.2
				: 0;
			const inwardZ = dstPortal
				? dstPortal.localPos.z - Math.cos(dstYaw) * 3.2
				: 0;

			sim.realm.currentRealmId = targetRealmId;
			traveler.inRealm = targetRealmId;
			sim.realm.localPos.set(inwardX, 0, inwardZ);
			sim.realm.yaw = dstYaw + Math.PI;
			sim.realm.portalCooldownSec = 1.35;
			sim.realm.steerTargetPortalId = null;

			soundEngine.playRealmPortalTransition(true);
			setActiveRealmId(targetRealmId);
			setRealmTraveler({ ...traveler });
			setRealmStatusBanner(
				`CROSSED INTER-REALM RIFT → ENTERED ${REALM_METADATA[targetRealmId].title}`,
			);
			return;
		}

		if (portal.kind === "BOARD_ASCENT" || portal.kind === "TIMELINE_PORTAL") {
			const targetTimelineId =
				portal.kind === "TIMELINE_PORTAL" && portal.targetTimelineId
					? portal.targetTimelineId === sim.multiverse.activeTimelineId
						? "TL-PRIME"
						: portal.targetTimelineId
					: sim.multiverse.activeTimelineId;

			const targetBranch =
				ensureBranchHydrated(sim.multiverse, targetTimelineId) ||
				ensureBranchHydrated(sim.multiverse, "TL-PRIME")!;
			const evalPieces =
				targetTimelineId === sim.multiverse.activeTimelineId
					? sim.pieces
					: targetBranch.pieces;

			const evalRes = evaluatePortalBoardExit(
				portal,
				traveler,
				evalPieces,
				sim.realm.isParityInverted,
				sim.realm.crucibleAnvilClaimed,
				targetBranch.name,
			);
			if (!evalRes) return;

			if (evalRes.status === "ALLY_OBSTRUCTED") {
				soundEngine.playBlock(false);
				const allyName = evalRes.occupant
					? ARCHETYPES[evalRes.occupant.type].chessName.toUpperCase()
					: "UNIT";
				setRealmStatusBanner(
					`EXIT ${evalRes.squareLabel} IN ${targetTimelineId} OBSTRUCTED BY ALLIED ${allyName}!`,
				);
				sim.realm.localPos.multiplyScalar(0.82);
				sim.realm.portalCooldownSec = 0.85;
				return;
			}

			// Valid exit (either CLEAR or ENEMY_OCCUPIED ambush, possibly in an alternate timeline!)
			sim.realm.ascentTargetCoord = { ...evalRes.coord };
			sim.realm.ascentTargetEnemy =
				evalRes.status === "ENEMY_OCCUPIED" ? evalRes.occupant || null : null;
			sim.realm.ascentPortalName = `${portal.name} → ${targetTimelineId} ${evalRes.squareLabel}`;
			sim.realm.ascentTargetTimelineId = targetTimelineId;
			sim.realm.steerTargetPortalId = null;
			sim.phase = "REALM_ASCENT";
			sim.phaseTimer = 0;
			soundEngine.playRealmPortalTransition(false);
			setPhase("REALM_ASCENT");
			const enemyName =
				evalRes.status === "ENEMY_OCCUPIED" && evalRes.occupant
					? ARCHETYPES[evalRes.occupant.type].chessName.toUpperCase()
					: null;
			setRealmStatusBanner(
				enemyName
					? `EMERGING IN ${targetTimelineId} AT ${evalRes.squareLabel} — ASSASSINATING ${enemyName}!`
					: `EMERGING IN ${targetTimelineId} AT ${evalRes.squareLabel}`,
			);
		}
	}, []);

	const handleSteerTowardPortal = useCallback((portal: RealmPortalNode) => {
		const sim = simRef.current;
		if (sim.phase !== "REALM_EXPLORATION") return;
		sim.realm.steerTargetPortalId = portal.id;
		soundEngine.playChessSelect();
		setRealmStatusBanner(`STEERING TOWARD ${portal.name.toUpperCase()}...`);
	}, []);

	const handleRealmAction = useCallback(
		(action: "jump" | "dash" | "strike") => {
			const sim = simRef.current;
			if (sim.phase !== "REALM_EXPLORATION") return;
			if (action === "jump" && sim.realm.localPos.y <= 0.05) {
				sim.realm.velocity.y = 10.5;
				soundEngine.playBystanderHop();
			} else if (action === "dash" && sim.realm.dashTimerSec <= 0) {
				sim.realm.dashTimerSec = 0.32;
				soundEngine.playSwing(false);
			} else if (action === "strike" && sim.realm.attackAnimTimerSec <= 0) {
				sim.realm.attackAnimTimerSec = 0.42;
				soundEngine.playSwing(true);
			}
		},
		[],
	);

	return {
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
	};
}
