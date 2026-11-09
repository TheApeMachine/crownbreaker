import * as THREE from "three";
import { computeMultiverseParadoxMetrics } from "../engine/multiverseEngine";
import type { MultiverseState, TimelineBranch } from "../types/game";

export interface WatchHandRig {
	timelineId: string;
	shortCode: string;
	handIndex: number;
	rootPivot: THREE.Group;
	lowerShaftMesh: THREE.Mesh;
	upperBrokenPivot: THREE.Group;
	upperShaftMesh: THREE.Mesh;
	spadeTipMesh: THREE.Mesh;
	tailRingMesh: THREE.Mesh;
	material: THREE.MeshStandardMaterial;
	labelSprite: THREE.Sprite;
	labelCanvas: HTMLCanvasElement;
	baseColorHex: number;
	currentAngle: number;
	targetAngle: number;
	spawnScale: number;
	shudderTimer: number;
	isCollapsed: boolean;
	lastLabelStateKey: string;
}

export interface MultiversalPocketWatchRig {
	rootGroup: THREE.Group;
	watchBodyGroup: THREE.Group;
	dialMesh: THREE.Mesh;
	dialCanvas: HTMLCanvasElement;
	dialTexture: THREE.CanvasTexture;
	lastDialSignature: string;
	caseMaterial: THREE.MeshStandardMaterial;
	crystalMesh: THREE.Mesh;
	fractureLines: THREE.LineSegments;
	fractureMaterial: THREE.LineBasicMaterial;
	centerJewelMesh: THREE.Mesh;
	centerJewelBeam: THREE.Mesh;
	bellHammerPivot: THREE.Group;
	gears: { mesh: THREE.Mesh; ratio: number; baseZ: number }[];
	subDialNeedles: {
		rememberedNeedle: THREE.Group;
		paradoxNeedle: THREE.Group;
		realitiesNeedle: THREE.Group;
	};
	astrolabeRings: THREE.Mesh[];
	handsGroup: THREE.Group;
	handsMap: Map<string, WatchHandRig>;
	causalArcsLine: THREE.LineSegments;
	shockwaveRingMesh: THREE.Mesh;
	shockwaveMaterial: THREE.MeshBasicMaterial;
	shockwaveTimer: number;
	bellStrikeTimer: number;
	watchPointLight: THREE.PointLight;
	imminentParadoxWarning: boolean;
}

const HAND_PALETTE = [
	0xfbbf24, // 0: PRIME - Sovereign Solar Gold
	0x38bdf8, // 1: Ω-1 - Astral Cyan Silver
	0xe879f9, // 2: Ω-2 - Fuchsia Paradox Amethyst
	0x34d399, // 3: Ω-3 - Chrono Emerald Brass
	0xfb7185, // 4: Ω-4 - Crimson Blood-Gold
	0xa78bfa, // 5: Ω-5 - Violet Ether
	0xf97316, // 6: Ω-6 - Crucible Copper
	0x2dd4bf, // 7: Ω-7 - Teal Verdigris
];

function createToothedGearGeometry(
	innerRadius: number,
	outerRadius: number,
	teethCount: number,
	thickness: number,
): THREE.BufferGeometry {
	const shape = new THREE.Shape();
	const step = (Math.PI * 2) / teethCount;
	const rootR = outerRadius * 0.86;

	for (let i = 0; i < teethCount; i++) {
		const a0 = i * step;
		const a1 = a0 + step * 0.22;
		const a2 = a0 + step * 0.35;
		const a3 = a0 + step * 0.65;
		const a4 = a0 + step * 0.78;

		const p0x = Math.cos(a0) * rootR;
		const p0y = Math.sin(a0) * rootR;
		if (i === 0) {
			shape.moveTo(p0x, p0y);
		} else {
			shape.lineTo(p0x, p0y);
		}
		shape.lineTo(Math.cos(a1) * rootR, Math.sin(a1) * rootR);
		shape.lineTo(Math.cos(a2) * outerRadius, Math.sin(a2) * outerRadius);
		shape.lineTo(Math.cos(a3) * outerRadius, Math.sin(a3) * outerRadius);
		shape.lineTo(Math.cos(a4) * rootR, Math.sin(a4) * rootR);
	}
	shape.closePath();

	if (innerRadius > 0.05) {
		const hole = new THREE.Path();
		hole.absarc(0, 0, innerRadius, 0, Math.PI * 2, false);
		shape.holes.push(hole);
	}

	return new THREE.ExtrudeGeometry(shape, {
		depth: thickness,
		bevelEnabled: true,
		bevelThickness: 0.02,
		bevelSize: 0.02,
		bevelSegments: 2,
	});
}

function updateHandLabelCanvas(
	canvas: HTMLCanvasElement,
	shortCode: string,
	turnNumber: number,
	isActive: boolean,
	isCollapsed: boolean,
	isHovered: boolean,
	colorHex: number,
) {
	const ctx = canvas.getContext("2d")!;
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	const hexStr = `#${colorHex.toString(16).padStart(6, "0")}`;
	ctx.save();

	// Ornate horological cartouche plate
	ctx.fillStyle = isCollapsed
		? "rgba(24, 12, 16, 0.94)"
		: isActive || isHovered
			? "rgba(9, 14, 26, 0.96)"
			: "rgba(11, 15, 25, 0.86)";
	ctx.strokeStyle = isCollapsed
		? "#ef4444"
		: isHovered
			? "#ffffff"
			: isActive
				? "#fbbf24"
				: hexStr;
	ctx.lineWidth = isActive || isHovered ? 5 : 3;

	ctx.beginPath();
	ctx.roundRect(8, 12, canvas.width - 16, canvas.height - 24, 14);
	ctx.fill();
	ctx.stroke();

	ctx.font = "bold 28px monospace";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillStyle = isCollapsed ? "#f87171" : isActive ? "#fde68a" : "#f8fafc";
	const labelText = isCollapsed
		? `${shortCode} [BROKEN]`
		: isActive
			? `★ ${shortCode} · T${turnNumber}`
			: `${shortCode} · T${turnNumber}`;
	ctx.fillText(labelText, canvas.width / 2, canvas.height / 2);

	if (isCollapsed) {
		ctx.strokeStyle = "#ef4444";
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.moveTo(26, canvas.height / 2);
		ctx.lineTo(canvas.width - 26, canvas.height / 2);
		ctx.stroke();
	}

	ctx.restore();
}

