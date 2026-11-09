import * as THREE from "three";
import {
	BOARD_GATEWAYS,
	evaluatePortalBoardExit,
	REALM_METADATA,
	REALM_PORTALS,
} from "../engine/realmEngine";
import type {
	BoardGateway,
	ChessPiece,
	RealmEnemySentinel,
	RealmId,
	RealmPortalNode,
	RealmTemporalEcho,
} from "../types/game";
import { boardToWorld } from "./arenaBuilder";
import {
	type ArticulatedPieceRig,
	createArticulatedPiece,
} from "./pieceModels";

export interface PortalMeshInstance {
	node: RealmPortalNode;
	group: THREE.Group;
	portalSurface: THREE.Mesh;
	frameMesh: THREE.Mesh;
	runeRingMesh: THREE.Mesh;
	barrierLockMesh: THREE.Mesh;
	renderTarget: THREE.WebGLRenderTarget;
	uniforms: {
		tPortal: { value: THREE.Texture };
		uTime: { value: number };
		uColor: { value: THREE.Color };
		uBlocked: { value: number };
		uContested: { value: number };
		uMirrorFlip: { value: number };
	};
}

export interface BoardGatewayMeshInstance {
	gateway: BoardGateway;
	group: THREE.Group;
	portalDisc: THREE.Mesh;
	outerRing: THREE.Mesh;
	innerRuneRing: THREE.Mesh;
	beamCylinder: THREE.Mesh;
	uniforms: {
		tPortal: { value: THREE.Texture };
		uTime: { value: number };
		uColor: { value: THREE.Color };
	};
}

export interface SubterraneanRealmsRig {
	rootGroup: THREE.Group;
	boardGatewaysGroup: THREE.Group;
	boardGatewayMeshes: Map<string, BoardGatewayMeshInstance>;
	realmGroups: Record<RealmId, THREE.Group>;
	portalInstances: Map<string, PortalMeshInstance>;
	// Realm-specific animated props
	mirrorShards: THREE.Mesh[];
	mirrorInverterArch: THREE.Group;
	crucibleLavaUniforms: {
		uTime: { value: number };
	};
	cruciblePistons: {
		group: THREE.Group;
		x: number;
		z: number;
		phase: number;
		warningRing: THREE.Mesh;
	}[];
	crucibleAnvilGroup: THREE.Group;
	crucibleAnvilGem: THREE.Mesh;
	remnantAstrolabeRings: THREE.Mesh[];
	remnantEchoGroup: THREE.Group;
	remnantEchoRigs: Map<
		string,
		{ rig: ArticulatedPieceRig; trailLine: THREE.Line }
	>;
	sentinelGroup: THREE.Group;
	sentinelRigs: Map<string, ArticulatedPieceRig>;
	realmPointLights: Record<RealmId, THREE.PointLight[]>;
	sharedRealmRenderTargets: Record<RealmId, THREE.WebGLRenderTarget>;
	portalCamera: THREE.PerspectiveCamera;
}

const PORTAL_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  varying vec4 vScreenPos;
  varying vec3 vViewDir;
  varying vec3 vNormalView;

  void main() {
    vUv = uv;
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mvPos.xyz);
    vNormalView = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * mvPos;
    vScreenPos = gl_Position;
  }
`;

const PORTAL_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D tPortal;
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uBlocked;
  uniform float uContested;
  uniform float uMirrorFlip;

  varying vec2 vUv;
  varying vec4 vScreenPos;
  varying vec3 vViewDir;
  varying vec3 vNormalView;

  void main() {
    // Perspective-correct screen-space UV blended with local portal UV for crisp portal windowing
    vec2 ndc = (vScreenPos.xy / max(0.0001, vScreenPos.w)) * 0.5 + 0.5;
    vec2 baseUv = mix(vUv, ndc, 0.68);
    if (uMirrorFlip > 0.5) {
      baseUv.x = 1.0 - baseUv.x;
    }

    vec2 centered = vUv * 2.0 - 1.0;
    float dist = length(centered);

    // Subtle dimensional ripple near the portal rim
    float ripple = sin(dist * 18.0 - uTime * 4.2) * 0.012 * smoothstep(0.35, 1.0, dist);
    vec2 sampleUv = clamp(baseUv + centered * ripple, 0.02, 0.98);

    // Chromatic aberration near the dimensional boundary
    float chroma = 0.008 * smoothstep(0.4, 1.0, dist);
    vec3 colR = texture2D(tPortal, clamp(sampleUv + vec2(chroma, 0.0), 0.01, 0.99)).rgb;
    vec3 colG = texture2D(tPortal, sampleUv).rgb;
    vec3 colB = texture2D(tPortal, clamp(sampleUv - vec2(chroma, 0.0), 0.01, 0.99)).rgb;
    vec3 portalScene = vec3(colR.r, colG.g, colB.b);

    // Boost portal interior brightness slightly so deep subterranean worlds read vividly through the frame
    portalScene = portalScene * 1.35 + uColor * 0.08;

    // Fresnel & edge energy vortex
    float fresnel = pow(1.0 - abs(dot(vViewDir, vNormalView)), 2.2);
    float rimGlow = smoothstep(0.62, 0.98, dist) + fresnel * 0.45;
    vec3 activeColor = uContested > 0.5 ? vec3(0.96, 0.25, 0.37) : uColor;

    vec3 finalCol = mix(portalScene, activeColor * 1.65, clamp(rimGlow * 0.72, 0.0, 1.0));

    // If obstructed by an allied piece on the board, render interlocking golden/crimson ward bars
    if (uBlocked > 0.5) {
      float bars = step(0.65, fract((vUv.x + vUv.y) * 9.0 + uTime * 0.5)) +
                   step(0.65, fract((vUv.x - vUv.y) * 9.0 - uTime * 0.5));
      finalCol = mix(finalCol * 0.35, vec3(0.95, 0.3, 0.2), clamp(bars * 0.85, 0.0, 1.0));
    }

    gl_FragColor = vec4(finalCol, 0.96);
  }
`;

