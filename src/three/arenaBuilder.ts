import * as THREE from "three";
import { createArenaBattleScarDisc } from "./battleWornShader";

export interface BoardArenaRig {
	group: THREE.Group;
	tiles: THREE.Mesh[][];
	tileOriginalY: number[][];
	highlightMeshes: Map<string, THREE.Mesh>;
	threatSigilMeshes: Map<string, THREE.Mesh>;
	duelRingGroup: THREE.Group;
	duelBarrierMesh: THREE.Mesh;
	duelFloorScarMesh: THREE.Mesh;
	duelFloorScarUniforms: {
		uTime: { value: number };
		uIntensity: { value: number };
	};
	columnsInstanced: THREE.InstancedMesh;
	spotAttacker: THREE.SpotLight;
	spotDefender: THREE.SpotLight;
	volumetricConeAttacker: THREE.Mesh;
	volumetricConeDefender: THREE.Mesh;
	clashPointLight: THREE.PointLight;
	ambientParticles: THREE.Points;
	tesseractLines: THREE.LineSegments;
	tesseractVerts4D: [number, number, number, number][];
	tesseractEdgeIndices: [number, number][];
	quantumLatticeGroup: THREE.Group;
	quantumWaveRings: THREE.Mesh[];
	quantumShaderUniforms: {
		uTime: { value: number };
		uIntensity: { value: number };
		uSliceW: { value: number };
	};
	entanglementHelixLines: THREE.LineSegments;
	supportPreviewAllyLines: THREE.LineSegments;
	supportPreviewEnemyLines: THREE.LineSegments;
	interventionRiftGroup: THREE.Group;
	interventionTrajectoryLine: THREE.Line;
	sovereignAegisDome: THREE.Mesh;
}

export const TILE_SIZE = 1.35;
export const BOARD_OFFSET = (7 * TILE_SIZE) / 2;

export function boardToWorld(
	row: number,
	col: number,
	target?: THREE.Vector3,
): THREE.Vector3 {
	const x = col * TILE_SIZE - BOARD_OFFSET;
	const z = row * TILE_SIZE - BOARD_OFFSET;
	if (target) {
		return target.set(x, 0, z);
	}
	return new THREE.Vector3(x, 0, z);
}

function createProceduralMarbleTextures(
	renderer: THREE.WebGLRenderer,
	isLight: boolean,
): { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } {
	const canvas = document.createElement("canvas");
	canvas.width = 512;
	canvas.height = 512;
	const ctx = canvas.getContext("2d")!;

	const bumpCanvas = document.createElement("canvas");
	bumpCanvas.width = 512;
	bumpCanvas.height = 512;
	const bCtx = bumpCanvas.getContext("2d")!;

	// Restrained, tactile travertine/obsidian albedo so tiles never blow out under lighting
	const grad = ctx.createLinearGradient(0, 0, 512, 512);
	if (isLight) {
		grad.addColorStop(0, "#9e9587");
		grad.addColorStop(0.5, "#918879");
		grad.addColorStop(1, "#857c6d");
	} else {
		grad.addColorStop(0, "#141822");
		grad.addColorStop(0.5, "#1a202c");
		grad.addColorStop(1, "#10141d");
	}
	ctx.fillStyle = grad;
	ctx.fillRect(0, 0, 512, 512);

	bCtx.fillStyle = "#808080";
	bCtx.fillRect(0, 0, 512, 512);

	for (let i = 0; i < 24; i++) {
		ctx.strokeStyle = isLight
			? i % 3 === 0
				? "rgba(180, 135, 50, 0.28)"
				: "rgba(65, 58, 48, 0.25)"
			: i % 3 === 0
				? "rgba(56, 189, 248, 0.14)"
				: "rgba(255, 255, 255, 0.05)";
		ctx.lineWidth = 1 + (i % 3);

		bCtx.strokeStyle = i % 2 === 0 ? "#969696" : "#686868";
		bCtx.lineWidth = 2;

		ctx.beginPath();
		bCtx.beginPath();
		let x = Math.random() * 512;
		let y = 0;
		ctx.moveTo(x, y);
		bCtx.moveTo(x, y);
		while (y < 512) {
			y += 24;
			x += (Math.random() - 0.5) * 44;
			ctx.lineTo(x, y);
			bCtx.lineTo(x, y);
		}
		ctx.stroke();
		bCtx.stroke();
	}

	ctx.strokeStyle = isLight
		? "rgba(195, 145, 45, 0.45)"
		: "rgba(148, 163, 184, 0.22)";
	ctx.lineWidth = 6;
	ctx.strokeRect(12, 12, 488, 488);

	bCtx.strokeStyle = "#ffffff";
	bCtx.lineWidth = 8;
	bCtx.strokeRect(10, 10, 492, 492);

	const map = new THREE.CanvasTexture(canvas);
	map.colorSpace = THREE.SRGBColorSpace;
	map.anisotropy = renderer.capabilities.getMaxAnisotropy();
	map.needsUpdate = true;

	const bumpMap = new THREE.CanvasTexture(bumpCanvas);
	bumpMap.anisotropy = renderer.capabilities.getMaxAnisotropy();
	bumpMap.needsUpdate = true;

	return { map, bumpMap };
}