function createWatchHandRig(
	branch: TimelineBranch,
	handIndex: number,
): WatchHandRig {
	const rootPivot = new THREE.Group();
	const isPrime = branch.id === "TL-PRIME";
	const baseColorHex = HAND_PALETTE[handIndex % HAND_PALETTE.length];

	const material = new THREE.MeshStandardMaterial({
		color: baseColorHex,
		emissive: baseColorHex,
		emissiveIntensity: isPrime ? 0.45 : 0.28,
		metalness: 0.88,
		roughness: 0.22,
	});

	// Hand length varies meaningfully by divergence depth and branch index
	const depth = branch.divergenceDepth ?? (isPrime ? 0 : 1);
	const totalLen = isPrime
		? 5.85
		: Math.max(3.8, 5.55 - depth * 0.32 - (handIndex % 3) * 0.22);
	const lowerLen = totalLen * 0.56;
	const upperLen = totalLen * 0.44;
	const thickness = isPrime ? 0.14 : Math.max(0.08, 0.12 - depth * 0.012);

	// Counterweight crescent ring at tail (-Y direction from center arbor)
	const tailRingGeo = new THREE.TorusGeometry(
		0.32 + (handIndex % 2) * 0.08,
		0.05,
		10,
		24,
	);
	const tailRingMesh = new THREE.Mesh(tailRingGeo, material);
	tailRingMesh.position.set(0, -0.75, 0);
	rootPivot.add(tailRingMesh);

	// Lower shaft from tail (-0.45) to mid-joint (lowerLen)
	const lowerShaftGeo = new THREE.BoxGeometry(thickness, lowerLen + 0.45, 0.08);
	const lowerShaftMesh = new THREE.Mesh(lowerShaftGeo, material);
	lowerShaftMesh.position.set(0, (lowerLen - 0.45) * 0.5, 0);
	rootPivot.add(lowerShaftMesh);

	// Upper pivot at `lowerLen` (bends/snaps when the timeline collapses!)
	const upperBrokenPivot = new THREE.Group();
	upperBrokenPivot.position.set(0, lowerLen, 0);
	rootPivot.add(upperBrokenPivot);

	const upperShaftGeo = new THREE.BoxGeometry(thickness * 0.82, upperLen, 0.07);
	const upperShaftMesh = new THREE.Mesh(upperShaftGeo, material);
	upperShaftMesh.position.set(0, upperLen * 0.5, 0);
	upperBrokenPivot.add(upperShaftMesh);

	// Ornate cathedral diamond/spade pointer tip
	const spadeGeo = new THREE.OctahedronGeometry(isPrime ? 0.34 : 0.26, 0);
	spadeGeo.scale(0.85, 1.85, 0.35);
	const spadeTipMesh = new THREE.Mesh(spadeGeo, material);
	spadeTipMesh.position.set(0, upperLen + 0.15, 0.02);
	upperBrokenPivot.add(spadeTipMesh);

	// Floating 3D Horological Branch Medallion Sprite near tip
	const labelCanvas = document.createElement("canvas");
	labelCanvas.width = 256;
	labelCanvas.height = 76;
	updateHandLabelCanvas(
		labelCanvas,
		branch.shortCode,
		branch.turnNumber,
		false,
		Boolean(branch.isCollapsed),
		false,
		baseColorHex,
	);

	const labelTex = new THREE.CanvasTexture(labelCanvas);
	labelTex.colorSpace = THREE.SRGBColorSpace;
	const spriteMat = new THREE.SpriteMaterial({
		map: labelTex,
		transparent: true,
		depthWrite: false,
	});
	const labelSprite = new THREE.Sprite(spriteMat);
	labelSprite.scale.set(1.95, 0.58, 1);
	labelSprite.position.set(0, upperLen + 0.82, 0.26);
	upperBrokenPivot.add(labelSprite);

	// Stagger Z height slightly per hand so hands never Z-fight
	rootPivot.position.z = 0.28 + handIndex * 0.055;

	return {
		timelineId: branch.id,
		shortCode: branch.shortCode,
		handIndex,
		rootPivot,
		lowerShaftMesh,
		upperBrokenPivot,
		upperShaftMesh,
		spadeTipMesh,
		tailRingMesh,
		material,
		labelSprite,
		labelCanvas,
		baseColorHex,
		currentAngle: 0,
		targetAngle: 0,
		spawnScale: 0.01,
		shudderTimer: 0,
		isCollapsed: Boolean(branch.isCollapsed),
		lastLabelStateKey: "",
	};
}

/**
 * Computes the semantic dial angle (in radians, 0 = 12 o'clock, clockwise positive)
 * for a given timeline branch on the Multiversal Pocket Watch.
 */
export function computeTimelineHandAngle(
	branch: TimelineBranch,
	handIndex: number,
	totalVisited: number,
): number {
	if (branch.id === "TL-PRIME") {
		// Prime Reality ticks clockwise from 12 o'clock by 1 minute mark per turn
		return ((branch.turnNumber - 1) * (Math.PI * 2)) / 60;
	}

	// Diverged branches occupy distinct horological sectors around the dial
	// determined by their branch index + divergence depth + turns elapsed since fork
	const sectorStep = (Math.PI * 2) / Math.max(6, totalVisited);
	const baseSectorAngle =
		handIndex * sectorStep + (branch.divergenceDepth ?? 1) * 0.28;
	const elapsedTurnsSinceFork = Math.max(
		0,
		branch.turnNumber - branch.forkTurn,
	);
	const turnProgressionAngle = (elapsedTurnsSinceFork * (Math.PI * 2)) / 60;

	return baseSectorAngle + turnProgressionAngle;
}

/**
 * Redraws the 1024x1024 dynamic antique pocket-watch dial face whenever multiverse state changes.
 */