const LAVA_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const LAVA_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vWorldPos;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  void main() {
    vec2 p = vWorldPos.xz * 0.38 + vec2(0.0, uTime * 0.45);
    float n1 = noise(p);
    float n2 = noise(p * 2.3 - vec2(uTime * 0.3, uTime * 0.6));
    float magma = n1 * 0.6 + n2 * 0.4;

    vec3 crust = vec3(0.09, 0.03, 0.02);
    vec3 lavaOrange = vec3(0.98, 0.38, 0.05);
    vec3 lavaWhiteHot = vec3(1.0, 0.88, 0.35);

    vec3 col = mix(crust, lavaOrange, smoothstep(0.32, 0.65, magma));
    col = mix(col, lavaWhiteHot, smoothstep(0.68, 0.88, magma));

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function createSubterraneanRealms(
	renderer: THREE.WebGLRenderer,
): SubterraneanRealmsRig {
	const rootGroup = new THREE.Group();
	const boardGatewaysGroup = new THREE.Group();
	rootGroup.add(boardGatewaysGroup);

	const portalCamera = new THREE.PerspectiveCamera(55, 1.0, 0.2, 160);

	// Shared RenderTargets for each realm so Board Gateways on the chessboard look directly into the live 3D realms below!
	const sharedRealmRenderTargets: Record<RealmId, THREE.WebGLRenderTarget> = {
		SHATTERED_MIRROR: new THREE.WebGLRenderTarget(384, 384, {
			minFilter: THREE.LinearFilter,
			magFilter: THREE.LinearFilter,
			format: THREE.RGBAFormat,
		}),
		ASHEN_CRUCIBLE: new THREE.WebGLRenderTarget(384, 384, {
			minFilter: THREE.LinearFilter,
			magFilter: THREE.LinearFilter,
			format: THREE.RGBAFormat,
		}),
		ECHOING_REMNANT: new THREE.WebGLRenderTarget(384, 384, {
			minFilter: THREE.LinearFilter,
			magFilter: THREE.LinearFilter,
			format: THREE.RGBAFormat,
		}),
	};

	// ============================================================================
	// 1. BUILD BOARD GATEWAY WELLS ON THE 4D CHESSBOARD
	// ============================================================================
	const boardGatewayMeshes = new Map<string, BoardGatewayMeshInstance>();
	const gwDiscGeo = new THREE.CircleGeometry(0.52, 32);
	const gwOuterRingGeo = new THREE.TorusGeometry(0.55, 0.045, 12, 36);
	const gwInnerRuneGeo = new THREE.RingGeometry(0.38, 0.48, 6);
	const gwBeamGeo = new THREE.CylinderGeometry(0.48, 0.54, 1.65, 24, 1, true);

	for (const gw of BOARD_GATEWAYS) {
		const gwGroup = new THREE.Group();
		const pos = boardToWorld(gw.row, gw.col);
		gwGroup.position.set(pos.x, 0.016, pos.z);

		const uniforms = {
			tPortal: { value: sharedRealmRenderTargets[gw.realmId].texture },
			uTime: { value: 0 },
			uColor: { value: new THREE.Color(gw.colorHex) },
			uBlocked: { value: 0 },
			uContested: { value: 0 },
			uMirrorFlip: { value: gw.realmId === "SHATTERED_MIRROR" ? 1.0 : 0.0 },
		};

		const discMat = new THREE.ShaderMaterial({
			vertexShader: PORTAL_VERTEX_SHADER,
			fragmentShader: PORTAL_FRAGMENT_SHADER,
			uniforms,
			transparent: true,
			depthWrite: false,
		});

		const portalDisc = new THREE.Mesh(gwDiscGeo, discMat);
		portalDisc.rotation.x = -Math.PI / 2;
		portalDisc.userData = {
			type: "tile",
			row: gw.row,
			col: gw.col,
			gatewayId: gw.id,
		};
		gwGroup.add(portalDisc);

		const outerRingMat = new THREE.MeshStandardMaterial({
			color: 0x1e293b,
			emissive: gw.colorHex,
			emissiveIntensity: 0.65,
			metalness: 0.88,
			roughness: 0.22,
		});
		const outerRing = new THREE.Mesh(gwOuterRingGeo, outerRingMat);
		outerRing.rotation.x = Math.PI / 2;
		outerRing.position.y = 0.02;
		gwGroup.add(outerRing);

		const innerRuneMat = new THREE.MeshBasicMaterial({
			color: gw.colorHex,
			side: THREE.DoubleSide,
			transparent: true,
			opacity: 0.72,
			depthWrite: false,
		});
		const innerRuneRing = new THREE.Mesh(gwInnerRuneGeo, innerRuneMat);
		innerRuneRing.rotation.x = -Math.PI / 2;
		innerRuneRing.position.y = 0.028;
		gwGroup.add(innerRuneRing);

		const beamMat = new THREE.MeshBasicMaterial({
			color: gw.colorHex,
			transparent: true,
			opacity: 0.14,
			side: THREE.DoubleSide,
			depthWrite: false,
			blending: THREE.AdditiveBlending,
		});
		const beamCylinder = new THREE.Mesh(gwBeamGeo, beamMat);
		beamCylinder.position.y = 0.82;
		gwGroup.add(beamCylinder);

		boardGatewaysGroup.add(gwGroup);
		boardGatewayMeshes.set(gw.id, {
			gateway: gw,
			group: gwGroup,
			portalDisc,
			outerRing,
			innerRuneRing,
			beamCylinder,
			uniforms,
		});
	}

	// ============================================================================
	// 2. BUILD THE THREE SUBTERRANEAN REALMS
	// ============================================================================
	const realmGroups: Record<RealmId, THREE.Group> = {
		SHATTERED_MIRROR: new THREE.Group(),
		ASHEN_CRUCIBLE: new THREE.Group(),
		ECHOING_REMNANT: new THREE.Group(),
	};

	const realmPointLights: Record<RealmId, THREE.PointLight[]> = {
		SHATTERED_MIRROR: [],
		ASHEN_CRUCIBLE: [],
		ECHOING_REMNANT: [],
	};

	for (const rId of [
		"SHATTERED_MIRROR",
		"ASHEN_CRUCIBLE",
		"ECHOING_REMNANT",
	] as RealmId[]) {
		const meta = REALM_METADATA[rId];
		realmGroups[rId].position.set(
			meta.worldCenter.x,
			meta.worldCenter.y,
			meta.worldCenter.z,
		);
		rootGroup.add(realmGroups[rId]);
	}

	// ----------------------------------------------------------------------------
	// REALM I: THE SHATTERED MIRROR (Cathedral of Chiral Inversion)
	// ----------------------------------------------------------------------------
	const mirrorGroup = realmGroups.SHATTERED_MIRROR;
	const mirrorFloorMat = new THREE.MeshPhysicalMaterial({
		color: 0x0b1120,
		roughness: 0.14,
		metalness: 0.78,
		clearcoat: 0.9,
		clearcoatRoughness: 0.1,
	});
	const mirrorFloor = new THREE.Mesh(
		new THREE.CylinderGeometry(21.5, 23.0, 1.2, 48),
		mirrorFloorMat,
	);
	mirrorFloor.position.y = -0.6;
	mirrorFloor.receiveShadow = true;
	mirrorGroup.add(mirrorFloor);

	// Chiral Checkerboard Inlaid Sanctuary Ring
	const mirrorGridGroup = new THREE.Group();
	const mirrorTileLight = new THREE.MeshPhysicalMaterial({
		color: 0x94a3b8,
		roughness: 0.15,
		metalness: 0.85,
		clearcoat: 1.0,
	});
	const mirrorTileDark = new THREE.MeshPhysicalMaterial({
		color: 0x0f172a,
		roughness: 0.18,
		metalness: 0.75,
		clearcoat: 0.9,
	});
	const mTileGeo = new THREE.BoxGeometry(2.6, 0.12, 2.6);
	for (let r = -4; r <= 3; r++) {
		for (let c = -4; c <= 3; c++) {
			const isLight = (r + c + 16) % 2 === 0;
			const mTile = new THREE.Mesh(
				mTileGeo,
				isLight ? mirrorTileLight : mirrorTileDark,
			);
			mTile.position.set((c + 0.5) * 2.65, 0.02, (r + 0.5) * 2.65);
			mirrorGridGroup.add(mTile);

			// Upside-down Gravity-Defying Inverted Cathedral Board suspended overhead at y = +22!
			const invTile = new THREE.Mesh(
				mTileGeo,
				isLight ? mirrorTileDark : mirrorTileLight,
			);
			invTile.position.set((c + 0.5) * 2.65, 22.0, (r + 0.5) * 2.65);
			mirrorGridGroup.add(invTile);
		}
	}
	mirrorGroup.add(mirrorGridGroup);

	// Gothic Cathedral Ribbed Vault Arches & Floating Shattered Mirror Monoliths
	const mirrorPillarMat = new THREE.MeshStandardMaterial({
		color: 0x1e293b,
		metalness: 0.82,
		roughness: 0.24,
	});
	const mirrorGlassMat = new THREE.MeshPhysicalMaterial({
		color: 0x38bdf8,
		emissive: 0x1e1b4b,
		emissiveIntensity: 0.45,
		metalness: 0.92,
		roughness: 0.06,
		clearcoat: 1.0,
		transparent: true,
		opacity: 0.82,
		side: THREE.DoubleSide,
	});

	const mirrorShards: THREE.Mesh[] = [];
	const pillarGeo = new THREE.CylinderGeometry(0.65, 0.85, 22.0, 12);
	const shardGeo = new THREE.OctahedronGeometry(2.4, 0);

	for (let i = 0; i < 12; i++) {
		const angle = (i / 12) * Math.PI * 2;
		const rad = 18.8;
		const px = Math.cos(angle) * rad;
		const pz = Math.sin(angle) * rad;

		const pillar = new THREE.Mesh(pillarGeo, mirrorPillarMat);
		pillar.position.set(px, 11.0, pz);
		mirrorGroup.add(pillar);

		// Floating Crystalline Mirror Shard Monoliths
		const shard = new THREE.Mesh(shardGeo, mirrorGlassMat);
		shard.scale.set(0.85, 2.6, 0.18);
		shard.position.set(
			Math.cos(angle + 0.25) * 13.5,
			5.2 + (i % 3) * 2.2,
			Math.sin(angle + 0.25) * 13.5,
		);
		shard.rotation.y = -angle + Math.PI / 2;
		shard.userData = { baseY: shard.position.y, phase: i * 0.7 };
		mirrorGroup.add(shard);
		mirrorShards.push(shard);
	}

	// Colossal Chess Landmarks in Shattered Mirror: 2 Towering 9m Glass-Steel Bishops Flanking the Nave
	for (const side of [-1, 1]) {
		const colossus = createArticulatedPiece(
			side < 0 ? "b" : "q",
			side < 0 ? "w" : "b",
		);
		colossus.root.scale.setScalar(4.8);
		colossus.root.position.set(side * 9.5, 0, -8.5);
		colossus.root.rotation.y = side < 0 ? 0.4 : -0.4;
		mirrorGroup.add(colossus.root);

		// Inverted Twin Colossus hanging upside down from the ceiling vault at y = 22!
		const invColossus = createArticulatedPiece(
			side < 0 ? "b" : "q",
			side < 0 ? "b" : "w",
		);
		invColossus.root.scale.setScalar(4.2);
		invColossus.root.position.set(side * 9.5, 22.0, -8.5);
		invColossus.root.rotation.x = Math.PI;
		mirrorGroup.add(invColossus.root);
	}

	const mirrorLight1 = new THREE.PointLight(0x38bdf8, 36, 42);
	mirrorLight1.position.set(0, 10, -10);
	const mirrorLight2 = new THREE.PointLight(0xc084fc, 36, 42);
	mirrorLight2.position.set(0, 10, 10);
	mirrorGroup.add(mirrorLight1, mirrorLight2);
	realmPointLights.SHATTERED_MIRROR.push(mirrorLight1, mirrorLight2);

	// ----------------------------------------------------------------------------
	// REALM II: THE ASHEN CRUCIBLE (Infernal Under-Forge)
	// ----------------------------------------------------------------------------
	const crucibleGroup = realmGroups.ASHEN_CRUCIBLE;

	const crucibleLavaUniforms = {
		uTime: { value: 0 },
	};
	const lavaMat = new THREE.ShaderMaterial({
		vertexShader: LAVA_VERTEX_SHADER,
		fragmentShader: LAVA_FRAGMENT_SHADER,
		uniforms: crucibleLavaUniforms,
	});

	// Expansive Molten Magma Sea beneath the Crucible
	const lavaSea = new THREE.Mesh(
		new THREE.CylinderGeometry(24.0, 24.0, 0.5, 48),
		lavaMat,
	);
	lavaSea.position.y = -0.55;
	crucibleGroup.add(lavaSea);

	// Three Basalt Forge Islands (West Bank, Central Anvil Island, East Bank) + North/South Rim
	const basaltMat = new THREE.MeshStandardMaterial({
		color: 0x1c1917,
		roughness: 0.78,
		metalness: 0.32,
	});
	const ironGratingsMat = new THREE.MeshStandardMaterial({
		color: 0x292524,
		roughness: 0.42,
		metalness: 0.85,
		emissive: 0x7c2d12,
		emissiveIntensity: 0.25,
	});

	// Central Island (`x ∈ [-4.15, 4.15], z ∈ [-16, 16]`)
	const centerIsland = new THREE.Mesh(
		new THREE.BoxGeometry(8.3, 0.8, 34.0),
		basaltMat,
	);
	centerIsland.position.set(0, -0.4, 0);
	crucibleGroup.add(centerIsland);

	// West Bank (`x ∈ [-18, -7.85]`) & East Bank (`x ∈ [7.85, 18]`)
	const westBank = new THREE.Mesh(
		new THREE.BoxGeometry(10.2, 0.8, 30.0),
		basaltMat,
	);
	westBank.position.set(-12.95, -0.4, 0);
	crucibleGroup.add(westBank);

	const eastBank = new THREE.Mesh(
		new THREE.BoxGeometry(10.2, 0.8, 30.0),
		basaltMat,
	);
	eastBank.position.set(12.95, -0.4, 0);
	crucibleGroup.add(eastBank);

	// Three Suspended Slag-Iron Causeway Bridges spanning the Molten Rivers (`z = 0`, `z = -12.5`, `z = +12.5`)
	const bridgeGeo = new THREE.BoxGeometry(18.0, 0.28, 4.2);
	for (const bz of [-12.5, 0, 12.5]) {
		const bridge = new THREE.Mesh(bridgeGeo, ironGratingsMat);
		bridge.position.set(0, -0.08, bz);
		crucibleGroup.add(bridge);
	}

	// Four Titanic Reciprocating Forge Pistons that slam down onto the bridges!
	const cruciblePistons: {
		group: THREE.Group;
		x: number;
		z: number;
		phase: number;
		warningRing: THREE.Mesh;
	}[] = [];

	const pistonSpecs = [
		{ x: -6.0, z: 0.0, phase: 0.0 },
		{ x: 6.0, z: 0.0, phase: Math.PI },
		{ x: 0.0, z: -8.2, phase: Math.PI * 0.5 },
		{ x: 0.0, z: 8.2, phase: Math.PI * 1.5 },
	];

	const hammerHeadGeo = new THREE.CylinderGeometry(1.45, 1.55, 2.8, 16);
	const hammerShaftGeo = new THREE.CylinderGeometry(0.45, 0.45, 16.0, 12);
	const hammerMat = new THREE.MeshStandardMaterial({
		color: 0x27272a,
		metalness: 0.9,
		roughness: 0.28,
		emissive: 0xea580c,
		emissiveIntensity: 0.35,
	});
	const warnGeo = new THREE.RingGeometry(1.1, 1.65, 24);

	for (const ps of pistonSpecs) {
		const pGroup = new THREE.Group();
		pGroup.position.set(ps.x, 4.5, ps.z);

		const head = new THREE.Mesh(hammerHeadGeo, hammerMat);
		head.position.y = 1.4;
		pGroup.add(head);

		const shaft = new THREE.Mesh(hammerShaftGeo, hammerMat);
		shaft.position.y = 10.4;
		pGroup.add(shaft);

		crucibleGroup.add(pGroup);

		const warnMat = new THREE.MeshBasicMaterial({
			color: 0xf97316,
			side: THREE.DoubleSide,
			transparent: true,
			opacity: 0.55,
			depthWrite: false,
		});
		const warningRing = new THREE.Mesh(warnGeo, warnMat);
		warningRing.rotation.x = -Math.PI / 2;
		warningRing.position.set(ps.x, 0.08, ps.z);
		crucibleGroup.add(warningRing);

		cruciblePistons.push({
			group: pGroup,
			x: ps.x,
			z: ps.z,
			phase: ps.phase,
			warningRing,
		});
	}

	// Central Hellfire Tempering Anvil Shrine at `(0, 0, 0)`
	const crucibleAnvilGroup = new THREE.Group();
	const anvilBase = new THREE.Mesh(
		new THREE.CylinderGeometry(1.6, 2.1, 0.9, 8),
		ironGratingsMat,
	);
	anvilBase.position.y = 0.45;
	crucibleAnvilGroup.add(anvilBase);

	const crucibleAnvilGem = new THREE.Mesh(
		new THREE.OctahedronGeometry(0.72, 1),
		new THREE.MeshStandardMaterial({
			color: 0xf59e0b,
			emissive: 0xf97316,
			emissiveIntensity: 2.2,
			roughness: 0.1,
			metalness: 0.3,
		}),
	);
	crucibleAnvilGem.position.y = 1.85;
	crucibleAnvilGroup.add(crucibleAnvilGem);
	crucibleGroup.add(crucibleAnvilGroup);

	// Colossal Chess Landmarks in Ashen Crucible: 4 Towering Iron-Forged Rook Siege Monoliths
	for (const [rx, rz] of [
		[-11, -11],
		[11, -11],
		[-11, 11],
		[11, 11],
	]) {
		const rookColossus = createArticulatedPiece("r", "b");
		rookColossus.root.scale.setScalar(5.2);
		rookColossus.root.position.set(rx, 0, rz);
		rookColossus.root.rotation.y = Math.atan2(-rx, -rz);
		crucibleGroup.add(rookColossus.root);
	}

	const crucibleLight1 = new THREE.PointLight(0xf97316, 48, 46);
	crucibleLight1.position.set(0, 9, 0);
	const crucibleLight2 = new THREE.PointLight(0xef4444, 34, 40);
	crucibleLight2.position.set(-10, 8, -8);
	const crucibleLight3 = new THREE.PointLight(0xf59e0b, 34, 40);
	crucibleLight3.position.set(10, 8, 8);
	crucibleGroup.add(crucibleLight1, crucibleLight2, crucibleLight3);
	realmPointLights.ASHEN_CRUCIBLE.push(
		crucibleLight1,
		crucibleLight2,
		crucibleLight3,
	);

	// ----------------------------------------------------------------------------
	// REALM III: THE ECHOING REMNANT (Mausoleum of Recorded Causality)
	// ----------------------------------------------------------------------------
	const remnantGroup = realmGroups.ECHOING_REMNANT;
	const remnantFloorMat = new THREE.MeshPhysicalMaterial({
		color: 0x061917,
		roughness: 0.25,
		metalness: 0.65,
		clearcoat: 0.6,
	});
	const remnantFloor = new THREE.Mesh(
		new THREE.CylinderGeometry(21.5, 23.0, 1.2, 48),
		remnantFloorMat,
	);
	remnantFloor.position.y = -0.6;
	remnantGroup.add(remnantFloor);

	// 64 Chronos Memory Plinths mapping the 8x8 Chessboard into the Mausoleum
	const plinthGeo = new THREE.BoxGeometry(2.75, 0.16, 2.75);
	const plinthLightMat = new THREE.MeshStandardMaterial({
		color: 0x0f2926,
		emissive: 0x0d9488,
		emissiveIntensity: 0.18,
		roughness: 0.35,
		metalness: 0.6,
	});
	const plinthDarkMat = new THREE.MeshStandardMaterial({
		color: 0x041210,
		roughness: 0.45,
		metalness: 0.7,
	});

	for (let r = 0; r < 8; r++) {
		for (let c = 0; c < 8; c++) {
			const isLight = (r + c) % 2 === 0;
			const plinth = new THREE.Mesh(
				plinthGeo,
				isLight ? plinthLightMat : plinthDarkMat,
			);
			plinth.position.set((c - 3.5) * 3.1, 0.04, (r - 3.5) * 3.1);
			remnantGroup.add(plinth);
		}
	}

	// Enormous Rotating Celestial Astrolabe Rings (`24m`, `28m`, `32m` diameter)
	const remnantAstrolabeRings: THREE.Mesh[] = [];
	const astroMat = new THREE.MeshStandardMaterial({
		color: 0x2dd4bf,
		emissive: 0x14b8a6,
		emissiveIntensity: 0.65,
		metalness: 0.85,
		roughness: 0.2,
	});
	for (let i = 0; i < 3; i++) {
		const ring = new THREE.Mesh(
			new THREE.TorusGeometry(19.5 + i * 2.4, 0.18, 12, 64),
			astroMat,
		);
		ring.position.y = 6.5 + i * 1.5;
		ring.rotation.x = Math.PI * (0.22 + i * 0.18);
		remnantGroup.add(ring);
		remnantAstrolabeRings.push(ring);
	}

	// Colossal Fallen Sovereign King Monument overlooking the Echoing Remnant
	const fallenKing = createArticulatedPiece("k", "w");
	fallenKing.root.scale.setScalar(5.8);
	fallenKing.root.position.set(-11.5, 0, -11.5);
	fallenKing.root.rotation.y = Math.PI * 0.25;
	remnantGroup.add(fallenKing.root);

	const remnantEchoGroup = new THREE.Group();
	remnantGroup.add(remnantEchoGroup);
	const remnantEchoRigs = new Map<
		string,
		{ rig: ArticulatedPieceRig; trailLine: THREE.Line }
	>();

	const remnantLight1 = new THREE.PointLight(0x34d399, 38, 45);
	remnantLight1.position.set(0, 11, 0);
	const remnantLight2 = new THREE.PointLight(0x22d3ee, 30, 40);
	remnantLight2.position.set(10, 8, -10);
	remnantGroup.add(remnantLight1, remnantLight2);
	realmPointLights.ECHOING_REMNANT.push(remnantLight1, remnantLight2);

	// ============================================================================
	// 3. BUILD PHYSICAL PORTAL ARCHWAYS IN ALL THREE REALMS
	// ============================================================================
	const portalInstances = new Map<string, PortalMeshInstance>();
	let mirrorInverterArch = new THREE.Group();

	const portalPlaneGeo = new THREE.PlaneGeometry(3.4, 5.2, 16, 16);
	const inverterPlaneGeo = new THREE.PlaneGeometry(5.6, 7.2, 20, 20);
	const archPillarGeo = new THREE.BoxGeometry(0.55, 5.6, 0.55);
	const archLintelGeo = new THREE.BoxGeometry(4.6, 0.65, 0.75);
	const runeHaloGeo = new THREE.TorusGeometry(2.35, 0.08, 12, 36);

	for (const pNode of REALM_PORTALS) {
		const pGroup = new THREE.Group();
		pGroup.position.set(pNode.localPos.x, pNode.localPos.y, pNode.localPos.z);
		pGroup.rotation.y = pNode.yaw;

		const isInverter = pNode.kind === "MIRROR_INVERTER";
		const rt = new THREE.WebGLRenderTarget(384, 384, {
			minFilter: THREE.LinearFilter,
			magFilter: THREE.LinearFilter,
			format: THREE.RGBAFormat,
		});

		const uniforms = {
			tPortal: { value: rt.texture },
			uTime: { value: 0 },
			uColor: { value: new THREE.Color(pNode.colorHex) },
			uBlocked: { value: 0 },
			uContested: { value: 0 },
			uMirrorFlip: { value: isInverter ? 1.0 : 0.0 },
		};

		const portalMat = new THREE.ShaderMaterial({
			vertexShader: PORTAL_VERTEX_SHADER,
			fragmentShader: PORTAL_FRAGMENT_SHADER,
			uniforms,
			side: THREE.DoubleSide,
			transparent: true,
		});

		const portalSurface = new THREE.Mesh(
			isInverter ? inverterPlaneGeo : portalPlaneGeo,
			portalMat,
		);
		portalSurface.position.y = isInverter ? 3.6 : 2.6;
		pGroup.add(portalSurface);

		const frameMat = new THREE.MeshStandardMaterial({
			color: 0x0f172a,
			emissive: pNode.colorHex,
			emissiveIntensity: 0.55,
			metalness: 0.88,
			roughness: 0.2,
		});

		const halfSpan = isInverter ? 2.95 : 1.85;
		const height = isInverter ? 7.4 : 5.4;

		const leftCol = new THREE.Mesh(archPillarGeo, frameMat);
		leftCol.scale.y = height / 5.6;
		leftCol.position.set(-halfSpan, height * 0.5, 0);
		pGroup.add(leftCol);

		const rightCol = new THREE.Mesh(archPillarGeo, frameMat);
		rightCol.scale.y = height / 5.6;
		rightCol.position.set(halfSpan, height * 0.5, 0);
		pGroup.add(rightCol);

		const lintel = new THREE.Mesh(archLintelGeo, frameMat);
		lintel.scale.x = (halfSpan * 2 + 0.7) / 4.6;
		lintel.position.set(0, height + 0.2, 0);
		pGroup.add(lintel);

		const runeRingMesh = new THREE.Mesh(
			runeHaloGeo,
			new THREE.MeshBasicMaterial({
				color: pNode.colorHex,
				wireframe: true,
				transparent: true,
				opacity: 0.5,
			}),
		);
		runeRingMesh.position.set(0, isInverter ? 3.6 : 2.6, 0.08);
		if (isInverter) runeRingMesh.scale.setScalar(1.35);
		pGroup.add(runeRingMesh);

		// Ward barrier mesh shown when a BOARD_ASCENT exit square is obstructed by an allied piece
		const barrierLockMesh = new THREE.Mesh(
			new THREE.RingGeometry(0.65, 1.45, 6),
			new THREE.MeshBasicMaterial({
				color: 0xef4444,
				side: THREE.DoubleSide,
				transparent: true,
				opacity: 0.85,
			}),
		);
		barrierLockMesh.position.set(0, 2.6, 0.14);
		barrierLockMesh.visible = false;
		pGroup.add(barrierLockMesh);

		if (isInverter) {
			mirrorInverterArch = pGroup;
		}

		realmGroups[pNode.realmId].add(pGroup);
		portalInstances.set(pNode.id, {
			node: pNode,
			group: pGroup,
			portalSurface,
			frameMesh: lintel,
			runeRingMesh,
			barrierLockMesh,
			renderTarget: rt,
			uniforms,
		});
	}

	const sentinelGroup = new THREE.Group();
	rootGroup.add(sentinelGroup);
	const sentinelRigs = new Map<string, ArticulatedPieceRig>();

	// Suppress unused renderer warning
	void renderer;

	return {
		rootGroup,
		boardGatewaysGroup,
		boardGatewayMeshes,
		realmGroups,
		portalInstances,
		mirrorShards,
		mirrorInverterArch,
		crucibleLavaUniforms,
		cruciblePistons,
		crucibleAnvilGroup,
		crucibleAnvilGem,
		remnantAstrolabeRings,
		remnantEchoGroup,
		remnantEchoRigs,
		sentinelGroup,
		sentinelRigs,
		realmPointLights,
		sharedRealmRenderTargets,
		portalCamera,
	};
}

/**
 * Synchronizes the 3D Temporal Echoes in THE ECHOING REMNANT and Realm Sentinels
 * whenever a warrior enters the subterranean worlds.
 */
export function syncRealmEntities3D(
	realmsRig: SubterraneanRealmsRig,
	echoes: RealmTemporalEcho[],
	sentinels: RealmEnemySentinel[],
) {
	// 1. Rebuild Temporal Echoes in Echoing Remnant
	realmsRig.remnantEchoRigs.forEach(({ rig, trailLine }) => {
		realmsRig.remnantEchoGroup.remove(rig.root);
		realmsRig.remnantEchoGroup.remove(trailLine);
	});
	realmsRig.remnantEchoRigs.clear();

	for (const echo of echoes) {
		const rig = createArticulatedPiece(echo.pieceType, echo.faction);
		const echoColor = echo.faction === "w" ? 0x38bdf8 : 0xf43f5e;
		for (const mesh of rig.allStandardMeshes) {
			const mat = mesh.material as THREE.MeshStandardMaterial;
			mat.transparent = true;
			mat.opacity = 0.58;
			mat.emissive.setHex(echoColor);
			mat.emissiveIntensity = 0.75;
		}
		rig.tesseractBadge.visible = true;
		rig.quantumWaveGroup.visible = true;
		realmsRig.remnantEchoGroup.add(rig.root);

		const trailPts = [
			new THREE.Vector3(echo.startLocalPos.x, 0.18, echo.startLocalPos.z),
			new THREE.Vector3(echo.endLocalPos.x, 0.18, echo.endLocalPos.z),
		];
		const trailGeo = new THREE.BufferGeometry().setFromPoints(trailPts);
		const trailMat = new THREE.LineBasicMaterial({
			color: echoColor,
			transparent: true,
			opacity: 0.78,
		});
		const trailLine = new THREE.Line(trailGeo, trailMat);
		realmsRig.remnantEchoGroup.add(trailLine);

		realmsRig.remnantEchoRigs.set(echo.id, { rig, trailLine });
	}

	// 2. Rebuild Patrolling Realm Sentinels
	realmsRig.sentinelRigs.forEach((rig) => {
		realmsRig.sentinelGroup.remove(rig.root);
	});
	realmsRig.sentinelRigs.clear();

	for (const sent of sentinels) {
		const rig = createArticulatedPiece(sent.piece.type, sent.piece.faction);
		rig.quantumWaveGroup.visible = true;
		realmsRig.sentinelGroup.add(rig.root);
		realmsRig.sentinelRigs.set(sent.id, rig);
	}
}

const _portalSrcPos = new THREE.Vector3();
const _portalDstPos = new THREE.Vector3();
const _camOffset = new THREE.Vector3();
const _camLookDir = new THREE.Vector3();
const _clipPlane = new THREE.Plane();
const _clipNormal = new THREE.Vector3();

/**
 * Updates all animated subterranean realm architecture, pistons, molten rivers,
 * deterministic temporal echoes, and renders live perspective-correct Render-To-Texture
 * Portal Views using the virtual `portalCamera` and near-plane clipping!
 */
export function updateSubterraneanRealmsAndPortals(
	renderer: THREE.WebGLRenderer,
	scene: THREE.Scene,
	mainCamera: THREE.PerspectiveCamera,
	realmsRig: SubterraneanRealmsRig,
	elapsed: number,
	rawDelta: number,
	activePhase: string,
	activeRealmId: RealmId,
	travelerPiece: ChessPiece | null,
	allPieces: ChessPiece[],
	isParityInverted: boolean,
	crucibleAnvilClaimed: boolean,
	echoes: RealmTemporalEcho[],
	sentinels: RealmEnemySentinel[],
) {
	// 1. Animate Board Gateway Wells on the Chessboard
	realmsRig.boardGatewayMeshes.forEach((gwInst) => {
		gwInst.uniforms.uTime.value = elapsed;
		gwInst.innerRuneRing.rotation.z = elapsed * 1.4;
		gwInst.outerRing.rotation.z = -elapsed * 0.7;
		const pulse = 0.1 + 0.06 * Math.sin(elapsed * 3.2);
		(gwInst.beamCylinder.material as THREE.MeshBasicMaterial).opacity = pulse;
	});

	// 2. Animate Shattered Mirror Shards
	for (const shard of realmsRig.mirrorShards) {
		const baseY = (shard.userData.baseY as number) || 5.5;
		const phase = (shard.userData.phase as number) || 0;
		shard.position.y = baseY + Math.sin(elapsed * 1.6 + phase) * 0.65;
		shard.rotation.y += rawDelta * 0.32;
	}

	// 3. Animate Ashen Crucible Magma & Reciprocating Forge Pistons
	realmsRig.crucibleLavaUniforms.uTime.value = elapsed;
	realmsRig.crucibleAnvilGem.rotation.y = elapsed * 2.2;
	realmsRig.crucibleAnvilGem.position.y = 1.85 + Math.sin(elapsed * 3.5) * 0.18;
	realmsRig.crucibleAnvilGem.visible = !crucibleAnvilClaimed;

	for (const piston of realmsRig.cruciblePistons) {
		const cycle = Math.sin(elapsed * 2.6 + piston.phase);
		// Maps [-1, 1] -> [0.05 (slammed onto bridge), 5.6 (raised)]
		const height =
			cycle < -0.68
				? 0.05
				: THREE.MathUtils.mapLinear(cycle, -0.68, 1.0, 0.2, 5.6);
		piston.group.position.y = height;
		const warnMat = piston.warningRing.material as THREE.MeshBasicMaterial;
		warnMat.opacity = cycle < -0.35 ? 0.88 : 0.28;
		warnMat.color.setHex(cycle < -0.65 ? 0xef4444 : 0xf97316);
	}

	// 4. Animate Echoing Remnant Astrolabe Rings & Deterministic Temporal Echoes
	realmsRig.remnantAstrolabeRings.forEach((ring, idx) => {
		ring.rotation.z = elapsed * (0.25 + idx * 0.12) * (idx % 2 === 0 ? 1 : -1);
		ring.rotation.y = elapsed * 0.15;
	});

	for (const echo of echoes) {
		const entry = realmsRig.remnantEchoRigs.get(echo.id);
		if (!entry) continue;
		entry.rig.root.visible = !echo.consumed;
		entry.trailLine.visible = !echo.consumed;
		if (echo.consumed) continue;

		echo.progress = (echo.progress + rawDelta * echo.speed) % 1.0;
		const lx = THREE.MathUtils.lerp(
			echo.startLocalPos.x,
			echo.endLocalPos.x,
			echo.progress,
		);
		const lz = THREE.MathUtils.lerp(
			echo.startLocalPos.z,
			echo.endLocalPos.z,
			echo.progress,
		);
		entry.rig.root.position.set(lx, 0, lz);
		const yaw = Math.atan2(
			echo.endLocalPos.x - echo.startLocalPos.x,
			echo.endLocalPos.z - echo.startLocalPos.z,
		);
		entry.rig.root.rotation.y = yaw;
		entry.rig.leftLegPivot.rotation.x = Math.sin(elapsed * 9) * 0.45;
		entry.rig.rightLegPivot.rotation.x = -Math.sin(elapsed * 9) * 0.45;
		entry.rig.quantumWaveGroup.rotation.y = elapsed * 4.0;
	}

	// 5. Animate Patrolling Realm Sentinels
	for (const sent of sentinels) {
		const rig = realmsRig.sentinelRigs.get(sent.id);
		if (!rig) continue;
		rig.root.visible = !sent.defeated && sent.realmId === activeRealmId;
		if (sent.defeated) continue;

		const meta = REALM_METADATA[sent.realmId];
		const angle = elapsed * 0.85;
		sent.localPos.x = sent.patrolOrigin.x + Math.cos(angle) * sent.patrolRadius;
		sent.localPos.z = sent.patrolOrigin.z + Math.sin(angle) * sent.patrolRadius;
		sent.yaw = -angle + Math.PI;

		rig.root.position.set(
			meta.worldCenter.x + sent.localPos.x,
			meta.worldCenter.y + sent.localPos.y,
			meta.worldCenter.z + sent.localPos.z,
		);
		rig.root.rotation.y = sent.yaw;
		rig.leftLegPivot.rotation.x = Math.sin(elapsed * 7) * 0.38;
		rig.rightLegPivot.rotation.x = -Math.sin(elapsed * 7) * 0.38;
	}

	// 6. REAL PERSPECTIVE-CORRECT PORTAL RENDERING (Render-To-Texture with Virtual Portal Camera & Clipping Plane)
	const portalCam = realmsRig.portalCamera;
	const prevRenderTarget = renderer.getRenderTarget();
	const prevLocalClipping = renderer.localClippingEnabled;
	renderer.localClippingEnabled = true;

	mainCamera.getWorldDirection(_camLookDir);

	if (activePhase === "CHESS_VIEW" || activePhase === "REALM_DESCENT") {
		// Render live camera-tracked perspective views of the 3 Subterranean Realms into the Board Gateway textures!
		for (const rId of [
			"SHATTERED_MIRROR",
			"ASHEN_CRUCIBLE",
			"ECHOING_REMNANT",
		] as RealmId[]) {
			const meta = REALM_METADATA[rId];
			const rt = realmsRig.sharedRealmRenderTargets[rId];

			// Map main camera offset relative to board center into the subterranean realm's vista
			portalCam.position.set(
				meta.worldCenter.x +
					THREE.MathUtils.clamp(mainCamera.position.x * 0.65, -12, 12),
				meta.worldCenter.y + 4.2 + Math.max(0, mainCamera.position.y * 0.22),
				meta.worldCenter.z +
					THREE.MathUtils.clamp(mainCamera.position.z * 0.65, -14, 14),
			);
			portalCam.lookAt(
				meta.worldCenter.x - mainCamera.position.x * 0.25,
				meta.worldCenter.y + 1.8,
				meta.worldCenter.z - mainCamera.position.z * 0.25,
			);
			portalCam.updateProjectionMatrix();

			renderer.setRenderTarget(rt);
			renderer.clear();
			renderer.render(scene, portalCam);
		}
	} else if (
		activePhase === "REALM_EXPLORATION" ||
		activePhase === "REALM_ASCENT"
	) {
		const activeMeta = REALM_METADATA[activeRealmId];

		realmsRig.portalInstances.forEach((pInst) => {
			pInst.uniforms.uTime.value = elapsed;
			pInst.runeRingMesh.rotation.z = elapsed * 1.2;

			// Only render portals located in the currently explored realm to keep 60fps performance
			if (pInst.node.realmId !== activeRealmId) return;

			// Evaluate exit status if BOARD_ASCENT or TIMELINE_PORTAL
			if (
				(pInst.node.kind === "BOARD_ASCENT" ||
					pInst.node.kind === "TIMELINE_PORTAL") &&
				travelerPiece
			) {
				const evalRes = evaluatePortalBoardExit(
					pInst.node,
					travelerPiece,
					allPieces,
					isParityInverted,
					crucibleAnvilClaimed,
				);
				pInst.uniforms.uBlocked.value =
					evalRes?.status === "ALLY_OBSTRUCTED" ? 1.0 : 0.0;
				pInst.uniforms.uContested.value =
					evalRes?.status === "ENEMY_OCCUPIED" ? 1.0 : 0.0;
				pInst.barrierLockMesh.visible = evalRes?.status === "ALLY_OBSTRUCTED";
			} else {
				pInst.uniforms.uBlocked.value = 0.0;
				pInst.uniforms.uContested.value = 0.0;
				pInst.barrierLockMesh.visible = false;
			}

			// Compute source portal world position
			_portalSrcPos.set(
				activeMeta.worldCenter.x + pInst.node.localPos.x,
				activeMeta.worldCenter.y + pInst.node.localPos.y + 2.4,
				activeMeta.worldCenter.z + pInst.node.localPos.z,
			);

			// Relative vector from source portal to main camera
			_camOffset.subVectors(mainCamera.position, _portalSrcPos);
			// Rotate offset into source portal local frame
			_camOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), -pInst.node.yaw);

			if (
				(pInst.node.kind === "BOARD_ASCENT" ||
					pInst.node.kind === "TIMELINE_PORTAL") &&
				travelerPiece
			) {
				// Destination is the actual 4D Chessboard square at y = 0!
				const evalRes = evaluatePortalBoardExit(
					pInst.node,
					travelerPiece,
					allPieces,
					isParityInverted,
					crucibleAnvilClaimed,
				);
				const targetCoord = evalRes?.coord ||
					pInst.node.targetBoardCoord || { row: 3, col: 3, z: 0, w: 0 };
				boardToWorld(targetCoord.row, targetCoord.col, _portalDstPos);

				portalCam.position.set(
					_portalDstPos.x +
						THREE.MathUtils.clamp(_camOffset.x * 0.45, -3.5, 3.5),
					2.25 + Math.abs(_camOffset.z) * 0.22,
					_portalDstPos.z +
						THREE.MathUtils.clamp(_camOffset.z * 0.45, -3.5, 3.5),
				);
				portalCam.lookAt(_portalDstPos.x, 0.55, _portalDstPos.z);
			} else if (
				pInst.node.kind === "INTER_REALM" &&
				pInst.node.targetRealmId
			) {
				// Destination is the target Subterranean Realm!
				const targetMeta = REALM_METADATA[pInst.node.targetRealmId];
				const targetPortal = REALM_PORTALS.find(
					(p) => p.id === pInst.node.targetPortalId,
				);
				const dstLocal = targetPortal
					? targetPortal.localPos
					: { x: 0, y: 0, z: 0 };
				const dstYaw = targetPortal ? targetPortal.yaw : 0;

				// Rotate camera offset by destination portal yaw + PI
				_camOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), dstYaw + Math.PI);

				_portalDstPos.set(
					targetMeta.worldCenter.x + dstLocal.x,
					targetMeta.worldCenter.y + dstLocal.y + 2.4,
					targetMeta.worldCenter.z + dstLocal.z,
				);

				portalCam.position.set(
					_portalDstPos.x + THREE.MathUtils.clamp(_camOffset.x * 0.5, -5, 5),
					_portalDstPos.y +
						THREE.MathUtils.clamp(_camOffset.y * 0.5, -1.2, 2.5),
					_portalDstPos.z + THREE.MathUtils.clamp(_camOffset.z * 0.5, -5, 5),
				);
				// Look into the center of the destination realm
				portalCam.lookAt(
					targetMeta.worldCenter.x,
					targetMeta.worldCenter.y + 2.2,
					targetMeta.worldCenter.z,
				);

				// Apply near-plane clipping at destination portal plane so back-wall geometry never blocks view
				_clipNormal.set(Math.sin(dstYaw), 0, Math.cos(dstYaw)).normalize();
				_clipPlane.setFromNormalAndCoplanarPoint(_clipNormal, _portalDstPos);
				renderer.clippingPlanes = [_clipPlane];
			} else if (pInst.node.kind === "MIRROR_INVERTER") {
				// Chiral Reflection across the Looking-Glass plane!
				portalCam.position.set(
					-mainCamera.position.x + activeMeta.worldCenter.x * 2,
					mainCamera.position.y,
					mainCamera.position.z,
				);
				portalCam.lookAt(
					activeMeta.worldCenter.x - _camLookDir.x * 12,
					_portalSrcPos.y + _camLookDir.y * 4,
					activeMeta.worldCenter.z - _camLookDir.z * 12,
				);
			}

			portalCam.updateProjectionMatrix();
			pInst.portalSurface.visible = false;
			renderer.setRenderTarget(pInst.renderTarget);
			renderer.clear();
			renderer.render(scene, portalCam);
			pInst.portalSurface.visible = true;
			renderer.clippingPlanes = [];
		});
	}

	renderer.clippingPlanes = [];
	renderer.localClippingEnabled = prevLocalClipping;
	renderer.setRenderTarget(prevRenderTarget);
}
