// @ts-nocheck — WebGL bootstrap/rAF loop extracted from App; simRef is loosely typed
import confetti from "canvas-confetti";
import {
	type Dispatch,
	type MutableRefObject,
	type SetStateAction,
	useEffect,
} from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import {
	clearPendingUniInteract,
	formatSimClock,
	queuePendingUniInteract,
	recordPersonalTransaction,
	syncAppointmentsWithClock,
	triggerCafeteriaCollisionSpill,
	tryResolveAnniversaryCollapse,
} from "../academic/colloquiumSimHelpers";
import { soundEngine } from "../audio/soundEngine";
import { ARCHETYPES } from "../data/archetypes";
import {
	chooseAIMove,
	formatSquareName,
	formatWName,
	getPieceAtProjected,
	getPieceLineageId,
	getValidMovesForPiece,
} from "../engine/chessEngine";
import {
	applyTacticalInterventionImpact,
	getFighterSpeedMultiplier,
	stepCombatSimulation,
	stepVictoryTaunt,
	triggerFighter4DPhaseShift,
	triggerFighterAttack,
	triggerFighterDash,
	triggerFighterJump,
	triggerFighterTemporalEcho,
	triggerVictoryTaunt,
	updateFighterAI,
} from "../engine/combatEngine";
import {
	BOARD_GATEWAYS,
	evaluateCrucibleHazards,
	evaluatePortalBoardExit,
	getPortalsForRealm,
	REALM_METADATA,
} from "../engine/realmEngine";
import {
	boardToWorld,
	createBoardArena,
	update4DTesseractProjection,
	updateQuantumEntanglementBeams,
} from "../three/arenaBuilder";
import { BattleWornShader } from "../three/battleWornShader";
import {
	animateFighterRig,
	animateFirstPersonViewmodel,
	createVFXPool,
	spawnAuraPillar,
	spawnBattleSmoke,
	spawnGroundDebris,
	spawnHitSparks,
	spawnParryImpactSparks,
	spawnShockwave,
	spawnSlashArc,
	updateVFXPool,
} from "../three/combatAnimator";
import { getWarriorEyeHeightWorld } from "../three/combatEyeHeight";
import {
	createArticulatedPiece,
	setPieceProfessorMode,
} from "../three/pieceModels";
import {
	createMultiversalPocketWatch,
	triggerPocketWatchReaction,
	updateMultiversalPocketWatch,
} from "../three/pocketWatchBuilder";
import {
	createSubterraneanRealms,
	syncRealmEntities3D,
	updateSubterraneanRealmsAndPortals,
} from "../three/realmBuilder";
import {
	createUniversityOfficeRig,
	getRoomAtWorldPos,
	TRAM_STATIONS,
	UNIVERSITY_ROOM_CENTERS,
	updateUniversityOfficeScene,
} from "../three/universityOfficeBuilder";
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
	MultiverseState,
	RealmId,
	RealmPortalNode,
} from "../types/game";

export type UseWebGLGameLoopParams = {
	canvasMountRef: MutableRefObject<HTMLDivElement | null>;
	simRef: MutableRefObject<any>;
	addCallout: (c: Omit<CombatCallout, "id" | "createdAt">) => void;
	executeChessMove: (...args: any[]) => void;
	executeFighterIntervention: (...args: any[]) => void;
	handleRealmAction: (...args: any[]) => void;
	handleResetGame: () => void;
	handleTemperAtCrucibleAnvil: () => void;
	handleToggleAutoPlayDemo: () => void;
	handleTraverseRealmPortal: (...args: any[]) => void;
	initiateCombatDuel: (...args: any[]) => void;
	syncBoardHighlights: () => void;
	// setters used inside the loop / input handlers
	setPhase: Dispatch<SetStateAction<GamePhase>>;
	setTurnFaction: Dispatch<SetStateAction<Faction>>;
	setTurnNumber: Dispatch<SetStateAction<number>>;
	setActiveSliceW: Dispatch<SetStateAction<number>>;
	setActiveSliceZ: Dispatch<SetStateAction<number>>;
	setTargetMoveW: Dispatch<SetStateAction<number>>;
	setTargetMoveZ: Dispatch<SetStateAction<number>>;
	setSelectedPiece: Dispatch<SetStateAction<ChessPiece | null>>;
	setMultiverseState: Dispatch<SetStateAction<MultiverseState>>;
	setAcademicColloquium: Dispatch<
		SetStateAction<AcademicColloquiumState | null>
	>;
	setHudAttacker: Dispatch<SetStateAction<FighterRuntime | null>>;
	setHudDefender: Dispatch<SetStateAction<FighterRuntime | null>>;
	setFightTimer: Dispatch<SetStateAction<number>>;
	setIntroShotIndex: Dispatch<SetStateAction<number>>;
	setKoBanner: Dispatch<SetStateAction<any>>;
	setWarVictor: Dispatch<SetStateAction<any>>;
	setBattleLogs: Dispatch<SetStateAction<BattleLogEntry[]>>;
	setActiveCollapseBanner: Dispatch<
		SetStateAction<CausalCollapseResolution[] | null>
	>;
	setWatchEventBanner: Dispatch<SetStateAction<any>>;
	setDemoDirectorStage: Dispatch<SetStateAction<string>>;
	setCameraPreset: Dispatch<SetStateAction<CameraPreset>>;
	setActiveRealmId: Dispatch<SetStateAction<RealmId>>;
	setRealmTraveler: Dispatch<SetStateAction<ChessPiece | null>>;
	setRealmParityInverted: Dispatch<SetStateAction<boolean>>;
	setRealmCrucibleClaimed: Dispatch<SetStateAction<boolean>>;
	setNearbyPortal: Dispatch<SetStateAction<any>>;
	setNearbyPortalEval: Dispatch<SetStateAction<any>>;
	setRealmStatusBanner: Dispatch<SetStateAction<string | null>>;
	setCombatCameraMode: Dispatch<SetStateAction<"first_person" | "side_arena">>;
	setCallouts: Dispatch<SetStateAction<CombatCallout[]>>;
	setDockCollapsed?: Dispatch<SetStateAction<boolean>>;
	// academic handlers referenced from pointer/key paths
	handleJoinOrLeaveCafeteriaQueue: () => void;
	handleDropOffShirtAtCleaner: (...args: any[]) => void;
	handlePickUpCleanedShirt: () => void;
	handleBuyNewShirtAtHaberdashery: () => void;
	handleToggleDriveCar: () => void;
	handleOpenTransitModal: () => void;
	handleCommuteHomeForSpareShirt: () => void;
	handleSleepUntilNextMorning: () => void;
	handleBuyTobyCroissant: () => void;
	handleEatHotPlateSoup: () => void;
	handleKickCoffeeMachine: () => void;
	handleTalkToNpcInRoom: (...args: any[]) => void;
	handleSetDrawerTab: (...args: any[]) => void;
	handleWalkToRoom: (...args: any[]) => void;
	handleEnterUniversityOffice: () => void;
	handleAttendScheduledMeetingInRoom: (...args: any[]) => void;
	handleConcludePublicationAndRestorePieces: () => void;
	handleBeginRealityShatter: () => void;
};