function renderPocketWatchDialFace(
	rig: MultiversalPocketWatchRig,
	multiverse: MultiverseState,
) {
	const metrics = computeMultiverseParadoxMetrics(multiverse);
	const activeBranch = multiverse.timelines.get(multiverse.activeTimelineId);
	const activeCode = activeBranch?.shortCode || "PRIME";
	const activeTurn = activeBranch?.turnNumber || 1;

	const signature = [
		multiverse.activeTimelineId,
		multiverse.hoveredTimelineId || "",
		activeTurn,
		multiverse.visitedTimelineIds.join(","),
		metrics.collapsedCount,
		metrics.rememberedSquareCount,
		metrics.causalDeathCount,
		metrics.pendingBreachCount,
		rig.imminentParadoxWarning ? "WARN" : "OK",
		...multiverse.visitedTimelineIds.map((id) => {
			const b = multiverse.timelines.get(id);
			return `${id}:${b?.turnNumber ?? 1}:${b?.isCollapsed ? 1 : 0}`;
		}),
	].join("|");

	if (signature === rig.lastDialSignature) return;
	rig.lastDialSignature = signature;

	const canvas = rig.dialCanvas;
	const ctx = canvas.getContext("2d")!;
	const cx = 512;
	const cy = 512;

	ctx.clearRect(0, 0, 1024, 1024);

	// 1. Aged Obsidian-Bronze Guilloché Dial Background
	const radGrad = ctx.createRadialGradient(cx, cy, 40, cx, cy, 495);
	if (rig.imminentParadoxWarning || metrics.paradoxStrain > 0.65) {
		radGrad.addColorStop(0, "#1f1018");
		radGrad.addColorStop(0.55, "#120d1a");
		radGrad.addColorStop(1, "#07090f");
	} else {
		radGrad.addColorStop(0, "#161b28");
		radGrad.addColorStop(0.6, "#0d111a");
		radGrad.addColorStop(1, "#06080d");
	}
	ctx.fillStyle = radGrad;
	ctx.beginPath();
	ctx.arc(cx, cy, 496, 0, Math.PI * 2);
	ctx.fill();

	// Concentric Gothic Astrolabe Filigree Rings
	const ringRadii = [478, 442, 385, 315, 225, 118];
	ringRadii.forEach((r, idx) => {
		ctx.strokeStyle =
			idx === 0 || idx === 2
				? "rgba(245, 158, 11, 0.52)"
				: "rgba(148, 163, 184, 0.22)";
		ctx.lineWidth = idx === 0 ? 5 : idx === 2 ? 3 : 1.5;
		ctx.beginPath();
		ctx.arc(cx, cy, r, 0, Math.PI * 2);
		ctx.stroke();
	});

	// 60 Minute/Degree Horological Graduations
	for (let i = 0; i < 60; i++) {
		const angle = (i * Math.PI * 2) / 60 - Math.PI / 2;
		const isMajor = i % 5 === 0;
		const rInner = isMajor ? 444 : 458;
		const rOuter = 474;
		ctx.strokeStyle = isMajor
			? "rgba(251, 191, 36, 0.78)"
			: "rgba(148, 163, 184, 0.35)";
		ctx.lineWidth = isMajor ? 3.5 : 1.5;
		ctx.beginPath();
		ctx.moveTo(cx + Math.cos(angle) * rInner, cy + Math.sin(angle) * rInner);
		ctx.lineTo(cx + Math.cos(angle) * rOuter, cy + Math.sin(angle) * rOuter);
		ctx.stroke();
	}

	// 12 Roman Numerals around the Chapter Ring
	const romans = [
		"XII",
		"I",
		"II",
		"III",
		"IV",
		"V",
		"VI",
		"VII",
		"VIII",
		"IX",
		"X",
		"XI",
	];
	ctx.font = "bold 34px Georgia, serif";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	romans.forEach((num, idx) => {
		const angle = (idx * Math.PI * 2) / 12 - Math.PI / 2;
		const r = 412;
		const x = cx + Math.cos(angle) * r;
		const y = cy + Math.sin(angle) * r;
		ctx.fillStyle = idx === 0 ? "#fbbf24" : "rgba(226, 232, 240, 0.72)";
		ctx.fillText(num, x, y);
	});

	// 2. REMEMBERED-SQUARE MEMORY TRAILS & PERIMETER UNIVERSE INSIGNIAS
	const totalVisited = multiverse.visitedTimelineIds.length;
	multiverse.visitedTimelineIds.forEach((tid, idx) => {
		const branch = multiverse.timelines.get(tid);
		if (!branch) return;
		const handAngle = computeTimelineHandAngle(branch, idx, totalVisited);
		// Canvas angle: 0 rad in hand space is 12 o'clock (-PI/2 in canvas arc space)
		const canvasAngle = handAngle - Math.PI / 2;
		const colorHex = HAND_PALETTE[idx % HAND_PALETTE.length];
		const hexStr = `#${colorHex.toString(16).padStart(6, "0")}`;
		const isAct = tid === multiverse.activeTimelineId;

		// Draw Memory Trail Arc representing turns & remembered squares in this universe
		const memCountForBranch = multiverse.rememberedSquares.filter(
			(r) => r.sourceTimelineId === tid,
		).length;
		const trailSpan = Math.min(
			Math.PI * 0.45,
			0.08 + memCountForBranch * 0.045 + branch.turnNumber * 0.02,
		);
		const trailRadius = 355 - (idx % 4) * 14;

		ctx.strokeStyle = branch.isCollapsed
			? "rgba(239, 68, 68, 0.35)"
			: isAct
				? "rgba(251, 191, 36, 0.65)"
				: `${hexStr}66`;
		ctx.lineWidth = isAct ? 6 : 3.5;
		ctx.beginPath();
		ctx.arc(cx, cy, trailRadius, canvasAngle - trailSpan, canvasAngle);
		ctx.stroke();

		// Draw Perimeter Branch Node Marker on the 355 ring
		const mx = cx + Math.cos(canvasAngle) * 355;
		const my = cy + Math.sin(canvasAngle) * 355;
		ctx.fillStyle = branch.isCollapsed ? "#7f1d1d" : isAct ? "#fbbf24" : hexStr;
		ctx.beginPath();
		ctx.arc(mx, my, isAct ? 10 : 7, 0, Math.PI * 2);
		ctx.fill();
	});

	// 3. THREE HOROLOGICAL SUB-DIALS (9 o'clock, 3 o'clock, 6 o'clock)
	const subDials = [
		{
			x: cx - 195,
			y: cy,
			r: 84,
			title: "REMEMBERED SQ",
			valueText: `${metrics.rememberedSquareCount} LETHAL`,
			accent: metrics.rememberedSquareCount > 0 ? "#f43f5e" : "#38bdf8",
		},
		{
			x: cx + 195,
			y: cy,
			r: 84,
			title: "PARADOX LOAD",
			valueText: `${Math.round(metrics.paradoxStrain * 100)}% STRAIN`,
			accent: metrics.paradoxStrain > 0.5 ? "#ef4444" : "#f59e0b",
		},
		{
			x: cx,
			y: cy + 195,
			r: 84,
			title: "REALITIES TOUCHED",
			valueText: `${metrics.visitedCount} HANDS · ${metrics.collapsedCount} BROKEN`,
			accent: "#e879f9",
		},
	];

	subDials.forEach((sd) => {
		ctx.fillStyle = "rgba(7, 10, 18, 0.92)";
		ctx.strokeStyle = sd.accent;
		ctx.lineWidth = 2.5;
		ctx.beginPath();
		ctx.arc(sd.x, sd.y, sd.r, 0, Math.PI * 2);
		ctx.fill();
		ctx.stroke();

		// Sub-dial ticks
		for (let t = 0; t < 12; t++) {
			const a = (t * Math.PI * 2) / 12;
			ctx.strokeStyle = "rgba(226, 232, 240, 0.35)";
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.moveTo(
				sd.x + Math.cos(a) * (sd.r - 12),
				sd.y + Math.sin(a) * (sd.r - 12),
			);
			ctx.lineTo(
				sd.x + Math.cos(a) * (sd.r - 3),
				sd.y + Math.sin(a) * (sd.r - 3),
			);
			ctx.stroke();
		}

		ctx.font = "bold 13px monospace";
		ctx.fillStyle = "rgba(148, 163, 184, 0.9)";
		ctx.fillText(sd.title, sd.x, sd.y - 24);

		ctx.font = "bold 17px monospace";
		ctx.fillStyle = sd.accent;
		ctx.fillText(sd.valueText, sd.x, sd.y + 30);
	});

	// Check if a Sentient Mathematical Theorem exists on the active board or if Yesterday was just checkmated
	const theoremPiece = activeBranch?.pieces.find((p) => p.isSentientTheorem);
	const recentYesterdayEvent = multiverse.watchEvents.find(
		(ev) => ev.kind === "RETROACTIVE_YESTERDAY_CHECKMATE",
	);

	// 4. UPPER ACTIVE UNIVERSE CARTOUCHE (12 o'clock below XII)
	const isPeerReviewDraft =
		theoremPiece && theoremPiece.theoremStatus === "UNPUBLISHED_DRAFT";
	ctx.fillStyle = "rgba(10, 14, 24, 0.92)";
	ctx.strokeStyle = rig.imminentParadoxWarning
		? "#ef4444"
		: isPeerReviewDraft
			? "#f59e0b"
			: theoremPiece || recentYesterdayEvent
				? "#38bdf8"
				: "#fbbf24";
	ctx.lineWidth = 3;
	ctx.beginPath();
	ctx.roundRect(cx - 195, cy - 245, 390, 74, 12);
	ctx.fill();
	ctx.stroke();

	ctx.font = "bold 14px monospace";
	ctx.fillStyle = rig.imminentParadoxWarning
		? "#fca5a5"
		: isPeerReviewDraft
			? "#fde68a"
			: theoremPiece || recentYesterdayEvent
				? "#7dd3fc"
				: "#fcd34d";
	ctx.fillText(
		rig.imminentParadoxWarning
			? "⚠ IMMINENT PARADOX SQUARE COLLISION ⚠"
			: recentYesterdayEvent
				? "⊢ Q.E.D. · YESTERDAY RETROACTIVELY CHECKMATED"
				: isPeerReviewDraft
					? "🎓 ACADEMIC PEER REVIEW IN SESSION · PREPRINT"
					: theoremPiece
						? theoremPiece.theoremAxiom ||
							"⊢ SENTIENT MATHEMATICAL THEOREM PUBLISHED"
						: "CHRONO-CAUSAL LEDGER · ACTIVE REALITY",
		cx,
		cy - 222,
	);

	ctx.font = "bold 24px Georgia, serif";
	ctx.fillStyle = "#ffffff";
	ctx.fillText(
		recentYesterdayEvent
			? `${activeCode} · TURN ${activeTurn} → Δt = −1 (YESTERDAY)`
			: isPeerReviewDraft
				? `${activeCode} · FACULTY COLLOQUIUM`
				: `${activeCode} · TURN ${activeTurn}`,
		cx,
		cy - 190,
	);

	// 5. CRYSTAL FRACTURE LINES ETCHED INTO THE DIAL UNDER HIGH STRAIN OR COLLAPSE
	const crackCount =
		metrics.collapsedCount * 3 + Math.floor(metrics.paradoxStrain * 6);
	if (crackCount > 0) {
		ctx.strokeStyle = "rgba(248, 113, 113, 0.55)";
		ctx.lineWidth = 2.2;
		for (let c = 0; c < crackCount; c++) {
			const startAngle = (c * 2.39996) % (Math.PI * 2);
			let rx = cx + Math.cos(startAngle) * 65;
			let ry = cy + Math.sin(startAngle) * 65;
			ctx.beginPath();
			ctx.moveTo(rx, ry);
			for (let seg = 0; seg < 5; seg++) {
				const stepR = 65 + (seg + 1) * 72;
				const jitter = (((c * 7 + seg * 13) % 11) - 5) * 0.045;
				rx = cx + Math.cos(startAngle + jitter) * stepR;
				ry = cy + Math.sin(startAngle + jitter) * stepR;
				ctx.lineTo(rx, ry);
			}
			ctx.stroke();
		}
	}

	rig.dialTexture.needsUpdate = true;
}