export function createBoardArena(renderer: THREE.WebGLRenderer): BoardArenaRig {
	const group = new THREE.Group();

	const lightTex = createProceduralMarbleTextures(renderer, true);
	const darkTex = createProceduralMarbleTextures(renderer, false);

	const lightTileMat = new THREE.MeshPhysicalMaterial({
		map: lightTex.map,
		bumpMap: lightTex.bumpMap,
		bumpScale: 0.015,
		roughness: 0.46,
		metalness: 0.1,
		clearcoat: 0.3,
		clearcoatRoughness: 0.3,
		envMapIntensity: 0.45,
	});

	const darkTileMat = new THREE.MeshPhysicalMaterial({
		map: darkTex.map,
		bumpMap: darkTex.bumpMap,
		bumpScale: 0.018,
		roughness: 0.34,
		metalness: 0.38,
		clearcoat: 0.45,
		clearcoatRoughness: 0.25,
		envMapIntensity: 0.5,
	});

	const tileGeo = new THREE.BoxGeometry(
		TILE_SIZE * 0.985,
		0.46,
		TILE_SIZE * 0.985,
	);
	const tiles: THREE.Mesh[][] = [];
	const tileOriginalY: number[][] = [];
	const highlightMeshes = new Map<string, THREE.Mesh>();
	const threatSigilMeshes = new Map<string, THREE.Mesh>();

	const highlightGeo = new THREE.PlaneGeometry(
		TILE_SIZE * 0.88,
		TILE_SIZE * 0.88,
	);
	const sigilGeo = new THREE.RingGeometry(0.28, 0.39, 4);

	for (let r = 0; r < 8; r++) {
		tiles[r] = [];
		tileOriginalY[r] = [];
		for (let c = 0; c < 8; c++) {
			const isLight = (r + c) % 2 === 0;
			const tile = new THREE.Mesh(
				tileGeo,
				isLight ? lightTileMat : darkTileMat,
			);
			const pos = boardToWorld(r, c);
			tile.position.set(pos.x, -0.23, pos.z);
			tile.receiveShadow = true;
			tile.castShadow = true;
			tile.userData = { type: "tile", row: r, col: c };
			group.add(tile);
			tiles[r][c] = tile;
			tileOriginalY[r][c] = -0.23;

			const hlMat = new THREE.MeshBasicMaterial({
				color: 0xf59e0b,
				transparent: true,
				opacity: 0.0,
				depthWrite: false,
				polygonOffset: true,
				polygonOffsetFactor: -2,
				polygonOffsetUnits: -2,
			});
			const hlMesh = new THREE.Mesh(highlightGeo, hlMat);
			hlMesh.rotation.x = -Math.PI / 2;
			hlMesh.position.set(pos.x, 0.012, pos.z);
			hlMesh.visible = false;
			group.add(hlMesh);
			highlightMeshes.set(`${r}_${c}`, hlMesh);

			// 4D Unseen Cross-Dimensional Threat Sigil (rotating diamond on tiles threatened from another W/Z slice!)
			const sigilMat = new THREE.MeshBasicMaterial({
				color: 0xc084fc,
				side: THREE.DoubleSide,
				transparent: true,
				opacity: 0.78,
				depthWrite: false,
			});
			const sigilMesh = new THREE.Mesh(sigilGeo, sigilMat);
			sigilMesh.rotation.x = -Math.PI / 2;
			sigilMesh.position.set(pos.x, 0.025, pos.z);
			sigilMesh.visible = false;
			group.add(sigilMesh);
			threatSigilMeshes.set(`${r}_${c}`, sigilMesh);
		}
	}

	// Grand Chessboard Outer Frame
	const boardSpan = 8 * TILE_SIZE + 0.95;
	const frameGeo = new THREE.BoxGeometry(boardSpan, 0.44, boardSpan);
	const frameMat = new THREE.MeshPhysicalMaterial({
		color: 0x0f131d,
		roughness: 0.45,
		metalness: 0.78,
		clearcoat: 0.4,
		envMapIntensity: 0.45,
	});
	const frameMesh = new THREE.Mesh(frameGeo, frameMat);
	frameMesh.position.y = -0.26;
	frameMesh.receiveShadow = true;
	group.add(frameMesh);

	const goldTrimMat = new THREE.MeshPhysicalMaterial({
		color: 0xc88d28,
		roughness: 0.25,
		metalness: 0.85,
		envMapIntensity: 0.5,
	});
	const outerBorderRing = new THREE.Mesh(
		new THREE.BoxGeometry(boardSpan + 0.14, 0.16, boardSpan + 0.14),
		goldTrimMat,
	);
	outerBorderRing.position.y = -0.22;
	group.add(outerBorderRing);

	const sanctuaryFloor = new THREE.Mesh(
		new THREE.CylinderGeometry(28, 32, 0.8, 64),
		new THREE.MeshStandardMaterial({
			color: 0x07090e,
			roughness: 0.85,
			metalness: 0.3,
		}),
	);
	sanctuaryFloor.position.y = -0.88;
	sanctuaryFloor.receiveShadow = true;
	group.add(sanctuaryFloor);

	// Instanced Perimeter Colosseum Monoliths
	const pillarCount = 24;
	const pillarGeo = new THREE.BoxGeometry(0.88, 5.8, 0.88);
	const pillarMat = new THREE.MeshStandardMaterial({
		color: 0x161b26,
		roughness: 0.6,
		metalness: 0.65,
	});
	const columnsInstanced = new THREE.InstancedMesh(
		pillarGeo,
		pillarMat,
		pillarCount,
	);
	columnsInstanced.castShadow = true;
	columnsInstanced.receiveShadow = true;

	const dummy = new THREE.Object3D();
	const colColor = new THREE.Color();
	for (let i = 0; i < pillarCount; i++) {
		const angle = (i / pillarCount) * Math.PI * 2;
		const radius = 19.5 + (i % 2) * 0.8;
		dummy.position.set(Math.cos(angle) * radius, 1.8, Math.sin(angle) * radius);
		dummy.rotation.y = -angle;
		const hScale = 0.85 + (i % 3) * 0.14;
		dummy.scale.set(1, hScale, 1);
		dummy.updateMatrix();
		columnsInstanced.setMatrixAt(i, dummy.matrix);

		colColor.setHSL(0.6, 0.2, 0.12 + (i % 3) * 0.03);
		columnsInstanced.setColorAt(i, colColor);
	}
	columnsInstanced.instanceMatrix.needsUpdate = true;
	if (columnsInstanced.instanceColor)
		columnsInstanced.instanceColor.needsUpdate = true;
	columnsInstanced.computeBoundingSphere();
	group.add(columnsInstanced);

	// Duel Ring Group (Includes an illuminated Spotlight Stage Floor Disc so fighters stand out cleanly against a warm pool of light!)
	const duelRingGroup = new THREE.Group();
	duelRingGroup.position.y = -2.5;
	group.add(duelRingGroup);

	// Create procedural radial spotlight stage texture with balanced warm chiaroscuro illumination
	const stageCanvas = document.createElement("canvas");
	stageCanvas.width = 512;
	stageCanvas.height = 512;
	const sCtx = stageCanvas.getContext("2d")!;
	const sGrad = sCtx.createRadialGradient(256, 256, 20, 256, 256, 250);
	sGrad.addColorStop(0, "rgba(254, 243, 199, 0.22)");
	sGrad.addColorStop(0.45, "rgba(245, 158, 11, 0.11)");
	sGrad.addColorStop(0.78, "rgba(15, 23, 42, 0.82)");
	sGrad.addColorStop(1, "rgba(7, 9, 14, 0.95)");
	sCtx.fillStyle = sGrad;
	sCtx.fillRect(0, 0, 512, 512);

	// Draw crisp alignment & spacing lines on the duel stage floor
	sCtx.strokeStyle = "rgba(251, 191, 36, 0.26)";
	sCtx.lineWidth = 3;
	sCtx.beginPath();
	sCtx.arc(256, 256, 175, 0, Math.PI * 2);
	sCtx.stroke();

	// Horizontal fighting plane axis & center line
	sCtx.strokeStyle = "rgba(254, 240, 138, 0.22)";
	sCtx.lineWidth = 2;
	sCtx.beginPath();
	sCtx.moveTo(48, 256);
	sCtx.lineTo(464, 256);
	sCtx.moveTo(256, 180);
	sCtx.lineTo(256, 332);
	sCtx.stroke();

	const stageFloorTex = new THREE.CanvasTexture(stageCanvas);
	stageFloorTex.colorSpace = THREE.SRGBColorSpace;
	stageFloorTex.needsUpdate = true;

	const stageFloorDisc = new THREE.Mesh(
		new THREE.CircleGeometry(4.32, 64),
		new THREE.MeshStandardMaterial({
			map: stageFloorTex,
			roughness: 0.58,
			metalness: 0.12,
			transparent: true,
			opacity: 0.8,
			depthWrite: false,
			polygonOffset: true,
			polygonOffsetFactor: -3,
			polygonOffsetUnits: -3,
		}),
	);
	stageFloorDisc.rotation.x = -Math.PI / 2;
	stageFloorDisc.position.y = 0.018;
	stageFloorDisc.receiveShadow = true;
	duelRingGroup.add(stageFloorDisc);

	// 3D Arena Floor Battle-Scar Shader Disc (procedural Voronoi cracks & flickering lava scars when HP < 30%!)
	const { mesh: duelFloorScarMesh, uniforms: duelFloorScarUniforms } =
		createArenaBattleScarDisc();
	duelRingGroup.add(duelFloorScarMesh);

	const arenaRingMesh = new THREE.Mesh(
		new THREE.TorusGeometry(4.4, 0.075, 16, 64),
		goldTrimMat,
	);
	arenaRingMesh.rotation.x = Math.PI / 2;
	arenaRingMesh.position.y = 0.04;
	duelRingGroup.add(arenaRingMesh);

	const innerRuneRing = new THREE.Mesh(
		new THREE.RingGeometry(4.15, 4.28, 48),
		new THREE.MeshBasicMaterial({
			color: 0xf59e0b,
			side: THREE.DoubleSide,
			transparent: true,
			opacity: 0.55,
			depthWrite: false,
		}),
	);
	innerRuneRing.rotation.x = -Math.PI / 2;
	innerRuneRing.position.y = 0.024;
	duelRingGroup.add(innerRuneRing);

	const barrierMat = new THREE.MeshBasicMaterial({
		color: 0xf59e0b,
		transparent: true,
		opacity: 0.0,
		side: THREE.DoubleSide,
		depthWrite: false,
	});
	const duelBarrierMesh = new THREE.Mesh(
		new THREE.CylinderGeometry(4.4, 4.4, 0.85, 48, 1, true),
		barrierMat,
	);
	duelBarrierMesh.position.y = 0.45;
	duelBarrierMesh.renderOrder = 5;
	duelRingGroup.add(duelBarrierMesh);

	// Bright, Wide Overhead Stage SpotLights (zero decay falloff loss so the fighters and stage floor are vividly illuminated!)
	const spotAttacker = new THREE.SpotLight(
		0xfffbeb,
		0,
		34,
		Math.PI / 3.8,
		0.55,
		0.9,
	);
	spotAttacker.position.set(-1.8, 6.8, 2.4);
	spotAttacker.castShadow = true;
	spotAttacker.shadow.bias = -0.0002;
	spotAttacker.shadow.mapSize.width = 1024;
	spotAttacker.shadow.mapSize.height = 1024;
	group.add(spotAttacker);
	group.add(spotAttacker.target);

	const spotDefender = new THREE.SpotLight(
		0xfff5f5,
		0,
		34,
		Math.PI / 3.8,
		0.55,
		0.9,
	);
	spotDefender.position.set(1.8, 6.8, 2.4);
	spotDefender.castShadow = false;
	group.add(spotDefender);
	group.add(spotDefender.target);

	// Vertical Overhead Volumetric Light Shafts (pointing straight down from y=6.4 onto the fighters, never crossing in front of the camera!)
	const coneGeo = new THREE.ConeGeometry(1.5, 6.4, 32, 1, true);

	const coneMatAttacker = new THREE.MeshBasicMaterial({
		color: 0xfef08a,
		transparent: true,
		opacity: 0,
		side: THREE.DoubleSide,
		depthWrite: false,
		blending: THREE.AdditiveBlending,
	});
	const volumetricConeAttacker = new THREE.Mesh(coneGeo, coneMatAttacker);
	volumetricConeAttacker.position.set(-1.6, 3.2, 0);
	group.add(volumetricConeAttacker);

	const coneMatDefender = new THREE.MeshBasicMaterial({
		color: 0xfecdd3,
		transparent: true,
		opacity: 0,
		side: THREE.DoubleSide,
		depthWrite: false,
		blending: THREE.AdditiveBlending,
	});
	const volumetricConeDefender = new THREE.Mesh(coneGeo, coneMatDefender);
	volumetricConeDefender.position.set(1.6, 3.2, 0);
	group.add(volumetricConeDefender);

	const clashPointLight = new THREE.PointLight(0xfffbeb, 0, 16.0, 1.0);
	clashPointLight.position.set(0, 2.5, 2.5);
	group.add(clashPointLight);

	// Floating Atmospheric Embers
	const particleCount = 140;
	const pPositions = new Float32Array(particleCount * 3);
	const pColors = new Float32Array(particleCount * 3);
	for (let i = 0; i < particleCount; i++) {
		pPositions[i * 3] = (Math.random() - 0.5) * 18;
		pPositions[i * 3 + 1] = Math.random() * 6.5;
		pPositions[i * 3 + 2] = (Math.random() - 0.5) * 18;

		const isGold = i % 2 === 0;
		pColors[i * 3] = isGold ? 0.95 : 0.35;
		pColors[i * 3 + 1] = isGold ? 0.7 : 0.75;
		pColors[i * 3 + 2] = isGold ? 0.25 : 0.95;
	}
	const pGeo = new THREE.BufferGeometry();
	pGeo.setAttribute("position", new THREE.BufferAttribute(pPositions, 3));
	pGeo.setAttribute("color", new THREE.BufferAttribute(pColors, 3));

	const pMat = new THREE.PointsMaterial({
		size: 0.065,
		vertexColors: true,
		transparent: true,
		opacity: 0.45,
		depthWrite: false,
	});
	const ambientParticles = new THREE.Points(pGeo, pMat);
	group.add(ambientParticles);

	// 4D Mathematical Tesseract (8-Cell Hypercube) Stereographic Projector (Elevated high behind the board so it never overlaps pieces or fighters)
	const tesseractVerts4D: [number, number, number, number][] = [];
	for (let i = 0; i < 16; i++) {
		tesseractVerts4D.push([
			i & 1 ? 1 : -1,
			i & 2 ? 1 : -1,
			i & 4 ? 1 : -1,
			i & 8 ? 1 : -1,
		]);
	}
	const tesseractEdgeIndices: [number, number][] = [];
	for (let i = 0; i < 16; i++) {
		for (let j = i + 1; j < 16; j++) {
			// Connect vertices differing in exactly 1 bit (1 axis of the 4D hypercube)
			const diff = i ^ j;
			if (diff === 1 || diff === 2 || diff === 4 || diff === 8) {
				tesseractEdgeIndices.push([i, j]);
			}
		}
	}

	const tessPositions = new Float32Array(tesseractEdgeIndices.length * 2 * 3);
	const tessGeo = new THREE.BufferGeometry();
	tessGeo.setAttribute("position", new THREE.BufferAttribute(tessPositions, 3));
	const tessMat = new THREE.LineBasicMaterial({
		color: 0x38bdf8,
		transparent: true,
		opacity: 0.2,
	});
	const tesseractLines = new THREE.LineSegments(tessGeo, tessMat);
	tesseractLines.position.set(0, 6.2, -11.5);
	group.add(tesseractLines);

	// Quantum 4D Wavefunction Interference Lattice & Concentric Probability Standing Waves
	const quantumLatticeGroup = new THREE.Group();
	quantumLatticeGroup.position.y = 0.015;
	group.add(quantumLatticeGroup);

	const gridHelper = new THREE.GridHelper(
		boardSpan * 1.35,
		24,
		0x38bdf8,
		0x7e22ce,
	);
	(gridHelper.material as THREE.Material).transparent = true;
	(gridHelper.material as THREE.Material).opacity = 0.0;
	quantumLatticeGroup.add(gridHelper);

	const quantumWaveRings: THREE.Mesh[] = [];
	for (let i = 0; i < 5; i++) {
		const r = 1.6 + i * 1.45;
		const waveRingGeo = new THREE.RingGeometry(r, r + 0.055, 64);
		const waveRingMat = new THREE.MeshBasicMaterial({
			color: i % 2 === 0 ? 0x38bdf8 : 0xc084fc,
			side: THREE.DoubleSide,
			transparent: true,
			opacity: 0.0,
			depthWrite: false,
			blending: THREE.AdditiveBlending,
		});
		const waveRing = new THREE.Mesh(waveRingGeo, waveRingMat);
		waveRing.rotation.x = -Math.PI / 2;
		waveRing.position.y = 0.01 + i * 0.004;
		quantumLatticeGroup.add(waveRing);
		quantumWaveRings.push(waveRing);
	}

	// Real-Time GLSL Quantum Schrödinger Wavefunction Interference Plane (|ψ(x,z,t)|²)
	const quantumShaderUniforms = {
		uTime: { value: 0 },
		uIntensity: { value: 0 },
		uSliceW: { value: 0 },
	};

	const quantumShaderMat = new THREE.ShaderMaterial({
		uniforms: quantumShaderUniforms,
		vertexShader: `
      varying vec2 vUv;
      varying vec3 vLocalPos;
      void main() {
        vUv = uv;
        vLocalPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
		fragmentShader: `
      uniform float uTime;
      uniform float uIntensity;
      uniform float uSliceW;
      varying vec2 vUv;
      varying vec3 vLocalPos;

      void main() {
        if (uIntensity <= 0.01) {
          gl_FragColor = vec4(0.0);
          return;
        }
        vec2 p = (vUv - 0.5) * 16.0;
        float r = length(p);
        // 4D Schrödinger standing wave interference pattern
        float psi1 = cos(p.x * 2.35 + uTime * 2.2) * cos(p.y * 2.35 - uTime * 1.8);
        float psi2 = sin(r * 2.8 - uTime * 3.6 + uSliceW * 1.57);
        float probDensity = abs(psi1 * 0.55 + psi2 * 0.45);
        float contour = smoothstep(0.62, 0.92, probDensity);
        float edgeFade = smoothstep(8.2, 4.5, r);

        vec3 cyanEigen = vec3(0.22, 0.74, 0.97);
        vec3 violetEigen = vec3(0.75, 0.52, 0.99);
        vec3 col = mix(cyanEigen, violetEigen, 0.5 + 0.5 * sin(r - uTime * 2.0 + uSliceW));
        float alpha = clamp(contour * edgeFade * uIntensity * 0.34, 0.0, 0.9);
        gl_FragColor = vec4(clamp(col, vec3(0.0), vec3(1.5)), alpha);
      }
    `,
		transparent: true,
		depthWrite: false,
		blending: THREE.AdditiveBlending,
		side: THREE.DoubleSide,
	});

	const quantumShaderPlane = new THREE.Mesh(
		new THREE.PlaneGeometry(TILE_SIZE * 8.2, TILE_SIZE * 8.2, 1, 1),
		quantumShaderMat,
	);
	quantumShaderPlane.rotation.x = -Math.PI / 2;
	quantumShaderPlane.position.y = 0.008;
	quantumLatticeGroup.add(quantumShaderPlane);

	// 3D Quantum Entanglement Double-Helix Beams (connects |Φ⁺⟩ Entangled Bell Pairs across the board!)
	const maxHelixSegments = 160;
	const helixPositions = new Float32Array(maxHelixSegments * 2 * 3);
	const helixGeo = new THREE.BufferGeometry();
	helixGeo.setAttribute(
		"position",
		new THREE.BufferAttribute(helixPositions, 3),
	);
	const helixMat = new THREE.LineBasicMaterial({
		color: 0x38bdf8,
		transparent: true,
		opacity: 0.85,
		blending: THREE.AdditiveBlending,
	});
	const entanglementHelixLines = new THREE.LineSegments(helixGeo, helixMat);
	entanglementHelixLines.frustumCulled = false;
	group.add(entanglementHelixLines);

	// Pre-Commit Tactical Support Preview Vector Lines (Allied = Cyan/Gold, Enemy = Crimson/Rose)
	const createSupportLineSegments = (hexColor: number) => {
		const maxSegs = 128;
		const pos = new Float32Array(maxSegs * 2 * 3);
		const geo = new THREE.BufferGeometry();
		geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
		const mat = new THREE.LineBasicMaterial({
			color: hexColor,
			transparent: true,
			opacity: 0.9,
			blending: THREE.AdditiveBlending,
		});
		const ls = new THREE.LineSegments(geo, mat);
		ls.frustumCulled = false;
		ls.visible = false;
		group.add(ls);
		return ls;
	};
	const supportPreviewAllyLines = createSupportLineSegments(0x38bdf8);
	const supportPreviewEnemyLines = createSupportLineSegments(0xf43f5e);

	// 4D Dimensional Rift Portal Group (Opens during Tactical Interventions!)
	const interventionRiftGroup = new THREE.Group();
	interventionRiftGroup.visible = false;
	group.add(interventionRiftGroup);

	const outerRiftRing = new THREE.Mesh(
		new THREE.TorusGeometry(1.15, 0.055, 16, 48),
		new THREE.MeshBasicMaterial({
			color: 0x38bdf8,
			transparent: true,
			opacity: 0.92,
			blending: THREE.AdditiveBlending,
		}),
	);
	interventionRiftGroup.add(outerRiftRing);

	const innerRiftRing = new THREE.Mesh(
		new THREE.OctahedronGeometry(0.95, 1),
		new THREE.MeshBasicMaterial({
			color: 0xc084fc,
			wireframe: true,
			transparent: true,
			opacity: 0.65,
			blending: THREE.AdditiveBlending,
		}),
	);
	interventionRiftGroup.add(innerRiftRing);

	const vortexDisc = new THREE.Mesh(
		new THREE.CircleGeometry(1.08, 36),
		new THREE.MeshBasicMaterial({
			color: 0x38bdf8,
			transparent: true,
			opacity: 0.34,
			side: THREE.DoubleSide,
			depthWrite: false,
			blending: THREE.AdditiveBlending,
		}),
	);
	interventionRiftGroup.add(vortexDisc);

	// Trajectory Energy Arc linking the supporting piece's board square to the active duel!
	const trajPointsCount = 32;
	const trajPositions = new Float32Array(trajPointsCount * 3);
	const trajGeo = new THREE.BufferGeometry();
	trajGeo.setAttribute("position", new THREE.BufferAttribute(trajPositions, 3));
	const trajMat = new THREE.LineBasicMaterial({
		color: 0x38bdf8,
		transparent: true,
		opacity: 0.95,
		blending: THREE.AdditiveBlending,
	});
	const interventionTrajectoryLine = new THREE.Line(trajGeo, trajMat);
	interventionTrajectoryLine.frustumCulled = false;
	interventionTrajectoryLine.visible = false;
	group.add(interventionTrajectoryLine);

	// King's Sovereign Aegis Shield Dome
	const sovereignAegisDome = new THREE.Mesh(
		new THREE.IcosahedronGeometry(1.05, 1),
		new THREE.MeshBasicMaterial({
			color: 0xfde047,
			wireframe: true,
			transparent: true,
			opacity: 0.55,
			blending: THREE.AdditiveBlending,
		}),
	);
	sovereignAegisDome.visible = false;
	group.add(sovereignAegisDome);

	return {
		group,
		tiles,
		tileOriginalY,
		highlightMeshes,
		threatSigilMeshes,
		duelRingGroup,
		duelBarrierMesh,
		duelFloorScarMesh,
		duelFloorScarUniforms,
		columnsInstanced,
		spotAttacker,
		spotDefender,
		volumetricConeAttacker,
		volumetricConeDefender,
		clashPointLight,
		ambientParticles,
		tesseractLines,
		tesseractVerts4D,
		tesseractEdgeIndices,
		quantumLatticeGroup,
		quantumWaveRings,
		quantumShaderUniforms,
		entanglementHelixLines,
		supportPreviewAllyLines,
		supportPreviewEnemyLines,
		interventionRiftGroup,
		interventionTrajectoryLine,
		sovereignAegisDome,
	};
}

/**
 * Rotates the 16 vertices of the 4D Tesseract in 4D planes (XW, YW, ZW),
 * stereographically projects them into 3D space, and animates the Quantum 4D Wavefunction Lattice!
 */
export function update4DTesseractProjection(
	rig: BoardArenaRig,
	elapsedTime: number,
	activeW: number,
	activeZ: number,
) {
	const isQuantumMode = activeW !== 0 || activeZ !== 0;
	const angleXW = elapsedTime * (isQuantumMode ? 0.95 : 0.45) + activeW * 0.95;
	const angleYW = elapsedTime * (isQuantumMode ? 0.72 : 0.32) + activeZ * 0.85;
	const angleXY = elapsedTime * 0.25;

	const cosXW = Math.cos(angleXW);
	const sinXW = Math.sin(angleXW);
	const cosYW = Math.cos(angleYW);
	const sinYW = Math.sin(angleYW);
	const cosXY = Math.cos(angleXY);
	const sinXY = Math.sin(angleXY);

	const projected3D: [number, number, number][] = [];
	const cameraDist4D = 2.6;
	const scale = isQuantumMode ? 2.15 : 1.55;

	for (let i = 0; i < 16; i++) {
		let [x, y, z, w] = rig.tesseractVerts4D[i];

		// Rotate in XY
		const x1 = x * cosXY - y * sinXY;
		const y1 = x * sinXY + y * cosXY;
		x = x1;
		y = y1;

		// Rotate in XW (4th dimension!)
		const x2 = x * cosXW - w * sinXW;
		const w2 = x * sinXW + w * cosXW;
		x = x2;
		w = w2;

		// Rotate in YW (4th dimension!)
		const y3 = y * cosYW - w * sinYW;
		const w3 = y * sinYW + w * cosYW;
		y = y3;
		w = w3;

		// Stereographic 4D -> 3D projection
		const factor = scale / (cameraDist4D - w);
		projected3D.push([x * factor, y * factor, z * factor]);
	}

	const posAttr = rig.tesseractLines.geometry.attributes
		.position as THREE.BufferAttribute;
	for (let e = 0; e < rig.tesseractEdgeIndices.length; e++) {
		const [vA, vB] = rig.tesseractEdgeIndices[e];
		const pA = projected3D[vA];
		const pB = projected3D[vB];
		posAttr.setXYZ(e * 2, pA[0], pA[1], pA[2]);
		posAttr.setXYZ(e * 2 + 1, pB[0], pB[1], pB[2]);
	}
	posAttr.needsUpdate = true;

	const primaryColorHex =
		activeW > 0
			? 0x38bdf8
			: activeW < 0
				? 0xc084fc
				: activeZ > 0
					? 0x34d399
					: 0xf59e0b;

	const mat = rig.tesseractLines.material as THREE.LineBasicMaterial;
	mat.color.setHex(primaryColorHex);
	mat.opacity = isQuantumMode ? 0.68 : 0.2;

	// Animate Quantum Wavefunction Interference Lattice on the board when in a 4D Quantum Slice!
	const gridChild = rig.quantumLatticeGroup.children[0] as THREE.LineSegments;
	if (gridChild?.material) {
		const gMat = gridChild.material as THREE.LineBasicMaterial;
		gMat.opacity = THREE.MathUtils.lerp(
			gMat.opacity,
			isQuantumMode ? 0.32 : 0.0,
			0.1,
		);
	}

	for (let i = 0; i < rig.quantumWaveRings.length; i++) {
		const ring = rig.quantumWaveRings[i];
		const rMat = ring.material as THREE.MeshBasicMaterial;
		if (isQuantumMode) {
			const wave = 0.5 + 0.5 * Math.sin(elapsedTime * 3.6 - i * 1.1);
			rMat.color.setHex(i % 2 === 0 ? primaryColorHex : 0x38bdf8);
			rMat.opacity = 0.16 + wave * 0.28;
			const pulseScale = 1.0 + Math.sin(elapsedTime * 2.4 + i) * 0.04;
			ring.scale.setScalar(pulseScale);
		} else {
			rMat.opacity = THREE.MathUtils.lerp(rMat.opacity, 0.0, 0.12);
		}
	}

	// Update GLSL Quantum Schrödinger Wavefunction Uniforms
	rig.quantumShaderUniforms.uTime.value = elapsedTime;
	rig.quantumShaderUniforms.uSliceW.value = activeW;
	rig.quantumShaderUniforms.uIntensity.value = THREE.MathUtils.lerp(
		rig.quantumShaderUniforms.uIntensity.value,
		isQuantumMode ? 1.0 : 0.18,
		0.1,
	);
}

/**
 * Renders 3D Double-Helix Quantum Entanglement Arcs between |Φ⁺⟩ Bell-Entangled pairs on the board!
 */
export function updateQuantumEntanglementBeams(
	rig: BoardArenaRig,
	entangledPairs: { a: THREE.Vector3; b: THREE.Vector3 }[],
	elapsedTime: number,
) {
	const posAttr = rig.entanglementHelixLines.geometry.attributes
		.position as THREE.BufferAttribute;
	let segIndex = 0;
	const maxSegs = 160;
	const stepsPerPair = 24;

	for (const pair of entangledPairs) {
		for (let strand = 0; strand < 2; strand++) {
			const phaseOffset = strand * Math.PI;
			for (let s = 0; s < stepsPerPair; s++) {
				if (segIndex >= maxSegs) break;
				const t0 = s / stepsPerPair;
				const t1 = (s + 1) / stepsPerPair;

				const calcPoint = (t: number) => {
					const x = THREE.MathUtils.lerp(pair.a.x, pair.b.x, t);
					const z = THREE.MathUtils.lerp(pair.a.z, pair.b.z, t);
					const baseArcY =
						THREE.MathUtils.lerp(pair.a.y, pair.b.y, t) +
						Math.sin(t * Math.PI) * 1.45 +
						0.75;
					const twistAngle =
						t * Math.PI * 5.0 - elapsedTime * 6.5 + phaseOffset;
					const radius = Math.sin(t * Math.PI) * 0.18;
					return [
						x + Math.cos(twistAngle) * radius,
						baseArcY + Math.sin(twistAngle) * radius,
						z + Math.sin(twistAngle) * radius,
					];
				};

				const p0 = calcPoint(t0);
				const p1 = calcPoint(t1);
				posAttr.setXYZ(segIndex * 2, p0[0], p0[1], p0[2]);
				posAttr.setXYZ(segIndex * 2 + 1, p1[0], p1[1], p1[2]);
				segIndex++;
			}
		}
	}

	// Zero out unused segments
	for (let i = segIndex; i < maxSegs; i++) {
		posAttr.setXYZ(i * 2, 0, -100, 0);
		posAttr.setXYZ(i * 2 + 1, 0, -100, 0);
	}
	posAttr.needsUpdate = true;
}

/**
 * Renders animated 3D tactical support vector arcs from supporting pieces on the board
 * to a contested capture square BEFORE the player commits to the move!
 */
export function updateSupportPreviewVectors(
	rig: BoardArenaRig,
	targetWorldPos: THREE.Vector3 | null,
	allySupportOrigins: THREE.Vector3[],
	enemySupportOrigins: THREE.Vector3[],
	elapsedTime: number,
) {
	const fillArcs = (
		lineSegs: THREE.LineSegments,
		origins: THREE.Vector3[],
		target: THREE.Vector3 | null,
	) => {
		if (!target || origins.length === 0) {
			lineSegs.visible = false;
			return;
		}
		lineSegs.visible = true;
		const posAttr = lineSegs.geometry.attributes
			.position as THREE.BufferAttribute;
		let segIdx = 0;
		const maxSegs = 128;
		const stepsPerArc = 14;

		for (const orig of origins) {
			for (let s = 0; s < stepsPerArc; s++) {
				if (segIdx >= maxSegs) break;
				const t0 = s / stepsPerArc;
				const t1 = (s + 1) / stepsPerArc;

				const pt = (t: number) => {
					const x = THREE.MathUtils.lerp(orig.x, target.x, t);
					const z = THREE.MathUtils.lerp(orig.z, target.z, t);
					const pulse = Math.sin(t * Math.PI * 3 - elapsedTime * 8) * 0.06;
					const y =
						THREE.MathUtils.lerp(orig.y + 0.85, target.y + 0.65, t) +
						Math.sin(t * Math.PI) * 1.15 +
						pulse;
					return [x, y, z];
				};

				const p0 = pt(t0);
				const p1 = pt(t1);
				posAttr.setXYZ(segIdx * 2, p0[0], p0[1], p0[2]);
				posAttr.setXYZ(segIdx * 2 + 1, p1[0], p1[1], p1[2]);
				segIdx++;
			}
		}

		for (let i = segIdx; i < maxSegs; i++) {
			posAttr.setXYZ(i * 2, 0, -100, 0);
			posAttr.setXYZ(i * 2 + 1, 0, -100, 0);
		}
		posAttr.needsUpdate = true;
	};

	fillArcs(rig.supportPreviewAllyLines, allySupportOrigins, targetWorldPos);
	fillArcs(rig.supportPreviewEnemyLines, enemySupportOrigins, targetWorldPos);
}

/**
 * Animates the 4D Dimensional Rift Portal and Trajectory Beam connecting the supporting piece's
 * board position to the active duel!
 */
export function updateInterventionRiftAndTrajectory(
	rig: BoardArenaRig,
	active: boolean,
	supporterWorldPos: THREE.Vector3,
	riftWorldPos: THREE.Vector3,
	strikeTargetWorldPos: THREE.Vector3,
	riftColorHex: number,
	progress01: number,
	elapsedTime: number,
) {
	if (!active) {
		rig.interventionRiftGroup.visible = false;
		rig.interventionTrajectoryLine.visible = false;
		return;
	}

	rig.interventionRiftGroup.visible = true;
	rig.interventionTrajectoryLine.visible = true;

	const envelope = Math.sin(Math.min(1, progress01) * Math.PI);
	rig.interventionRiftGroup.position.copy(riftWorldPos);
	rig.interventionRiftGroup.scale.setScalar(0.2 + envelope * 1.15);
	rig.interventionRiftGroup.rotation.y = elapsedTime * 1.8;

	const outerRing = rig.interventionRiftGroup.children[0] as THREE.Mesh;
	const innerRing = rig.interventionRiftGroup.children[1] as THREE.Mesh;
	const vortexDisc = rig.interventionRiftGroup.children[2] as THREE.Mesh;

	if (outerRing) {
		(outerRing.material as THREE.MeshBasicMaterial).color.setHex(riftColorHex);
		outerRing.rotation.z = elapsedTime * 5.5;
	}
	if (innerRing) {
		(innerRing.material as THREE.MeshBasicMaterial).color.setHex(riftColorHex);
		innerRing.rotation.x = -elapsedTime * 4.2;
		innerRing.rotation.y = elapsedTime * 3.8;
	}
	if (vortexDisc) {
		(vortexDisc.material as THREE.MeshBasicMaterial).color.setHex(riftColorHex);
	}

	// Update 32-segment energy trajectory arc from Supporter's Board Square -> Rift -> Enemy Target!
	const trajMat = rig.interventionTrajectoryLine
		.material as THREE.LineBasicMaterial;
	trajMat.color.setHex(riftColorHex);
	trajMat.opacity = Math.min(1, envelope * 1.4);

	const posAttr = rig.interventionTrajectoryLine.geometry.attributes
		.position as THREE.BufferAttribute;
	const count = 32;
	for (let i = 0; i < count; i++) {
		const t = i / (count - 1);
		// Quadratic Bezier curve from supporterWorldPos -> elevated control point above rift -> strikeTargetWorldPos
		const invT = 1 - t;
		const ctrlX = (supporterWorldPos.x + strikeTargetWorldPos.x) * 0.5;
		const ctrlY = Math.max(supporterWorldPos.y, strikeTargetWorldPos.y) + 3.2;
		const ctrlZ = (supporterWorldPos.z + strikeTargetWorldPos.z) * 0.5;

		const x =
			invT * invT * supporterWorldPos.x +
			2 * invT * t * ctrlX +
			t * t * strikeTargetWorldPos.x;
		const y =
			invT * invT * (supporterWorldPos.y + 1.1) +
			2 * invT * t * ctrlY +
			t * t * (strikeTargetWorldPos.y + 1.1) +
			Math.sin(t * Math.PI * 4 - elapsedTime * 16) * 0.08;
		const z =
			invT * invT * supporterWorldPos.z +
			2 * invT * t * ctrlZ +
			t * t * strikeTargetWorldPos.z;

		posAttr.setXYZ(i, x, y, z);
	}
	posAttr.needsUpdate = true;
}