export function useWebGLGameLoop(params: UseWebGLGameLoopParams) {
	const {
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
		setRealmTraveler,
		setNearbyPortal,
		setNearbyPortalEval,
		setRealmStatusBanner,
		setCombatCameraMode,
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
		handleConcludePublicationAndRestorePieces,
	} = params;

	// Initialize Three.js Scene, Calibrated Bloom, Studio & Cinematic Fight Lighting, Board, 4D Tesseract, Pieces, and Loop
	useEffect(() => {
		const container = canvasMountRef.current;
		if (!container) return;

		const isHeadless =
			navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);

		const scene = new THREE.Scene();
		scene.background = new THREE.Color(0x07090e);
		scene.fog = new THREE.FogExp2(0x07090e, 0.022);

		const camera = new THREE.PerspectiveCamera(
			45,
			container.clientWidth / container.clientHeight,
			0.08,
			150,
		);
		camera.position.set(0, 11.5, 11.5);
		scene.add(camera);

		// First-Person Viewmodel Mount attached directly to camera lens space
		const fpMountGroup = new THREE.Group();
		camera.add(fpMountGroup);
		const fpLight = new THREE.PointLight(0xfffbeb, 3.2, 2.5);
		fpLight.position.set(0, 0.25, -0.35);
		fpMountGroup.add(fpLight);
		simRef.current.fpMountGroup = fpMountGroup;

		const renderer = new THREE.WebGLRenderer({
			antialias: true,
			powerPreference: "high-performance",
		});
		renderer.outputColorSpace = THREE.SRGBColorSpace;
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		// Calibrated toneMappingExposure so marble tiles and white armor never blow out!
		renderer.toneMappingExposure = 0.88;
		renderer.setPixelRatio(
			isHeadless ? 1 : Math.min(window.devicePixelRatio, 2),
		);
		renderer.setSize(container.clientWidth, container.clientHeight);
		renderer.shadowMap.enabled = !isHeadless;
		renderer.shadowMap.type = THREE.PCFSoftShadowMap;

		container.innerHTML = "";
		container.appendChild(renderer.domElement);

		// Post-Processing Composer with restrained UnrealBloomPass + Battle-Worn Critical Duel ShaderPass (< 30% HP)
		let composer: EffectComposer | null = null;
		let bloomPass: UnrealBloomPass | null = null;
		let battleWornPass: ShaderPass | null = null;
		if (!isHeadless) {
			composer = new EffectComposer(renderer);
			composer.addPass(new RenderPass(scene, camera));
			bloomPass = new UnrealBloomPass(
				new THREE.Vector2(container.clientWidth, container.clientHeight),
				0.18, // scaled-down strength for crispness
				0.28, // tight radius
				0.88, // high threshold so only true emissive weapon sparks/slashes bloom
			);
			composer.addPass(bloomPass);

			battleWornPass = new ShaderPass(BattleWornShader);
			battleWornPass.uniforms.uAspect.value =
				container.clientWidth / Math.max(1, container.clientHeight);
			composer.addPass(battleWornPass);

			composer.addPass(new OutputPass());
		}

		const onContextLost = (e: Event) => {
			e.preventDefault();
		};
		renderer.domElement.addEventListener("webglcontextlost", onContextLost);

		const pmremGenerator = new THREE.PMREMGenerator(renderer);
		scene.environment = pmremGenerator.fromScene(
			new RoomEnvironment(),
			0.04,
		).texture;
		pmremGenerator.dispose();

		// 3-Point Board Studio Lighting Rig (calibrated intensities)
		const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x1e1b4b, 0.48);
		scene.add(hemiLight);

		const keyLight = new THREE.DirectionalLight(0xfffbeb, 1.65);
		keyLight.position.set(9, 16, 10);
		keyLight.castShadow = !isHeadless;
		keyLight.shadow.mapSize.width = 2048;
		keyLight.shadow.mapSize.height = 2048;
		keyLight.shadow.camera.near = 2;
		keyLight.shadow.camera.far = 38;
		const d = 10.5;
		keyLight.shadow.camera.left = -d;
		keyLight.shadow.camera.right = d;
		keyLight.shadow.camera.top = d;
		keyLight.shadow.camera.bottom = -d;
		keyLight.shadow.bias = -0.0005;
		keyLight.shadow.normalBias = 0.02;
		scene.add(keyLight);

		const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.95);
		rimLight.position.set(-10, 9, -11);
		scene.add(rimLight);

		const warmFill = new THREE.PointLight(0xf59e0b, 0.85, 24);
		warmFill.position.set(0, 6, 0);
		scene.add(warmFill);

		// OrbitControls for Chess View (allowing close-up piece inspection, panning, and upward tilt to inspect the Colossal Multiversal Pocket Watch!)
		const controls = new OrbitControls(camera, renderer.domElement);
		controls.enableDamping = true;
		controls.dampingFactor = 0.06;
		controls.enablePan = true;
		controls.screenSpacePanning = true;
		controls.maxPolarAngle = Math.PI * 0.85;
		controls.minDistance = 1.6;
		controls.maxDistance = 36;
		controls.target.set(0, 0.3, 0);
		simRef.current.controls = controls;

		// Build 3D Chessboard, 4D Tesseract Projector, Cinematic Spotlights & Duel Colosseum Arena
		const arenaRig = createBoardArena(renderer);
		scene.add(arenaRig.group);
		simRef.current.arenaRig = arenaRig;

		// Build Colossal 3D Multiversal Pocket Watch suspended high above the chessboard!
		const pocketWatchRig = createMultiversalPocketWatch(renderer);
		scene.add(pocketWatchRig.rootGroup);
		simRef.current.pocketWatchRig = pocketWatchRig;

		// Build 3D Subterranean Impossible Realms (The Shattered Mirror, The Ashen Crucible, The Echoing Remnant)
		// and Live Perspective Render-To-Texture Portals + 6 Board Gateway Wells!
		const realmsRig = createSubterraneanRealms(renderer);
		scene.add(realmsRig.rootGroup);
		scene.add(realmsRig.boardGatewaysGroup);
		simRef.current.realmsRig = realmsRig;

		// Build Modest 3D University of Greater Andromeda Office (Room 4B, Peano Hall: rainy window, 1987 broken coffee machine, chalkboard, oak desk)
		const universityOfficeRig = createUniversityOfficeRig();
		scene.add(universityOfficeRig.rootGroup);
		simRef.current.universityOfficeRig = universityOfficeRig;

		// Build Combat VFX Pool
		const vfxPool = createVFXPool();
		scene.add(vfxPool.group);
		simRef.current.vfxPool = vfxPool;

		// Holographic Temporal Echo Clone Mesh for 4D Spacetime Pincer Strikes during Duels!
		const echoGeo = new THREE.CylinderGeometry(0.28, 0.36, 1.35, 16);
		const echoMat = new THREE.MeshBasicMaterial({
			color: 0x38bdf8,
			wireframe: true,
			transparent: true,
			opacity: 0.65,
		});
		const temporalEchoMesh = new THREE.Mesh(echoGeo, echoMat);
		temporalEchoMesh.visible = false;
		scene.add(temporalEchoMesh);

		// Populate all 32 articulated 3D chess warriors
		const sim = simRef.current;
		sim.pieceRigs.clear();
		sim.bystanders.clear();
		for (const piece of sim.pieces) {
			const rig = createArticulatedPiece(piece.type, piece.faction);
			boardToWorld(piece.row, piece.col, rig.root.position);
			rig.root.rotation.y = piece.faction === "w" ? Math.PI : 0;
			scene.add(rig.root);
			sim.pieceRigs.set(piece.id, rig);
			sim.bystanders.set(piece.id, {
				offsetX: 0,
				offsetZ: 0,
				vx: 0,
				vz: 0,
				y: 0,
				vy: 0,
				panickedTimer: 0,
			});
		}

		renderer.compile(scene, camera);

		// Raycasting for Chessboard Clicks & Hover Preview
		const raycaster = new THREE.Raycaster();
		const pointer = new THREE.Vector2();
		let pointerDownPos = { x: 0, y: 0 };

		const getBoardCoordsFromEvent = (ev: PointerEvent): BoardCoord | null => {
			const rect = renderer.domElement.getBoundingClientRect();
			pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
			pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
			raycaster.setFromCamera(pointer, camera);

			const flatTiles = arenaRig.tiles.flat();
			const hits = raycaster.intersectObjects(flatTiles, false);
			if (hits.length > 0) {
				const { row, col } = hits[0].object.userData as {
					row: number;
					col: number;
				};
				return { row, col };
			}

			for (const [pieceId, rig] of sim.pieceRigs.entries()) {
				const pieceHits = raycaster.intersectObject(rig.root, true);
				if (pieceHits.length > 0) {
					const piece = sim.pieces.find((p) => p.id === pieceId);
					if (piece) return { row: piece.row, col: piece.col };
				}
			}
			return null;
		};

		const onPointerDown = (ev: PointerEvent) => {
			if (!soundEngine.muted) {
				soundEngine.startMusic();
			}
			pointerDownPos = { x: ev.clientX, y: ev.clientY };
			sim.mouseLook.isDragging = true;
			sim.mouseLook.lastPointerX = ev.clientX;
			sim.mouseLook.lastPointerY = ev.clientY;
		};

		const onPointerMove = (ev: PointerEvent) => {
			const ml = sim.mouseLook;
			const dx = ev.clientX - ml.lastPointerX;
			const dy = ev.clientY - ml.lastPointerY;
			ml.lastPointerX = ev.clientX;
			ml.lastPointerY = ev.clientY;

			// Universal 360° Mouse Look-Around when dragging OR when Free-Look Mode [F] is active!
			if ((ml.isDragging || ml.freeLookActive) && sim.phase !== "CHESS_VIEW") {
				const sens = 0.0052;
				if (sim.phase === "ACADEMIC_SIMULATOR") {
					ml.uniCamYaw -= dx * sens;
					ml.uniCamPitch = THREE.MathUtils.clamp(
						ml.uniCamPitch + dy * sens,
						ml.uniFirstPerson ? -0.85 : -0.35,
						ml.uniFirstPerson ? 0.95 : 1.22,
					);
				} else if (sim.phase === "REALM_EXPLORATION") {
					ml.realmCamYawOffset -= dx * sens;
					ml.realmCamPitch = THREE.MathUtils.clamp(
						ml.realmCamPitch + dy * sens,
						-0.35,
						1.18,
					);
				} else if (sim.phase === "FIGHT_ACTIVE") {
					ml.fightLookYaw = THREE.MathUtils.clamp(
						ml.fightLookYaw - dx * sens,
						sim.combatCameraMode === "first_person" ? -1.35 : -Math.PI,
						sim.combatCameraMode === "first_person" ? 1.35 : Math.PI,
					);
					ml.fightLookPitch = THREE.MathUtils.clamp(
						ml.fightLookPitch + dy * sens,
						-0.72,
						0.85,
					);
				}
			}

			if (
				sim.phase === "ACADEMIC_SIMULATOR" &&
				sim.academicColloquium?.stage === "UNIVERSITY_SIMULATOR" &&
				sim.academicColloquium.activeDrawerTab === "NONE" &&
				!ml.isDragging
			) {
				const rect = renderer.domElement.getBoundingClientRect();
				pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
				pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
				raycaster.setFromCamera(pointer, camera);
				const hits = raycaster.intersectObject(
					universityOfficeRig.rootGroup,
					true,
				);
				let foundInteract = false;
				for (const h of hits) {
					let cur: THREE.Object3D | null = h.object;
					while (cur && cur !== universityOfficeRig.rootGroup) {
						if (cur.userData?.uniInteract) {
							foundInteract = true;
							break;
						}
						cur = cur.parent;
					}
					if (foundInteract) break;
				}
				renderer.domElement.style.cursor = foundInteract ? "pointer" : "";
				return;
			}

			if (sim.phase !== "CHESS_VIEW" || sim.validMoves.length === 0) return;
			const coord = getBoardCoordsFromEvent(ev);
			if (!coord) {
				setHoveredCaptureMove(null);
				return;
			}
			const matchMove = sim.validMoves.find(
				(m) => m.to.row === coord.row && m.to.col === coord.col && m.isCapture,
			);
			setHoveredCaptureMove(matchMove || null);
		};

		const resolveUniInteractTag = (actionTag: string) => {
			if (actionTag === "OPEN_CHALKBOARD") {
				handleSetDrawerTab("CHALKBOARD_PROOF");
			} else if (actionTag === "OPEN_PINE_MAIL") {
				handleSetDrawerTab("PINE_MAIL");
			} else if (actionTag === "OPEN_FINANCE_LEDGER") {
				handleSetDrawerTab("FINANCE_LEDGER");
			} else if (actionTag === "KICK_COFFEE_MACHINE") {
				handleKickCoffeeMachine();
			} else if (actionTag === "TALK_TOBY") {
				handleTalkToNpcInRoom("TOBY");
			} else if (actionTag === "TALK_BISHOP") {
				handleTalkToNpcInRoom("BISHOP");
			} else if (actionTag === "TALK_QUEEN") {
				handleTalkToNpcInRoom("QUEEN");
			} else if (actionTag === "TALK_ROOK") {
				handleTalkToNpcInRoom("ROOK");
			} else if (
				actionTag === "JOIN_CAFETERIA_QUEUE" ||
				actionTag === "CAFETERIA_QUEUE"
			) {
				handleJoinOrLeaveCafeteriaQueue();
			} else if (actionTag === "CLEANER_COUNTER") {
				const col = sim.academicColloquium;
				if (col?.shirtState === "COFFEE_STAINED") {
					handleDropOffShirtAtCleaner("EXPRESS_75_MIN");
				} else if (
					col?.activeDryCleaningTicket &&
					!col.activeDryCleaningTicket.collected
				) {
					handlePickUpCleanedShirt();
				} else {
					handleBuyNewShirtAtHaberdashery();
				}
			} else if (actionTag === "TOGGLE_DRIVE_CAR") {
				handleToggleDriveCar();
			} else if (
				actionTag === "BOARD_TRAM" ||
				actionTag === "TRAM_STATION_KIOSK"
			) {
				handleOpenTransitModal();
			} else if (actionTag === "HOME_WARDROBE") {
				handleCommuteHomeForSpareShirt();
			} else if (actionTag === "HOME_BED") {
				handleSleepUntilNextMorning();
			} else if (actionTag === "BUY_HABERDASHERY_SHIRT") {
				handleBuyNewShirtAtHaberdashery();
			} else if (actionTag === "BUY_TOBY_CROISSANT") {
				handleBuyTobyCroissant();
			} else if (actionTag === "EAT_HOT_PLATE_SOUP") {
				handleEatHotPlateSoup();
			}
		};

		const tryResolvePendingUniInteract = () => {
			const up = sim.uniPlayer;
			const tag = up.pendingUniInteract;
			if (!tag) return;
			const ix = up.pendingInteractX;
			const iz = up.pendingInteractZ;
			if (typeof ix === "number" && typeof iz === "number") {
				if (Math.hypot(up.worldX - ix, up.worldZ - iz) > 1.85) return;
			} else if (up.targetX !== null || up.targetZ !== null) {
				return;
			}
			clearPendingUniInteract(up);
			resolveUniInteractTag(tag);
		};

		const onPointerUp = (ev: PointerEvent) => {
			sim.mouseLook.isDragging = false;
			const dragDist = Math.hypot(
				ev.clientX - pointerDownPos.x,
				ev.clientY - pointerDownPos.y,
			);

			// In ACADEMIC_SIMULATOR, clicking a prop walks there first; interaction fires on arrival.
			if (
				sim.phase === "ACADEMIC_SIMULATOR" &&
				sim.academicColloquium?.stage === "UNIVERSITY_SIMULATOR" &&
				sim.academicColloquium.activeDrawerTab === "NONE" &&
				dragDist <= 7
			) {
				const rect = renderer.domElement.getBoundingClientRect();
				pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
				pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
				raycaster.setFromCamera(pointer, camera);

				const sceneHits = raycaster.intersectObject(
					universityOfficeRig.rootGroup,
					true,
				);
				for (const hit of sceneHits) {
					let cur: THREE.Object3D | null = hit.object;
					while (cur && cur !== universityOfficeRig.rootGroup) {
						const actionTag = cur.userData?.uniInteract as string | undefined;
						if (actionTag) {
							const ix =
								typeof cur.userData.interactX === "number"
									? cur.userData.interactX
									: hit.point.x;
							const iz =
								typeof cur.userData.interactZ === "number"
									? cur.userData.interactZ
									: hit.point.z;
							const dist = Math.hypot(
								sim.uniPlayer.worldX - ix,
								sim.uniPlayer.worldZ - iz,
							);
							if (dist <= 1.85) {
								resolveUniInteractTag(actionTag);
							} else {
								queuePendingUniInteract(sim.uniPlayer, actionTag, ix, iz);
							}
							return;
						}
						cur = cur.parent;
					}
				}

				const floorHits = raycaster.intersectObject(
					universityOfficeRig.walkableFloorMesh,
					false,
				);
				if (floorHits.length > 0) {
					const pt = floorHits[0].point;
					clearPendingUniInteract(sim.uniPlayer);
					sim.uniPlayer.targetX = THREE.MathUtils.clamp(pt.x, -92, 92);
					sim.uniPlayer.targetZ = THREE.MathUtils.clamp(pt.z, -36, 86);
				}
				return;
			}

			if (sim.phase !== "CHESS_VIEW") return;
			if (dragDist > 8) return;

			if (sim.gameMode === "vs_ai" && sim.turnFaction === "b") return;

			const coord = getBoardCoordsFromEvent(ev);
			if (!coord) return;

			if (sim.selectedPieceId) {
				const activePiece = sim.pieces.find(
					(p) => p.id === sim.selectedPieceId,
				);
				// Prioritize gateway descent if clicking the piece's own gateway square, or captures/chrono-intercepts, or moves into the selected targetMoveW/targetMoveZ slice
				const chosenMove =
					sim.validMoves.find(
						(m) =>
							m.to.row === coord.row &&
							m.to.col === coord.col &&
							m.dimensionType === "REALM_GATEWAY_DESCENT",
					) ||
					sim.validMoves.find(
						(m) =>
							m.to.row === coord.row && m.to.col === coord.col && m.isCapture,
					) ||
					sim.validMoves.find(
						(m) =>
							m.to.row === coord.row &&
							m.to.col === coord.col &&
							m.to.w === sim.targetMoveW &&
							m.to.z === sim.targetMoveZ,
					) ||
					sim.validMoves.find(
						(m) => m.to.row === coord.row && m.to.col === coord.col,
					);

				if (activePiece && chosenMove) {
					executeChessMove(activePiece, chosenMove);
					return;
				}
			}

			const clickedPiece = getPieceAtProjected(
				sim.pieces,
				coord.row,
				coord.col,
				sim.activeSliceZ,
				sim.activeSliceW,
			);

			if (clickedPiece && clickedPiece.faction === sim.turnFaction) {
				soundEngine.playChessSelect();
				sim.selectedPieceId = clickedPiece.id;
				sim.targetMoveW = clickedPiece.w;
				sim.targetMoveZ = clickedPiece.z;
				setTargetMoveW(clickedPiece.w);
				setTargetMoveZ(clickedPiece.z);
				sim.validMoves = getValidMovesForPiece(
					clickedPiece,
					sim.pieces,
					clickedPiece.z,
					clickedPiece.w,
				);
				syncBoardHighlights();
			} else {
				sim.selectedPieceId = null;
				sim.validMoves = [];
				syncBoardHighlights();
			}
		};

		const onPointerLeave = () => {
			sim.mouseLook.isDragging = false;
		};

		const onWheel = (ev: WheelEvent) => {
			if (sim.phase === "CHESS_VIEW") return; // OrbitControls handles wheel in CHESS_VIEW
			const ml = sim.mouseLook;
			const zoomStep = ev.deltaY * 0.0055;
			if (sim.phase === "ACADEMIC_SIMULATOR") {
				if (ml.uniFirstPerson && zoomStep > 0) {
					ml.uniFirstPerson = false;
					ml.uniCamDistance = 1.8;
					setUniFirstPerson(false);
				} else {
					ml.uniCamDistance = THREE.MathUtils.clamp(
						ml.uniCamDistance + zoomStep,
						0.7,
						14.5,
					);
					if (ml.uniCamDistance <= 0.85 && !ml.uniFirstPerson) {
						ml.uniFirstPerson = true;
						setUniFirstPerson(true);
					}
				}
			} else if (sim.phase === "REALM_EXPLORATION") {
				ml.realmCamDistance = THREE.MathUtils.clamp(
					ml.realmCamDistance + zoomStep,
					1.6,
					13.5,
				);
			} else if (sim.phase === "FIGHT_ACTIVE") {
				ml.fightCamDistOffset = THREE.MathUtils.clamp(
					ml.fightCamDistOffset + zoomStep,
					-2.2,
					4.5,
				);
			}
		};

		const onDoubleClick = () => {
			if (sim.phase === "CHESS_VIEW") return;
			sim.mouseLook.uniCamYaw = 0;
			sim.mouseLook.uniCamPitch = 0.42;
			sim.mouseLook.fightLookYaw = 0;
			sim.mouseLook.fightLookPitch = 0;
			sim.mouseLook.realmCamYawOffset = 0;
			sim.mouseLook.realmCamPitch = 0.42;
		};

		renderer.domElement.addEventListener("pointerdown", onPointerDown);
		renderer.domElement.addEventListener("pointermove", onPointerMove);
		renderer.domElement.addEventListener("pointerup", onPointerUp);
		renderer.domElement.addEventListener("pointerleave", onPointerLeave);
		renderer.domElement.addEventListener("wheel", onWheel, { passive: true });
		renderer.domElement.addEventListener("dblclick", onDoubleClick);

		const onKeyDown = (e: KeyboardEvent) => {
			if (!soundEngine.muted) {
				soundEngine.startMusic();
			}
			if (sim.phase === "ACADEMIC_SIMULATOR" && sim.academicColloquium) {
				if (
					e.key === "Escape" &&
					sim.academicColloquium.activeDrawerTab !== "NONE"
				) {
					handleSetDrawerTab("NONE");
					return;
				} else if (e.key === "1") {
					handleSetDrawerTab(
						sim.academicColloquium.activeDrawerTab === "CHALKBOARD_PROOF"
							? "NONE"
							: "CHALKBOARD_PROOF",
					);
					return;
				} else if (e.key === "2") {
					handleSetDrawerTab(
						sim.academicColloquium.activeDrawerTab === "FINANCE_LEDGER"
							? "NONE"
							: "FINANCE_LEDGER",
					);
					return;
				} else if (e.key === "3") {
					handleSetDrawerTab(
						sim.academicColloquium.activeDrawerTab === "CALENDAR_NPCS"
							? "NONE"
							: "CALENDAR_NPCS",
					);
					return;
				} else if (e.key === "4") {
					handleSetDrawerTab(
						sim.academicColloquium.activeDrawerTab === "PINE_MAIL"
							? "NONE"
							: "PINE_MAIL",
					);
					return;
				} else if (e.key === "t" || e.key === "T") {
					if (sim.academicColloquium.tramTransitModalOpen) {
						handleCloseTransitModal();
					} else {
						handleOpenTransitModal();
					}
					return;
				} else if (e.key === "e" || e.key === "E") {
					handleToggleDriveCar();
					return;
				}
			}
			if (e.key === "h" || e.key === "H") {
				setDockCollapsed((prev) => !prev);
			} else if (e.key === "m" || e.key === "M") {
				setMultiverseModalOpen((prev) => !prev);
				return;
			} else if (e.key === "f" || e.key === "F") {
				const nextFree = !sim.mouseLook.freeLookActive;
				sim.mouseLook.freeLookActive = nextFree;
				setFreeMouseLook(nextFree);
				return;
			} else if (e.key === "r" || e.key === "R") {
				sim.mouseLook.uniCamYaw = 0;
				sim.mouseLook.uniCamPitch = 0.42;
				sim.mouseLook.uniCamDistance = 6.2;
				sim.mouseLook.fightLookYaw = 0;
				sim.mouseLook.fightLookPitch = 0;
				sim.mouseLook.fightCamDistOffset = 0;
				sim.mouseLook.realmCamYawOffset = 0;
				sim.mouseLook.realmCamPitch = 0.42;
				return;
			} else if (e.key === "v" || e.key === "V") {
				if (sim.phase === "ACADEMIC_SIMULATOR") {
					const nextFp = !sim.mouseLook.uniFirstPerson;
					sim.mouseLook.uniFirstPerson = nextFp;
					if (!nextFp && sim.mouseLook.uniCamDistance < 1.8) {
						sim.mouseLook.uniCamDistance = 5.6;
					}
					setUniFirstPerson(nextFp);
					return;
				}
				const next =
					sim.combatCameraMode === "first_person"
						? "side_arena"
						: "first_person";
				sim.combatCameraMode = next;
				setCombatCameraMode(next);
			} else if (e.key === "p" || e.key === "P") {
				handleToggleAutoPlayDemo();
				return;
			} else if (
				(e.key === "c" || e.key === "C") &&
				sim.phase === "CHESS_VIEW"
			) {
				const nextPreset: CameraPreset =
					sim.cameraPreset === "pocket_watch" ? "white_orbit" : "pocket_watch";
				handleSelectCameraPreset(nextPreset);
				return;
			}

			sim.keysHeld[e.code] = true;

			// SUBTERRANEAN REALM 3RD-PERSON EXPLORATION CONTROLS
			if (sim.phase === "REALM_EXPLORATION" && sim.realm.travelerPieceId) {
				if (e.code === "Space") {
					e.preventDefault();
					handleRealmAction("jump");
				} else if (
					e.code === "ShiftLeft" ||
					e.code === "ShiftRight" ||
					e.code === "KeyL"
				) {
					handleRealmAction("dash");
				} else if (e.code === "KeyJ" || e.code === "KeyK") {
					handleRealmAction("strike");
				} else if (e.code === "KeyE") {
					if (
						sim.realm.currentRealmId === "ASHEN_CRUCIBLE" &&
						!sim.realm.crucibleAnvilClaimed &&
						Math.hypot(sim.realm.localPos.x, sim.realm.localPos.z) < 2.9
					) {
						handleTemperAtCrucibleAnvil();
						return;
					}
					if (sim.realm.nearbyPortal) {
						handleTraverseRealmPortal(sim.realm.nearbyPortal);
					}
				}
				return;
			}

			if (sim.phase !== "FIGHT_ACTIVE") return;
			const atk = sim.attackerRuntime;
			const def = sim.defenderRuntime;
			if (!atk || !def) return;

			const human = !atk.isAI ? atk : !def.isAI ? def : atk;

			if (e.code === "KeyJ" || e.code === "KeyZ") {
				triggerFighterAttack(human, "L", addCallout);
			} else if (e.code === "KeyK" || e.code === "KeyX") {
				triggerFighterAttack(human, "H", addCallout);
			} else if (e.code === "KeyU" || e.code === "KeyC" || e.code === "Enter") {
				triggerFighterAttack(human, "S", addCallout);
			} else if (e.code === "KeyQ") {
				triggerFighter4DPhaseShift(human, addCallout);
			} else if (e.code === "KeyE") {
				triggerFighterTemporalEcho(human, addCallout);
			} else if (e.code === "KeyT") {
				executeFighterIntervention(human);
			} else if (e.code === "BracketLeft") {
				const len = human.supporters.length;
				if (len > 0) {
					human.selectedSupporterIndex =
						(human.selectedSupporterIndex - 1 + len) % len;
					soundEngine.playChessSelect();
				}
			} else if (e.code === "BracketRight") {
				const len = human.supporters.length;
				if (len > 0) {
					human.selectedSupporterIndex =
						(human.selectedSupporterIndex + 1) % len;
					soundEngine.playChessSelect();
				}
			} else if (
				e.code === "KeyW" ||
				e.code === "ArrowUp" ||
				e.code === "Space"
			) {
				triggerFighterJump(human);
			} else if (e.code === "KeyS" || e.code === "ArrowDown") {
				if (!e.repeat && human.action !== "block") {
					human.lastBlockPressTime = performance.now();
				}
				human.action = "block";
				human.vx = 0;
			} else if (
				e.code === "ShiftLeft" ||
				e.code === "ShiftRight" ||
				e.code === "KeyL"
			) {
				const forward =
					sim.keysHeld.KeyA || sim.keysHeld.ArrowLeft
						? human.facing === -1
						: sim.keysHeld.KeyD || sim.keysHeld.ArrowRight
							? human.facing === 1
							: true;
				triggerFighterDash(human, forward);
			}
		};

		const onKeyUp = (e: KeyboardEvent) => {
			sim.keysHeld[e.code] = false;
			if (sim.phase !== "FIGHT_ACTIVE") return;
			const atk = sim.attackerRuntime;
			const def = sim.defenderRuntime;
			if (!atk || !def) return;
			const human = !atk.isAI ? atk : !def.isAI ? def : atk;

			if (e.code === "KeyS" || e.code === "ArrowDown") {
				if (human.action === "block") {
					human.action = "idle";
				}
			}
		};

		window.addEventListener("keydown", onKeyDown);
		window.addEventListener("keyup", onKeyUp);

		const onResize = () => {
			if (!container) return;
			const w = container.clientWidth;
			const h = container.clientHeight;
			camera.aspect = w / h;
			camera.updateProjectionMatrix();
			renderer.setSize(w, h);
			if (composer) composer.setSize(w, h);
			if (bloomPass) bloomPass.resolution.set(w, h);
			if (battleWornPass)
				battleWornPass.uniforms.uAspect.value = w / Math.max(1, h);
		};
		window.addEventListener("resize", onResize);

		const checkFighterActionVFX = (
			f: FighterRuntime,
			prevAction: FighterAction,
		) => {
			if (f.action === prevAction) return;
			const worldX = sim.duelCenterWorld.x + f.x * 0.72;
			const worldY = sim.duelCenterWorld.y + 0.85 + f.y * 0.72;
			const worldZ = sim.duelCenterWorld.z;
			const colorHex = f.piece.faction === "w" ? 0x38bdf8 : 0xf43f5e;

			if (f.action.startsWith("light")) {
				spawnSlashArc(
					vfxPool,
					worldX,
					worldY,
					worldZ,
					f.facing,
					colorHex,
					"horizontal",
				);
			} else if (f.action.startsWith("heavy")) {
				spawnSlashArc(
					vfxPool,
					worldX,
					worldY + 0.15,
					worldZ,
					f.facing,
					0xf59e0b,
					"overhead",
				);
			} else if (f.action === "combo_finisher") {
				spawnSlashArc(
					vfxPool,
					worldX,
					worldY,
					worldZ,
					f.facing,
					0xfef08a,
					"cyclone",
				);
			} else if (f.action === "special") {
				spawnAuraPillar(vfxPool, worldX, worldZ, 0xf59e0b);
				spawnSlashArc(
					vfxPool,
					worldX,
					worldY,
					worldZ,
					f.facing,
					0xf59e0b,
					"cyclone",
				);
			} else if (f.action === "parry_flash") {
				spawnAuraPillar(vfxPool, worldX, worldZ, 0xfef08a);
			}
		};

		// Master Animation Loop
		const clock = new THREE.Clock();
		let animFrameId = 0;
		let hudSyncAccumulator = 0;
		let battleWornIntensity = 0;
		let battleWornPulse = 0;
		let battleSmokeTimer = 0;
		let prevCombatCamMode = sim.combatCameraMode;

		const animate = () => {
			animFrameId = requestAnimationFrame(animate);
			const rawDelta = Math.min(clock.getDelta(), 0.05);
			const elapsed = clock.getElapsedTime();
			const nowMs = performance.now();

			// Rotate & project the 4D Tesseract (8-cell Hypercube) in the sky!
			update4DTesseractProjection(
				arenaRig,
				elapsed,
				sim.activeSliceW,
				sim.activeSliceZ,
			);

			// Spin any active 4D Unseen Threat Sigils on the board
			arenaRig.threatSigilMeshes.forEach((sigil) => {
				if (sigil.visible) {
					sigil.rotation.z += rawDelta * 2.2;
				}
			});

			// Drift ambient sanctuary embers upward gently
			const emberPos = arenaRig.ambientParticles.geometry.attributes
				.position as THREE.BufferAttribute;
			for (let i = 0; i < emberPos.count; i++) {
				let py = emberPos.getY(i) + rawDelta * (0.35 + (i % 3) * 0.18);
				if (py > 6.5) py = 0.1;
				emberPos.setY(i, py);
			}
			emberPos.needsUpdate = true;

			updateVFXPool(vfxPool, rawDelta);

			// Update Phase Machine
			if (sim.phase === "ACADEMIC_SIMULATOR" && sim.academicColloquium) {
				// ============================================================================
				// STANDALONE UNIVERSITY OF GREATER ANDROMEDA — 5-ROOM 3D CAMPUS & HUMAN RIGS
				// The chess game is GONE: hide the chessboard, pocket watch, realms, AND all 32 armored chess rigs!
				// ============================================================================
				const col = sim.academicColloquium;
				const shatterSec = col.realityShatterProgressSec ?? 0;

				arenaRig.group.visible = false;
				pocketWatchRig.rootGroup.visible =
					col.stage === "REALITY_SHATTER_TRANSITION" && shatterSec > 2.5;
				realmsRig.rootGroup.visible = false;
				realmsRig.boardGatewaysGroup.visible = false;
				temporalEchoMesh.visible = false;
				if (sim.firstPersonRig) {
					sim.firstPersonRig.root.visible = false;
				}
				// Hide all 32 armored chess piece rigs during the University Simulator — human academic rigs are used instead!
				for (const r of sim.pieceRigs.values()) {
					r.root.visible = false;
				}
				universityOfficeRig.rootGroup.visible = true;

				keyLight.intensity = THREE.MathUtils.damp(
					keyLight.intensity,
					0.25,
					8,
					rawDelta,
				);
				hemiLight.intensity = THREE.MathUtils.damp(
					hemiLight.intensity,
					0.32,
					8,
					rawDelta,
				);
				rimLight.intensity = THREE.MathUtils.damp(
					rimLight.intensity,
					0.38,
					8,
					rawDelta,
				);
				warmFill.intensity = THREE.MathUtils.damp(
					warmFill.intensity,
					0.16,
					8,
					rawDelta,
				);

				let playerIsMoving = false;
				const up = sim.uniPlayer;

				// 1. REAL-TIME WASD / ARROW-KEY / CLICK NAVIGATION & CONTINUOUS UNIVERSITY CLOCK
				// Drawers never freeze the body — only fullscreen story stages do.
				if (col.stage === "UNIVERSITY_SIMULATOR") {
					col.timeOfDayMinutes = Math.min(
						22 * 60 + 30,
						col.timeOfDayMinutes + rawDelta * 1.6,
					);
					syncAppointmentsWithClock(col, false);

					// Embodied tram ride — lerp across the city; clock accrues during the trip.
					if (sim.uniTransit?.isRiding && sim.uniTransit.destinationStationId) {
						const st = TRAM_STATIONS.find(
							(s) => s.id === sim.uniTransit.destinationStationId,
						);
						if (st) {
							const dur = Math.max(4, sim.uniTransit.rideDurationSec || 12);
							const prevT = sim.uniTransit.transitTimer;
							sim.uniTransit.transitTimer = Math.min(dur, prevT + rawDelta);
							const t = sim.uniTransit.transitTimer / dur;
							const destX =
								st.x + Math.sin(st.platformAngle + Math.PI / 2) * 2.8;
							const destZ =
								st.z + Math.cos(st.platformAngle + Math.PI / 2) * 2.8;
							up.worldX = THREE.MathUtils.lerp(
								sim.uniTransit.startX,
								destX,
								t,
							);
							up.worldZ = THREE.MathUtils.lerp(
								sim.uniTransit.startZ,
								destZ,
								t,
							);
							up.yaw = Math.atan2(destX - sim.uniTransit.startX, destZ - sim.uniTransit.startZ);
							up.targetX = null;
							up.targetZ = null;
							col.isRidingTram = true;
							col.timeOfDayMinutes = Math.min(
								22 * 60 + 30,
								col.timeOfDayMinutes + rawDelta * 5.5,
							);
							syncAppointmentsWithClock(col, false);
							playerIsMoving = true;

							if (sim.uniTransit.transitTimer >= dur) {
								sim.uniTransit.isRiding = false;
								sim.uniTransit.destinationStationId = null;
								sim.uniTransit.transitTimer = 0;
								col.isRidingTram = false;
								up.worldX = destX;
								up.worldZ = destZ;
								col.energyLevel = Math.min(100, col.energyLevel + 6);
								if (st.id === "PEANO_QUAD") {
									col.currentRoom = "CAMPUS_QUAD";
								} else if (st.id === "DOWNTOWN_PERSEUS") {
									col.currentRoom = "DRY_CLEANER";
								} else if (st.id === "KEPLER_SUBURBS") {
									col.currentRoom = "CITY_STREETS";
									if (
										col.tobyCroissantPurchased &&
										(col.domesticArcStage === "CROISSANT_BOUGHT" ||
											col.domesticArcStage === "ANNIVERSARY_WALK")
									) {
										col.domesticArcStage = "ANNIVERSARY_WALK";
										up.targetX = UNIVERSITY_ROOM_CENTERS.PAWN_HOUSE.x;
										up.targetZ = UNIVERSITY_ROOM_CENTERS.PAWN_HOUSE.z;
									}
								} else {
									col.currentRoom = "CAMPUS_QUAD";
								}
								col.colloquiumLog = [
									`🚈 [${formatSimClock(col.timeOfDayMinutes)}] Arrived ${st.name}. Walk the last block on foot.`,
									...col.colloquiumLog.slice(0, 9),
								];
								hudSyncAccumulator = 1.0;
							}
						} else {
							sim.uniTransit.isRiding = false;
							col.isRidingTram = false;
						}
					}

					// Step Live Cafeteria Coffee Queue (Finite Cashier Service Rate!)
					if (
						col.cafeteriaQueuePosition !== null &&
						col.currentRoom === "CAFETERIA"
					) {
						const targetQueueX = 11.4 - col.cafeteriaQueuePosition * 1.25;
						const targetQueueZ = -3.2;
						up.worldX = THREE.MathUtils.damp(
							up.worldX,
							targetQueueX,
							8,
							rawDelta,
						);
						up.worldZ = THREE.MathUtils.damp(
							up.worldZ,
							targetQueueZ,
							8,
							rawDelta,
						);
						up.yaw = Math.PI;

						col.cafeteriaServiceProgress += rawDelta * 36; // ~2.8 real seconds per patron
						col.timeOfDayMinutes += rawDelta * 1.4;
						syncAppointmentsWithClock(col, false);

						if (col.cafeteriaServiceProgress >= 100) {
							col.cafeteriaServiceProgress = 0;
							if (col.cafeteriaQueuePosition > 0) {
								col.cafeteriaQueuePosition -= 1;
								soundEngine.playOfficeKeyboardClack();
								if (col.cafeteriaQueuePosition === 0) {
									col.colloquiumLog = [
										`☕ [${formatSimClock(col.timeOfDayMinutes)}] You reached the front of the Lagrange Point Cafeteria queue. The cashier is pouring your 12oz filter coffee ($4.50)...`,
										...col.colloquiumLog.slice(0, 9),
									];
								}
								hudSyncAccumulator = 1.0;
							} else {
								// Cashier finishes serving Dr. Pawn!
								col.cafeteriaQueuePosition = null;
								if (col.checkingBalance >= 4.5) {
									recordPersonalTransaction(
										col,
										"Lagrange Point Cafeteria — 12oz Hot Filter Coffee",
										"CAFETERIA",
										-4.5,
									);
									col.carryingHotCoffee = true;
									col.energyLevel = Math.min(100, col.energyLevel + 18);
									soundEngine.playSynodResonance(false);
									col.colloquiumLog = [
										`☕ [${formatSimClock(col.timeOfDayMinutes)}] Paid $4.50 for a piping-hot cup of filter coffee! Watch out for the distracted student pacing near the cafeteria doorway...`,
										...col.colloquiumLog.slice(0, 9),
									];
								} else {
									soundEngine.playRejectionStamp();
									col.colloquiumLog = [
										`💳 [${formatSimClock(col.timeOfDayMinutes)}] Card declined at the Cafeteria register! You don't even have $4.50 in Personal Checking.`,
										...col.colloquiumLog.slice(0, 9),
									];
								}
								hudSyncAccumulator = 1.0;
							}
						}
					} else {
						if (sim.uniCar.isDriving) {
							// 1a. DRIVING DR. PAWN'S 1984 STATION WAGON ACROSS OPEN-WORLD CITY ROADS
							let throttle = 0;
							let steer = 0;
							if (sim.keysHeld.KeyW || sim.keysHeld.ArrowUp) throttle += 1;
							if (sim.keysHeld.KeyS || sim.keysHeld.ArrowDown) throttle -= 1;
							if (sim.keysHeld.KeyA || sim.keysHeld.ArrowLeft) steer += 1;
							if (sim.keysHeld.KeyD || sim.keysHeld.ArrowRight) steer -= 1;

							const maxSpeed = 22.0; // ~49 mph
							if (throttle > 0) {
								sim.uniCar.speed = THREE.MathUtils.damp(
									sim.uniCar.speed,
									maxSpeed,
									2.8,
									rawDelta,
								);
							} else if (throttle < 0) {
								sim.uniCar.speed = THREE.MathUtils.damp(
									sim.uniCar.speed,
									-7.5,
									4.0,
									rawDelta,
								);
							} else {
								sim.uniCar.speed = THREE.MathUtils.damp(
									sim.uniCar.speed,
									0,
									1.8,
									rawDelta,
								);
							}

							if (Math.abs(sim.uniCar.speed) > 0.3) {
								const turnFactor = (sim.uniCar.speed >= 0 ? 1 : -1) * 2.2;
								sim.uniCar.yaw += steer * turnFactor * rawDelta;
							}

							sim.uniCar.worldX +=
								Math.sin(sim.uniCar.yaw) * sim.uniCar.speed * rawDelta;
							sim.uniCar.worldZ +=
								Math.cos(sim.uniCar.yaw) * sim.uniCar.speed * rawDelta;

							sim.uniCar.worldX = THREE.MathUtils.clamp(
								sim.uniCar.worldX,
								-92,
								92,
							);
							sim.uniCar.worldZ = THREE.MathUtils.clamp(
								sim.uniCar.worldZ,
								-36,
								86,
							);

							up.worldX = sim.uniCar.worldX;
							up.worldZ = sim.uniCar.worldZ;
							up.yaw = sim.uniCar.yaw;
							col.carSpeedMph = Math.abs(sim.uniCar.speed) * 2.23694;
							col.carWorldX = sim.uniCar.worldX;
							col.carWorldZ = sim.uniCar.worldZ;
							col.carYaw = sim.uniCar.yaw;
							playerIsMoving = Math.abs(sim.uniCar.speed) > 0.5;

							const detectedRoom = getRoomAtWorldPos(
								sim.uniCar.worldX,
								sim.uniCar.worldZ,
							);
							if (detectedRoom !== col.currentRoom) {
								const prevRoom = col.currentRoom;
								col.currentRoom = detectedRoom;
								hudSyncAccumulator = 1.0;
								if (
									detectedRoom === "PAWN_HOUSE" &&
									prevRoom !== "PAWN_HOUSE" &&
									tryResolveAnniversaryCollapse(col, {
										arrivedAtHouse: true,
									})
								) {
									sim.uniCar.isDriving = false;
									sim.uniCar.speed = 0;
									col.isDrivingCar = false;
									col.carSpeedMph = 0;
								}
							}
						} else if (!sim.uniTransit?.isRiding && !col.isRidingTram) {
							// 1b. WALKING ON FOOT (Camera-Relative WASD / Arrow Keys or Click Steering)
							let inputFwd = 0;
							let inputRight = 0;
							if (sim.keysHeld.KeyW || sim.keysHeld.ArrowUp) inputFwd += 1;
							if (sim.keysHeld.KeyS || sim.keysHeld.ArrowDown) inputFwd -= 1;
							if (sim.keysHeld.KeyA || sim.keysHeld.ArrowLeft) inputRight -= 1;
							if (sim.keysHeld.KeyD || sim.keysHeld.ArrowRight) inputRight += 1;

							let moveX = 0;
							let moveZ = 0;
							if (Math.hypot(inputFwd, inputRight) > 0.05) {
								up.targetX = null;
								up.targetZ = null;
								clearPendingUniInteract(up);
								// Transform WASD relative to current mouse-look camera yaw!
								const camYaw = sim.mouseLook.uniCamYaw;
								const fwdX = -Math.sin(camYaw);
								const fwdZ = -Math.cos(camYaw);
								const rightX = Math.cos(camYaw);
								const rightZ = -Math.sin(camYaw);
								moveX = inputFwd * fwdX + inputRight * rightX;
								moveZ = inputFwd * fwdZ + inputRight * rightZ;
							} else if (up.targetX !== null && up.targetZ !== null) {
								const dx = up.targetX - up.worldX;
								const dz = up.targetZ - up.worldZ;
								const dist = Math.hypot(dx, dz);
								if (dist > 0.35) {
									moveX = dx / dist;
									moveZ = dz / dist;
								} else {
									up.targetX = null;
									up.targetZ = null;
									tryResolvePendingUniInteract();
								}
							} else {
								tryResolvePendingUniInteract();
							}

							const len = Math.hypot(moveX, moveZ);
							if (len > 0.01) {
								playerIsMoving = true;
								moveX /= len;
								moveZ /= len;
								const walkSpeed = 5.4;
								up.worldX = THREE.MathUtils.clamp(
									up.worldX + moveX * walkSpeed * rawDelta,
									-92,
									92,
								);
								up.worldZ = THREE.MathUtils.clamp(
									up.worldZ + moveZ * walkSpeed * rawDelta,
									-36,
									86,
								);
								up.yaw = Math.atan2(moveX, moveZ);

								const detectedRoom = getRoomAtWorldPos(up.worldX, up.worldZ);
								if (detectedRoom !== col.currentRoom) {
									const prevRoom = col.currentRoom;
									col.currentRoom = detectedRoom;
									hudSyncAccumulator = 1.0;
									if (
										detectedRoom === "PAWN_HOUSE" &&
										prevRoom !== "PAWN_HOUSE"
									) {
										tryResolveAnniversaryCollapse(col, {
											arrivedAtHouse: true,
										});
									}
								}

								// Check physical collision with the distracted undergraduate student pacing near the Cafeteria doorway!
								if (
									col.carryingHotCoffee &&
									!col.coffeeSpillIncidentTriggered &&
									universityOfficeRig.distractedStudentRig
								) {
									const stuPos =
										universityOfficeRig.distractedStudentRig.root.position;
									const distToStudent = Math.hypot(
										up.worldX - stuPos.x,
										up.worldZ - stuPos.z,
									);
									if (distToStudent < 2.25) {
										triggerCafeteriaCollisionSpill(col, sim);
										hudSyncAccumulator = 1.0;
									}
								}
							} else if (sim.mouseLook.uniFirstPerson) {
								// In 1st-Person Researcher POV, turn Dr. Pawn's body to match the mouse-look direction!
								up.yaw = Math.PI + sim.mouseLook.uniCamYaw;
							}
						}
					}
				} else if (col.stage === "REALITY_SHATTER_TRANSITION") {
					// 2. MULTI-STAGE 3D REALITY SHATTER SEQUENCE (University Fractures -> Cosmic Chessboard Reawakens)
					col.realityShatterProgressSec =
						(col.realityShatterProgressSec ?? 0) + rawDelta;
					const curShatter = col.realityShatterProgressSec;
					sim.cameraShake = Math.max(
						sim.cameraShake,
						Math.min(0.38, curShatter * 0.08),
					);

					if (Math.random() < rawDelta * 20) {
						spawnHitSparks(
							vfxPool,
							up.worldX + (Math.random() - 0.5) * 9.5,
							1.2 + Math.random() * 3.2,
							up.worldZ + (Math.random() - 0.5) * 6.5,
							curShatter > 2.2 ? 0x38bdf8 : 0xfbbf24,
							14,
						);
					}

					if (curShatter > 2.5 && pocketWatchRig.rootGroup.visible) {
						pocketWatchRig.rootGroup.position.set(
							up.worldX,
							11.5 - Math.min(4.0, (curShatter - 2.5) * 1.6),
							up.worldZ - 9.0,
						);
						updateMultiversalPocketWatch(
							pocketWatchRig,
							sim.multiverse,
							elapsed,
							rawDelta,
							false,
							false,
						);
					}

					hudSyncAccumulator = 1.0;
					if (curShatter >= 5.2) {
						pocketWatchRig.rootGroup.position.set(0, 0, 0);
						handleConcludePublicationAndRestorePieces();
					}
				}

				updateUniversityOfficeScene(universityOfficeRig, elapsed, rawDelta, {
					year: col.academicYear,
					semesterLabel: col.semester,
					dayIndex: col.dayIndex,
					dayName: DAY_NAMES_LIST[col.dayIndex % 5] || "Tuesday",
					timeOfDayMinutes: col.timeOfDayMinutes,
					timeFormatted: formatSimClock(col.timeOfDayMinutes),
					playerWorldX: up.worldX,
					playerWorldZ: up.worldZ,
					playerYaw: up.yaw,
					playerIsMoving,
					carWorldX: sim.uniCar.worldX,
					carWorldZ: sim.uniCar.worldZ,
					carYaw: sim.uniCar.yaw,
					carSpeed: sim.uniCar.speed,
					isDrivingCar: sim.uniCar.isDriving,
					homeSpareShirts: col.hasSpareCleanShirtAtHome ? 1 : 0,
					weeklyMortgagePayment: col.monthlyMortgage ?? 2140,
					shirtState: col.shirtState,
					carryingHotCoffee: col.carryingHotCoffee,
					cafeteriaQueuePosition: col.cafeteriaQueuePosition,
					cafeteriaServiceProgress: col.cafeteriaServiceProgress,
					activeDryCleaningTicket: col.activeDryCleaningTicket,
					lemmaIntegrity: col.centralLemmaIntegrity,
					boundaryGaugeVerified: col.proofWorkbench.boundaryGaugeVerified,
					jacobianSignFlipped: col.proofWorkbench.jacobianSignFlipped,
					chiralLabDataAttached: col.proofWorkbench.chiralLabDataAttached,
					journalRejections: col.journalRejections,
					hIndex: col.hIndex,
					personalBalance: col.checkingBalance,
					departmentalBalance: col.departmentalBudget,
					equipmentSold: col.equipmentSoldForFee,
					publishedAccepted: Boolean(col.publishedDoi),
					realityShatterProgressSec: col.realityShatterProgressSec ?? 0,
					isRidingTram: col.isRidingTram,
					tramDestinationStationId: col.tramDestinationStationId,
					livingInOffice4B: col.livingInOffice4B,
					hermitianBoundaryBalanced:
						col.proofWorkbench.hermitianBoundaryBalanced,
					chshS: col.proofWorkbench.chshS,
					monogamyLemmaAnnotated: col.proofWorkbench.monogamyLemmaAnnotated,
				});

				// Hide Dr. Pawn's head mesh in First-Person POV so spectacles/hair never clip the camera lens, and keep Dr. Pawn's self-label hidden!
				const ml = sim.mouseLook;
				universityOfficeRig.drPawnRig.headGroup.visible = !ml.uniFirstPerson;
				universityOfficeRig.drPawnRig.labelSprite.visible = false;

				// Sync React HUD periodically so the live clock, queue progress, and shatter sequence stay responsive
				hudSyncAccumulator += rawDelta;
				if (hudSyncAccumulator >= 0.25) {
					hudSyncAccumulator = 0;
					setAcademicColloquium({ ...col });
				}

				// Smooth 360° Mouse-Look Camera (Supports both 1st-Person Researcher Eye-Level POV & 3rd-Person Orbit + Scroll Zoom!)
				const shakeX =
					sim.cameraShake > 0.01
						? (Math.random() - 0.5) * sim.cameraShake * 0.35
						: 0;
				const shakeY =
					sim.cameraShake > 0.01
						? (Math.random() - 0.5) * sim.cameraShake * 0.35
						: 0;
				sim.cameraShake = Math.max(0, sim.cameraShake - rawDelta * 1.8);

				if (ml.uniFirstPerson && col.stage !== "REALITY_SHATTER_TRANSITION") {
					const walkBob = playerIsMoving
						? Math.sin(elapsed * 11) * 0.028
						: Math.sin(elapsed * 2.2) * 0.006;
					const eyeY = 1.62 + walkBob + shakeY;
					_camTargetPos.set(up.worldX + shakeX, eyeY, up.worldZ);
					const lookDist = 6.0;
					const horizLook = Math.cos(ml.uniCamPitch) * lookDist;
					_camLookTarget.set(
						up.worldX - Math.sin(ml.uniCamYaw) * horizLook,
						eyeY - Math.sin(ml.uniCamPitch) * lookDist,
						up.worldZ - Math.cos(ml.uniCamYaw) * horizLook,
					);
					camera.position.lerp(_camTargetPos, 1 - Math.exp(-22 * rawDelta));
					sim.currentLookAt.lerp(_camLookTarget, 1 - Math.exp(-26 * rawDelta));
				} else {
					const dist = ml.uniCamDistance;
					const pitch = THREE.MathUtils.clamp(ml.uniCamPitch, -0.25, 1.22);
					const horizDist = Math.cos(pitch) * dist;
					const camHeight = Math.max(0.55, 1.38 + Math.sin(pitch) * dist);
					_camTargetPos.set(
						up.worldX + Math.sin(ml.uniCamYaw) * horizDist + shakeX,
						camHeight + shakeY,
						up.worldZ + Math.cos(ml.uniCamYaw) * horizDist,
					);
					_camLookTarget.set(
						up.worldX - Math.sin(ml.uniCamYaw) * 0.85,
						1.35 +
							(col.stage === "REALITY_SHATTER_TRANSITION"
								? Math.min(1.8, shatterSec * 0.35)
								: 0),
						up.worldZ - Math.cos(ml.uniCamYaw) * 0.85,
					);
					camera.position.lerp(_camTargetPos, 1 - Math.exp(-12 * rawDelta));
					sim.currentLookAt.lerp(_camLookTarget, 1 - Math.exp(-15 * rawDelta));
				}

				camera.lookAt(sim.currentLookAt);
				camera.fov = THREE.MathUtils.damp(
					camera.fov,
					col.stage === "REALITY_SHATTER_TRANSITION"
						? 54
						: ml.uniFirstPerson
							? 58
							: 46,
					10,
					rawDelta,
				);
				camera.updateProjectionMatrix();
			} else if (sim.phase === "CHESS_VIEW") {
				universityOfficeRig.rootGroup.visible = false;
				arenaRig.group.visible = true;
				pocketWatchRig.rootGroup.visible = true;
				realmsRig.rootGroup.visible = true;
				realmsRig.boardGatewaysGroup.visible = true;
				temporalEchoMesh.visible = false;
				arenaRig.tesseractLines.visible = true;
				arenaRig.quantumLatticeGroup.visible = true;
				if (sim.firstPersonRig) {
					sim.firstPersonRig.root.visible = false;
				}
				for (const r of sim.pieceRigs.values()) {
					r.hpRingMesh.visible = true;
				}

				// Restore camera FOV & level horizon when back on the Chessboard
				if (Math.abs(camera.fov - 45) > 0.05) {
					camera.fov = THREE.MathUtils.damp(camera.fov, 45, 8, rawDelta);
					camera.updateProjectionMatrix();
				}
				sim.currentDutchRoll = THREE.MathUtils.damp(
					sim.currentDutchRoll,
					0,
					10,
					rawDelta,
				);

				const isQuantumManifold =
					sim.activeSliceW !== 0 || sim.activeSliceZ !== 0;

				// Distinct Visual Language between Classical Prime Sanctuary (W=0, Z=0) and Quantum 4D Manifold (W≠0 or Z≠0)
				scene.environmentIntensity = THREE.MathUtils.damp(
					scene.environmentIntensity ?? 0.65,
					isQuantumManifold ? 0.5 : 0.65,
					5,
					rawDelta,
				);
				if (scene.fog instanceof THREE.FogExp2) {
					scene.fog.density = THREE.MathUtils.damp(
						scene.fog.density,
						isQuantumManifold ? 0.028 : 0.022,
						5,
						rawDelta,
					);
				}

				const targetKey = isQuantumManifold ? 1.15 : 1.65;
				keyLight.intensity = THREE.MathUtils.damp(
					keyLight.intensity,
					targetKey,
					5,
					rawDelta,
				);
				hemiLight.intensity = THREE.MathUtils.damp(
					hemiLight.intensity,
					isQuantumManifold ? 0.62 : 0.48,
					5,
					rawDelta,
				);
				rimLight.intensity = THREE.MathUtils.damp(
					rimLight.intensity,
					isQuantumManifold ? 1.55 : 0.95,
					5,
					rawDelta,
				);
				warmFill.color.setHex(
					sim.activeSliceW > 0
						? 0x38bdf8
						: sim.activeSliceW < 0
							? 0xc084fc
							: sim.activeSliceZ > 0
								? 0x34d399
								: 0xf59e0b,
				);
				warmFill.intensity = THREE.MathUtils.damp(
					warmFill.intensity,
					isQuantumManifold ? 1.45 : 0.85,
					5,
					rawDelta,
				);

				arenaRig.spotAttacker.intensity = THREE.MathUtils.damp(
					arenaRig.spotAttacker.intensity,
					0,
					8,
					rawDelta,
				);
				arenaRig.spotDefender.intensity = THREE.MathUtils.damp(
					arenaRig.spotDefender.intensity,
					0,
					8,
					rawDelta,
				);
				arenaRig.clashPointLight.intensity = THREE.MathUtils.damp(
					arenaRig.clashPointLight.intensity,
					0,
					10,
					rawDelta,
				);
				(
					arenaRig.volumetricConeAttacker.material as THREE.MeshBasicMaterial
				).opacity = THREE.MathUtils.damp(
					(arenaRig.volumetricConeAttacker.material as THREE.MeshBasicMaterial)
						.opacity,
					0,
					8,
					rawDelta,
				);
				(
					arenaRig.volumetricConeDefender.material as THREE.MeshBasicMaterial
				).opacity = THREE.MathUtils.damp(
					(arenaRig.volumetricConeDefender.material as THREE.MeshBasicMaterial)
						.opacity,
					0,
					8,
					rawDelta,
				);

				arenaRig.duelRingGroup.position.y = THREE.MathUtils.damp(
					arenaRig.duelRingGroup.position.y,
					-2.5,
					6,
					rawDelta,
				);
				(arenaRig.duelBarrierMesh.material as THREE.MeshBasicMaterial).opacity =
					THREE.MathUtils.damp(
						(arenaRig.duelBarrierMesh.material as THREE.MeshBasicMaterial)
							.opacity,
						0,
						8,
						rawDelta,
					);
				arenaRig.duelFloorScarMesh.visible = false;
				battleWornIntensity = THREE.MathUtils.damp(
					battleWornIntensity,
					0,
					8,
					rawDelta,
				);
				battleWornPulse = THREE.MathUtils.damp(
					battleWornPulse,
					0,
					10,
					rawDelta,
				);
				battleSmokeTimer += rawDelta;
				const shouldEmitBoardSmoke = battleSmokeTimer >= 0.14;
				if (shouldEmitBoardSmoke) battleSmokeTimer = 0;

				// Position & render all 32 pieces with Single-3D-Slice 4D Quantum Perception!
				for (const piece of sim.pieces) {
					const rig = sim.pieceRigs.get(piece.id);
					if (!rig) continue;
					rig.root.visible = true;

					const bys = sim.bystanders.get(piece.id);
					if (bys) {
						bys.offsetX = THREE.MathUtils.damp(bys.offsetX, 0, 8, rawDelta);
						bys.offsetZ = THREE.MathUtils.damp(bys.offsetZ, 0, 8, rawDelta);
						bys.y = THREE.MathUtils.damp(bys.y, 0, 10, rawDelta);
						bys.vx = 0;
						bys.vz = 0;
						bys.vy = 0;
						bys.panickedTimer = 0;
					}

					const isSameSlice =
						piece.w === sim.activeSliceW && piece.z === sim.activeSliceZ;
					const wDiff = piece.w - sim.activeSliceW;
					const zDiff = piece.z - sim.activeSliceZ;
					const theoremHover = piece.isSentientTheorem
						? 0.24 + Math.sin(elapsed * 4.2 + piece.col) * 0.07
						: 0;
					const elevation4D =
						(isSameSlice
							? 0
							: 0.36 * Math.abs(wDiff) + 0.55 * Math.abs(zDiff)) + theoremHover;

					boardToWorld(piece.row, piece.col, _vec3A);
					rig.root.position.x = THREE.MathUtils.damp(
						rig.root.position.x,
						_vec3A.x + wDiff * 0.14,
						10,
						rawDelta,
					);
					rig.root.position.y = THREE.MathUtils.damp(
						rig.root.position.y,
						elevation4D,
						10,
						rawDelta,
					);
					rig.root.position.z = THREE.MathUtils.damp(
						rig.root.position.z,
						_vec3A.z,
						10,
						rawDelta,
					);
					rig.root.scale.setScalar(
						THREE.MathUtils.damp(
							rig.root.scale.x,
							piece.isSentientTheorem ? 1.18 : isSameSlice ? 1.0 : 0.88,
							8,
							rawDelta,
						),
					);

					const isProfessorSession = Boolean(sim.academicColloquium?.active);
					if (rig.isProfessorModeActive !== isProfessorSession) {
						setPieceProfessorMode(rig, isProfessorSession, piece.faction);
					}

					// When Academic Peer Review is in session, all 32 Professors turn toward the Candidate Pawn Professor
					// to debate, peer-review, stroke their chins, and adjust their wire-rimmed glasses!
					let targetYaw = piece.faction === "w" ? Math.PI : 0;
					if (isProfessorSession && sim.academicColloquium) {
						const candPiece = sim.pieces.find(
							(p) => p.id === sim.academicColloquium?.candidatePieceId,
						);
						if (candPiece && candPiece.id !== piece.id) {
							boardToWorld(candPiece.row, candPiece.col, _camLookTarget);
							targetYaw = Math.atan2(
								_camLookTarget.x - _vec3A.x,
								_camLookTarget.z - _vec3A.z,
							);
						}
					}
					rig.root.rotation.y = THREE.MathUtils.damp(
						rig.root.rotation.y,
						targetYaw,
						8,
						rawDelta,
					);

					rig.surpriseGroup.visible = false;
					rig.statusShaderMesh.visible = false;
					rig.statusIndicatorGroup.visible = false;
					const showQuantumOrbits =
						piece.w !== 0 ||
						piece.z !== 0 ||
						!isSameSlice ||
						Boolean(piece.entangledWithId) ||
						Boolean(piece.isChronocrator) ||
						Boolean(piece.isSentientTheorem) ||
						Boolean(piece.synodStacks && piece.synodStacks > 0);
					rig.tesseractBadge.visible =
						piece.w !== 0 ||
						piece.z !== 0 ||
						!isSameSlice ||
						Boolean(piece.isChronocrator) ||
						Boolean(piece.isSentientTheorem) ||
						Boolean(piece.synodStacks && piece.synodStacks > 0);
					rig.quantumWaveGroup.visible = showQuantumOrbits;
					if (showQuantumOrbits) {
						const spinMult = piece.isSentientTheorem
							? 7.5
							: piece.isChronocrator
								? 4.5
								: 2.5;
						rig.tesseractBadge.rotation.y += rawDelta * spinMult;
						rig.tesseractBadge.rotation.x +=
							rawDelta * (piece.isSentientTheorem ? 4.2 : 1.8);
						rig.quantumWaveGroup.rotation.y +=
							rawDelta * (piece.isSentientTheorem ? 8.4 : 3.2);
						rig.quantumWaveGroup.rotation.z += rawDelta * 2.1;
					}

					const targetOpacity = isSameSlice ? 1.0 : 0.38;
					for (const mesh of rig.allStandardMeshes) {
						const mat = mesh.material as THREE.MeshStandardMaterial;
						if (Math.abs(mat.opacity - targetOpacity) > 0.01) {
							mat.transparent = targetOpacity < 0.99;
							mat.opacity = THREE.MathUtils.damp(
								mat.opacity,
								targetOpacity,
								10,
								rawDelta,
							);
							mat.needsUpdate = true;
						}
					}

					rig.bodyPivot.position.y = THREE.MathUtils.damp(
						rig.bodyPivot.position.y,
						0.18,
						10,
						rawDelta,
					);
					rig.bodyPivot.rotation.x = Math.sin(elapsed * 2.2 + piece.col) * 0.03;
					rig.bodyPivot.rotation.y = 0;
					rig.bodyPivot.rotation.z = 0;
					rig.pelvisGroup.position.y = rig.bodyPivot.position.y;
					rig.pelvisGroup.rotation.set(0, 0, 0);
					rig.leftLegPivot.rotation.set(0, 0, 0);
					rig.rightLegPivot.rotation.set(0, 0, 0);
					const isSelected = piece.id === sim.selectedPieceId;
					const boardScanYaw =
						Math.sin(elapsed * 0.9 + piece.row * 1.7 + piece.col * 2.3) * 0.14;
					rig.headGroup.rotation.set(
						isProfessorSession
							? Math.sin(elapsed * 3.2 + piece.row * 1.3 + piece.col) * 0.09 // Academic nodding / scrutinizing manuscript!
							: isSelected
								? -0.05
								: 0,
						isSelected ? 0 : boardScanYaw * 0.45,
						isProfessorSession ? Math.cos(elapsed * 1.9 + piece.col) * 0.05 : 0,
					);
					const eyeScanX = isSelected ? 0 : boardScanYaw * 0.025;
					rig.leftPupilPivot.position.set(-eyeScanX, 0, 0.006);
					rig.rightPupilPivot.position.set(eyeScanX, 0, 0.006);
					rig.leftPupilPivot.scale.setScalar(isSelected ? 1.2 : 1.0);
					rig.rightPupilPivot.scale.setScalar(isSelected ? 1.2 : 1.0);
					rig.leftUpperLid.position.y = isSelected ? 0.009 : 0.0125;
					rig.rightUpperLid.position.y = isSelected ? 0.009 : 0.0125;

					if (isProfessorSession) {
						// Academic Colloquium Pose: Chin-stroking / adjusting wire-rimmed spectacles & gesturing with suede-patched elbows!
						const debateGesture =
							Math.sin(elapsed * 3.6 + piece.col * 1.7 + piece.row) * 0.18;
						rig.rightArmPivot.rotation.set(-0.62 + debateGesture, 0, -0.18);
						rig.rightElbowPivot.rotation.set(-1.12 - debateGesture * 0.5, 0, 0);
						rig.leftArmPivot.rotation.set(-0.32 - debateGesture * 0.4, 0, 0.14);
						rig.leftElbowPivot.rotation.set(-0.78, 0, 0);
					} else {
						rig.rightArmPivot.rotation.set(-0.14, 0, -0.05);
						rig.rightElbowPivot.rotation.set(-0.28, 0, 0);
						rig.leftArmPivot.rotation.set(-0.1, 0, 0.05);
						rig.leftElbowPivot.rotation.set(-0.25, 0, 0);
					}
					rig.capePivot.rotation.x =
						0.14 + Math.sin(elapsed * 2.5 + piece.row) * 0.04;

					if (piece.type === "q") {
						rig.specialOrbitGroup.rotation.x = 0;
						rig.specialOrbitGroup.rotation.y += rawDelta * 1.6;
						rig.specialOrbitGroup.scale.setScalar(1.0);
					}

					const boardHpRatio = piece.hp / Math.max(1, piece.maxHp);
					const ringMat = rig.hpRingMesh.material as THREE.MeshBasicMaterial;
					ringMat.color.setHex(
						boardHpRatio > 0.65
							? piece.faction === "w"
								? 0xf59e0b
								: 0x38bdf8
							: boardHpRatio > 0.3
								? 0xf97316
								: 0xf43f5e,
					);
					ringMat.opacity = isSelected
						? 0.95
						: piece.hp < piece.maxHp
							? 0.72
							: 0.32;

					// Diegetic 3D Vitality on the Chessboard: Soul-Crown Halo, Beating Heart Core & Pauldron Sundering!
					const boardSpecialReady =
						piece.meter >= ARCHETYPES[piece.type].special.meterCost;
					rig.vitalityHaloMesh.visible =
						isSelected || piece.hp < piece.maxHp || boardSpecialReady;
					if (rig.vitalityHaloMesh.visible) {
						rig.vitalityHaloUniforms.uTime.value = elapsed;
						rig.vitalityHaloUniforms.uHpRatio.value = boardHpRatio;
						rig.vitalityHaloUniforms.uRecoverableRatio.value = boardHpRatio;
						rig.vitalityHaloUniforms.uGuardRatio.value = 1.0;
						rig.vitalityHaloUniforms.uSpecialReady.value = boardSpecialReady
							? 1.0
							: 0.0;
					}
					const boardHeartBeat =
						1.0 +
						0.22 *
							Math.abs(Math.sin(elapsed * (2.8 + (1 - boardHpRatio) * 7.5))) **
								3;
					rig.coreGem.scale.setScalar(boardHeartBeat);

					if (rig.pauldronMeshes.length >= 2) {
						const leftP = rig.pauldronMeshes[0];
						const rightP = rig.pauldronMeshes[1];
						leftP.visible = boardHpRatio >= 0.42;
						if (leftP.visible) {
							const dmgTilt =
								boardHpRatio < 0.65 ? (0.65 - boardHpRatio) * 1.1 : 0;
							leftP.rotation.z = (leftP.userData.baseRotZ ?? 0.35) + dmgTilt;
						}
						rightP.visible = boardHpRatio >= 0.22;
						if (rightP.visible) {
							const dmgTiltR =
								boardHpRatio < 0.48 ? (0.48 - boardHpRatio) * 1.2 : 0;
							rightP.rotation.z =
								(rightP.userData.baseRotZ ?? -0.35) - dmgTiltR;
						}
					}

					// Persistent Battle-Worn Armor Cracks, Flickering Emissive Scars & Smoke on surviving board pieces < 30% HP!
					if (boardHpRatio < 0.3 && piece.hp > 0) {
						const severity = Math.min(1, (0.3 - boardHpRatio) / 0.22 + 0.35);
						const flicker =
							0.55 +
							0.45 *
								Math.sin(elapsed * 28 + piece.col * 3) *
								Math.cos(elapsed * 17 + piece.row);
						rig.primaryArmorMat.emissiveIntensity = severity * flicker * 1.55;
						rig.primaryArmorMat.bumpScale = 0.04 * severity;
						if (shouldEmitBoardSmoke && isSameSlice) {
							spawnBattleSmoke(
								vfxPool,
								rig.root.position.x,
								rig.root.position.y + 0.65,
								rig.root.position.z,
								severity,
								piece.faction === "w" ? 0xf59e0b : 0xf43f5e,
							);
						}
					} else {
						rig.primaryArmorMat.emissiveIntensity = 0.0;
						rig.primaryArmorMat.bumpScale = 0.0;
					}
				}

				// Render 3D Double-Helix Quantum Entanglement Arcs between |Φ⁺⟩ Bell Pairs!
				arenaRig.entanglementHelixLines.visible = true;
				const entangledPairs: { a: THREE.Vector3; b: THREE.Vector3 }[] = [];
				const visitedIds = new Set<string>();
				for (const p of sim.pieces) {
					if (p.entangledWithId && !visitedIds.has(p.id)) {
						const partner = sim.pieces.find((x) => x.id === p.entangledWithId);
						if (partner) {
							visitedIds.add(p.id);
							visitedIds.add(partner.id);
							const rigA = sim.pieceRigs.get(p.id);
							const rigB = sim.pieceRigs.get(partner.id);
							if (rigA && rigB) {
								entangledPairs.push({
									a: rigA.root.position,
									b: rigB.root.position,
								});
							}
						}
					}
				}
				updateQuantumEntanglementBeams(arenaRig, entangledPairs, elapsed);

				// DIRECTOR'S AUTO-PLAY DEMO CHOREOGRAPHY (during CHESS_VIEW)
				if (sim.autoPlayDemo) {
					controls.autoRotate = true;
					controls.autoRotateSpeed = 1.35;
					sim.demoBoardTimer += rawDelta;

					// Step 1 (0.45s): Select the best showcase move & highlight its 4D trajectory + Tactical Support preview!
					if (!sim.demoPendingDecision && sim.demoBoardTimer >= 0.45) {
						// If 2 moves have passed without a capture duel, stage a dramatic clash on the board!
						if (sim.demoMovesWithoutCapture >= 2) {
							const friendly = sim.pieces.find(
								(p) => p.faction === sim.turnFaction && p.type !== "k",
							);
							const enemy = sim.pieces.find(
								(p) => p.faction !== sim.turnFaction && p.type !== "k",
							);
							if (friendly && enemy) {
								friendly.row = 4;
								friendly.col = 3;
								friendly.w = 0;
								enemy.row = 3;
								enemy.col = 3;
								enemy.w = 0;
							}
							sim.demoMovesWithoutCapture = 0;
						}

						const decision = chooseAIMove(sim.pieces, sim.turnFaction, true);
						if (decision) {
							sim.demoPendingDecision = decision;
							sim.selectedPieceId = decision.piece.id;
							sim.targetMoveW = decision.move.to.w;
							sim.targetMoveZ = decision.move.to.z;
							setTargetMoveW(decision.move.to.w);
							setTargetMoveZ(decision.move.to.z);

							// Shift viewed 4D slice if the move targets Ana (+W) or Kata (-W) so the Quantum Lattice lights up!
							if (
								decision.move.to.w !== sim.activeSliceW ||
								decision.move.to.z !== sim.activeSliceZ
							) {
								sim.activeSliceW = decision.move.to.w;
								sim.activeSliceZ = decision.move.to.z;
								setActiveSliceW(decision.move.to.w);
								setActiveSliceZ(decision.move.to.z);
							}

							sim.validMoves = getValidMovesForPiece(
								decision.piece,
								sim.pieces,
								decision.move.to.z,
								decision.move.to.w,
							);
							syncBoardHighlights();
							soundEngine.playChessSelect();

							if (decision.move.isCapture && decision.move.targetPiece) {
								setHoveredCaptureMove(decision.move);
								setDemoDirectorStage(
									`IMMINENT DUEL AT ${formatSquareName(decision.move.to)} · ${ARCHETYPES[decision.piece.type].chessName.toUpperCase()} VS ${ARCHETYPES[decision.move.targetPiece.type].chessName.toUpperCase()}`,
								);
							} else {
								setHoveredCaptureMove(null);
								setDemoDirectorStage(
									`4D MANIFOLD ADVANCE · ${ARCHETYPES[decision.piece.type].chessName.toUpperCase()} → ${formatSquareName(decision.move.to)} (${formatWName(decision.move.to.w)})`,
								);
							}
						}
					}

					// Step 2 (1.50s): Execute the highlighted move or launch the capture duel!
					if (sim.demoPendingDecision && sim.demoBoardTimer >= 1.5) {
						const { piece, move } = sim.demoPendingDecision;
						sim.demoPendingDecision = null;
						sim.demoBoardTimer = 0;
						if (move.isCapture) {
							sim.demoMovesWithoutCapture = 0;
						}
						executeChessMove(piece, move);
					}
				} else {
					controls.autoRotate = false;
				}

				controls.update();
			} else if (
				sim.phase === "TRANSITION_TO_FIGHT" ||
				sim.phase === "FIGHT_INTRO" ||
				sim.phase === "FIGHT_ACTIVE" ||
				sim.phase === "FIGHT_OUTRO"
			) {
				const atk = sim.attackerRuntime;
				const def = sim.defenderRuntime;

				if (atk && def) {
					arenaRig.tesseractLines.visible = false;
					arenaRig.entanglementHelixLines.visible = false;
					sim.phaseTimer += rawDelta;

					const baseStageY = sim.duelCenterWorld.y;
					const atkWorldX = sim.duelCenterWorld.x + atk.x * 0.72;
					const atkWorldY = baseStageY + atk.y * 0.72;
					const atkWorldZ = sim.duelCenterWorld.z;
					const atkEyeH = getWarriorEyeHeightWorld(atk.piece.type);

					const defWorldX = sim.duelCenterWorld.x + def.x * 0.72;
					const defWorldY = baseStageY + def.y * 0.72;
					const defWorldZ = sim.duelCenterWorld.z;
					const defEyeH = getWarriorEyeHeightWorld(def.piece.type);

					const midWorldX = (atkWorldX + defWorldX) * 0.5;
					const atkRig = sim.pieceRigs.get(atk.piece.id);
					const defRig = sim.pieceRigs.get(def.piece.id);

					if (sim.phase === "TRANSITION_TO_FIGHT" && sim.phaseTimer >= 0.55) {
						sim.phase = "FIGHT_INTRO";
						sim.phaseTimer = 0;
						sim.introShotIndex = 0;
						setIntroShotIndex(0);
						setPhase("FIGHT_INTRO");
						soundEngine.playWesternStandoffCut(0);
						// Snap Challenger into place & start at wide FOV (62°) directly in front of Challenger's eyes, then CRASH-ZOOM to 9.5° in 0.14s!
						if (atkRig) {
							atkRig.root.position.set(atkWorldX, atkWorldY, atkWorldZ);
							atkRig.root.scale.setScalar(1.42);
							atkRig.root.rotation.y = Math.PI / 2;
						}
						camera.position.set(
							atkWorldX + 1.48,
							atkWorldY + atkEyeH,
							atkWorldZ,
						);
						sim.currentLookAt.set(atkWorldX, atkWorldY + atkEyeH, atkWorldZ);
						camera.fov = 62; // Starts wide and immediately punches in via high-speed optical crash zoom!
						sim.currentDutchRoll = 0.04;
					} else if (sim.phase === "FIGHT_INTRO") {
						// 3-Shot Sergio Leone / Tarantino Optical Crash-Zoom Sequence:
						// Shot 0 (0.00s - 0.85s): Challenger Extreme Eye Crash-Zoom (62° -> 9.5° in 0.14s!)
						// Shot 1 (0.85s - 1.70s): Defender Extreme Eye Counter-Crash-Zoom (62° -> 9.5° in 0.14s!)
						// Shot 2 (1.70s - 2.25s): Snap-Zoom into First-Person Warrior Visor POV!
						const nextShot =
							sim.phaseTimer < 0.85 ? 0 : sim.phaseTimer < 1.7 ? 1 : 2;
						if (nextShot !== sim.introShotIndex) {
							sim.introShotIndex = nextShot;
							setIntroShotIndex(nextShot);
							soundEngine.playWesternStandoffCut(nextShot);
							if (nextShot === 1) {
								if (defRig) {
									defRig.root.position.set(defWorldX, defWorldY, defWorldZ);
									defRig.root.scale.setScalar(1.42);
									defRig.root.rotation.y = -Math.PI / 2;
								}
								camera.position.set(
									defWorldX - 1.48,
									defWorldY + defEyeH,
									defWorldZ,
								);
								sim.currentLookAt.set(
									defWorldX,
									defWorldY + defEyeH,
									defWorldZ,
								);
								camera.fov = 62; // Starts wide and immediately CRASH-ZOOMS into Defender's glaring eyes!
								sim.currentDutchRoll = -0.04;
							} else if (nextShot === 2) {
								const human = !atk.isAI ? atk : !def.isAI ? def : atk;
								const opp = human === atk ? def : atk;
								const hWorldX = sim.duelCenterWorld.x + human.x * 0.72;
								const hWorldY = baseStageY + human.y * 0.72;
								const hEyeH = getWarriorEyeHeightWorld(human.piece.type);
								const oWorldX = sim.duelCenterWorld.x + opp.x * 0.72;
								const oWorldY = baseStageY + opp.y * 0.72;
								const oEyeH = getWarriorEyeHeightWorld(opp.piece.type);

								camera.position.set(
									hWorldX,
									hWorldY + hEyeH,
									sim.duelCenterWorld.z,
								);
								sim.currentLookAt.set(
									oWorldX,
									oWorldY + oEyeH * 0.82,
									sim.duelCenterWorld.z,
								);
								camera.fov = 22; // Snap-zooms out into 56° First-Person Visor FOV!
								sim.currentDutchRoll = 0;
							}
						}
						if (sim.phaseTimer >= 2.25) {
							sim.phase = "FIGHT_ACTIVE";
							sim.phaseTimer = 0;
							sim.introShotIndex = -1;
							setIntroShotIndex(-1);
							setPhase("FIGHT_ACTIVE");
						}
					}

					// 1. HIGH-CONTRAST STAGE SPOTLIGHTING & QUANTUM TUNNELING FIELD:
					const isQuantumCombat =
						atk.wPhaseTimerMs > 0 ||
						def.wPhaseTimerMs > 0 ||
						atk.temporalEchoTimerMs > 0 ||
						def.temporalEchoTimerMs > 0;

					arenaRig.quantumLatticeGroup.visible = isQuantumCombat;
					if (isQuantumCombat) {
						update4DTesseractProjection(
							arenaRig,
							elapsed * 2.5,
							atk.wPhaseOffset || 1,
							0,
						);
					}

					scene.environmentIntensity = THREE.MathUtils.damp(
						scene.environmentIntensity ?? 0.65,
						0.38,
						8,
						rawDelta,
					);
					if (scene.fog instanceof THREE.FogExp2) {
						scene.fog.density = THREE.MathUtils.damp(
							scene.fog.density,
							0.034,
							6,
							rawDelta,
						);
					}

					keyLight.intensity = THREE.MathUtils.damp(
						keyLight.intensity,
						0.25,
						8,
						rawDelta,
					);
					hemiLight.intensity = THREE.MathUtils.damp(
						hemiLight.intensity,
						0.28,
						8,
						rawDelta,
					);
					rimLight.intensity = THREE.MathUtils.damp(
						rimLight.intensity,
						1.25,
						8,
						rawDelta,
					);
					warmFill.intensity = THREE.MathUtils.damp(
						warmFill.intensity,
						0.18,
						8,
						rawDelta,
					);

					// Position balanced, atmospheric overhead spotlights (toned down so highlights never blow out!)
					const isOutro = sim.phase === "FIGHT_OUTRO";
					const atkWonOutro =
						def.hp <= 0 ||
						(atk.hp > 0 && atk.hp / atk.maxHp >= def.hp / def.maxHp);

					arenaRig.spotAttacker.position.set(
						atkWorldX + 0.45,
						baseStageY + 6.8,
						atkWorldZ + 2.2,
					);
					arenaRig.spotAttacker.target.position.set(
						atkWorldX,
						atkWorldY + 0.95,
						atkWorldZ,
					);
					arenaRig.spotAttacker.intensity = THREE.MathUtils.damp(
						arenaRig.spotAttacker.intensity,
						isOutro ? (atkWonOutro ? 92.0 : 18.0) : 82.0,
						10,
						rawDelta,
					);

					arenaRig.spotDefender.position.set(
						defWorldX - 0.45,
						baseStageY + 6.8,
						defWorldZ + 2.2,
					);
					arenaRig.spotDefender.target.position.set(
						defWorldX,
						defWorldY + 0.95,
						defWorldZ,
					);
					arenaRig.spotDefender.intensity = THREE.MathUtils.damp(
						arenaRig.spotDefender.intensity,
						isOutro ? (!atkWonOutro ? 92.0 : 18.0) : 82.0,
						10,
						rawDelta,
					);

					// Subtle vertical overhead volumetric light shafts descending onto each fighter
					arenaRig.volumetricConeAttacker.position.set(
						atkWorldX,
						baseStageY + 3.2,
						atkWorldZ,
					);
					arenaRig.volumetricConeAttacker.rotation.set(0, 0, 0);
					(
						arenaRig.volumetricConeAttacker.material as THREE.MeshBasicMaterial
					).opacity = THREE.MathUtils.damp(
						(
							arenaRig.volumetricConeAttacker
								.material as THREE.MeshBasicMaterial
						).opacity,
						sim.phase === "FIGHT_INTRO"
							? 0.0
							: isOutro
								? atkWonOutro
									? 0.038
									: 0.0
								: 0.026,
						6,
						rawDelta,
					);

					arenaRig.volumetricConeDefender.position.set(
						defWorldX,
						baseStageY + 3.2,
						defWorldZ,
					);
					arenaRig.volumetricConeDefender.rotation.set(0, 0, 0);
					(
						arenaRig.volumetricConeDefender.material as THREE.MeshBasicMaterial
					).opacity = THREE.MathUtils.damp(
						(
							arenaRig.volumetricConeDefender
								.material as THREE.MeshBasicMaterial
						).opacity,
						sim.phase === "FIGHT_INTRO"
							? 0.0
							: isOutro
								? !atkWonOutro
									? 0.038
									: 0.0
								: 0.026,
						6,
						rawDelta,
					);

					// Balanced front-stage fill light illuminating both duelists without over-brightening
					arenaRig.clashPointLight.position.set(
						midWorldX,
						baseStageY + 2.15,
						sim.duelCenterWorld.z + 2.2,
					);
					arenaRig.clashPointLight.intensity = THREE.MathUtils.damp(
						arenaRig.clashPointLight.intensity,
						10.5,
						8,
						rawDelta,
					);

					arenaRig.duelRingGroup.position.x = sim.duelCenterWorld.x;
					arenaRig.duelRingGroup.position.z = sim.duelCenterWorld.z;
					arenaRig.duelRingGroup.position.y = THREE.MathUtils.damp(
						arenaRig.duelRingGroup.position.y,
						baseStageY,
						9,
						rawDelta,
					);
					(
						arenaRig.duelBarrierMesh.material as THREE.MeshBasicMaterial
					).opacity = THREE.MathUtils.damp(
						(arenaRig.duelBarrierMesh.material as THREE.MeshBasicMaterial)
							.opacity,
						0.04,
						5,
						rawDelta,
					);

					// Render Temporal Echo Hologram Clone if either fighter has bifurcated timelines!
					const echoOwner =
						atk.temporalEchoTimerMs > 0
							? atk
							: def.temporalEchoTimerMs > 0
								? def
								: null;
					if (echoOwner) {
						temporalEchoMesh.visible = true;
						temporalEchoMesh.position.set(
							sim.duelCenterWorld.x + echoOwner.temporalEchoX * 0.72,
							0.7,
							sim.duelCenterWorld.z,
						);
						temporalEchoMesh.rotation.y += rawDelta * 8;
					} else {
						temporalEchoMesh.visible = false;
					}

					// 2. COMEDIC BYSTANDER PIECES & FULL ARENA RING CLEARANCE:
					// Clear all non-fighting pieces outside the 4.6-unit Duel Ring perimeter AND out of the camera's front viewing corridor so ONLY the two fighters occupy the spotlighted stage!
					for (const piece of sim.pieces) {
						if (piece.id === atk.piece.id || piece.id === def.piece.id)
							continue;
						const rig = sim.pieceRigs.get(piece.id);
						if (!rig) continue;

						let bys = sim.bystanders.get(piece.id);
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
							sim.bystanders.set(piece.id, bys);
						}

						boardToWorld(piece.row, piece.col, _vec3A);
						const curWorldX = _vec3A.x + bys.offsetX;
						const curWorldZ = _vec3A.z + bys.offsetZ;

						const distToRingCenter = Math.hypot(
							curWorldX - sim.duelCenterWorld.x,
							curWorldZ - sim.duelCenterWorld.z,
						);
						const distToAtk = Math.hypot(
							curWorldX - atkWorldX,
							curWorldZ - atkWorldZ,
						);
						const distToDef = Math.hypot(
							curWorldX - defWorldX,
							curWorldZ - defWorldZ,
						);
						const minFighterDist = Math.min(distToAtk, distToDef);

						// Check if this bystander is inside the 4.75-unit Duel Ring OR in the foreground camera sightline corridor!
						const inArenaRing = distToRingCenter < 4.75;
						const inCameraCorridor =
							curWorldZ > sim.duelCenterWorld.z - 0.9 &&
							curWorldZ < sim.duelCenterWorld.z + 7.8 &&
							Math.abs(curWorldX - sim.duelCenterWorld.x) < 4.6;

						if (inArenaRing || inCameraCorridor || minFighterDist < 2.8) {
							// Use stable home-square side relative to duelCenterWorld so push direction never oscillates!
							const stableSide = _vec3A.x >= sim.duelCenterWorld.x ? 1 : -1;
							let pushDirX = curWorldX - sim.duelCenterWorld.x;
							let pushDirZ = curWorldZ - sim.duelCenterWorld.z;

							if (inCameraCorridor) {
								pushDirX = stableSide * 1.8;
								pushDirZ = curWorldZ < sim.duelCenterWorld.z ? -1.0 : -0.35;
							} else if (Math.hypot(pushDirX, pushDirZ) < 0.25) {
								pushDirX = stableSide * 1.4;
								pushDirZ = piece.row < 4 ? -1.2 : 1.2;
							}

							const len = Math.hypot(pushDirX, pushDirZ) || 1;
							pushDirX /= len;
							pushDirZ /= len;

							const urgency = inCameraCorridor
								? 1.0
								: Math.max(0.5, (4.85 - distToRingCenter) / 4.85);
							bys.vx += pushDirX * (24.0 * urgency) * rawDelta;
							bys.vz += pushDirZ * (24.0 * urgency) * rawDelta;

							if (bys.y <= 0.02) {
								bys.vy = 5.4 + Math.random() * 2.0;
								soundEngine.playBystanderHop();
							}
							bys.panickedTimer = 0.65;
						} else {
							const homeDistToCenter = Math.hypot(
								_vec3A.x - sim.duelCenterWorld.x,
								_vec3A.z - sim.duelCenterWorld.z,
							);
							const homeInCameraCorridor =
								_vec3A.z > sim.duelCenterWorld.z - 0.9 &&
								_vec3A.z < sim.duelCenterWorld.z + 7.8 &&
								Math.abs(_vec3A.x - sim.duelCenterWorld.x) < 4.6;

							if (!homeInCameraCorridor && homeDistToCenter > 5.1) {
								bys.vx += -bys.offsetX * 5.0 * rawDelta;
								bys.vz += -bys.offsetZ * 5.0 * rawDelta;
								if (
									Math.hypot(bys.offsetX, bys.offsetZ) > 0.35 &&
									bys.y <= 0.01
								) {
									bys.vy = 3.2;
								}
							}
						}

						bys.offsetX += bys.vx * rawDelta;
						bys.offsetZ += bys.vz * rawDelta;
						bys.vx *= Math.max(0, 1 - 6.5 * rawDelta);
						bys.vz *= Math.max(0, 1 - 6.5 * rawDelta);

						if (bys.y > 0 || bys.vy !== 0) {
							bys.y += bys.vy * rawDelta;
							bys.vy -= 24.0 * rawDelta;
							if (bys.y <= 0) {
								bys.y = 0;
								bys.vy = 0;
							}
						}

						if (bys.panickedTimer > 0) {
							bys.panickedTimer = Math.max(0, bys.panickedTimer - rawDelta);
						}

						rig.root.position.set(
							_vec3A.x + bys.offsetX,
							bys.y,
							_vec3A.z + bys.offsetZ,
						);

						const lookAngle = Math.atan2(
							midWorldX - rig.root.position.x,
							sim.duelCenterWorld.z - rig.root.position.z,
						);
						rig.root.rotation.y = THREE.MathUtils.damp(
							rig.root.rotation.y,
							lookAngle,
							10,
							rawDelta,
						);

						const isPanicking = bys.panickedTimer > 0 || bys.y > 0.05;
						rig.surpriseGroup.visible = isPanicking;
						rig.statusShaderMesh.visible = false;
						rig.statusIndicatorGroup.visible = false;
						if (isPanicking) {
							rig.surpriseGroup.rotation.y += rawDelta * 10;
							rig.bodyPivot.rotation.z =
								Math.sin(elapsed * 28 + piece.col) * 0.26;
							rig.bodyPivot.rotation.x = -0.18;
							rig.rightArmPivot.rotation.x =
								-2.4 + Math.sin(elapsed * 32) * 0.55;
							rig.leftArmPivot.rotation.x =
								-2.4 - Math.sin(elapsed * 32) * 0.55;
							rig.capePivot.rotation.x = 0.85;
						} else {
							rig.bodyPivot.rotation.z = 0;
							rig.bodyPivot.rotation.x =
								Math.sin(elapsed * 5 + piece.col) * 0.06;
							rig.rightArmPivot.rotation.x =
								-0.25 + Math.sin(elapsed * 5 + piece.row) * 0.12;
							rig.leftArmPivot.rotation.x = -0.2;
						}
					}

					// 3. Step Active Combat Simulation (with High-Noon Bullet-Time Dilation!)
					if (sim.slowMoTimer > 0) {
						sim.slowMoTimer = Math.max(0, sim.slowMoTimer - rawDelta);
					}
					const combatDelta = sim.slowMoTimer > 0 ? rawDelta * 0.24 : rawDelta;

					if (sim.hitstopTimer > 0) {
						sim.hitstopTimer = Math.max(0, sim.hitstopTimer - rawDelta);
					} else if (sim.phase === "FIGHT_ACTIVE") {
						sim.fightTimer = Math.max(0, sim.fightTimer - combatDelta);

						const human = !atk.isAI ? atk : !def.isAI ? def : atk;
						const humanSpdMult = getFighterSpeedMultiplier(human);
						if (
							!sim.autoPlayDemo &&
							(human.action === "idle" ||
								human.action === "walk_fwd" ||
								human.action === "walk_back")
						) {
							const leftHeld = sim.keysHeld.KeyA || sim.keysHeld.ArrowLeft;
							const rightHeld = sim.keysHeld.KeyD || sim.keysHeld.ArrowRight;
							if (sim.combatCameraMode === "first_person") {
								// In First-Person Visor POV, D advances toward the opponent and A steps back!
								if (rightHeld && !leftHeld) {
									human.vx = human.facing * human.spec.walkSpeed * humanSpdMult;
									human.action = "walk_fwd";
								} else if (leftHeld && !rightHeld) {
									human.vx =
										-human.facing * human.spec.walkSpeed * humanSpdMult;
									human.action = "walk_back";
								} else {
									human.vx = 0;
									human.action = "idle";
								}
							} else {
								if (leftHeld && !rightHeld) {
									human.vx = -human.spec.walkSpeed * humanSpdMult;
									human.action = human.facing === -1 ? "walk_fwd" : "walk_back";
								} else if (rightHeld && !leftHeld) {
									human.vx = human.spec.walkSpeed * humanSpdMult;
									human.action = human.facing === 1 ? "walk_fwd" : "walk_back";
								} else {
									human.vx = 0;
									human.action = "idle";
								}
							}
						}

						// Emit localized particles for active Burn / Slow / Weakened status effects!
						for (const f of [atk, def]) {
							if (f.hp <= 0) continue;
							const fWorldX = sim.duelCenterWorld.x + f.x * 0.72;
							const fWorldY = 0.8 + f.y * 0.72;
							const fWorldZ = sim.duelCenterWorld.z;
							if (f.statusBurnTimerMs > 0 && Math.random() < rawDelta * 14) {
								spawnBattleSmoke(
									vfxPool,
									fWorldX,
									fWorldY,
									fWorldZ,
									0.9,
									0xf97316,
								);
							}
							if (f.statusSlowTimerMs > 0 && Math.random() < rawDelta * 8) {
								spawnHitSparks(vfxPool, fWorldX, fWorldY, fWorldZ, 0x38bdf8, 2);
							}
							if (f.statusWeakenedTimerMs > 0 && Math.random() < rawDelta * 8) {
								spawnHitSparks(vfxPool, fWorldX, fWorldY, fWorldZ, 0xc084fc, 2);
							}
						}

						if (atk.isAI || sim.autoPlayDemo) {
							updateFighterAI(
								atk,
								def,
								combatDelta,
								nowMs,
								addCallout,
								(aiCaller, idx) => executeFighterIntervention(aiCaller, idx),
								sim.autoPlayDemo,
							);
						}
						if (def.isAI || sim.autoPlayDemo) {
							updateFighterAI(
								def,
								atk,
								combatDelta,
								nowMs,
								addCallout,
								(aiCaller, idx) => executeFighterIntervention(aiCaller, idx),
								sim.autoPlayDemo,
							);
						}

						// Director's Auto-Play Camera & Telemetry Switcher during active duels:
						// Alternates between First-Person Visor POV and 3rd-Person Side Arena Camera so viewers experience both!
						if (sim.autoPlayDemo) {
							sim.demoCameraTimer += rawDelta;
							if (sim.activeIntervention) {
								if (sim.combatCameraMode !== "side_arena") {
									sim.combatCameraMode = "side_arena";
									setCombatCameraMode("side_arena");
								}
								setDemoDirectorStage(
									`TACTICAL INTERVENTION · ${ARCHETYPES[sim.activeIntervention.supporter.type].chessName.toUpperCase()} (${sim.activeIntervention.supporter.interventionName.toUpperCase()})!`,
								);
							} else if (sim.demoCameraTimer >= 4.2) {
								sim.demoCameraTimer = 0;
								const nextCam =
									sim.combatCameraMode === "first_person"
										? "side_arena"
										: "first_person";
								sim.combatCameraMode = nextCam;
								setCombatCameraMode(nextCam);
								setDemoDirectorStage(
									nextCam === "first_person"
										? "FIRST-PERSON VISOR POV · PARRY, COMBOS & 4D PHASE-SHIFT"
										: "3RD-PERSON COLOSSEUM CAMERA · BYSTANDERS & FULL-BODY RIGS",
								);
							}
						}

						// Step Active Tactical Intervention Sequence (0.72s Rift & Supporter Strike Climax!)
						if (sim.activeIntervention) {
							const interv = sim.activeIntervention;
							interv.timerSec += rawDelta;
							const caller = interv.callerIsAttacker ? atk : def;
							const opponent = interv.callerIsAttacker ? def : atk;

							// Animate the actual supporting board piece rig leaping & projecting energy into the rift!
							const supRig = sim.pieceRigs.get(interv.supporter.pieceId);
							if (supRig) {
								const arc = Math.sin(
									Math.min(1, interv.timerSec / interv.durationSec) * Math.PI,
								);
								supRig.root.position.y += arc * 1.45;
								supRig.rightArmPivot.rotation.x = -1.85 * arc;
								supRig.leftArmPivot.rotation.x = -1.4 * arc;
								supRig.quantumWaveGroup.visible = true;
								supRig.tesseractBadge.visible =
									interv.supporter.isCrossDimensional;
								supRig.quantumWaveGroup.rotation.y += rawDelta * 12;
							}

							// Apply combat impact at 0.26s into the rift sequence!
							if (!interv.impactApplied && interv.timerSec >= 0.26) {
								interv.impactApplied = true;
								const intervEvents = {
									hitstopMs: 0,
									cameraShake: 0,
									sparkWorldPos: null as {
										x: number;
										y: number;
										color: number;
									} | null,
									slowMoDurationMs: 0,
									parryImpact: null,
								};
								applyTacticalInterventionImpact(
									caller,
									opponent,
									interv.supporter,
									intervEvents,
									addCallout,
								);

								if (intervEvents.slowMoDurationMs > 0) {
									sim.slowMoTimer = Math.max(
										sim.slowMoTimer,
										intervEvents.slowMoDurationMs / 1000,
									);
								}
								if (intervEvents.cameraShake > 0) {
									sim.cameraShake = Math.max(
										sim.cameraShake,
										intervEvents.cameraShake,
									);
								}
								if (intervEvents.sparkWorldPos) {
									const impactWorldX =
										sim.duelCenterWorld.x + intervEvents.sparkWorldPos.x * 0.72;
									const impactWorldY = intervEvents.sparkWorldPos.y;
									const impactWorldZ = sim.duelCenterWorld.z;
									spawnHitSparks(
										vfxPool,
										impactWorldX,
										impactWorldY,
										impactWorldZ,
										intervEvents.sparkWorldPos.color,
										24,
									);
									spawnShockwave(
										vfxPool,
										impactWorldX,
										0.06,
										impactWorldZ,
										intervEvents.sparkWorldPos.color,
										5.8,
									);
									spawnAuraPillar(
										vfxPool,
										impactWorldX,
										impactWorldZ,
										intervEvents.sparkWorldPos.color,
									);
									spawnGroundDebris(vfxPool, impactWorldX, impactWorldZ, 10);
									sim.hitstopTimer = 0.048;
								}
							}

							if (interv.timerSec >= interv.durationSec) {
								sim.activeIntervention = null;
							}
						}

						checkFighterActionVFX(atk, sim.prevAtkAction);
						checkFighterActionVFX(def, sim.prevDefAction);
						sim.prevAtkAction = atk.action;
						sim.prevDefAction = def.action;

						const stepEvents = stepCombatSimulation(
							atk,
							def,
							combatDelta,
							nowMs,
							addCallout,
						);
						if (stepEvents.slowMoDurationMs > 0) {
							sim.slowMoTimer = Math.max(
								sim.slowMoTimer,
								stepEvents.slowMoDurationMs / 1000,
							);
						}
						if (stepEvents.cameraShake > 0) {
							sim.cameraShake = Math.max(
								sim.cameraShake,
								stepEvents.cameraShake,
							);
						}
						if (stepEvents.parryImpact) {
							const pi = stepEvents.parryImpact;
							const fallbackWorldX = sim.duelCenterWorld.x + pi.x * 0.72;
							const fallbackWorldY = pi.y;
							const fallbackWorldZ = sim.duelCenterWorld.z;
							const parryDefRig = pi.defenderIsAttacker ? atkRig : defRig;
							const parryAtkRig = pi.defenderIsAttacker ? defRig : atkRig;
							spawnParryImpactSparks(
								vfxPool,
								fallbackWorldX,
								fallbackWorldY,
								fallbackWorldZ,
								pi.facing,
								pi.defenderFaction,
								parryDefRig,
								parryAtkRig,
							);
							sim.hitstopTimer = Math.max(sim.hitstopTimer, 0.055);
							arenaRig.clashPointLight.color.setHex(0xffffff);
							arenaRig.clashPointLight.intensity = 24.0;
						}
						if (stepEvents.sparkWorldPos) {
							const worldX =
								sim.duelCenterWorld.x + stepEvents.sparkWorldPos.x * 0.72;
							const worldY = stepEvents.sparkWorldPos.y;
							const worldZ = sim.duelCenterWorld.z;
							spawnHitSparks(
								vfxPool,
								worldX,
								worldY,
								worldZ,
								stepEvents.sparkWorldPos.color,
								stepEvents.parryImpact ? 22 : 16,
							);

							if (!stepEvents.parryImpact) {
								arenaRig.clashPointLight.color.setHex(
									stepEvents.sparkWorldPos.color,
								);
								arenaRig.clashPointLight.intensity = 16.0;
							}

							if (stepEvents.cameraShake >= 0.25) {
								sim.hitstopTimer = Math.max(sim.hitstopTimer, 0.042);
								spawnShockwave(
									vfxPool,
									worldX,
									0.05,
									worldZ,
									stepEvents.sparkWorldPos.color,
									4.5,
								);
								spawnGroundDebris(vfxPool, worldX, worldZ, 8);
							}
							if (
								atk.hp / Math.max(1, atk.maxHp) < 0.3 ||
								def.hp / Math.max(1, def.maxHp) < 0.3
							) {
								battleWornPulse = 1.0;
							}
						}

						// HOROLOGIUM WATCH DUEL ARENA HAZARD: Sweeping Timeline Hand across the Colossal Dial!
						if (sim.duelOnWatch && atk.hp > 0 && def.hp > 0) {
							sim.horologiumSweepTimer += combatDelta;
							if (sim.horologiumSweepTimer >= 4.2) {
								sim.horologiumSweepTimer = 0;
								soundEngine.playWatchHandForged();
								if (sim.pocketWatchRig) {
									triggerPocketWatchReaction(
										sim.pocketWatchRig,
										0xfbbf24,
										sim.multiverse.activeTimelineId,
										false,
									);
								}
								for (const f of [atk, def]) {
									if (f.y >= 0.55 || f.wPhaseTimerMs > 0) {
										f.meter = Math.min(100, f.meter + 22);
										addCallout({
											text: "⌚ ESCAPEMENT VAULT! (+22% METER)",
											subtext: "LEAPT OVER SWEEPING WATCH HAND",
											x: f.x,
											y: 2.35,
											color: "#fbbf24",
										});
									} else if (!f.isAI || Math.random() < 0.65) {
										f.hp = Math.max(1, f.hp - 9);
										f.vy = Math.max(f.vy, 5.2);
										f.hitFlashTimerMs = 140;
										spawnShockwave(
											vfxPool,
											sim.duelCenterWorld.x + f.x * 0.72,
											sim.duelCenterWorld.y + 0.1,
											sim.duelCenterWorld.z,
											0xfbbf24,
											4.2,
										);
										addCallout({
											text: "⌚ SWEPT BY TIMELINE HAND (-9 HP)!",
											subtext: "JUMP (W) OR 4D-PHASE (U) WHEN GEARS CHIME",
											x: f.x,
											y: 2.1,
											color: "#f59e0b",
										});
									}
								}
							}
						}

						// Check K.O. or Time Out!
						if (atk.hp <= 0 || def.hp <= 0 || sim.fightTimer <= 0) {
							const attackerWon =
								def.hp <= 0 ||
								(atk.hp > 0 && atk.hp / atk.maxHp >= def.hp / def.maxHp);
							const winner = attackerWon ? atk : def;
							const loser = attackerWon ? def : atk;

							const tauntSpec = triggerVictoryTaunt(winner, loser);
							sim.phase = "FIGHT_OUTRO";
							sim.phaseTimer = 0;
							setPhase("FIGHT_OUTRO");
							soundEngine.playKO();

							const koWorldX = sim.duelCenterWorld.x + loser.x * 0.72;
							spawnShockwave(
								vfxPool,
								koWorldX,
								0.05,
								sim.duelCenterWorld.z,
								0xf59e0b,
								6.5,
							);
							spawnGroundDebris(vfxPool, koWorldX, sim.duelCenterWorld.z, 14);
							spawnAuraPillar(
								vfxPool,
								sim.duelCenterWorld.x + winner.x * 0.72,
								sim.duelCenterWorld.z,
								tauntSpec.flourishColorHex,
							);

							const wasUpset =
								winner.spec.tacticalValue < loser.spec.tacticalValue ||
								!attackerWon;

							if (wasUpset) {
								confetti({
									particleCount: 70,
									spread: 65,
									origin: { y: 0.6 },
								});
							}

							setKoBanner({
								title: `${winner.spec.warriorTitle} · ${tauntSpec.name}`,
								subtitle: `"${tauntSpec.quote}" — ${
									wasUpset
										? `Tactical Upset: Value ${winner.spec.tacticalValue} ${winner.spec.chessName} felled Value ${loser.spec.tacticalValue} ${loser.spec.chessName}!`
										: `${winner.spec.chessName} claims the square with ${winner.hp} HP.`
								}`,
								wasUpset,
							});
						}
					} else if (sim.phase === "FIGHT_OUTRO" && sim.phaseTimer < 2.65) {
						const attackerWon =
							def.hp <= 0 ||
							(atk.hp > 0 && atk.hp / atk.maxHp >= def.hp / def.maxHp);
						const winner = attackerWon ? atk : def;
						const loser = attackerWon ? def : atk;
						const { triggeredClimaxVFX, climaxColorHex } = stepVictoryTaunt(
							winner,
							loser,
							rawDelta,
						);
						if (triggeredClimaxVFX) {
							const winWorldX = sim.duelCenterWorld.x + winner.x * 0.72;
							spawnShockwave(
								vfxPool,
								winWorldX,
								0.05,
								sim.duelCenterWorld.z,
								climaxColorHex,
								5.2,
							);
							spawnHitSparks(
								vfxPool,
								winWorldX,
								1.35,
								sim.duelCenterWorld.z,
								climaxColorHex,
								18,
							);
							spawnAuraPillar(
								vfxPool,
								winWorldX,
								sim.duelCenterWorld.z,
								climaxColorHex,
							);
							soundEngine.playSpecialActivate();
						}
					} else if (sim.phase === "FIGHT_OUTRO" && sim.phaseTimer >= 2.65) {
						const attackerWon =
							def.hp <= 0 ||
							(atk.hp > 0 && atk.hp / atk.maxHp >= def.hp / def.maxHp);

						// CASE A: SUBTERRANEAN REALM SENTINEL DUEL RESOLUTION!
						if (sim.duelInRealm && sim.realm.travelerPieceId) {
							const exploringPiece = sim.pieces.find(
								(p) => p.id === sim.realm.travelerPieceId,
							);
							const realmMeta = REALM_METADATA[sim.realm.currentRealmId];

							if (attackerWon && exploringPiece) {
								// Exploring warrior defeated the Realm Sentinel!
								// Record authoritative Multiversal Lineage Death Event!
								recordCausalAssassination(
									sim.multiverse,
									sim.multiverse.activeTimelineId,
									exploringPiece,
									def.piece,
									{
										row: def.piece.row,
										col: def.piece.col,
										z: def.piece.z,
										w: def.piece.w,
									},
									sim.turnNumber,
									`Subterranean Sentinel slain in ${realmMeta.title}`,
								);

								// Remove the corresponding enemy chess piece from the active 4D board!
								sim.pieces = sim.pieces.filter((p) => p.id !== def.piece.id);
								syncActiveBranchFromSim();
								setMultiverseState({ ...sim.multiverse });
								const loserRig = sim.pieceRigs.get(def.piece.id);
								if (loserRig) {
									loserRig.root.parent?.remove(loserRig.root);
									sim.pieceRigs.delete(def.piece.id);
								}

								// Mark the sentinel defeated inside the realm & hide its 3D sentinel rig
								const sent = sim.realm.sentinels.find(
									(s) => s.id === sim.activeSentinelId,
								);
								if (sent) {
									sent.defeated = true;
									if (sim.realmsRig) {
										const sRig = sim.realmsRig.sentinelRigs.get(sent.id);
										if (sRig) {
											sRig.root.visible = false;
										}
									}
								}

								const adrenalineHeal = Math.round(exploringPiece.maxHp * 0.18);
								exploringPiece.hp = Math.min(
									exploringPiece.maxHp,
									Math.max(15, atk.hp + adrenalineHeal),
								);
								exploringPiece.meter = Math.min(100, atk.meter + 25);
								exploringPiece.kills += 1;

								setBattleLogs((prev) => [
									{
										id: `realm_duel_${Date.now()}`,
										turnNumber: sim.turnNumber,
										summary: `Subterranean Victory: ${atk.spec.chessName} slew Sentinel ${def.spec.chessName} in ${realmMeta.title}!`,
										detail: `Lineage [${getPieceLineageId(def.piece)}] marked for Multiversal Death! ${atk.spec.chessName} continues exploring the realm (+${adrenalineHeal} HP, +25 Meter).`,
										wasUpset: atk.spec.tacticalValue < def.spec.tacticalValue,
										winnerFaction: atk.piece.faction,
									},
									...prev.slice(0, 7),
								]);

								// Resume 3D Realm Exploration right where the warrior stands!
								sim.duelInRealm = false;
								sim.activeSentinelId = null;
								sim.attackerRuntime = null;
								sim.defenderRuntime = null;
								sim.phase = "REALM_EXPLORATION";
								setPhase("REALM_EXPLORATION");
								setKoBanner(null);
								setRealmTraveler({ ...exploringPiece });
								setRealmStatusBanner(
									`FELLED REALM SENTINEL ${def.spec.chessName.toUpperCase()} — LINEAGE DEATH RECORDED!`,
								);
							} else {
								// Exploring warrior fell to the Subterranean Sentinel!
								recordCausalAssassination(
									sim.multiverse,
									sim.multiverse.activeTimelineId,
									def.piece,
									atk.piece,
									{
										row: atk.piece.row,
										col: atk.piece.col,
										z: atk.piece.z,
										w: atk.piece.w,
									},
									sim.turnNumber,
									`Subterranean fall in ${realmMeta.title}`,
								);
								sim.pieces = sim.pieces.filter((p) => p.id !== atk.piece.id);
								syncActiveBranchFromSim();
								setMultiverseState({ ...sim.multiverse });
								const loserRig = sim.pieceRigs.get(atk.piece.id);
								if (loserRig) {
									loserRig.root.parent?.remove(loserRig.root);
									sim.pieceRigs.delete(atk.piece.id);
								}

								if (sim.realmsRig) {
									syncRealmEntities3D(sim.realmsRig, [], []);
								}

								setBattleLogs((prev) => [
									{
										id: `realm_loss_${Date.now()}`,
										turnNumber: sim.turnNumber,
										summary: `Subterranean Fall: ${atk.spec.chessName} fell to Sentinel ${def.spec.chessName} in ${realmMeta.title}!`,
										detail: `${atk.spec.chessName} [Lineage ${getPieceLineageId(atk.piece)}] was lost in the underworld.`,
										wasUpset: true,
										winnerFaction: def.piece.faction,
									},
									...prev.slice(0, 7),
								]);

								const nextFaction: Faction =
									sim.turnFaction === "w" ? "b" : "w";
								sim.turnFaction = nextFaction;
								sim.turnNumber += 1;
								syncActiveBranchFromSim();
								setTurnFaction(nextFaction);
								setTurnNumber(sim.turnNumber);

								sim.duelInRealm = false;
								sim.activeSentinelId = null;
								sim.realm.travelerPieceId = null;
								sim.attackerRuntime = null;
								sim.defenderRuntime = null;
								sim.duelCenterWorld.set(0, 0, 0);
								sim.phase = "CHESS_VIEW";
								if (sim.controls) sim.controls.enabled = true;
								setRealmTraveler(null);
								setNearbyPortal(null);
								setNearbyPortalEval(null);
								setRealmStatusBanner(null);
								setPhase("CHESS_VIEW");
								setKoBanner(null);
								syncBoardHighlights();
							}
						} else if (
							sim.duelIsAcademicDebate &&
							sim.academicColloquium?.active
						) {
							// CASE A2: ACADEMIC ORAL DEFENSE PODIUM DEBATE DUEL VS REVIEWER #2 (TENURED PROF. ROOK)!
							// Neither Professor dies in an Academic Podium Debate — instead, Reviewer #2 concedes his objections,
							// both Professors return to their faculty seats, and the Sentient Mathematical Theorem is ACCEPTED & PUBLISHED!
							const col = sim.academicColloquium;
							col.oralDefenseDuelCompleted = true;
							col.oralDefenseArgumentsWon = 3;
							col.rigorScore = 100;
							col.stage = "PUBLISHED_QED";
							col.publishedDoi = `10.4004/ann.transtemp.${sim.turnNumber}.${Date.now().toString().slice(-4)}`;
							if (col.reviewers[1]) {
								col.reviewers[1].verdict = "ACCEPTED";
								col.reviewers[1].rebuttalResolved = true;
							}
							setAcademicColloquium({ ...col });

							soundEngine.playSynodResonance(true);
							confetti({ particleCount: 100, spread: 85, origin: { y: 0.45 } });
							setWatchEventBanner({
								title: `🎓 ORAL DEFENSE TRIUMPH — REVIEWER #2 CONCEDES!`,
								subtitle: `Tenured Prof. Rook signed the Acceptance Certificate! Click "Restore Chess Pieces & Unlock Checkmate Yesterday" in the Colloquium Panel!`,
							});
							setBattleLogs((prev) => [
								{
									id: `oral_defense_${Date.now()}`,
									turnNumber: sim.turnNumber,
									summary: `🎓 Oral Defense Podium Victory: Dr. Candidate Pawn Refuted Reviewer #2 (Tenured Prof. Rook)!`,
									detail: `Unanimous Faculty Senate vote achieved! "${col.manuscriptTitle}" accepted for publication in the Annals of Transtemporal Mathematics [DOI: ${col.publishedDoi}].`,
									wasUpset: true,
									winnerFaction: atk.piece.faction,
								},
								...prev.slice(0, 7),
							]);

							sim.duelIsAcademicDebate = false;
							sim.phase = "CHESS_VIEW";
							sim.attackerRuntime = null;
							sim.defenderRuntime = null;
							sim.pendingMove = null;
							sim.duelInRealm = false;
							sim.duelOnWatch = false;
							sim.duelCenterWorld.set(0, 0, 0);
							if (sim.controls) sim.controls.enabled = true;
							setPhase("CHESS_VIEW");
							setKoBanner(null);
							syncBoardHighlights();
						} else {
							// CASE B: STANDARD OR REALM-EMERGENCE CHESSBOARD DUEL RESOLUTION
							if (sim.isExhibitionDuel) {
								for (const rig of sim.exhibitionTempRigs) {
									rig.root.parent?.remove(rig.root);
								}
								sim.exhibitionTempRigs = [];
							} else if (sim.pendingMove) {
								const winnerRuntime = attackerWon ? atk : def;
								const loserRuntime = attackerWon ? def : atk;
								const sq = formatSquareName(sim.pendingMove.to);
								const targetWLabel = formatWName(sim.pendingMove.to.w);

								// Record Authoritative Multiversal Death Event for the slain piece's lineage!
								const causalDeath = recordCausalAssassination(
									sim.multiverse,
									sim.multiverse.activeTimelineId,
									winnerRuntime.piece,
									loserRuntime.piece,
									sim.pendingMove.to,
									sim.turnNumber,
									`${winnerRuntime.spec.chessName} slew ${loserRuntime.spec.chessName} at ${sq} [${targetWLabel}]`,
								);

								sim.pieces = sim.pieces.filter(
									(p) => p.id !== loserRuntime.piece.id,
								);
								const loserRig = sim.pieceRigs.get(loserRuntime.piece.id);
								if (loserRig) {
									loserRig.root.parent?.remove(loserRig.root);
									sim.pieceRigs.delete(loserRuntime.piece.id);
								}

								const survivorPiece = sim.pieces.find(
									(p) => p.id === winnerRuntime.piece.id,
								);
								if (survivorPiece) {
									const adrenalineHeal = Math.round(survivorPiece.maxHp * 0.15);
									survivorPiece.hp = Math.min(
										survivorPiece.maxHp,
										Math.max(12, winnerRuntime.hp + adrenalineHeal),
									);
									survivorPiece.meter = Math.min(100, winnerRuntime.meter + 15);
									survivorPiece.kills += 1;

									if (attackerWon) {
										survivorPiece.row = sim.pendingMove.to.row;
										survivorPiece.col = sim.pendingMove.to.col;
										survivorPiece.z = sim.pendingMove.to.z;
										survivorPiece.w = sim.pendingMove.to.w;
										survivorPiece.hasMoved = true;
										survivorPiece.history.push({
											row: survivorPiece.row,
											col: survivorPiece.col,
											z: survivorPiece.z,
											w: survivorPiece.w,
											turn: sim.turnNumber + 1,
										});

										if (
											survivorPiece.type === "p" &&
											(survivorPiece.row === 0 || survivorPiece.row === 7)
										) {
											survivorPiece.type = "q";
											survivorPiece.maxHp = ARCHETYPES.q.maxHp;
											survivorPiece.hp = ARCHETYPES.q.maxHp;
											const oldRig = sim.pieceRigs.get(survivorPiece.id);
											if (oldRig?.root.parent) {
												const parent = oldRig.root.parent;
												parent.remove(oldRig.root);
												const promotedRig = createArticulatedPiece(
													"q",
													survivorPiece.faction,
												);
												parent.add(promotedRig.root);
												sim.pieceRigs.set(survivorPiece.id, promotedRig);
											}
										}
									}
								}

								const wasUpset =
									!attackerWon ||
									winnerRuntime.spec.tacticalValue <
										loserRuntime.spec.tacticalValue;

								const isAlternateRealityKill =
									sim.multiverse.activeTimelineId !== "TL-PRIME";
								const wasWatchAscensionDuel = sim.duelOnWatch;
								let redeemedLineageText = "";

								if (wasWatchAscensionDuel && survivorPiece) {
									survivorPiece.isChronocrator = true;
									survivorPiece.synodStacks =
										(survivorPiece.synodStacks || 0) + 1;
									survivorPiece.hp = survivorPiece.maxHp;
									survivorPiece.meter = 100;

									// If an allied piece was previously assassinated, winning atop the Pocket Watch redeems & resurrects it!
									const alliedAssassination = Array.from(
										sim.multiverse.eliminatedLineages.values(),
									).find((ev) => ev.victimFaction === survivorPiece.faction);
									if (alliedAssassination) {
										const restored = rewindCausalAssassination(
											sim.multiverse,
											alliedAssassination.id,
										);
										if (restored) {
											const activeBr = ensureBranchHydrated(
												sim.multiverse,
												sim.multiverse.activeTimelineId,
											);
											if (activeBr) {
												const restoredPiece = activeBr.pieces.find(
													(p) =>
														getPieceLineageId(p) === restored.victimLineageId,
												);
												if (
													restoredPiece &&
													!sim.pieces.some((p) => p.id === restoredPiece.id)
												) {
													sim.pieces.push(restoredPiece);
													const scene = sim.arenaRig?.group.parent;
													if (scene) {
														const newRig = createArticulatedPiece(
															restoredPiece.type,
															restoredPiece.faction,
														);
														boardToWorld(
															restoredPiece.row,
															restoredPiece.col,
															newRig.root.position,
														);
														scene.add(newRig.root);
														sim.pieceRigs.set(restoredPiece.id, newRig);
													}
												}
											}
											redeemedLineageText = ` · Resurrected Fallen ${ARCHETYPES[restored.victimType].chessName} [${restored.victimLineageId}]!`;
										}
									}

									soundEngine.playSynodResonance(true);
									confetti({
										particleCount: 95,
										spread: 80,
										origin: { y: 0.45 },
									});
									setWatchEventBanner({
										title: `⌚ CROWNED CHRONOCRATOR: ${ARCHETYPES[survivorPiece.type].warriorTitle.toUpperCase()}!`,
										subtitle: `Triumphed atop the Colossal Pocket Watch! Gained Causal Immunity, Sovereign Vectors & Full Vitality${redeemedLineageText}`,
									});
								}

								const wasYesterdayCheckmate =
									sim.pendingMove.dimensionType === "CHECKMATE_YESTERDAY" &&
									attackerWon;

								if (wasYesterdayCheckmate) {
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
									setWatchEventBanner({
										title: winnerRuntime.piece.entanglementSwapUnlocked
											? `⊢ CKW SWAP — THE CROWN DECOHERES AT ${sq}!`
											: `⊢ Q.E.D. — YESTERDAY HAS BEEN CHECKMATED AT ${sq}!`,
										subtitle: winnerRuntime.piece.entanglementSwapUnlocked
											? `Monogamy theorem forced an entanglement swap: ${loserRuntime.spec.chessName} was maximally entangled with the Queen — and is now mathematically forbidden from having existed on Turn 1.`
											: `Sentient Mathematical Theorem (${winnerRuntime.piece.theoremAxiom || "⊢ ∀t < t₀ : ¬∃Monarch [Q.E.D.]"}) retroactively refuted ${loserRuntime.spec.chessName} at Turn 1 (Yesterday)!`,
									});
								}

								const duelLogEntry: BattleLogEntry = {
									id: `duel_${Date.now()}`,
									turnNumber: sim.turnNumber,
									summary: wasYesterdayCheckmate
										? `⊢ Q.E.D. CHECKMATED YESTERDAY: Sentient Theorem Refuted ${loserRuntime.spec.chessName} at Turn 1 (${sq})!`
										: wasWatchAscensionDuel
											? `⌚ HOROLOGIUM ASCENSION VICTORY: ${winnerRuntime.spec.chessName} Crowned Chronocrator Atop the Cosmic Watch!`
											: isAlternateRealityKill
												? `CAUSAL ASSASSINATION IN ${sim.multiverse.activeTimelineId}: ${loserRuntime.spec.chessName} [${causalDeath.victimLineageId}] Slain!`
												: attackerWon
													? `${atk.spec.chessName} conquered ${def.spec.chessName} at ${sq} [${targetWLabel}]`
													: `UPSET AT ${sq}: Defending ${def.spec.chessName} slew Attacking ${atk.spec.chessName}!`,
									detail: wasYesterdayCheckmate
										? `Formal proof "${winnerRuntime.piece.theoremAxiom || "⊢ ∀t < t₀ : ¬∃Monarch [Q.E.D.]"}" erased ${loserRuntime.spec.warriorTitle} from Yesterday's timeline across all branches!`
										: wasWatchAscensionDuel
											? `${winnerRuntime.spec.warriorTitle} commands Chronocrator Sovereign Vectors & Remembered-Square Immunity${redeemedLineageText}`
											: isAlternateRealityKill
												? `Lineage ${causalDeath.victimLineageId} terminated in ${sim.multiverse.activeTimelineId}! Converge with Prime Reality to erase its counterpart there!`
												: `${winnerRuntime.spec.warriorTitle} survived with ${survivorPiece?.hp ?? winnerRuntime.hp} HP (${survivorPiece?.kills ?? 1} Kills).`,
									wasUpset,
									winnerFaction: winnerRuntime.piece.faction,
								};

								setBattleLogs((prev) => [duelLogEntry, ...prev.slice(0, 7)]);

								if (
									loserRuntime.piece.type === "k" &&
									!sim.autoConvergeToPrimeAfterDuel
								) {
									setWarVictor({
										faction: winnerRuntime.piece.faction,
										reason: wasYesterdayCheckmate
											? `⊢ Q.E.D. — YESTERDAY HAS BEEN CHECKMATED! A Pawn merged with its alternate-timeline self into the Sentient Mathematical Theorem "${winnerRuntime.piece.theoremAxiom || "⊢ ∀t < t₀ : ¬∃Monarch [Q.E.D.]"}" and retroactively checkmated the Eternal Monarch on Turn 1 (Yesterday) at Square ${sq}!`
											: `Regicide at Square ${sq} in ${sim.multiverse.activeTimelineId}! ${winnerRuntime.spec.warriorTitle} defeated the Eternal Monarch in single combat.`,
									});
									confetti({
										particleCount: 120,
										spread: 90,
										origin: { y: 0.5 },
									});

									if (sim.autoPlayDemo) {
										setTimeout(() => {
											if (simRef.current.autoPlayDemo) {
												handleResetGame();
												simRef.current.autoPlayDemo = true;
												setAutoPlayDemo(true);
											}
										}, 3200);
									}
								}

								const nextFaction: Faction =
									sim.turnFaction === "w" ? "b" : "w";
								sim.turnFaction = nextFaction;
								sim.turnNumber += 1;
								syncActiveBranchFromSim();
								setMultiverseState({ ...sim.multiverse });
								setTurnFaction(nextFaction);
								setTurnNumber(sim.turnNumber);

								// If this was a Guided Causal Assassination in an alternate timeline, automatically converge back to TL-PRIME!
								if (sim.autoConvergeToPrimeAfterDuel) {
									sim.autoConvergeToPrimeAfterDuel = false;
									sim.phase = "CHESS_VIEW";
									sim.attackerRuntime = null;
									sim.defenderRuntime = null;
									sim.pendingMove = null;
									sim.duelCenterWorld.set(0, 0, 0);
									setPhase("CHESS_VIEW");
									setKoBanner(null);
									setTimeout(() => {
										handleTriggerConvergence("TL-PRIME");
									}, 250);
									return;
								}

								if (
									!sim.autoPlayDemo &&
									sim.gameMode === "vs_ai" &&
									nextFaction === "b" &&
									loserRuntime.piece.type !== "k"
								) {
									setTimeout(() => {
										const currentSim = simRef.current;
										if (
											currentSim.autoPlayDemo ||
											currentSim.phase !== "CHESS_VIEW" ||
											currentSim.turnFaction !== "b"
										)
											return;
										const aiDecision = chooseAIMove(currentSim.pieces, "b");
										if (aiDecision) {
											executeChessMove(aiDecision.piece, aiDecision.move);
										}
									}, 1100);
								}
							}

							sim.phase = "CHESS_VIEW";
							sim.attackerRuntime = null;
							sim.defenderRuntime = null;
							sim.pendingMove = null;
							sim.duelInRealm = false;
							sim.duelOnWatch = false;
							sim.horologiumSweepTimer = 0;
							sim.duelCenterWorld.set(0, 0, 0);
							sim.demoBoardTimer = 0;
							sim.demoPendingDecision = null;
							if (sim.controls) {
								sim.controls.enabled = true;
							}
							setPhase("CHESS_VIEW");
							setKoBanner(null);
							syncBoardHighlights();
						}
					}

					// Position and animate the two dueling 3D rigs on the Duel Stage
					const human = !atk.isAI ? atk : !def.isAI ? def : atk;
					const opponent = human === atk ? def : atk;
					const isFirstPersonActive =
						(sim.phase === "FIGHT_ACTIVE" ||
							(sim.phase === "FIGHT_INTRO" && sim.introShotIndex === 2)) &&
						sim.combatCameraMode === "first_person";

					const fighterPairs: [
						FighterRuntime,
						ArticulatedPieceRig | undefined,
					][] = [
						[atk, atkRig],
						[def, defRig],
					];

					for (const [f, rig] of fighterPairs) {
						if (!rig) continue;
						const targetWorldX = sim.duelCenterWorld.x + f.x * 0.72;
						const targetWorldY = baseStageY + f.y * 0.72;
						const phaseOffsetZ =
							f.wPhaseTimerMs > 0 ? f.wPhaseOffset * 0.65 : 0;
						const targetWorldZ = sim.duelCenterWorld.z + phaseOffsetZ;

						rig.root.position.x = THREE.MathUtils.damp(
							rig.root.position.x,
							targetWorldX,
							28,
							rawDelta,
						);
						rig.root.position.y = THREE.MathUtils.damp(
							rig.root.position.y,
							targetWorldY,
							28,
							rawDelta,
						);
						rig.root.position.z = THREE.MathUtils.damp(
							rig.root.position.z,
							targetWorldZ,
							28,
							rawDelta,
						);

						rig.root.scale.setScalar(
							THREE.MathUtils.damp(rig.root.scale.x, 1.42, 22, rawDelta),
						);

						// Visibility rules:
						// - During Shot 0 (Challenger Extreme Eye Crash-Zoom), hide Defender so Challenger's eyes are 100% unobstructed head-on!
						// - During Shot 1 (Defender Extreme Eye Crash-Zoom), hide Challenger so Defender's eyes are 100% unobstructed head-on!
						// - During First-Person Combat, hide the human fighter's 3rd-person body and show the First-Person Weapon/Shield Viewmodel!
						if (sim.phase === "FIGHT_INTRO" && sim.introShotIndex === 0) {
							rig.root.visible = f === atk;
						} else if (
							sim.phase === "FIGHT_INTRO" &&
							sim.introShotIndex === 1
						) {
							rig.root.visible = f === def;
						} else if (isFirstPersonActive && f === human) {
							rig.root.visible = false;
						} else {
							rig.root.visible = true;
						}

						if (f.wPhaseTimerMs <= 0) {
							for (const mesh of rig.allStandardMeshes) {
								const mat = mesh.material as THREE.MeshStandardMaterial;
								if (mat.opacity < 0.99) {
									mat.opacity = 1.0;
									mat.transparent = false;
									mat.needsUpdate = true;
								}
							}
						}

						const targetFacingYaw = f.facing === 1 ? Math.PI / 2 : -Math.PI / 2;
						rig.root.rotation.y = THREE.MathUtils.damp(
							rig.root.rotation.y,
							targetFacingYaw,
							24,
							rawDelta,
						);

						animateFighterRig(rig, f, elapsed, rawDelta);

						// Keep head level and lock iris/pupil focus + fierce standoff squint dead-center into the lens during Sergio Leone Crash-Zooms!
						if (
							sim.phase === "FIGHT_INTRO" &&
							(sim.introShotIndex === 0 || sim.introShotIndex === 1)
						) {
							rig.headGroup.rotation.set(0, 0, 0);
							rig.bodyPivot.rotation.set(0, 0, 0);
							const microTremor = Math.sin(elapsed * 24) * 0.0008;
							rig.leftPupilPivot.position.set(microTremor, 0, 0.006);
							rig.rightPupilPivot.position.set(microTremor, 0, 0.006);
							rig.leftPupilPivot.scale.setScalar(1.24);
							rig.rightPupilPivot.scale.setScalar(1.24);
							rig.leftUpperLid.position.y = 0.0082;
							rig.rightUpperLid.position.y = 0.0082;
							rig.leftUpperLid.rotation.z = 0.19;
							rig.rightUpperLid.rotation.z = 0.19;
						}
					}

					// Animate First-Person Weapon & Shield Viewmodel Rig when in First-Person Mode!
					if (sim.firstPersonRig) {
						sim.firstPersonRig.root.visible = isFirstPersonActive;
						if (isFirstPersonActive) {
							animateFirstPersonViewmodel(
								sim.firstPersonRig,
								human,
								elapsed,
								rawDelta,
							);
						}
					}

					// 4. SPAGHETTI WESTERN OPTICAL CRASH-ZOOMS -> FIRST-PERSON VISOR COMBAT CAMERA
					const midX = sim.duelCenterWorld.x + (atk.x + def.x) * 0.5 * 0.72;
					const midY = baseStageY + 0.96 + Math.max(atk.y, def.y) * 0.22;
					const midZ = sim.duelCenterWorld.z;
					const sep = Math.abs(atk.x - def.x);

					let targetFov = 38;
					let fovDampSpeed = 14;
					let targetDutchRoll = 0;
					let camLerpSpeed = 14;

					if (sim.phase === "TRANSITION_TO_FIGHT") {
						_camTargetPos.set(midX, baseStageY + 1.75, midZ + 5.0);
						_camLookTarget.set(midX, baseStageY + 1.0, midZ);
						targetFov = 42;
						fovDampSpeed = 12;
						targetDutchRoll = 0.03;
						camLerpSpeed = 12;
					} else if (sim.phase === "FIGHT_INTRO") {
						if (sim.introShotIndex === 0) {
							// SHOT 0: Sergio Leone Extreme Eye CRASH-ZOOM on Challenger (FOV 62° -> 9.5° in 0.14s, locked dead-on Challenger's glowing eyes!)
							_camTargetPos.set(
								atkWorldX + 1.48,
								atkWorldY + atkEyeH,
								atkWorldZ,
							);
							_camLookTarget.set(atkWorldX, atkWorldY + atkEyeH, atkWorldZ);
							targetFov = 9.5;
							fovDampSpeed = 32; // Violent, high-speed optical crash zoom!
							targetDutchRoll = 0.035;
							camLerpSpeed = 40;
						} else if (sim.introShotIndex === 1) {
							// SHOT 1: Sergio Leone Extreme Eye Counter-CRASH-ZOOM on Defender (FOV 62° -> 9.5° in 0.14s, locked dead-on Defender's glaring eyes!)
							_camTargetPos.set(
								defWorldX - 1.48,
								defWorldY + defEyeH,
								defWorldZ,
							);
							_camLookTarget.set(defWorldX, defWorldY + defEyeH, defWorldZ);
							targetFov = 9.5;
							fovDampSpeed = 32; // Violent, high-speed optical crash zoom!
							targetDutchRoll = -0.035;
							camLerpSpeed = 40;
						} else {
							// SHOT 2: Snap-Zoom out into Human Warrior's First-Person Helmet Visor POV!
							const hWorldX = sim.duelCenterWorld.x + human.x * 0.72;
							const hWorldY = baseStageY + human.y * 0.72;
							const hEyeH = getWarriorEyeHeightWorld(human.piece.type);
							const oWorldX = sim.duelCenterWorld.x + opponent.x * 0.72;
							const oWorldY = baseStageY + opponent.y * 0.72;
							const oEyeH = getWarriorEyeHeightWorld(opponent.piece.type);

							_camTargetPos.set(hWorldX, hWorldY + hEyeH, midZ);
							_camLookTarget.set(oWorldX, oWorldY + oEyeH * 0.82, midZ);
							targetFov = 56;
							fovDampSpeed = 24;
							targetDutchRoll = 0;
							camLerpSpeed = 28;
						}
					} else if (sim.phase === "FIGHT_OUTRO") {
						// Unobstructed Heroic 3rd-Person Low-Angle Orbit around the Victorious Warrior!
						const winnerWorldX =
							def.hp <= 0 ||
							(atk.hp > 0 && atk.hp / atk.maxHp >= def.hp / def.maxHp)
								? atkWorldX
								: defWorldX;
						const winnerIsAtk = winnerWorldX === atkWorldX;
						const orbitSweep = Math.sin(sim.phaseTimer * 0.75) * 0.95;
						_camTargetPos.set(
							winnerWorldX + (winnerIsAtk ? 0.65 : -0.65) + orbitSweep,
							baseStageY + 1.18,
							midZ + 2.75,
						);
						_camLookTarget.set(winnerWorldX, baseStageY + 1.08, midZ);
						targetFov = 28;
						fovDampSpeed = 14;
						targetDutchRoll = winnerIsAtk ? 0.045 : -0.045;
						camLerpSpeed = 12;
					} else if (sim.combatCameraMode === "first_person") {
						// FIRST-PERSON VISOR COMBAT MODE (with Free Mouse-Look Pitch/Yaw Offset!)
						const hWorldX =
							sim.duelCenterWorld.x + human.x * 0.72 - human.facing * 0.26;
						const hWorldY = baseStageY + human.y * 0.72;
						const hPhaseZ =
							human.wPhaseTimerMs > 0 ? human.wPhaseOffset * 0.65 : 0;
						const hWorldZ = midZ + hPhaseZ;
						const hEyeH = getWarriorEyeHeightWorld(human.piece.type);

						const oWorldX = sim.duelCenterWorld.x + opponent.x * 0.72;
						const oWorldY = baseStageY + opponent.y * 0.72;
						const oPhaseZ =
							opponent.wPhaseTimerMs > 0 ? opponent.wPhaseOffset * 0.65 : 0;
						const oWorldZ = midZ + oPhaseZ;
						const oEyeH = getWarriorEyeHeightWorld(opponent.piece.type);

						const walkBob =
							human.action === "walk_fwd" || human.action === "walk_back"
								? Math.sin(elapsed * 14) * 0.035
								: Math.sin(elapsed * 2.5) * 0.008;

						const camPosX = hWorldX;
						const camPosY = hWorldY + hEyeH + walkBob;
						const camPosZ = hWorldZ;
						_camTargetPos.set(camPosX, camPosY, camPosZ);

						// Base vector toward opponent + user mouse-look yaw/pitch rotation!
						const baseDX = oWorldX - camPosX;
						const baseDY = oWorldY + oEyeH * 0.78 - camPosY;
						const baseDZ = oWorldZ - camPosZ;
						const baseDist = Math.max(1.5, Math.hypot(baseDX, baseDZ));
						const baseYaw =
							Math.atan2(baseDX, baseDZ) + sim.mouseLook.fightLookYaw;
						const basePitch =
							Math.atan2(baseDY, baseDist) - sim.mouseLook.fightLookPitch;

						_camLookTarget.set(
							camPosX + Math.sin(baseYaw) * Math.cos(basePitch) * baseDist,
							camPosY + Math.sin(basePitch) * baseDist,
							camPosZ + Math.cos(baseYaw) * Math.cos(basePitch) * baseDist,
						);
						targetFov = sim.activeIntervention
							? 68
							: human.action === "special"
								? 64
								: human.wPhaseTimerMs > 0
									? 66
									: 56;
						fovDampSpeed = 18;
						targetDutchRoll =
							human.action === "hitstun"
								? 0.08
								: human.wPhaseTimerMs > 0
									? 0.05 * human.wPhaseOffset
									: 0;
						camLerpSpeed = 28;
					} else {
						// Optional Side Arena Camera (Toggled via 'V' key or HUD button, with full 360° Mouse Orbit & Scroll Zoom!)
						const baseDist = THREE.MathUtils.clamp(
							4.45 + sep * 0.45 + sim.mouseLook.fightCamDistOffset,
							2.2,
							11.5,
						);
						const orbitYaw = sim.mouseLook.fightLookYaw;
						const orbitPitch = THREE.MathUtils.clamp(
							0.22 + sim.mouseLook.fightLookPitch,
							-0.15,
							1.15,
						);
						const horizDist = Math.cos(orbitPitch) * baseDist;
						_camTargetPos.set(
							midX + Math.sin(orbitYaw) * horizDist,
							baseStageY +
								Math.max(0.45, 1.1 + Math.sin(orbitPitch) * baseDist),
							midZ + Math.cos(orbitYaw) * horizDist,
						);
						_camLookTarget.set(midX, midY, midZ);
						targetFov = 38;
						fovDampSpeed = 12;
						targetDutchRoll = 0;
						camLerpSpeed = 12;
					}

					// If combatCameraMode just switched between first_person and side_arena, snap camera immediately
					// so it never flies through the back of a warrior's helmet or across bystander pieces!
					if (sim.combatCameraMode !== prevCombatCamMode) {
						prevCombatCamMode = sim.combatCameraMode;
						camera.position.copy(_camTargetPos);
						sim.currentLookAt.copy(_camLookTarget);
					}

					if (sim.cameraShake > 0) {
						_camTargetPos.x += (Math.random() - 0.5) * sim.cameraShake * 0.6;
						_camTargetPos.y += (Math.random() - 0.5) * sim.cameraShake * 0.6;
						targetDutchRoll += (Math.random() - 0.5) * sim.cameraShake * 0.22;
						sim.cameraShake = Math.max(0, sim.cameraShake - rawDelta * 1.8);
					}

					camera.fov = THREE.MathUtils.damp(
						camera.fov,
						targetFov,
						fovDampSpeed,
						rawDelta,
					);
					camera.updateProjectionMatrix();

					camera.position.lerp(
						_camTargetPos,
						1 - Math.exp(-camLerpSpeed * rawDelta),
					);
					sim.currentLookAt.lerp(
						_camLookTarget,
						1 - Math.exp(-(camLerpSpeed + 4) * rawDelta),
					);
					camera.lookAt(sim.currentLookAt);

					// Apply Dutch Angle roll around the camera's local line-of-sight axis after lookAt!
					sim.currentDutchRoll = THREE.MathUtils.damp(
						sim.currentDutchRoll,
						targetDutchRoll,
						camLerpSpeed,
						rawDelta,
					);
					camera.rotateZ(sim.currentDutchRoll);

					// 4B. STRICT CAMERA SIGHTLINE & PROXIMITY OCCLUSION GUARD:
					// Guarantees no 3D fighter or bystander chess piece can EVER sit in front of the camera lens
					// and cast a black silhouette across the viewport during any fight phase!
					for (const [f, rig] of fighterPairs) {
						if (!rig) continue;
						const distCamToFighter = Math.hypot(
							camera.position.x - rig.root.position.x,
							camera.position.z - rig.root.position.z,
						);
						if (sim.phase === "FIGHT_INTRO" && sim.introShotIndex === 0) {
							rig.root.visible = f === atk;
						} else if (
							sim.phase === "FIGHT_INTRO" &&
							sim.introShotIndex === 1
						) {
							rig.root.visible = f === def;
						} else if (
							(isFirstPersonActive && f === human) ||
							distCamToFighter < 1.05
						) {
							rig.root.visible = false;
						} else {
							rig.root.visible = true;
						}
					}

					const camX = camera.position.x;
					const camZ = camera.position.z;
					const lookX = sim.currentLookAt.x;
					const lookZ = sim.currentLookAt.z;
					const rayDX = lookX - camX;
					const rayDZ = lookZ - camZ;
					const rayLenSq = rayDX * rayDX + rayDZ * rayDZ;

					for (const piece of sim.pieces) {
						if (piece.id === atk.piece.id || piece.id === def.piece.id)
							continue;
						const rig = sim.pieceRigs.get(piece.id);
						if (!rig) continue;

						// Hide all bystanders during extreme eye Crash-Zooms or Subterranean Realm Duels so the lens is 100% clear
						if (
							sim.duelInRealm ||
							(sim.phase === "FIGHT_INTRO" &&
								(sim.introShotIndex === 0 || sim.introShotIndex === 1))
						) {
							rig.root.visible = false;
							continue;
						}

						const px = rig.root.position.x;
						const pz = rig.root.position.z;
						const distToCam = Math.hypot(px - camX, pz - camZ);
						const distToStage = Math.hypot(
							px - sim.duelCenterWorld.x,
							pz - sim.duelCenterWorld.z,
						);

						// Distance from piece to the camera -> lookAt sightline segment
						let tProj =
							rayLenSq > 0.0001
								? ((px - camX) * rayDX + (pz - camZ) * rayDZ) / rayLenSq
								: 0;
						tProj = Math.max(-0.15, Math.min(1.25, tProj));
						const closestX = camX + tProj * rayDX;
						const closestZ = camZ + tProj * rayDZ;
						const distToSightline = Math.hypot(px - closestX, pz - closestZ);

						const isInterveningSupporter =
							sim.activeIntervention?.supporter.pieceId === piece.id;

						// Hide any bystander that is close to the camera lens, inside the sightline corridor, or inside the duel stage!
						if (
							distToCam < 2.85 ||
							(tProj > -0.1 && tProj < 1.15 && distToSightline < 2.35) ||
							(!isInterveningSupporter && distToStage < 4.35)
						) {
							rig.root.visible = false;
						} else {
							rig.root.visible = true;
						}
					}

					// 5. BATTLE-WORN CRITICAL DUEL SHADER, 3D ARENA FLOOR FRACTURES & LOCALIZED SMOKE (< 30% HP)
					const atkHpRatio = atk.hp / Math.max(1, atk.maxHp);
					const defHpRatio = def.hp / Math.max(1, def.maxHp);
					const minHpRatio = Math.min(atkHpRatio, defHpRatio);

					if (minHpRatio < 0.3) {
						const targetScar = Math.min(1.0, (0.3 - minHpRatio) / 0.22 + 0.38);
						battleWornIntensity = THREE.MathUtils.damp(
							battleWornIntensity,
							targetScar,
							7,
							rawDelta,
						);
						battleWornPulse = THREE.MathUtils.damp(
							battleWornPulse,
							0,
							5,
							rawDelta,
						);

						arenaRig.duelFloorScarMesh.visible = battleWornIntensity > 0.01;
						arenaRig.duelFloorScarUniforms.uTime.value = elapsed;
						arenaRig.duelFloorScarUniforms.uIntensity.value =
							battleWornIntensity;

						battleSmokeTimer += rawDelta;
						if (battleSmokeTimer >= 0.065) {
							battleSmokeTimer = 0;
							if (atkHpRatio < 0.3) {
								spawnBattleSmoke(
									vfxPool,
									atkWorldX,
									atkWorldY + 0.85,
									atkWorldZ,
									battleWornIntensity,
									0xf59e0b,
								);
							}
							if (defHpRatio < 0.3) {
								spawnBattleSmoke(
									vfxPool,
									defWorldX,
									defWorldY + 0.85,
									defWorldZ,
									battleWornIntensity,
									0xf43f5e,
								);
							}
							// Emit localized smoke & cinders rising from the fractured duel arena floor!
							const crackAngle = Math.random() * Math.PI * 2;
							const crackRad = 0.6 + Math.random() * 2.8;
							spawnBattleSmoke(
								vfxPool,
								sim.duelCenterWorld.x + Math.cos(crackAngle) * crackRad,
								baseStageY + 0.06,
								sim.duelCenterWorld.z + Math.sin(crackAngle) * crackRad * 0.65,
								battleWornIntensity * 0.85,
								0xf59e0b,
							);
						}
					} else {
						battleWornIntensity = THREE.MathUtils.damp(
							battleWornIntensity,
							0,
							8,
							rawDelta,
						);
						battleWornPulse = THREE.MathUtils.damp(
							battleWornPulse,
							0,
							8,
							rawDelta,
						);
						arenaRig.duelFloorScarMesh.visible = battleWornIntensity > 0.01;
						arenaRig.duelFloorScarUniforms.uIntensity.value =
							battleWornIntensity;
					}

					hudSyncAccumulator += rawDelta;
					if (hudSyncAccumulator >= 0.05) {
						hudSyncAccumulator = 0;
						setHudAttacker({ ...atk });
						setHudDefender({ ...def });
						setFightTimer(sim.fightTimer);
					}
				}
			} else if (
				sim.phase === "REALM_DESCENT" ||
				sim.phase === "REALM_EXPLORATION" ||
				sim.phase === "REALM_ASCENT"
			) {
				// ============================================================================
				// SUBTERRANEAN IMPOSSIBLE REALMS: DESCENT, 3RD-PERSON EXPLORATION & ASCENT
				// ============================================================================
				const rm = sim.realm;
				const exploringPiece =
					sim.pieces.find((p) => p.id === rm.travelerPieceId) || null;
				const playerRig = rm.travelerPieceId
					? sim.pieceRigs.get(rm.travelerPieceId)
					: undefined;
				const realmMeta = REALM_METADATA[rm.currentRealmId];
				const realmCenter = realmMeta.worldCenter;

				if (sim.firstPersonRig) sim.firstPersonRig.root.visible = false;
				arenaRig.tesseractLines.visible = false;
				arenaRig.entanglementHelixLines.visible = false;
				arenaRig.spotAttacker.intensity = THREE.MathUtils.damp(
					arenaRig.spotAttacker.intensity,
					0,
					10,
					rawDelta,
				);
				arenaRig.spotDefender.intensity = THREE.MathUtils.damp(
					arenaRig.spotDefender.intensity,
					0,
					10,
					rawDelta,
				);

				sim.phaseTimer += rawDelta;

				if (sim.phase === "REALM_DESCENT") {
					const t = Math.min(1, sim.phaseTimer / 1.15);
					const smoothT = t * t * (3 - 2 * t);

					const entryGateway =
						BOARD_GATEWAYS.find((g) => g.id === rm.entryGatewayId) ||
						BOARD_GATEWAYS[0];
					boardToWorld(entryGateway.row, entryGateway.col, _vec3A);

					const dstX = realmCenter.x + rm.localPos.x;
					const dstY = realmCenter.y + 0.05;
					const dstZ = realmCenter.z + rm.localPos.z;

					const curX = THREE.MathUtils.lerp(_vec3A.x, dstX, smoothT);
					const curY = THREE.MathUtils.lerp(0.2, dstY, smoothT);
					const curZ = THREE.MathUtils.lerp(_vec3A.z, dstZ, smoothT);

					if (playerRig) {
						playerRig.root.visible = true;
						playerRig.root.position.set(curX, curY, curZ);
						playerRig.root.scale.setScalar(
							THREE.MathUtils.lerp(1.0, 1.32, smoothT),
						);
						playerRig.root.rotation.y = rm.yaw + (1 - smoothT) * Math.PI * 2;
					}

					_camTargetPos.set(curX, curY + 3.2 + (1 - smoothT) * 2.5, curZ + 5.8);
					_camLookTarget.set(curX, curY + 0.9, curZ - 1.5);
					camera.position.lerp(_camTargetPos, 1 - Math.exp(-14 * rawDelta));
					sim.currentLookAt.lerp(_camLookTarget, 1 - Math.exp(-16 * rawDelta));
					camera.lookAt(sim.currentLookAt);
					camera.fov = THREE.MathUtils.damp(camera.fov, 54, 10, rawDelta);
					camera.updateProjectionMatrix();

					if (t >= 1) {
						sim.phase = "REALM_EXPLORATION";
						sim.phaseTimer = 0;
						setPhase("REALM_EXPLORATION");
					}
				} else if (sim.phase === "REALM_ASCENT") {
					const t = Math.min(1, sim.phaseTimer / 1.1);
					const smoothT = t * t * (3 - 2 * t);

					const entryGateway =
						BOARD_GATEWAYS.find((g) => g.id === rm.entryGatewayId) ||
						BOARD_GATEWAYS[0];
					const exitCoord = rm.ascentTargetCoord || {
						row: entryGateway.row,
						col: entryGateway.col,
						z: entryGateway.z,
						w: entryGateway.w,
					};
					boardToWorld(exitCoord.row, exitCoord.col, _vec3A);

					const srcX = realmCenter.x + rm.localPos.x;
					const srcY = realmCenter.y + 0.5;
					const srcZ = realmCenter.z + rm.localPos.z;

					const curX = THREE.MathUtils.lerp(srcX, _vec3A.x, smoothT);
					const curY = THREE.MathUtils.lerp(srcY, 0.0, smoothT);
					const curZ = THREE.MathUtils.lerp(srcZ, _vec3A.z, smoothT);

					if (playerRig) {
						playerRig.root.visible = true;
						playerRig.root.position.set(curX, curY, curZ);
						playerRig.root.scale.setScalar(
							THREE.MathUtils.lerp(1.32, 1.0, smoothT),
						);
						playerRig.root.rotation.y =
							(exploringPiece?.faction === "w" ? Math.PI : 0) +
							(1 - smoothT) * Math.PI * 2;
					}

					_camTargetPos.set(curX, curY + 4.5 + smoothT * 5.0, curZ + 7.5);
					_camLookTarget.set(curX, curY + 0.6, curZ);
					camera.position.lerp(_camTargetPos, 1 - Math.exp(-14 * rawDelta));
					sim.currentLookAt.lerp(_camLookTarget, 1 - Math.exp(-16 * rawDelta));
					camera.lookAt(sim.currentLookAt);
					camera.fov = THREE.MathUtils.damp(camera.fov, 45, 10, rawDelta);
					camera.updateProjectionMatrix();

					if (t >= 1 && exploringPiece) {
						if (sim.realmsRig) {
							syncRealmEntities3D(sim.realmsRig, [], []);
						}

						exploringPiece.inRealm = null;
						exploringPiece.realmTraversals =
							(exploringPiece.realmTraversals ?? 0) + 1;
						const targetTimelineId =
							rm.ascentTargetTimelineId || sim.multiverse.activeTimelineId;
						rm.travelerPieceId = null;
						rm.nearbyPortal = null;
						rm.nearbyPortalEval = null;
						rm.ascentTargetTimelineId = null;
						setRealmTraveler(null);
						setNearbyPortal(null);
						setNearbyPortalEval(null);
						setRealmStatusBanner(null);

						let activeTraveler = exploringPiece;
						let targetEnemy = rm.ascentTargetEnemy;

						// If emerging through a TIMELINE_PORTAL into an alternate timeline!
						if (targetTimelineId !== sim.multiverse.activeTimelineId) {
							syncActiveBranchFromSim();
							const deployRes = transitionTravelerToTimeline(
								sim.multiverse,
								exploringPiece,
								sim.multiverse.activeTimelineId,
								targetTimelineId,
								exitCoord,
							);
							const dstBranch = switchActiveTimeline(
								sim.multiverse,
								targetTimelineId,
							);
							rebuildSceneRigsForTimeline(dstBranch);
							activeTraveler = deployRes.mergedTraveler;
							targetEnemy =
								sim.pieces.find(
									(p) =>
										p.id !== activeTraveler.id &&
										p.faction !== activeTraveler.faction &&
										p.row === exitCoord.row &&
										p.col === exitCoord.col &&
										p.z === exitCoord.z &&
										p.w === exitCoord.w,
								) || null;
						}

						// Shift active slice view to the emergence square's 4D slice!
						sim.activeSliceW = exitCoord.w;
						sim.activeSliceZ = exitCoord.z;
						sim.targetMoveW = exitCoord.w;
						sim.targetMoveZ = exitCoord.z;
						setActiveSliceW(exitCoord.w);
						setActiveSliceZ(exitCoord.z);
						setTargetMoveW(exitCoord.w);
						setTargetMoveZ(exitCoord.z);

						if (targetEnemy && targetEnemy.faction !== activeTraveler.faction) {
							const ambushMove: MoveOption = {
								from: {
									row: entryGateway.row,
									col: entryGateway.col,
									z: entryGateway.z,
									w: entryGateway.w,
								},
								to: { ...exitCoord },
								isCapture: true,
								targetPiece: targetEnemy,
								dimensionType: "REALM_PORTAL_TRAVERSAL",
								dimensionLabel: rm.ascentPortalName || realmMeta.title,
							};
							initiateCombatDuel(activeTraveler, ambushMove, false);
						} else {
							// Peaceful emergence onto the destination square — consumes 1 chess turn!
							activeTraveler.row = exitCoord.row;
							activeTraveler.col = exitCoord.col;
							activeTraveler.z = exitCoord.z;
							activeTraveler.w = exitCoord.w;
							activeTraveler.hasMoved = true;
							activeTraveler.history.push({
								row: exitCoord.row,
								col: exitCoord.col,
								z: exitCoord.z,
								w: exitCoord.w,
								turn: sim.turnNumber + 1,
							});

							if (
								activeTraveler.type === "p" &&
								(activeTraveler.row === 0 || activeTraveler.row === 7)
							) {
								activeTraveler.type = "q";
								activeTraveler.maxHp = ARCHETYPES.q.maxHp;
								activeTraveler.hp = ARCHETYPES.q.maxHp;
								const oldRig = sim.pieceRigs.get(activeTraveler.id);
								if (oldRig?.root.parent) {
									const parent = oldRig.root.parent;
									parent.remove(oldRig.root);
									const promotedRig = createArticulatedPiece(
										"q",
										activeTraveler.faction,
									);
									parent.add(promotedRig.root);
									sim.pieceRigs.set(activeTraveler.id, promotedRig);
								}
							}

							const fromSq = formatSquareName({
								row: entryGateway.row,
								col: entryGateway.col,
							});
							const toSq = formatSquareName(exitCoord);

							setBattleLogs((prev) => [
								{
									id: `realm_emerge_${Date.now()}`,
									turnNumber: sim.turnNumber,
									summary: `Emerged from ${realmMeta.title} in ${sim.multiverse.activeTimelineId}: ${ARCHETYPES[activeTraveler.type].chessName} ${fromSq} → ${toSq}`,
									detail: `Warrior HP ${activeTraveler.hp}/${activeTraveler.maxHp}, Meter ${Math.round(activeTraveler.meter)}%.${rm.isParityInverted ? " Chiral Mirror Parity Active." : ""}${rm.crucibleAnvilClaimed ? " Hellfire Tempered." : ""}`,
									wasUpset: false,
									winnerFaction: activeTraveler.faction,
								},
								...prev.slice(0, 7),
							]);

							const nextFaction: Faction = sim.turnFaction === "w" ? "b" : "w";
							sim.turnFaction = nextFaction;
							sim.turnNumber += 1;
							syncActiveBranchFromSim();
							setMultiverseState({ ...sim.multiverse });
							sim.phase = "CHESS_VIEW";
							if (sim.controls) sim.controls.enabled = true;
							setTurnFaction(nextFaction);
							setTurnNumber(sim.turnNumber);
							setPhase("CHESS_VIEW");
							syncBoardHighlights();

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
									const aiDecision = chooseAIMove(currentSim.pieces, "b");
									if (aiDecision) {
										executeChessMove(aiDecision.piece, aiDecision.move);
									}
								}, 1000);
							}
						}
					}
				} else if (sim.phase === "REALM_EXPLORATION" && exploringPiece) {
					// ======================================================================
					// REAL-TIME 3RD-PERSON REALM EXPLORATION, HAZARDS, ECHOES & SENTINELS
					// ======================================================================
					rm.portalCooldownSec = Math.max(0, rm.portalCooldownSec - rawDelta);
					rm.hazardCooldownSec = Math.max(0, rm.hazardCooldownSec - rawDelta);
					rm.attackAnimTimerSec = Math.max(0, rm.attackAnimTimerSec - rawDelta);
					rm.dashTimerSec = Math.max(0, rm.dashTimerSec - rawDelta);

					// 1. Third-Person WASD / Arrow Key Movement (or Auto-Play / Click-to-Steer navigation!)
					let moveX = 0;
					let moveZ = 0;
					if (sim.keysHeld.KeyW || sim.keysHeld.ArrowUp) moveZ -= 1;
					if (sim.keysHeld.KeyS || sim.keysHeld.ArrowDown) moveZ += 1;
					if (sim.keysHeld.KeyA || sim.keysHeld.ArrowLeft) moveX -= 1;
					if (sim.keysHeld.KeyD || sim.keysHeld.ArrowRight) moveX += 1;

					if (Math.hypot(moveX, moveZ) > 0.05) {
						rm.steerTargetPortalId = null;
					} else if (
						rm.steerTargetPortalId ||
						sim.autoPlayDemo ||
						(sim.gameMode === "vs_ai" && exploringPiece.faction === "b")
					) {
						const portals = getPortalsForRealm(rm.currentRealmId);
						const targetP =
							portals.find((p) => p.id === rm.steerTargetPortalId) ||
							portals.find((p) => {
								if (p.kind !== "BOARD_ASCENT") return false;
								const ev = evaluatePortalBoardExit(
									p,
									exploringPiece,
									sim.pieces,
									rm.isParityInverted,
									rm.crucibleAnvilClaimed,
								);
								return ev && ev.status !== "ALLY_OBSTRUCTED";
							}) ||
							portals[0];

						if (targetP) {
							const dx = targetP.localPos.x - rm.localPos.x;
							const dz = targetP.localPos.z - rm.localPos.z;
							const dist = Math.hypot(dx, dz);
							if (dist > 1.05) {
								moveX = dx / dist;
								moveZ = dz / dist;
							} else if (rm.portalCooldownSec <= 0) {
								handleTraverseRealmPortal(targetP);
							}
						}
					}

					const inputLen = Math.hypot(moveX, moveZ);
					const baseMoveSpeed = 6.4 * (rm.dashTimerSec > 0 ? 2.15 : 1.0);
					if (inputLen > 0.01) {
						moveX /= inputLen;
						moveZ /= inputLen;
						rm.velocity.x = moveX * baseMoveSpeed;
						rm.velocity.z = moveZ * baseMoveSpeed;
						const targetYaw = Math.atan2(moveX, moveZ);
						let diffYaw = targetYaw - rm.yaw;
						while (diffYaw > Math.PI) diffYaw -= Math.PI * 2;
						while (diffYaw < -Math.PI) diffYaw += Math.PI * 2;
						rm.yaw += diffYaw * Math.min(1, rawDelta * 14);
					} else {
						rm.velocity.x *= Math.exp(-14 * rawDelta);
						rm.velocity.z *= Math.exp(-14 * rawDelta);
					}

					rm.localPos.x = THREE.MathUtils.clamp(
						rm.localPos.x + rm.velocity.x * rawDelta,
						-16.8,
						16.8,
					);
					rm.localPos.z = THREE.MathUtils.clamp(
						rm.localPos.z + rm.velocity.z * rawDelta,
						-16.8,
						16.8,
					);

					// Vertical Jump & Gravity Physics
					if (rm.localPos.y > 0 || rm.velocity.y !== 0) {
						rm.localPos.y += rm.velocity.y * rawDelta;
						rm.velocity.y -= 24.0 * rawDelta;
						if (rm.localPos.y <= 0) {
							rm.localPos.y = 0;
							rm.velocity.y = 0;
						}
					}

					// 2. REALM II MECHANIC: THE ASHEN CRUCIBLE — MOLTEN LAVA CHANNELS, FORGE PISTONS & HELLFIRE ANVIL
					if (rm.currentRealmId === "ASHEN_CRUCIBLE") {
						const haz = evaluateCrucibleHazards(
							rm.localPos.x,
							rm.localPos.z,
							elapsed,
						);
						if (haz.nearHellfireAnvil && !rm.crucibleAnvilClaimed) {
							handleTemperAtCrucibleAnvil();
						} else if (
							(haz.inLavaRiver || haz.hitByForgePiston) &&
							rm.localPos.y < 0.85 &&
							rm.hazardCooldownSec <= 0
						) {
							rm.hazardCooldownSec = 0.95;
							const dmg = haz.hitByForgePiston ? 12 : 8;
							exploringPiece.hp = Math.max(10, exploringPiece.hp - dmg);
							exploringPiece.persistentBurnMs = Math.max(
								exploringPiece.persistentBurnMs ?? 0,
								4000,
							);
							soundEngine.playCrucibleHazard(false);
							spawnHitSparks(
								vfxPool,
								realmCenter.x + rm.localPos.x,
								realmCenter.y + rm.localPos.y + 0.8,
								realmCenter.z + rm.localPos.z,
								0xf97316,
								22,
							);
							setRealmTraveler({ ...exploringPiece });
							setRealmStatusBanner(
								haz.hitByForgePiston
									? `CRUSHED BY TITANIC FORGE PISTON (-${dmg} HP & PERSISTENT BURN)!`
									: `SCORCHED BY MOLTEN SLAG RIVER (-${dmg} HP & PERSISTENT BURN)!`,
							);
						}
					}

					// 3. REALM III MECHANIC: THE ECHOING REMNANT — DETERMINISTIC CAUSALITY ECHO REPLAY & ABSORPTION
					if (rm.currentRealmId === "ECHOING_REMNANT") {
						for (const echo of rm.echoes) {
							if (echo.consumed) continue;
							const ex = THREE.MathUtils.lerp(
								echo.startLocalPos.x,
								echo.endLocalPos.x,
								echo.progress,
							);
							const ez = THREE.MathUtils.lerp(
								echo.startLocalPos.z,
								echo.endLocalPos.z,
								echo.progress,
							);
							const distToEcho = Math.hypot(
								rm.localPos.x - ex,
								rm.localPos.z - ez,
							);
							if (distToEcho < 1.95) {
								echo.consumed = true;
								if (echo.faction === exploringPiece.faction) {
									exploringPiece.meter = Math.min(
										100,
										exploringPiece.meter + 18,
									);
									exploringPiece.hp = Math.min(
										exploringPiece.maxHp,
										exploringPiece.hp + 8,
									);
									soundEngine.playQuantumEntangle(false);
									spawnAuraPillar(
										vfxPool,
										realmCenter.x + ex,
										realmCenter.z + ez,
										0x38bdf8,
									);
									setRealmStatusBanner(
										"ABSORBED ALLIED TEMPORAL ECHO (+18% METER, +8 HP)!",
									);
								} else {
									exploringPiece.persistentSlowMs = 3500;
									soundEngine.playQuantumEntangle(true);
									spawnShockwave(
										vfxPool,
										realmCenter.x + ex,
										realmCenter.y + 0.2,
										realmCenter.z + ez,
										0xf43f5e,
										4.0,
									);
									setRealmStatusBanner(
										"INTERCEPTED BY ENEMY TEMPORAL ECHO — CHRONO-STASIS APPLIED!",
									);
								}
								setRealmTraveler({ ...exploringPiece });
							}
						}
					}

					// 4. SUBTERRANEAN ENEMY SENTINEL PATROLS & REAL-TIME COMBAT ENCOUNTERS
					for (const sent of rm.sentinels) {
						if (sent.defeated || sent.realmId !== rm.currentRealmId) continue;
						const distToSent = Math.hypot(
							rm.localPos.x - sent.localPos.x,
							rm.localPos.z - sent.localPos.z,
						);
						const engageRadius = rm.attackAnimTimerSec > 0 ? 3.35 : 2.15;
						if (distToSent < engageRadius) {
							const realmDuelMove: MoveOption = {
								from: {
									row: exploringPiece.row,
									col: exploringPiece.col,
									z: exploringPiece.z,
									w: exploringPiece.w,
								},
								to: {
									row: sent.piece.row,
									col: sent.piece.col,
									z: sent.piece.z,
									w: sent.piece.w,
								},
								isCapture: true,
								targetPiece: sent.piece,
								dimensionType: "REALM_GATEWAY_DESCENT",
							};
							initiateCombatDuel(exploringPiece, realmDuelMove, false, {
								x: realmCenter.x + (rm.localPos.x + sent.localPos.x) * 0.5,
								y: realmCenter.y,
								z: realmCenter.z + (rm.localPos.z + sent.localPos.z) * 0.5,
								realmTitle: realmMeta.title,
								sentinelId: sent.id,
							});
							break;
						}
					}

					// 5. CHECK PORTAL PROXIMITY & PHYSICAL THRESHOLD CROSSING
					const realmPortals = getPortalsForRealm(rm.currentRealmId);
					let closestPortal: RealmPortalNode | null = null;
					let closestPortalDist = 3.4;
					for (const pNode of realmPortals) {
						const d = Math.hypot(
							rm.localPos.x - pNode.localPos.x,
							rm.localPos.z - pNode.localPos.z,
						);
						if (d < closestPortalDist) {
							closestPortalDist = d;
							closestPortal = pNode;
						}
						if (d < 1.35 && rm.portalCooldownSec <= 0) {
							handleTraverseRealmPortal(pNode);
							break;
						}
					}

					if (closestPortal?.id !== rm.nearbyPortal?.id) {
						rm.nearbyPortal = closestPortal;
						const evalRes =
							closestPortal &&
							(closestPortal.kind === "BOARD_ASCENT" ||
								closestPortal.kind === "TIMELINE_PORTAL")
								? (() => {
										const targetTlId =
											closestPortal.kind === "TIMELINE_PORTAL" &&
											closestPortal.targetTimelineId
												? closestPortal.targetTimelineId ===
													sim.multiverse.activeTimelineId
													? "TL-PRIME"
													: closestPortal.targetTimelineId
												: sim.multiverse.activeTimelineId;
										const tBranch =
											ensureBranchHydrated(sim.multiverse, targetTlId) ||
											ensureBranchHydrated(sim.multiverse, "TL-PRIME")!;
										const targetPieces =
											targetTlId === sim.multiverse.activeTimelineId
												? sim.pieces
												: tBranch.pieces;
										return evaluatePortalBoardExit(
											closestPortal,
											exploringPiece,
											targetPieces,
											rm.isParityInverted,
											rm.crucibleAnvilClaimed,
											tBranch.name,
										);
									})()
								: null;
						rm.nearbyPortalEval = evalRes;
						setNearbyPortal(closestPortal);
						setNearbyPortalEval(evalRes);
					}

					// 6. POSITION & ANIMATE THE PLAYER'S 3D WARRIOR RIG IN THE REALM
					if (playerRig) {
						playerRig.root.visible = true;
						playerRig.root.position.set(
							realmCenter.x + rm.localPos.x,
							realmCenter.y + rm.localPos.y,
							realmCenter.z + rm.localPos.z,
						);
						playerRig.root.scale.setScalar(1.32);
						playerRig.root.rotation.y = rm.yaw + Math.PI;

						const isMoving = Math.hypot(rm.velocity.x, rm.velocity.z) > 0.35;
						const walkCycle = elapsed * 12;
						playerRig.leftLegPivot.rotation.x = isMoving
							? Math.sin(walkCycle) * 0.55
							: 0;
						playerRig.rightLegPivot.rotation.x = isMoving
							? -Math.sin(walkCycle) * 0.55
							: 0;
						playerRig.bodyPivot.position.y =
							0.18 +
							(isMoving
								? Math.abs(Math.sin(walkCycle)) * 0.05
								: Math.sin(elapsed * 2.5) * 0.02);

						if (rm.attackAnimTimerSec > 0) {
							const swingT = 1 - rm.attackAnimTimerSec / 0.42;
							playerRig.rightArmPivot.rotation.set(
								-1.8 + Math.sin(swingT * Math.PI) * 2.2,
								0,
								-0.2,
							);
						} else {
							playerRig.rightArmPivot.rotation.set(
								isMoving ? -Math.sin(walkCycle) * 0.35 : -0.18,
								0,
								-0.08,
							);
						}
						playerRig.leftArmPivot.rotation.set(
							isMoving ? Math.sin(walkCycle) * 0.35 : -0.14,
							0,
							0.08,
						);
						playerRig.capePivot.rotation.x =
							0.22 +
							(isMoving
								? 0.35 + Math.sin(walkCycle * 1.5) * 0.12
								: Math.sin(elapsed * 2.5) * 0.05);

						const hpRatio =
							exploringPiece.hp / Math.max(1, exploringPiece.maxHp);
						playerRig.vitalityHaloMesh.visible = true;
						playerRig.vitalityHaloUniforms.uTime.value = elapsed;
						playerRig.vitalityHaloUniforms.uHpRatio.value = hpRatio;
						playerRig.vitalityHaloUniforms.uRecoverableRatio.value = hpRatio;
						playerRig.vitalityHaloUniforms.uGuardRatio.value =
							rm.isParityInverted ? 1.0 : 0.85;
						playerRig.vitalityHaloUniforms.uSpecialReady.value =
							exploringPiece.meter >=
							ARCHETYPES[exploringPiece.type].special.meterCost
								? 1.0
								: 0.0;
					}

					// 7. THIRD-PERSON FOLLOW & 360° MOUSE-LOOK CAMERA INSIDE THE SUBTERRANEAN REALM
					const totalRealmYaw = rm.yaw + sim.mouseLook.realmCamYawOffset;
					const rDist = sim.mouseLook.realmCamDistance;
					const rPitch = THREE.MathUtils.clamp(
						sim.mouseLook.realmCamPitch,
						-0.2,
						1.15,
					);
					const rHoriz = Math.cos(rPitch) * rDist;
					const camBackX = -Math.sin(totalRealmYaw) * rHoriz;
					const camBackZ = -Math.cos(totalRealmYaw) * rHoriz;
					_camTargetPos.set(
						realmCenter.x + rm.localPos.x + camBackX,
						realmCenter.y +
							rm.localPos.y +
							Math.max(0.6, 1.1 + Math.sin(rPitch) * rDist),
						realmCenter.z + rm.localPos.z + camBackZ,
					);
					_camLookTarget.set(
						realmCenter.x + rm.localPos.x + Math.sin(totalRealmYaw) * 2.2,
						realmCenter.y + rm.localPos.y + 1.15,
						realmCenter.z + rm.localPos.z + Math.cos(totalRealmYaw) * 2.2,
					);

					camera.position.lerp(_camTargetPos, 1 - Math.exp(-12 * rawDelta));
					sim.currentLookAt.lerp(_camLookTarget, 1 - Math.exp(-16 * rawDelta));
					camera.lookAt(sim.currentLookAt);
					camera.fov = THREE.MathUtils.damp(
						camera.fov,
						rm.dashTimerSec > 0 ? 64 : 52,
						12,
						rawDelta,
					);
					camera.updateProjectionMatrix();
				}
			} else if (sim.phase === "CAUSAL_COLLAPSE") {
				// ============================================================================
				// REALITY CONVERGENCE & CAUSAL ASSASSINATION COLLAPSE SEQUENCE ON THE 3D BOARD
				// ============================================================================
				sim.phaseTimer += rawDelta;
				const progress = Math.min(1, sim.phaseTimer / 2.4);
				const colRes = sim.activeCollapseResolution;
				const primaryErased = colRes?.[0]?.erasedPiece;

				if (primaryErased) {
					boardToWorld(primaryErased.row, primaryErased.col, _vec3A);
					const orbitAngle = sim.phaseTimer * 1.4;
					_camTargetPos.set(
						_vec3A.x + Math.sin(orbitAngle) * 4.2,
						3.2 + (1 - progress) * 1.5,
						_vec3A.z + Math.cos(orbitAngle) * 4.2 + 2.5,
					);
					_camLookTarget.set(
						_vec3A.x,
						0.9 + Math.sin(progress * Math.PI) * 0.8,
						_vec3A.z,
					);
					camera.position.lerp(_camTargetPos, 1 - Math.exp(-10 * rawDelta));
					sim.currentLookAt.lerp(_camLookTarget, 1 - Math.exp(-14 * rawDelta));
					camera.lookAt(sim.currentLookAt);
					camera.fov = THREE.MathUtils.damp(camera.fov, 34, 10, rawDelta);
					camera.updateProjectionMatrix();

					if (Math.random() < rawDelta * 18) {
						spawnHitSparks(
							vfxPool,
							_vec3A.x + (Math.random() - 0.5) * 0.8,
							0.8 + progress * 1.2,
							_vec3A.z + (Math.random() - 0.5) * 0.8,
							0xd946ef,
							8,
						);
					}
				}

				// Levitate, twist, and implode the doomed 3D rig(s) in a quantum singularity!
				for (const dRig of sim.collapseDoomedRigs) {
					dRig.root.position.y = Math.sin(progress * Math.PI * 0.8) * 1.85;
					dRig.root.rotation.y += rawDelta * (8 + progress * 24);
					dRig.root.rotation.z = Math.sin(elapsed * 28) * 0.35 * progress;
					const shrink = Math.max(0.01, 1.0 - progress ** 2.2);
					dRig.root.scale.setScalar(shrink);
				}

				if (sim.phaseTimer >= 2.4) {
					for (const dRig of sim.collapseDoomedRigs) {
						dRig.root.parent?.remove(dRig.root);
					}
					sim.collapseDoomedRigs = [];

					const regicideItem = colRes?.find((r) => r.erasedPiece.type === "k");
					if (regicideItem) {
						setWarVictor({
							faction: regicideItem.event.killerFaction,
							reason: `Multiversal Regicide! The Eternal Monarch's lineage [${regicideItem.event.victimLineageId}] was assassinated in ${regicideItem.event.sourceTimelineName} and erased from ${regicideItem.targetTimelineName} during Reality Convergence!`,
						});
						confetti({ particleCount: 140, spread: 95, origin: { y: 0.5 } });
					}

					sim.activeCollapseResolution = null;
					sim.phase = "CHESS_VIEW";
					if (sim.controls) sim.controls.enabled = true;
					setPhase("CHESS_VIEW");
					setActiveCollapseBanner(null);
					syncBoardHighlights();
				}
			}

			// Update & Render Live Perspective-Correct Portals (WebGLRenderTarget RTT) for both Board Gateways and Subterranean Realm Portals!
			if (sim.realmsRig && sim.phase !== "ACADEMIC_SIMULATOR") {
				const exploringPiece = sim.realm.travelerPieceId
					? (sim.pieces.find((p) => p.id === sim.realm.travelerPieceId) ?? null)
					: null;

				updateSubterraneanRealmsAndPortals(
					renderer,
					scene,
					camera,
					sim.realmsRig,
					elapsed,
					rawDelta,
					sim.phase,
					sim.realm.currentRealmId,
					exploringPiece,
					sim.pieces,
					sim.realm.isParityInverted,
					sim.realm.crucibleAnvilClaimed,
					sim.realm.echoes,
					sim.realm.sentinels,
				);
			}

			if (bloomPass) {
				const isUni = sim.phase === "ACADEMIC_SIMULATOR";
				bloomPass.strength = isUni ? 0.06 : 0.18;
				bloomPass.threshold = isUni ? 0.94 : 0.88;
			}

			if (composer) {
				composer.render();
			} else {
				renderer.render(scene, camera);
			}
		};

		animFrameId = requestAnimationFrame(animate);

		return () => {
			cancelAnimationFrame(animFrameId);
			renderer.domElement.removeEventListener(
				"webglcontextlost",
				onContextLost,
			);
			renderer.domElement.removeEventListener("pointerdown", onPointerDown);
			renderer.domElement.removeEventListener("pointermove", onPointerMove);
			renderer.domElement.removeEventListener("pointerup", onPointerUp);
			renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
			window.removeEventListener("keydown", onKeyDown);
			window.removeEventListener("keyup", onKeyUp);
			window.removeEventListener("resize", onResize);
			controls.dispose();
			if (composer) composer.dispose();
			renderer.dispose();
		};
	}, [
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
	]);
}