/**
 * Builds the colossal 3D Multiversal Pocket Watch suspended high above the chessboard.
 */
export function createMultiversalPocketWatch(
	renderer: THREE.WebGLRenderer,
): MultiversalPocketWatchRig {
	const rootGroup = new THREE.Group();
	// Suspended high above the northern horizon of the 4D chessboard, tilted down toward the arena
	rootGroup.position.set(0, 17.2, -14.2);
	rootGroup.rotation.x = 0.54;

	const watchBodyGroup = new THREE.Group();
	rootGroup.add(watchBodyGroup);

	// Warm horological point light illuminating the watch face and clockwork
	const watchPointLight = new THREE.PointLight(0xfbbf24, 3.2, 28);
	watchPointLight.position.set(0, 1.5, 4.8);
	watchBodyGroup.add(watchPointLight);

	// 1. AGED BRASS & OBSIDIAN POCKET WATCH CASE
	const caseMaterial = new THREE.MeshStandardMaterial({
		color: 0xc28e42,
		emissive: 0x3b2106,
		emissiveIntensity: 0.22,
		metalness: 0.88,
		roughness: 0.26,
	});

	const obsidianMat = new THREE.MeshStandardMaterial({
		color: 0x0c101c,
		metalness: 0.65,
		roughness: 0.22,
	});

	const outerBezel = new THREE.Mesh(
		new THREE.TorusGeometry(7.6, 0.52, 24, 96),
		caseMaterial,
	);
	outerBezel.position.z = 0.08;
	watchBodyGroup.add(outerBezel);

	const innerBezel = new THREE.Mesh(
		new THREE.TorusGeometry(7.08, 0.18, 16, 96),
		caseMaterial,
	);
	innerBezel.position.z = 0.22;
	watchBodyGroup.add(innerBezel);

	const caseBack = new THREE.Mesh(
		new THREE.CylinderGeometry(7.65, 7.5, 0.55, 72),
		obsidianMat,
	);
	caseBack.rotation.x = Math.PI / 2;
	caseBack.position.z = -0.35;
	watchBodyGroup.add(caseBack);

	// 12 Gothic Bezel Lugs around the perimeter
	const lugGeo = new THREE.BoxGeometry(0.42, 0.72, 0.68);
	for (let i = 0; i < 12; i++) {
		const a = (i * Math.PI * 2) / 12;
		const lug = new THREE.Mesh(lugGeo, caseMaterial);
		lug.position.set(Math.cos(a) * 7.75, Math.sin(a) * 7.75, 0.12);
		lug.rotation.z = a - Math.PI / 2;
		watchBodyGroup.add(lug);
	}

	// 12-o'clock Winding Crown Stem, Fluted Crown & Antique Bow Ring
	const stemMesh = new THREE.Mesh(
		new THREE.CylinderGeometry(0.45, 0.52, 1.25, 24),
		caseMaterial,
	);
	stemMesh.position.set(0, 8.35, 0.05);
	watchBodyGroup.add(stemMesh);

	const crownWheel = new THREE.Mesh(
		new THREE.CylinderGeometry(0.82, 0.72, 0.55, 32),
		caseMaterial,
	);
	crownWheel.position.set(0, 9.05, 0.05);
	watchBodyGroup.add(crownWheel);

	const bowRing = new THREE.Mesh(
		new THREE.TorusGeometry(1.38, 0.14, 16, 48),
		caseMaterial,
	);
	bowRing.position.set(0, 9.55, 0.05);
	watchBodyGroup.add(bowRing);

	// External Doom Bell Strike Hammer at 11 o'clock bezel
	const bellHammerPivot = new THREE.Group();
	bellHammerPivot.position.set(-2.6, 7.65, 0.25);
	const hammerArm = new THREE.Mesh(
		new THREE.CylinderGeometry(0.08, 0.08, 1.45, 12),
		caseMaterial,
	);
	hammerArm.position.set(-0.55, 0.45, 0);
	hammerArm.rotation.z = 0.75;
	bellHammerPivot.add(hammerArm);
	const hammerHead = new THREE.Mesh(
		new THREE.CylinderGeometry(0.28, 0.28, 0.65, 16),
		caseMaterial,
	);
	hammerHead.position.set(-1.05, 0.92, 0);
	hammerHead.rotation.z = -0.35;
	bellHammerPivot.add(hammerHead);
	watchBodyGroup.add(bellHammerPivot);

	// 2. DYNAMIC ENGRAVED DIAL FACE
	const dialCanvas = document.createElement("canvas");
	dialCanvas.width = 1024;
	dialCanvas.height = 1024;
	const dialTexture = new THREE.CanvasTexture(dialCanvas);
	dialTexture.colorSpace = THREE.SRGBColorSpace;
	dialTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

	const dialMat = new THREE.MeshStandardMaterial({
		map: dialTexture,
		roughness: 0.36,
		metalness: 0.35,
	});
	const dialMesh = new THREE.Mesh(new THREE.CircleGeometry(7.05, 72), dialMat);
	dialMesh.position.z = 0.02;
	watchBodyGroup.add(dialMesh);

	// 3. EXPOSED INTERNAL CLOCKWORK GEARS
	const gearConfigs = [
		{
			x: 0,
			y: 0,
			rOut: 2.35,
			rIn: 0.85,
			teeth: 28,
			ratio: 0.35,
			color: 0xd97706,
			z: 0.06,
		},
		{
			x: -2.2,
			y: 1.9,
			rOut: 1.45,
			rIn: 0.42,
			teeth: 18,
			ratio: -0.65,
			color: 0xb45309,
			z: 0.08,
		},
		{
			x: 2.2,
			y: 1.9,
			rOut: 1.45,
			rIn: 0.42,
			teeth: 18,
			ratio: 0.65,
			color: 0x94a3b8,
			z: 0.08,
		},
		{
			x: -1.65,
			y: -1.85,
			rOut: 1.15,
			rIn: 0.32,
			teeth: 15,
			ratio: 0.95,
			color: 0xf59e0b,
			z: 0.07,
		},
		{
			x: 1.65,
			y: -1.85,
			rOut: 1.15,
			rIn: 0.32,
			teeth: 15,
			ratio: -0.95,
			color: 0x64748b,
			z: 0.07,
		},
	];

	const gears: { mesh: THREE.Mesh; ratio: number; baseZ: number }[] = [];
	for (const gc of gearConfigs) {
		const geo = createToothedGearGeometry(gc.rIn, gc.rOut, gc.teeth, 0.08);
		const mat = new THREE.MeshStandardMaterial({
			color: gc.color,
			metalness: 0.86,
			roughness: 0.28,
		});
		const mesh = new THREE.Mesh(geo, mat);
		mesh.position.set(gc.x, gc.y, gc.z);
		watchBodyGroup.add(mesh);
		gears.push({ mesh, ratio: gc.ratio, baseZ: gc.z });
	}

	// 4. PHYSICAL 3D SUB-DIAL NEEDLES (9 o'clock, 3 o'clock, 6 o'clock)
	const makeSubNeedle = (x: number, y: number, colorHex: number) => {
		const grp = new THREE.Group();
		grp.position.set(x, y, 0.16);
		const needleMat = new THREE.MeshStandardMaterial({
			color: colorHex,
			emissive: colorHex,
			emissiveIntensity: 0.55,
			metalness: 0.8,
			roughness: 0.2,
		});
		const shaft = new THREE.Mesh(
			new THREE.BoxGeometry(0.06, 0.88, 0.04),
			needleMat,
		);
		shaft.position.y = 0.34;
		grp.add(shaft);
		watchBodyGroup.add(grp);
		return grp;
	};

	const rememberedNeedle = makeSubNeedle(-2.7, 0, 0xf43f5e);
	const paradoxNeedle = makeSubNeedle(2.7, 0, 0xf59e0b);
	const realitiesNeedle = makeSubNeedle(0, -2.7, 0xe879f9);

	// 5. HANDS GROUP & CENTRAL JEWEL ARBOR CAP
	const handsGroup = new THREE.Group();
	watchBodyGroup.add(handsGroup);

	const jewelMat = new THREE.MeshStandardMaterial({
		color: 0x38bdf8,
		emissive: 0x38bdf8,
		emissiveIntensity: 0.85,
		metalness: 0.3,
		roughness: 0.12,
	});
	const centerJewelMesh = new THREE.Mesh(
		new THREE.OctahedronGeometry(0.42, 1),
		jewelMat,
	);
	centerJewelMesh.scale.set(1, 1, 0.55);
	centerJewelMesh.position.z = 0.85;
	watchBodyGroup.add(centerJewelMesh);

	// Directional pointer beam on the center jewel indicating the Active Universe
	const beamGeo = new THREE.ConeGeometry(0.22, 1.65, 8);
	beamGeo.translate(0, 0.82, 0);
	const centerJewelBeam = new THREE.Mesh(
		beamGeo,
		new THREE.MeshBasicMaterial({
			color: 0xfbbf24,
			transparent: true,
			opacity: 0.75,
		}),
	);
	centerJewelBeam.position.z = 0.86;
	watchBodyGroup.add(centerJewelBeam);

	// 6. CAUSAL TETHER ARCS LINE SEGMENTS (Connecting hands that have cross-timeline kills)
	const arcPositions = new Float32Array(120 * 3);
	const arcGeo = new THREE.BufferGeometry();
	arcGeo.setAttribute("position", new THREE.BufferAttribute(arcPositions, 3));
	arcGeo.setDrawRange(0, 0);
	const causalArcsLine = new THREE.LineSegments(
		arcGeo,
		new THREE.LineBasicMaterial({
			color: 0xf43f5e,
			transparent: true,
			opacity: 0.88,
		}),
	);
	causalArcsLine.position.z = 0.72;
	watchBodyGroup.add(causalArcsLine);

	// 7. DOMED WATCH CRYSTAL & FRACTURE CRACK OVERLAY
	const crystalMat = new THREE.MeshPhysicalMaterial({
		color: 0xe0f2fe,
		transparent: true,
		opacity: 0.11,
		roughness: 0.08,
		metalness: 0.05,
		clearcoat: 1.0,
		depthWrite: false,
	});
	const crystalGeo = new THREE.SphereGeometry(
		7.1,
		48,
		24,
		0,
		Math.PI * 2,
		0,
		Math.PI * 0.18,
	);
	crystalGeo.rotateX(Math.PI / 2);
	const crystalMesh = new THREE.Mesh(crystalGeo, crystalMat);
	crystalMesh.position.z = -5.75;
	watchBodyGroup.add(crystalMesh);

	// 3D Fracture Crack segments on the crystal dome
	const crackVerts: number[] = [];
	for (let i = 0; i < 14; i++) {
		const a = (i * Math.PI * 2) / 14 + 0.15;
		let prevX = Math.cos(a) * 0.5;
		let prevY = Math.sin(a) * 0.5;
		for (let s = 1; s <= 5; s++) {
			const r = s * 1.32;
			const jitter = (((i * 11 + s * 7) % 9) - 4) * 0.08;
			const nx = Math.cos(a + jitter) * r;
			const ny = Math.sin(a + jitter) * r;
			crackVerts.push(prevX, prevY, 0.92, nx, ny, 0.92);
			prevX = nx;
			prevY = ny;
		}
	}
	const fractureGeo = new THREE.BufferGeometry();
	fractureGeo.setAttribute(
		"position",
		new THREE.Float32BufferAttribute(crackVerts, 3),
	);
	fractureGeo.setDrawRange(0, 0);
	const fractureMaterial = new THREE.LineBasicMaterial({
		color: 0xfca5a5,
		transparent: true,
		opacity: 0.75,
	});
	const fractureLines = new THREE.LineSegments(fractureGeo, fractureMaterial);
	watchBodyGroup.add(fractureLines);

	// 8. ORBITING GIMBALED ASTROLABE RINGS (Unlock as more universes are visited!)
	const astrolabeRings: THREE.Mesh[] = [];
	const ringSpecs = [
		{ r: 8.65, tube: 0.09, color: 0xfbbf24 },
		{ r: 9.35, tube: 0.07, color: 0x38bdf8 },
		{ r: 10.05, tube: 0.06, color: 0xe879f9 },
	];
	for (const rs of ringSpecs) {
		const rMesh = new THREE.Mesh(
			new THREE.TorusGeometry(rs.r, rs.tube, 12, 84),
			new THREE.MeshStandardMaterial({
				color: rs.color,
				emissive: rs.color,
				emissiveIntensity: 0.35,
				metalness: 0.85,
				roughness: 0.2,
			}),
		);
		rMesh.visible = false;
		watchBodyGroup.add(rMesh);
		astrolabeRings.push(rMesh);
	}

	// 9. RADIAL SHOCKWAVE RING FOR MAJOR CAUSAL / PARADOX EVENTS
	const shockwaveMaterial = new THREE.MeshBasicMaterial({
		color: 0xf43f5e,
		transparent: true,
		opacity: 0,
		side: THREE.DoubleSide,
		depthWrite: false,
	});
	const shockwaveRingMesh = new THREE.Mesh(
		new THREE.RingGeometry(6.8, 7.6, 64),
		shockwaveMaterial,
	);
	shockwaveRingMesh.position.z = 0.65;
	shockwaveRingMesh.visible = false;
	watchBodyGroup.add(shockwaveRingMesh);

	return {
		rootGroup,
		watchBodyGroup,
		dialMesh,
		dialCanvas,
		dialTexture,
		lastDialSignature: "",
		caseMaterial,
		crystalMesh,
		fractureLines,
		fractureMaterial,
		centerJewelMesh,
		centerJewelBeam,
		bellHammerPivot,
		gears,
		subDialNeedles: {
			rememberedNeedle,
			paradoxNeedle,
			realitiesNeedle,
		},
		astrolabeRings,
		handsGroup,
		handsMap: new Map(),
		causalArcsLine,
		shockwaveRingMesh,
		shockwaveMaterial,
		shockwaveTimer: 0,
		bellStrikeTimer: 0,
		watchPointLight,
		imminentParadoxWarning: false,
	};
}

/**
 * Triggers a physical shockwave, bell-hammer strike, and hand shudder on the 3D Pocket Watch.
 */
export function triggerPocketWatchReaction(
	rig: MultiversalPocketWatchRig,
	colorHex: number,
	targetTimelineId?: string,
	strikeBell: boolean = true,
) {
	rig.shockwaveMaterial.color.setHex(colorHex);
	rig.shockwaveTimer = 1.35;
	rig.shockwaveRingMesh.visible = true;
	rig.shockwaveRingMesh.scale.setScalar(0.25);

	if (strikeBell) {
		rig.bellStrikeTimer = 1.1;
	}

	if (targetTimelineId) {
		const hand = rig.handsMap.get(targetTimelineId);
		if (hand) {
			hand.shudderTimer = 1.6;
		}
	}
}

/**
 * Synchronizes the 3D Multiversal Pocket Watch every frame with the authoritative `MultiverseState`.
 */
export function updateMultiversalPocketWatch(
	rig: MultiversalPocketWatchRig,
	multiverse: MultiverseState,
	elapsed: number,
	dt: number,
	imminentParadoxWarning: boolean = false,
	duelOnWatchMode: boolean = false,
) {
	rig.imminentParadoxWarning = imminentParadoxWarning;
	const metrics = computeMultiverseParadoxMetrics(multiverse);
	const visitedIds = multiverse.visitedTimelineIds;
	const totalVisited = visitedIds.length;

	// Smoothly tilt the Colossal Pocket Watch into a horizontal Celestial Arena Platform during a Horologium Watch Duel!
	const targetRotX = duelOnWatchMode ? -Math.PI / 2 : 0.54;
	const targetRootY = duelOnWatchMode ? 16.5 : 17.2;
	rig.rootGroup.rotation.x = THREE.MathUtils.damp(
		rig.rootGroup.rotation.x,
		targetRotX,
		8,
		dt,
	);
	rig.rootGroup.position.y = THREE.MathUtils.damp(
		rig.rootGroup.position.y,
		targetRootY,
		8,
		dt,
	);
	rig.crystalMesh.visible = !duelOnWatchMode;

	// 1. Ensure a persistent 3D WatchHandRig exists for every visited/created timeline
	visitedIds.forEach((tid, idx) => {
		const branch = multiverse.timelines.get(tid);
		if (!branch) return;

		let handRig = rig.handsMap.get(tid);
		if (!handRig) {
			handRig = createWatchHandRig(branch, idx);
			const initialAngle = computeTimelineHandAngle(branch, idx, totalVisited);
			handRig.currentAngle = initialAngle;
			handRig.targetAngle = initialAngle;
			rig.handsGroup.add(handRig.rootPivot);
			rig.handsMap.set(tid, handRig);

			if (idx > 0) {
				triggerPocketWatchReaction(rig, handRig.baseColorHex, tid, false);
			}
		}

		// Update semantic target angle from branch properties
		if (!branch.isCollapsed) {
			handRig.targetAngle = computeTimelineHandAngle(branch, idx, totalVisited);
		}
		handRig.isCollapsed = Boolean(branch.isCollapsed);

		// Smooth mechanical escapement stepping toward targetAngle
		const angleDiff = handRig.targetAngle - handRig.currentAngle;
		handRig.currentAngle += angleDiff * Math.min(1, dt * 8.5);

		// Smooth spawn emergence
		handRig.spawnScale = THREE.MathUtils.lerp(
			handRig.spawnScale,
			1.0,
			Math.min(1, dt * 6),
		);
		handRig.rootPivot.scale.setScalar(handRig.spawnScale);

		// Compute instability tremor for this specific timeline
		const hasPendingBreach = Array.from(
			multiverse.eliminatedLineages.values(),
		).some((ev) => !branch.appliedDeathEventIds.includes(ev.id));
		if (handRig.shudderTimer > 0) {
			handRig.shudderTimer = Math.max(0, handRig.shudderTimer - dt);
		}

		const isActive = tid === multiverse.activeTimelineId;
		const isHovered = tid === multiverse.hoveredTimelineId;

		let jitter = 0;
		if (handRig.shudderTimer > 0) {
			jitter = Math.sin(elapsed * 55) * 0.14 * handRig.shudderTimer;
		} else if (hasPendingBreach || rig.imminentParadoxWarning) {
			jitter = Math.sin(elapsed * 36 + idx * 2.1) * 0.032;
		} else if (!branch.isCollapsed) {
			// Subtle mechanical second-hand micro-tick
			jitter = Math.sin(Math.floor(elapsed * 2) * 1.5) * 0.004;
		}

		// In Three.js XY plane, 12 o'clock is +Y (rotation.z = 0), clockwise is negative Z rotation
		handRig.rootPivot.rotation.z = -(handRig.currentAngle + jitter);

		// Active hand rises slightly forward and pulses brightly (kept flush when dueling atop the watch!)
		const targetZ = duelOnWatchMode
			? 0.12 + idx * 0.015
			: (isActive ? 0.58 : 0.28) + idx * 0.045;
		handRig.rootPivot.position.z = THREE.MathUtils.lerp(
			handRig.rootPivot.position.z,
			targetZ,
			Math.min(1, dt * 10),
		);

		if (branch.isCollapsed) {
			// Collapsed timeline hand visibly cracks/bends at its mid-joint and turns scorched iron!
			handRig.upperBrokenPivot.rotation.z = THREE.MathUtils.lerp(
				handRig.upperBrokenPivot.rotation.z,
				0.62,
				Math.min(1, dt * 8),
			);
			handRig.material.color.setHex(0x27272a);
			handRig.material.emissive.setHex(0x991b1b);
			handRig.material.emissiveIntensity = 0.25 + Math.sin(elapsed * 4) * 0.1;
		} else {
			handRig.upperBrokenPivot.rotation.z = THREE.MathUtils.lerp(
				handRig.upperBrokenPivot.rotation.z,
				0,
				Math.min(1, dt * 8),
			);
			handRig.material.color.setHex(
				isHovered ? 0xffffff : handRig.baseColorHex,
			);
			handRig.material.emissive.setHex(
				isActive ? 0xfbbf24 : handRig.baseColorHex,
			);
			handRig.material.emissiveIntensity = isHovered
				? 1.15
				: isActive
					? 0.78 + Math.sin(elapsed * 5) * 0.22
					: 0.28;
		}

		// Keep the floating 3D medallion upright and synchronized
		handRig.labelSprite.visible = !duelOnWatchMode;
		handRig.labelSprite.material.rotation =
			handRig.rootPivot.rotation.z + handRig.upperBrokenPivot.rotation.z;
		const labelKey = `${branch.shortCode}|${branch.turnNumber}|${isActive}|${branch.isCollapsed}|${isHovered}`;
		if (labelKey !== handRig.lastLabelStateKey) {
			handRig.lastLabelStateKey = labelKey;
			updateHandLabelCanvas(
				handRig.labelCanvas,
				branch.shortCode,
				branch.turnNumber,
				isActive,
				Boolean(branch.isCollapsed),
				isHovered,
				handRig.baseColorHex,
			);
			(handRig.labelSprite.material.map as THREE.CanvasTexture).needsUpdate =
				true;
		}

		// Point the Center Jewel Beam directly along the active universe's hand!
		if (isActive) {
			rig.centerJewelBeam.rotation.z = handRig.rootPivot.rotation.z;
			(rig.centerJewelMesh.material as THREE.MeshStandardMaterial).color.setHex(
				rig.imminentParadoxWarning ? 0xef4444 : handRig.baseColorHex,
			);
			(
				rig.centerJewelMesh.material as THREE.MeshStandardMaterial
			).emissive.setHex(
				rig.imminentParadoxWarning ? 0xef4444 : handRig.baseColorHex,
			);
		}
	});

	// 2. Update 3D Causal Assassination Tether Arcs between hands
	const arcAttr = rig.causalArcsLine.geometry.getAttribute(
		"position",
	) as THREE.BufferAttribute;
	let vertIdx = 0;
	for (const [, ev] of multiverse.eliminatedLineages.entries()) {
		const srcHand = rig.handsMap.get(ev.sourceTimelineId);
		const primeHand = rig.handsMap.get(multiverse.primeTimelineId);
		if (srcHand && primeHand && srcHand !== primeHand && vertIdx + 20 < 120) {
			const a1 = -srcHand.currentAngle + Math.PI / 2;
			const a2 = -primeHand.currentAngle + Math.PI / 2;
			const x1 = Math.cos(a1) * 3.8;
			const y1 = Math.sin(a1) * 3.8;
			const x2 = Math.cos(a2) * 3.8;
			const y2 = Math.sin(a2) * 3.8;

			const segments = 8;
			for (let s = 0; s < segments; s++) {
				const t0 = s / segments;
				const t1 = (s + 1) / segments;
				const p0x = THREE.MathUtils.lerp(x1, x2, t0);
				const p0y = THREE.MathUtils.lerp(y1, y2, t0);
				const p0z = Math.sin(t0 * Math.PI) * 0.65;

				const p1x = THREE.MathUtils.lerp(x1, x2, t1);
				const p1y = THREE.MathUtils.lerp(y1, y2, t1);
				const p1z = Math.sin(t1 * Math.PI) * 0.65;

				arcAttr.setXYZ(vertIdx++, p0x, p0y, p0z);
				arcAttr.setXYZ(vertIdx++, p1x, p1y, p1z);
			}
		}
	}
	rig.causalArcsLine.geometry.setDrawRange(0, vertIdx);
	arcAttr.needsUpdate = true;

	// 3. Update Sub-Dial Needles (Remembered Squares, Paradox Strain, Visited Realities)
	rig.subDialNeedles.rememberedNeedle.rotation.z = -Math.min(
		Math.PI * 1.8,
		metrics.rememberedSquareCount * 0.35,
	);
	rig.subDialNeedles.paradoxNeedle.rotation.z =
		-metrics.paradoxStrain * Math.PI * 1.75 +
		(rig.imminentParadoxWarning ? Math.sin(elapsed * 40) * 0.15 : 0);
	rig.subDialNeedles.realitiesNeedle.rotation.z = -Math.min(
		Math.PI * 1.8,
		(metrics.visitedCount - 1) * 0.55,
	);

	// 4. Rotate Exposed Internal Clockwork Gears (reverses backward in time during a Retroactive Yesterday Checkmate!)
	const latestWatchEv = multiverse.watchEvents[0];
	const isReversingYesterday =
		latestWatchEv &&
		latestWatchEv.kind === "RETROACTIVE_YESTERDAY_CHECKMATE" &&
		rig.bellStrikeTimer > 0;
	const strainSpeedMult =
		((duelOnWatchMode ? 2.4 : 1) + metrics.paradoxStrain * 2.2) *
		(isReversingYesterday ? -3.6 : 1.0);
	const stutter =
		!isReversingYesterday &&
		metrics.paradoxStrain > 0.45 &&
		Math.sin(elapsed * 19) > 0.72
			? -0.4
			: 1.0;
	for (const g of rig.gears) {
		g.mesh.rotation.z += dt * g.ratio * strainSpeedMult * stutter;
	}

	// 5. Update Crystal Fracture Lines & Casing Heat Glow based on Paradox Strain
	const totalCrackSegments = 14 * 5 * 2;
	const activeCrackVerts = Math.min(
		totalCrackSegments,
		Math.floor(
			(metrics.paradoxStrain * 0.7 + metrics.collapsedCount * 0.35) *
				totalCrackSegments,
		),
	);
	rig.fractureLines.geometry.setDrawRange(
		0,
		activeCrackVerts - (activeCrackVerts % 2),
	);
	rig.fractureMaterial.opacity =
		0.45 + metrics.paradoxStrain * 0.45 + Math.sin(elapsed * 8) * 0.1;

	// Casing heats up under high paradox strain
	rig.caseMaterial.emissive.setHex(
		rig.imminentParadoxWarning || metrics.paradoxStrain > 0.6
			? 0x991b1b
			: 0x3b2106,
	);
	rig.caseMaterial.emissiveIntensity =
		0.22 +
		metrics.paradoxStrain * 0.55 +
		(rig.imminentParadoxWarning ? Math.sin(elapsed * 12) * 0.25 : 0);

	// 6. Unlock & Orbit Outer Gimbaled Astrolabe Rings as more timelines are visited (or during Horologium Duels)
	rig.astrolabeRings.forEach((ring, idx) => {
		const shouldShow = duelOnWatchMode || totalVisited >= idx + 2;
		ring.visible = shouldShow;
		if (shouldShow) {
			ring.rotation.x = Math.sin(elapsed * (0.35 + idx * 0.18) + idx) * 0.32;
			ring.rotation.y = Math.cos(elapsed * (0.28 + idx * 0.15) + idx) * 0.32;
			ring.rotation.z = elapsed * (idx % 2 === 0 ? 0.22 : -0.18);
		}
	});

	// 7. Animate Doom Bell Hammer & Radial Shockwave Ring
	if (rig.bellStrikeTimer > 0) {
		rig.bellStrikeTimer = Math.max(0, rig.bellStrikeTimer - dt);
		rig.bellHammerPivot.rotation.z =
			Math.abs(Math.sin(rig.bellStrikeTimer * Math.PI * 6)) * 0.48;
	} else {
		rig.bellHammerPivot.rotation.z = 0;
	}

	if (rig.shockwaveTimer > 0) {
		rig.shockwaveTimer = Math.max(0, rig.shockwaveTimer - dt);
		const p = 1 - rig.shockwaveTimer / 1.35;
		rig.shockwaveRingMesh.scale.setScalar(0.35 + p * 1.85);
		rig.shockwaveMaterial.opacity = (1 - p) * 0.85;
		if (rig.shockwaveTimer <= 0) {
			rig.shockwaveRingMesh.visible = false;
		}
	}

	// Gentle majestic levitation bob of the entire colossal pocket watch (locked steady when fighters duel atop it!)
	rig.watchBodyGroup.position.y = duelOnWatchMode
		? 0
		: Math.sin(elapsed * 0.9) * 0.28;
	rig.watchBodyGroup.rotation.z = duelOnWatchMode
		? 0
		: Math.sin(elapsed * 0.45) * 0.025 +
			(rig.imminentParadoxWarning ? Math.sin(elapsed * 28) * 0.012 : 0);

	// Redraw dial canvas only when multiverse state signature changes
	renderPocketWatchDialFace(rig, multiverse);
}
