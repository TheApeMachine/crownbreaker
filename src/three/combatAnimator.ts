import * as THREE from "three";
import type { FighterRuntime } from "../types/game";
import type {
	ArticulatedPieceRig,
	FirstPersonViewmodelRig,
} from "./pieceModels";

export interface VFXPool {
	group: THREE.Group;
	shockwaves: {
		mesh: THREE.Mesh;
		active: boolean;
		timer: number;
		maxDuration: number;
		maxScale: number;
	}[];
	sparks: {
		mesh: THREE.Mesh;
		vx: number;
		vy: number;
		vz: number;
		active: boolean;
		timer: number;
		maxLife: number;
	}[];
	parrySparks: {
		mesh: THREE.Mesh;
		vx: number;
		vy: number;
		vz: number;
		baseLength: number;
		hotColor: THREE.Color;
		coolColor: THREE.Color;
		active: boolean;
		timer: number;
		maxLife: number;
	}[];
	parryFlares: {
		group: THREE.Group;
		starburstMesh: THREE.Mesh;
		deflectionRing: THREE.Mesh;
		coreFlash: THREE.Mesh;
		active: boolean;
		timer: number;
		maxDuration: number;
	}[];
	slashArcs: {
		mesh: THREE.Mesh;
		active: boolean;
		timer: number;
		maxDuration: number;
		spinSpeed: number;
	}[];
	debris: {
		mesh: THREE.Mesh;
		vx: number;
		vy: number;
		vz: number;
		rx: number;
		ry: number;
		active: boolean;
		timer: number;
	}[];
	auraPillars: {
		mesh: THREE.Mesh;
		active: boolean;
		timer: number;
		maxDuration: number;
	}[];
	riftPortals: {
		group: THREE.Group;
		outerRing: THREE.Mesh;
		innerVortex: THREE.Mesh;
		beamMesh: THREE.Mesh;
		active: boolean;
		timer: number;
		maxDuration: number;
	}[];
	smokePlumes: {
		sprite: THREE.Sprite;
		vx: number;
		vy: number;
		vz: number;
		baseScale: number;
		isEmber: boolean;
		active: boolean;
		timer: number;
		maxLife: number;
	}[];
}

const _parryDefWorldPos = new THREE.Vector3();
const _parryAtkWorldPos = new THREE.Vector3();
const _parryLookTarget = new THREE.Vector3();

// Procedural gradient alpha texture for glowing crescent weapon slash trails
function createSlashArcTexture(): THREE.CanvasTexture {
	const canvas = document.createElement("canvas");
	canvas.width = 128;
	canvas.height = 128;
	const ctx = canvas.getContext("2d")!;
	const grad = ctx.createLinearGradient(0, 0, 128, 128);
	grad.addColorStop(0, "rgba(255,255,255,0)");
	grad.addColorStop(0.35, "rgba(255,255,255,0.65)");
	grad.addColorStop(0.75, "rgba(255,255,255,1)");
	grad.addColorStop(1, "rgba(255,255,255,0)");
	ctx.fillStyle = grad;
	ctx.fillRect(0, 0, 128, 128);
	return new THREE.CanvasTexture(canvas);
}

// Procedural 8-pointed razor starburst flare texture for frame-perfect Parry Impact
function createParryStarburstTexture(): THREE.CanvasTexture {
	const canvas = document.createElement("canvas");
	canvas.width = 256;
	canvas.height = 256;
	const ctx = canvas.getContext("2d")!;
	const cx = 128;
	const cy = 128;

	// Radial core glow
	const coreGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 96);
	coreGrad.addColorStop(0, "rgba(255, 255, 255, 1.0)");
	coreGrad.addColorStop(0.22, "rgba(254, 240, 138, 0.88)");
	coreGrad.addColorStop(0.55, "rgba(245, 158, 11, 0.28)");
	coreGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
	ctx.fillStyle = coreGrad;
	ctx.fillRect(0, 0, 256, 256);

	// 8 razor-sharp diffraction spikes
	for (let i = 0; i < 8; i++) {
		ctx.save();
		ctx.translate(cx, cy);
		ctx.rotate((i * Math.PI) / 4);
		const isMajor = i % 2 === 0;
		const len = isMajor ? 124 : 84;
		const halfWidth = isMajor ? 5.5 : 3.2;

		const spikeGrad = ctx.createLinearGradient(0, -len, 0, len);
		spikeGrad.addColorStop(0, "rgba(255, 255, 255, 0)");
		spikeGrad.addColorStop(0.35, "rgba(254, 240, 138, 0.75)");
		spikeGrad.addColorStop(0.5, "rgba(255, 255, 255, 1.0)");
		spikeGrad.addColorStop(0.65, "rgba(254, 240, 138, 0.75)");
		spikeGrad.addColorStop(1, "rgba(255, 255, 255, 0)");

		ctx.fillStyle = spikeGrad;
		ctx.beginPath();
		ctx.moveTo(0, -len);
		ctx.lineTo(halfWidth, 0);
		ctx.lineTo(0, len);
		ctx.lineTo(-halfWidth, 0);
		ctx.closePath();
		ctx.fill();
		ctx.restore();
	}

	return new THREE.CanvasTexture(canvas);
}

// Procedural soft radial smoke puff texture for localized < 30% HP battle smoke
function createSmokePlumeTexture(): THREE.CanvasTexture {
	const canvas = document.createElement("canvas");
	canvas.width = 128;
	canvas.height = 128;
	const ctx = canvas.getContext("2d")!;
	const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 60);
	grad.addColorStop(0, "rgba(255, 255, 255, 0.72)");
	grad.addColorStop(0.45, "rgba(210, 215, 225, 0.36)");
	grad.addColorStop(0.78, "rgba(120, 130, 145, 0.12)");
	grad.addColorStop(1, "rgba(0, 0, 0, 0)");
	ctx.fillStyle = grad;
	ctx.fillRect(0, 0, 128, 128);
	return new THREE.CanvasTexture(canvas);
}

export function createVFXPool(): VFXPool {
	const group = new THREE.Group();

	// 1. Expanding Floor Shockwave Rings
	const shockwaves: VFXPool["shockwaves"] = [];
	const ringGeo = new THREE.RingGeometry(0.35, 0.62, 40);
	for (let i = 0; i < 8; i++) {
		const mat = new THREE.MeshBasicMaterial({
			color: 0xf59e0b,
			side: THREE.DoubleSide,
			transparent: true,
			opacity: 0,
			depthWrite: false,
			blending: THREE.AdditiveBlending,
		});
		const mesh = new THREE.Mesh(ringGeo, mat);
		mesh.rotation.x = -Math.PI / 2;
		mesh.visible = false;
		group.add(mesh);
		shockwaves.push({
			mesh,
			active: false,
			timer: 0,
			maxDuration: 0.45,
			maxScale: 5.5,
		});
	}

	// 2. Standard Hit Sparks
	const sparks: VFXPool["sparks"] = [];
	const sparkGeo = new THREE.OctahedronGeometry(0.075, 0);
	for (let i = 0; i < 56; i++) {
		const mat = new THREE.MeshBasicMaterial({
			color: 0xfef08a,
			transparent: true,
			opacity: 0,
			blending: THREE.AdditiveBlending,
		});
		const mesh = new THREE.Mesh(sparkGeo, mat);
		mesh.visible = false;
		group.add(mesh);
		sparks.push({
			mesh,
			vx: 0,
			vy: 0,
			vz: 0,
			active: false,
			timer: 0,
			maxLife: 0.36,
		});
	}

	// 2B. High-Intensity Velocity-Aligned Parry Streak Sparks (Technical Mastery Deflection Shards)
	const parrySparks: VFXPool["parrySparks"] = [];
	// Double-ended diamond needle oriented along +Z so mesh.lookAt(pos + vel) aligns the streak along its flight vector!
	const parryNeedleGeo = new THREE.ConeGeometry(0.032, 0.42, 4);
	parryNeedleGeo.rotateX(Math.PI / 2);
	for (let i = 0; i < 96; i++) {
		const mat = new THREE.MeshBasicMaterial({
			color: 0xffffff,
			transparent: true,
			opacity: 0,
			depthWrite: false,
			blending: THREE.AdditiveBlending,
		});
		const mesh = new THREE.Mesh(parryNeedleGeo, mat);
		mesh.visible = false;
		group.add(mesh);
		parrySparks.push({
			mesh,
			vx: 0,
			vy: 0,
			vz: 0,
			baseLength: 1.0,
			hotColor: new THREE.Color(0xffffff),
			coolColor: new THREE.Color(0xf59e0b),
			active: false,
			timer: 0,
			maxLife: 0.42,
		});
	}

	// 2C. Cruciform Parry Starburst & Runic Deflection Rings at Exact Point of Impact
	const parryFlares: VFXPool["parryFlares"] = [];
	const starburstTex = createParryStarburstTexture();
	const starburstGeo = new THREE.PlaneGeometry(1.45, 1.45);
	const deflectRingGeo = new THREE.RingGeometry(0.32, 0.44, 36);
	const coreFlashGeo = new THREE.OctahedronGeometry(0.16, 0);

	for (let i = 0; i < 4; i++) {
		const flareGroup = new THREE.Group();
		flareGroup.visible = false;

		const starMat = new THREE.MeshBasicMaterial({
			map: starburstTex,
			color: 0xffffff,
			transparent: true,
			opacity: 0,
			side: THREE.DoubleSide,
			depthWrite: false,
			blending: THREE.AdditiveBlending,
		});
		const starburstMesh = new THREE.Mesh(starburstGeo, starMat);

		const ringMat = new THREE.MeshBasicMaterial({
			color: 0xfef08a,
			transparent: true,
			opacity: 0,
			side: THREE.DoubleSide,
			depthWrite: false,
			blending: THREE.AdditiveBlending,
		});
		const deflectionRing = new THREE.Mesh(deflectRingGeo, ringMat);
		deflectionRing.rotation.y = Math.PI / 2;

		const coreMat = new THREE.MeshBasicMaterial({
			color: 0xffffff,
			transparent: true,
			opacity: 0,
			depthWrite: false,
			blending: THREE.AdditiveBlending,
		});
		const coreFlash = new THREE.Mesh(coreFlashGeo, coreMat);

		flareGroup.add(starburstMesh, deflectionRing, coreFlash);
		group.add(flareGroup);

		parryFlares.push({
			group: flareGroup,
			starburstMesh,
			deflectionRing,
			coreFlash,
			active: false,
			timer: 0,
			maxDuration: 0.34,
		});
	}

	// 3. Curved 3D Weapon Slash Arcs
	const slashArcs: VFXPool["slashArcs"] = [];
	const slashTex = createSlashArcTexture();
	const slashGeo = new THREE.RingGeometry(0.68, 1.38, 28, 1, 0, Math.PI * 1.15);
	for (let i = 0; i < 8; i++) {
		const mat = new THREE.MeshBasicMaterial({
			color: 0x38bdf8,
			alphaMap: slashTex,
			transparent: true,
			opacity: 0,
			side: THREE.DoubleSide,
			depthWrite: false,
			blending: THREE.AdditiveBlending,
		});
		const mesh = new THREE.Mesh(slashGeo, mat);
		mesh.visible = false;
		group.add(mesh);
		slashArcs.push({
			mesh,
			active: false,
			timer: 0,
			maxDuration: 0.22,
			spinSpeed: 14,
		});
	}

	// 4. Bouncing 3D Stone/Marble Debris Chunks on Heavy Smashes
	const debris: VFXPool["debris"] = [];
	const debrisGeo = new THREE.DodecahedronGeometry(0.095, 0);
	for (let i = 0; i < 28; i++) {
		const mat = new THREE.MeshStandardMaterial({
			color: i % 2 === 0 ? 0xd6cfc2 : 0x1e293b,
			roughness: 0.5,
			metalness: 0.3,
		});
		const mesh = new THREE.Mesh(debrisGeo, mat);
		mesh.castShadow = true;
		mesh.visible = false;
		group.add(mesh);
		debris.push({
			mesh,
			vx: 0,
			vy: 0,
			vz: 0,
			rx: 0,
			ry: 0,
			active: false,
			timer: 0,
		});
	}

	// 5. Rising Vertical Energy Pillars for Special Moves & Perfect Parries
	const auraPillars: VFXPool["auraPillars"] = [];
	const pillarGeo = new THREE.CylinderGeometry(0.75, 0.95, 3.8, 28, 1, true);
	pillarGeo.translate(0, 1.9, 0);
	for (let i = 0; i < 4; i++) {
		const mat = new THREE.MeshBasicMaterial({
			color: 0xf59e0b,
			transparent: true,
			opacity: 0,
			side: THREE.DoubleSide,
			depthWrite: false,
			blending: THREE.AdditiveBlending,
		});
		const mesh = new THREE.Mesh(pillarGeo, mat);
		mesh.visible = false;
		group.add(mesh);
		auraPillars.push({
			mesh,
			active: false,
			timer: 0,
			maxDuration: 0.55,
		});
	}

	// 6. 4D Quantum Rift Portals & Directional Intervention Beams (for Tactical Intervention: The Board Fights Back)
	const riftPortals: VFXPool["riftPortals"] = [];
	const portalTorusGeo = new THREE.TorusGeometry(0.78, 0.055, 12, 36);
	const portalInnerGeo = new THREE.RingGeometry(0.15, 0.72, 24);
	const beamGeo = new THREE.CylinderGeometry(0.12, 0.24, 1.0, 16, 1, true);
	beamGeo.rotateX(Math.PI / 2);
	beamGeo.translate(0, 0, 0.5);

	for (let i = 0; i < 4; i++) {
		const portalGroup = new THREE.Group();
		portalGroup.visible = false;

		const outerMat = new THREE.MeshBasicMaterial({
			color: 0x38bdf8,
			transparent: true,
			opacity: 0,
			blending: THREE.AdditiveBlending,
			depthWrite: false,
		});
		const outerRing = new THREE.Mesh(portalTorusGeo, outerMat);

		const innerMat = new THREE.MeshBasicMaterial({
			color: 0xffffff,
			side: THREE.DoubleSide,
			transparent: true,
			opacity: 0,
			blending: THREE.AdditiveBlending,
			depthWrite: false,
			wireframe: true,
		});
		const innerVortex = new THREE.Mesh(portalInnerGeo, innerMat);

		const beamMat = new THREE.MeshBasicMaterial({
			color: 0x38bdf8,
			side: THREE.DoubleSide,
			transparent: true,
			opacity: 0,
			blending: THREE.AdditiveBlending,
			depthWrite: false,
		});
		const beamMesh = new THREE.Mesh(beamGeo, beamMat);

		portalGroup.add(outerRing, innerVortex, beamMesh);
		group.add(portalGroup);

		riftPortals.push({
			group: portalGroup,
			outerRing,
			innerVortex,
			beamMesh,
			active: false,
			timer: 0,
			maxDuration: 0.78,
		});
	}

	// 7. Localized Battle-Worn Smoke & Glowing Cinder Plumes (< 30% Critical HP)
	const smokePlumes: VFXPool["smokePlumes"] = [];
	const smokeTex = createSmokePlumeTexture();
	for (let i = 0; i < 42; i++) {
		const isEmber = i % 3 === 0;
		const mat = new THREE.SpriteMaterial({
			map: smokeTex,
			color: isEmber ? 0xf59e0b : 0x334155,
			transparent: true,
			opacity: 0,
			depthWrite: false,
			blending: isEmber ? THREE.AdditiveBlending : THREE.NormalBlending,
		});
		const sprite = new THREE.Sprite(mat);
		sprite.visible = false;
		group.add(sprite);
		smokePlumes.push({
			sprite,
			vx: 0,
			vy: 0,
			vz: 0,
			baseScale: 0.35,
			isEmber,
			active: false,
			timer: 0,
			maxLife: 0.9,
		});
	}

	return {
		group,
		shockwaves,
		sparks,
		parrySparks,
		parryFlares,
		slashArcs,
		debris,
		auraPillars,
		riftPortals,
		smokePlumes,
	};
}

export function spawnHitSparks(
	pool: VFXPool,
	x: number,
	y: number,
	z: number,
	colorHex: number,
	count: number = 14,
) {
	let spawned = 0;
	for (const s of pool.sparks) {
		if (!s.active) {
			s.active = true;
			s.timer = 0;
			s.maxLife = 0.28 + Math.random() * 0.18;
			s.mesh.visible = true;
			s.mesh.position.set(x, y, z);
			const scale = 0.9 + Math.random() * 0.9;
			s.mesh.scale.set(scale * 1.8, scale * 0.5, scale * 0.5);
			const mat = s.mesh.material as THREE.MeshBasicMaterial;
			mat.color.setHex(colorHex);
			mat.opacity = 1;

			const angle = Math.random() * Math.PI * 2;
			const speed = 3.0 + Math.random() * 7.5;
			s.vx = Math.cos(angle) * speed;
			s.vy = 2.0 + Math.random() * 6.5;
			s.vz = (Math.random() - 0.5) * 6.0;

			spawned++;
			if (spawned >= count) break;
		}
	}
}

/**
 * Triggers distinct, high-intensity velocity-aligned particle sparks and a 3D cruciform starburst
 * at the exact point of blade-on-shield impact when a fighter performs a successful Perfect Parry!
 */
export function spawnParryImpactSparks(
	pool: VFXPool,
	fallbackWorldX: number,
	fallbackWorldY: number,
	fallbackWorldZ: number,
	defenderFacing: 1 | -1,
	defenderFaction: "w" | "b",
	defenderRig?: ArticulatedPieceRig,
	attackerRig?: ArticulatedPieceRig,
) {
	let impactX = fallbackWorldX;
	let impactY = fallbackWorldY;
	let impactZ = fallbackWorldZ;

	// Compute the exact 3D point of impact between the defender's raised shield/ward (leftElbowPivot)
	// and the attacker's striking weapon (rightElbowPivot) when the 3D rigs are present!
	if (defenderRig) {
		defenderRig.root.updateMatrixWorld(true);
		defenderRig.leftElbowPivot.getWorldPosition(_parryDefWorldPos);
		// Offset slightly forward along the defender's facing vector to the outer shield rim / ward surface
		_parryDefWorldPos.x += defenderFacing * 0.24;
		_parryDefWorldPos.y += 0.08;

		if (attackerRig) {
			attackerRig.root.updateMatrixWorld(true);
			attackerRig.rightElbowPivot.getWorldPosition(_parryAtkWorldPos);
			impactX = THREE.MathUtils.lerp(
				_parryDefWorldPos.x,
				_parryAtkWorldPos.x,
				0.38,
			);
			impactY = THREE.MathUtils.lerp(
				_parryDefWorldPos.y,
				_parryAtkWorldPos.y,
				0.38,
			);
			impactZ = THREE.MathUtils.lerp(
				_parryDefWorldPos.z,
				_parryAtkWorldPos.z,
				0.38,
			);
		} else {
			impactX = _parryDefWorldPos.x;
			impactY = _parryDefWorldPos.y;
			impactZ = _parryDefWorldPos.z;
		}
	}

	const factionAccentHex = defenderFaction === "w" ? 0x38bdf8 : 0xf43f5e;

	// 1. Spawn Cruciform Starburst & Concentric Deflection Ring locked at the exact point of impact
	for (const pf of pool.parryFlares) {
		if (!pf.active) {
			pf.active = true;
			pf.timer = 0;
			pf.maxDuration = 0.34;
			pf.group.visible = true;
			pf.group.position.set(impactX, impactY, impactZ);

			pf.starburstMesh.scale.setScalar(0.25);
			pf.starburstMesh.rotation.z = Math.random() * Math.PI;
			const starMat = pf.starburstMesh.material as THREE.MeshBasicMaterial;
			starMat.color.setHex(0xffffff);
			starMat.opacity = 1.0;

			pf.deflectionRing.scale.setScalar(0.2);
			pf.deflectionRing.rotation.set(
				(Math.random() - 0.5) * 0.35,
				Math.PI / 2 + defenderFacing * 0.28,
				0,
			);
			const ringMat = pf.deflectionRing.material as THREE.MeshBasicMaterial;
			ringMat.color.setHex(0xfef08a);
			ringMat.opacity = 1.0;

			pf.coreFlash.scale.setScalar(1.0);
			const coreMat = pf.coreFlash.material as THREE.MeshBasicMaterial;
			coreMat.color.setHex(0xffffff);
			coreMat.opacity = 1.0;
			break;
		}
	}

	// 2. Spawn 52 High-Velocity Velocity-Aligned Needle Sparks in a bimodal deflection pattern:
	//    - Half erupt in a 360° planar shear ring perpendicular to the clash axis (shield face shear)
	//    - Half ricochet forward & upward in a high-velocity cone toward the deflected attacker
	let spawned = 0;
	const targetCount = 52;
	for (const ps of pool.parrySparks) {
		if (!ps.active) {
			ps.active = true;
			ps.timer = 0;
			ps.maxLife = 0.32 + Math.random() * 0.24;
			ps.mesh.visible = true;
			ps.mesh.position.set(
				impactX + (Math.random() - 0.5) * 0.06,
				impactY + (Math.random() - 0.5) * 0.06,
				impactZ + (Math.random() - 0.5) * 0.06,
			);

			const isPlanarRing = spawned % 2 === 0;
			if (isPlanarRing) {
				// Tangential shear burst across the shield/blade plane (Y-Z plane with slight forward kick)
				const theta =
					(spawned / targetCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
				const planarSpeed = 8.5 + Math.random() * 9.5;
				ps.vx = defenderFacing * (1.2 + Math.random() * 3.8);
				ps.vy = Math.sin(theta) * planarSpeed + 1.8;
				ps.vz = Math.cos(theta) * planarSpeed;
				ps.baseLength = 1.15 + Math.random() * 0.85;
			} else {
				// High-velocity forward deflection cone toward the recoiling attacker
				const coneElev = -0.15 + Math.random() * 1.15;
				const coneAzimuth = (Math.random() - 0.5) * 1.25;
				const speed = 10.0 + Math.random() * 10.5;
				ps.vx =
					defenderFacing * Math.cos(coneElev) * Math.cos(coneAzimuth) * speed;
				ps.vy = Math.sin(coneElev) * speed + 2.4;
				ps.vz = Math.sin(coneAzimuth) * speed;
				ps.baseLength = 1.35 + Math.random() * 1.05;
			}

			// Multi-temperature incandescent palette: blinding white-gold hot core cooling to gold, amber, or faction cyan/crimson
			const colorRoll = spawned % 4;
			if (colorRoll === 0) {
				ps.hotColor.setHex(0xffffff);
				ps.coolColor.setHex(0xfef08a);
			} else if (colorRoll === 1) {
				ps.hotColor.setHex(0xfef08a);
				ps.coolColor.setHex(0xf59e0b);
			} else if (colorRoll === 2) {
				ps.hotColor.setHex(0xffffff);
				ps.coolColor.setHex(factionAccentHex);
			} else {
				ps.hotColor.setHex(0xfde047);
				ps.coolColor.setHex(0xf97316);
			}

			const mat = ps.mesh.material as THREE.MeshBasicMaterial;
			mat.color.copy(ps.hotColor);
			mat.opacity = 1.0;

			_parryLookTarget.set(
				ps.mesh.position.x + ps.vx,
				ps.mesh.position.y + ps.vy,
				ps.mesh.position.z + ps.vz,
			);
			ps.mesh.lookAt(_parryLookTarget);
			ps.mesh.scale.set(0.85, 0.85, ps.baseLength * 1.6);

			spawned++;
			if (spawned >= targetCount) break;
		}
	}

	// 3. Also trigger a crisp golden shockwave & secondary hot core sparks at the exact impact point
	spawnShockwave(pool, impactX, 0.05, impactZ, 0xfef08a, 4.8);
}

export function spawnSlashArc(
	pool: VFXPool,
	x: number,
	y: number,
	z: number,
	facing: 1 | -1,
	colorHex: number,
	style: "horizontal" | "overhead" | "cyclone",
) {
	for (const arc of pool.slashArcs) {
		if (!arc.active) {
			arc.active = true;
			arc.timer = 0;
			arc.maxDuration = style === "cyclone" ? 0.34 : 0.2;
			arc.spinSpeed = (style === "cyclone" ? 22 : 14) * facing;
			arc.mesh.visible = true;
			arc.mesh.position.set(x + facing * 0.35, y, z);

			if (style === "horizontal") {
				arc.mesh.rotation.set(
					Math.PI / 2 + (Math.random() - 0.5) * 0.35,
					0,
					facing === 1 ? -0.6 : Math.PI - 0.6,
				);
				arc.mesh.scale.setScalar(1.05);
			} else if (style === "overhead") {
				arc.mesh.rotation.set(0.2, facing === 1 ? 0 : Math.PI, -0.5);
				arc.mesh.scale.setScalar(1.3);
			} else {
				arc.mesh.rotation.set(Math.PI / 2, 0, 0);
				arc.mesh.scale.setScalar(1.55);
			}

			const mat = arc.mesh.material as THREE.MeshBasicMaterial;
			mat.color.setHex(colorHex);
			mat.opacity = 0.95;
			break;
		}
	}
}

export function spawnGroundDebris(
	pool: VFXPool,
	x: number,
	z: number,
	count: number = 8,
) {
	let spawned = 0;
	for (const d of pool.debris) {
		if (!d.active) {
			d.active = true;
			d.timer = 0;
			d.mesh.visible = true;
			d.mesh.position.set(
				x + (Math.random() - 0.5) * 0.8,
				0.08,
				z + (Math.random() - 0.5) * 0.8,
			);
			d.mesh.scale.setScalar(0.7 + Math.random() * 0.8);
			const angle = Math.random() * Math.PI * 2;
			const spd = 1.5 + Math.random() * 4.2;
			d.vx = Math.cos(angle) * spd;
			d.vy = 4.2 + Math.random() * 4.8;
			d.vz = Math.sin(angle) * spd;
			d.rx = (Math.random() - 0.5) * 16;
			d.ry = (Math.random() - 0.5) * 16;

			spawned++;
			if (spawned >= count) break;
		}
	}
}

export function spawnAuraPillar(
	pool: VFXPool,
	x: number,
	z: number,
	colorHex: number,
) {
	for (const p of pool.auraPillars) {
		if (!p.active) {
			p.active = true;
			p.timer = 0;
			p.maxDuration = 0.55;
			p.mesh.visible = true;
			p.mesh.position.set(x, 0, z);
			p.mesh.scale.set(0.4, 1.0, 0.4);
			const mat = p.mesh.material as THREE.MeshBasicMaterial;
			mat.color.setHex(colorHex);
			mat.opacity = 0.85;
			break;
		}
	}
}

export function spawnShockwave(
	pool: VFXPool,
	x: number,
	y: number,
	z: number,
	colorHex: number,
	maxScale: number = 6.0,
) {
	for (const sw of pool.shockwaves) {
		if (!sw.active) continue;
	}
	for (const sw of pool.shockwaves) {
		if (!sw.active) {
			sw.active = true;
			sw.timer = 0;
			sw.maxDuration = 0.42;
			sw.maxScale = maxScale;
			sw.mesh.visible = true;
			sw.mesh.position.set(x, y + 0.05, z);
			sw.mesh.scale.setScalar(0.5);
			const mat = sw.mesh.material as THREE.MeshBasicMaterial;
			mat.color.setHex(colorHex);
			mat.opacity = 0.9;
			break;
		}
	}
}

export function spawnInterventionRift(
	pool: VFXPool,
	originX: number,
	originY: number,
	originZ: number,
	targetX: number,
	targetY: number,
	targetZ: number,
	colorHex: number,
) {
	for (const rp of pool.riftPortals) {
		if (!rp.active) {
			rp.active = true;
			rp.timer = 0;
			rp.maxDuration = 0.78;
			rp.group.visible = true;
			rp.group.position.set(originX, originY, originZ);
			rp.group.lookAt(targetX, targetY, targetZ);

			const dist = Math.max(
				0.5,
				Math.hypot(targetX - originX, targetY - originY, targetZ - originZ),
			);
			rp.beamMesh.scale.set(1, 1, dist);

			const outerMat = rp.outerRing.material as THREE.MeshBasicMaterial;
			outerMat.color.setHex(colorHex);
			outerMat.opacity = 0.95;

			const innerMat = rp.innerVortex.material as THREE.MeshBasicMaterial;
			innerMat.color.setHex(colorHex);
			innerMat.opacity = 0.75;

			const beamMat = rp.beamMesh.material as THREE.MeshBasicMaterial;
			beamMat.color.setHex(colorHex);
			beamMat.opacity = 0.85;
			break;
		}
	}
}

/**
 * Spawns localized curling battle smoke & flickering cinder embers from a critically wounded (< 30% HP)
 * warrior or the fractured duel arena floor!
 */
export function spawnBattleSmoke(
	pool: VFXPool,
	x: number,
	y: number,
	z: number,
	intensity: number = 1.0,
	emberColorHex: number = 0xf59e0b,
) {
	let spawned = 0;
	for (const sp of pool.smokePlumes) {
		if (!sp.active) {
			sp.active = true;
			sp.timer = 0;
			sp.maxLife = sp.isEmber
				? 0.55 + Math.random() * 0.35
				: 0.85 + Math.random() * 0.55;
			sp.sprite.visible = true;
			sp.sprite.position.set(
				x + (Math.random() - 0.5) * 0.52,
				y + Math.random() * 0.35,
				z + (Math.random() - 0.5) * 0.42,
			);
			sp.baseScale = sp.isEmber
				? (0.14 + Math.random() * 0.14) * (0.7 + 0.5 * intensity)
				: (0.34 + Math.random() * 0.28) * (0.75 + 0.45 * intensity);
			sp.sprite.scale.setScalar(sp.baseScale);

			sp.vx = (Math.random() - 0.5) * 0.65;
			sp.vy = sp.isEmber
				? 1.35 + Math.random() * 1.2
				: 0.75 + Math.random() * 0.65;
			sp.vz = (Math.random() - 0.5) * 0.55;

			const mat = sp.sprite.material as THREE.SpriteMaterial;
			if (sp.isEmber) {
				mat.color.setHex(Math.random() < 0.5 ? emberColorHex : 0xf43f5e);
			} else {
				mat.color.setHex(Math.random() < 0.5 ? 0x1e293b : 0x334155);
			}
			mat.opacity = 0.0;

			spawned++;
			if (spawned >= 2) break;
		}
	}
}

export function updateVFXPool(pool: VFXPool, dt: number) {
	for (const sw of pool.shockwaves) {
		if (!sw.active) continue;
		sw.timer += dt;
		const progress = sw.timer / sw.maxDuration;
		if (progress >= 1) {
			sw.active = false;
			sw.mesh.visible = false;
		} else {
			const scale = THREE.MathUtils.lerp(
				0.6,
				sw.maxScale,
				1 - (1 - progress) ** 3,
			);
			sw.mesh.scale.setScalar(scale);
			(sw.mesh.material as THREE.MeshBasicMaterial).opacity =
				(1 - progress) * 0.85;
		}
	}

	for (const s of pool.sparks) {
		if (!s.active) continue;
		s.timer += dt;
		if (s.timer >= s.maxLife) {
			s.active = false;
			s.mesh.visible = false;
		} else {
			s.mesh.position.x += s.vx * dt;
			s.mesh.position.y += s.vy * dt;
			s.mesh.position.z += s.vz * dt;
			s.vy -= 18 * dt;
			s.mesh.rotation.x += 14 * dt;
			s.mesh.rotation.y += 14 * dt;
			const p = s.timer / s.maxLife;
			s.mesh.scale.setScalar(1.3 * (1 - p));
			(s.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - p;
		}
	}

	// Update High-Intensity Velocity-Aligned Parry Streak Sparks (with floor ricochet & thermal cooling!)
	for (const ps of pool.parrySparks) {
		if (!ps.active) continue;
		ps.timer += dt;
		if (ps.timer >= ps.maxLife) {
			ps.active = false;
			ps.mesh.visible = false;
		} else {
			const p = ps.timer / ps.maxLife;
			ps.mesh.position.x += ps.vx * dt;
			ps.mesh.position.y += ps.vy * dt;
			ps.mesh.position.z += ps.vz * dt;

			// High-tension gravity & aerodynamic drag
			ps.vy -= 19.5 * dt;
			const drag = Math.max(0, 1 - 2.4 * dt);
			ps.vx *= drag;
			ps.vz *= drag;

			// Ricochet off the sanctuary marble floor!
			if (ps.mesh.position.y < 0.04 && ps.vy < 0) {
				ps.mesh.position.y = 0.04;
				ps.vy = -ps.vy * 0.62;
				ps.vx *= 0.85;
				ps.vz *= 0.85;
			}

			const speedSq = ps.vx * ps.vx + ps.vy * ps.vy + ps.vz * ps.vz;
			if (speedSq > 0.001) {
				_parryLookTarget.set(
					ps.mesh.position.x + ps.vx,
					ps.mesh.position.y + ps.vy,
					ps.mesh.position.z + ps.vz,
				);
				ps.mesh.lookAt(_parryLookTarget);
			}

			const speed = Math.sqrt(speedSq);
			const streakStretch =
				ps.baseLength * (0.55 + Math.min(2.2, speed * 0.12)) * (1 - p * 0.65);
			const thickness = (1 - p * 0.7) * 0.9;
			ps.mesh.scale.set(thickness, thickness, Math.max(0.15, streakStretch));

			const mat = ps.mesh.material as THREE.MeshBasicMaterial;
			mat.color.copy(ps.hotColor).lerp(ps.coolColor, Math.min(1, p * 1.35));
			mat.opacity = 1 - p * p;
		}
	}

	// Update Cruciform Parry Starbursts & Concentric Deflection Rings
	for (const pf of pool.parryFlares) {
		if (!pf.active) continue;
		pf.timer += dt;
		const p = pf.timer / pf.maxDuration;
		if (p >= 1) {
			pf.active = false;
			pf.group.visible = false;
		} else {
			const expand = 1 - (1 - p) ** 3;
			pf.starburstMesh.scale.setScalar(0.35 + expand * 1.55);
			pf.starburstMesh.rotation.z += 4.5 * dt;
			(pf.starburstMesh.material as THREE.MeshBasicMaterial).opacity = Math.max(
				0,
				1 - p * 1.25,
			);

			pf.deflectionRing.scale.setScalar(0.3 + expand * 2.85);
			pf.deflectionRing.rotation.z -= 6.0 * dt;
			(pf.deflectionRing.material as THREE.MeshBasicMaterial).opacity =
				Math.max(0, (1 - p) * 0.92);

			pf.coreFlash.scale.setScalar(Math.max(0.05, 1.35 * (1 - p * 1.4)));
			pf.coreFlash.rotation.x += 12 * dt;
			pf.coreFlash.rotation.y += 16 * dt;
			(pf.coreFlash.material as THREE.MeshBasicMaterial).opacity = Math.max(
				0,
				1 - p * 1.4,
			);
		}
	}

	for (const arc of pool.slashArcs) {
		if (!arc.active) continue;
		arc.timer += dt;
		const p = arc.timer / arc.maxDuration;
		if (p >= 1) {
			arc.active = false;
			arc.mesh.visible = false;
		} else {
			arc.mesh.rotation.z += arc.spinSpeed * dt;
			(arc.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - p) * 0.95;
		}
	}

	for (const d of pool.debris) {
		if (!d.active) continue;
		d.timer += dt;
		if (d.timer >= 0.85) {
			d.active = false;
			d.mesh.visible = false;
		} else {
			d.mesh.position.x += d.vx * dt;
			d.mesh.position.y += d.vy * dt;
			d.mesh.position.z += d.vz * dt;
			d.vy -= 22 * dt;
			if (d.mesh.position.y < 0.04) {
				d.mesh.position.y = 0.04;
				d.vy = -d.vy * 0.45;
				d.vx *= 0.7;
				d.vz *= 0.7;
			}
			d.mesh.rotation.x += d.rx * dt;
			d.mesh.rotation.y += d.ry * dt;
			const p = d.timer / 0.85;
			if (p > 0.6) {
				d.mesh.scale.setScalar((1 - p) * 2.2);
			}
		}
	}

	for (const pillar of pool.auraPillars) {
		if (!pillar.active) continue;
		pillar.timer += dt;
		const p = pillar.timer / pillar.maxDuration;
		if (p >= 1) {
			pillar.active = false;
			pillar.mesh.visible = false;
		} else {
			const xz = THREE.MathUtils.lerp(0.5, 2.2, 1 - (1 - p) ** 2);
			pillar.mesh.scale.set(xz, 1.0 + p * 0.6, xz);
			pillar.mesh.rotation.y += 8 * dt;
			(pillar.mesh.material as THREE.MeshBasicMaterial).opacity =
				(1 - p) * 0.75;
		}
	}

	for (const rp of pool.riftPortals) {
		if (!rp.active) continue;
		rp.timer += dt;
		const p = rp.timer / rp.maxDuration;
		if (p >= 1) {
			rp.active = false;
			rp.group.visible = false;
		} else {
			const openScale = p < 0.2 ? p / 0.2 : p > 0.75 ? (1 - p) / 0.25 : 1.0;
			rp.outerRing.scale.setScalar(0.6 + openScale * 0.65);
			rp.innerVortex.scale.setScalar(0.5 + openScale * 0.6);
			rp.outerRing.rotation.z += 9 * dt;
			rp.innerVortex.rotation.z -= 14 * dt;

			const beamPulse = Math.sin(p * Math.PI);
			rp.beamMesh.scale.x = 0.5 + beamPulse * 1.4;
			rp.beamMesh.scale.y = 0.5 + beamPulse * 1.4;

			(rp.outerRing.material as THREE.MeshBasicMaterial).opacity =
				openScale * 0.95;
			(rp.innerVortex.material as THREE.MeshBasicMaterial).opacity =
				openScale * 0.7;
			(rp.beamMesh.material as THREE.MeshBasicMaterial).opacity =
				beamPulse * 0.85;
		}
	}

	for (const sp of pool.smokePlumes) {
		if (!sp.active) continue;
		sp.timer += dt;
		const p = sp.timer / sp.maxLife;
		if (p >= 1) {
			sp.active = false;
			sp.sprite.visible = false;
		} else {
			// Curling turbulent updraft motion
			const swirl = Math.sin(sp.timer * 7.5 + sp.baseScale * 20) * 0.42;
			sp.sprite.position.x += (sp.vx + swirl) * dt;
			sp.sprite.position.y += sp.vy * dt;
			sp.sprite.position.z += sp.vz * dt;

			const scaleCurve = sp.isEmber ? 1.0 - p * 0.55 : 1.0 + p * 1.45;
			sp.sprite.scale.setScalar(sp.baseScale * scaleCurve);

			const fade = p < 0.2 ? p / 0.2 : 1.0 - (p - 0.2) / 0.8;
			const mat = sp.sprite.material as THREE.SpriteMaterial;
			mat.opacity = fade * (sp.isEmber ? 0.85 : 0.48);
		}
	}
}

export function animateFighterRig(
	rig: ArticulatedPieceRig,
	fighter: FighterRuntime,
	elapsedTime: number,
	dt: number,
) {
	const {
		pelvisGroup,
		leftLegPivot,
		rightLegPivot,
		bodyPivot,
		headGroup,
		rightArmPivot,
		rightElbowPivot,
		leftArmPivot,
		leftElbowPivot,
		capePivot,
		specialOrbitGroup,
	} = rig;
	rig.surpriseGroup.visible = false;

	const p =
		fighter.actionDurationMs > 0
			? Math.min(1, fighter.actionTimerMs / fighter.actionDurationMs)
			: 0;

	let targetBodyY = 0.18;
	let targetBodyRotX = 0;
	let targetBodyRotY = 0;
	let targetBodyRotZ = 0;

	let targetPelvisRotX = 0;
	let targetPelvisRotY = 0;
	let targetLeftLegX = 0;
	let targetRightLegX = 0;

	let targetRightArmX = -0.18;
	let targetRightArmY = 0;
	let targetRightArmZ = -0.08;
	let targetRightElbowX = -0.45;

	let targetLeftArmX = -0.15;
	let targetLeftArmY = 0.12;
	let targetLeftArmZ = 0.08;
	let targetLeftElbowX = -0.42;

	let targetHeadX = 0;
	let targetHeadY = 0;
	let targetCapeX = 0.16 + Math.sin(elapsedTime * 4) * 0.06;

	const isVictoryTaunt =
		fighter.action === "victory_taunt" || fighter.action === "victory";

	// Orbiting blades for Queen
	if (fighter.spec.type === "q") {
		const orbitSpeed =
			fighter.action === "special" ? 14.0 : isVictoryTaunt ? 7.5 : 2.2;
		specialOrbitGroup.rotation.y += dt * orbitSpeed;
		const targetOrbitTilt = isVictoryTaunt && p > 0.35 ? -Math.PI * 0.36 : 0;
		specialOrbitGroup.rotation.x = THREE.MathUtils.damp(
			specialOrbitGroup.rotation.x,
			targetOrbitTilt,
			10,
			dt,
		);
		const radiusScale =
			fighter.action === "special"
				? 1.0 + Math.sin(p * Math.PI) * 2.6
				: isVictoryTaunt
					? 1.0 + Math.sin(Math.min(1, p * 1.4) * Math.PI * 0.5) * 0.85
					: 1.0;
		specialOrbitGroup.scale.setScalar(radiusScale);
	}

	const hpRatio = fighter.hp / Math.max(1, fighter.maxHp);
	const fatigueSlump =
		fighter.hp > 0 ? Math.max(0, (0.72 - hpRatio) * 0.34) : 0;
	const breathFreq = 3.5 + (1 - hpRatio) * 6.0;
	const breathAmp = 0.04 + (1 - hpRatio) * 0.045;

	switch (fighter.action) {
		case "idle": {
			const breath = Math.sin(elapsedTime * breathFreq);
			targetBodyY = 0.18 + breath * 0.014;
			targetBodyRotX = fatigueSlump + breath * breathAmp;
			targetBodyRotY = -0.14; // Martial 3/4 dueling guard stance
			targetPelvisRotY = -0.18;
			targetLeftLegX = 0.16;
			targetRightLegX = -0.16;
			targetBodyRotZ = hpRatio < 0.35 ? Math.sin(elapsedTime * 2.8) * 0.06 : 0;
			targetRightArmX =
				Math.sin(elapsedTime * breathFreq + 0.5) * 0.08 -
				0.24 +
				fatigueSlump * 0.3;
			targetRightElbowX = -0.52 + breath * 0.06;
			targetLeftArmX =
				-Math.sin(elapsedTime * breathFreq) * 0.06 - 0.22 + fatigueSlump * 0.4;
			targetLeftElbowX = -0.48 - breath * 0.05;
			targetHeadX = fatigueSlump * 0.42;
			targetHeadY = 0.14;
			break;
		}
		case "walk_fwd": {
			const stride = Math.sin(elapsedTime * 12);
			const bounce = Math.abs(Math.cos(elapsedTime * 12)) * 0.032;
			targetBodyY = 0.18 + bounce;
			targetBodyRotX = 0.18 + fatigueSlump * 0.85;
			targetBodyRotY = stride * 0.14;
			targetPelvisRotY = -stride * 0.18;
			targetLeftLegX = stride * 0.52;
			targetRightLegX = -stride * 0.52;
			targetRightArmX = -stride * 0.36 - 0.24;
			targetRightElbowX = -0.62 - Math.max(0, stride) * 0.25;
			targetLeftArmX = stride * 0.36 - 0.2;
			targetLeftElbowX = -0.55 - Math.max(0, -stride) * 0.25;
			targetCapeX = 0.48 + Math.sin(elapsedTime * 12) * 0.12;
			break;
		}
		case "walk_back": {
			const stride = Math.sin(elapsedTime * 10);
			targetBodyY = 0.18 + Math.abs(Math.cos(elapsedTime * 10)) * 0.022;
			targetBodyRotX = -0.08 + fatigueSlump * 0.65;
			targetLeftLegX = -stride * 0.42;
			targetRightLegX = stride * 0.42;
			targetRightArmX = -0.28 + stride * 0.18;
			targetRightElbowX = -0.68;
			targetLeftArmX = -0.38 - stride * 0.18;
			targetLeftElbowX = -0.62;
			targetCapeX = 0.08;
			break;
		}
		case "dash_fwd": {
			targetBodyY = 0.15;
			targetBodyRotX = 0.44;
			targetLeftLegX = 0.58;
			targetRightLegX = -0.62;
			targetRightArmX = -0.68;
			targetRightElbowX = -0.25;
			targetLeftArmX = 0.38;
			targetLeftElbowX = -0.75;
			targetCapeX = 0.98;
			break;
		}
		case "dash_back": {
			targetBodyY = 0.21;
			targetBodyRotX = -0.32;
			targetLeftLegX = -0.48;
			targetRightLegX = 0.45;
			targetRightArmX = 0.45;
			targetRightElbowX = -0.82;
			targetLeftArmX = -0.58;
			targetLeftElbowX = -0.55;
			targetCapeX = 0.15;
			break;
		}
		case "jump": {
			targetBodyRotX = -0.16;
			targetLeftLegX = -0.45;
			targetRightLegX = 0.28;
			targetRightArmX = -0.85;
			targetRightElbowX = -0.35;
			targetLeftArmX = -0.62;
			targetLeftElbowX = -0.55;
			targetCapeX = 0.88;
			break;
		}
		case "block": {
			targetBodyY = 0.15;
			targetBodyRotX = -0.06;
			targetBodyRotY = -0.38;
			targetPelvisRotY = -0.28;
			targetLeftLegX = -0.35;
			targetRightLegX = 0.35;
			targetLeftArmX = -0.98;
			targetLeftArmY = 0.58;
			targetLeftElbowX = -0.55;
			targetRightArmX = -0.52;
			targetRightElbowX = -0.78;
			targetHeadY = 0.32;
			break;
		}
		case "parry_flash": {
			targetBodyRotY = 0.48;
			targetLeftLegX = 0.32;
			targetRightLegX = -0.38;
			targetLeftArmX = -1.25;
			targetLeftArmY = -0.48;
			targetLeftElbowX = -0.12;
			targetRightArmX = -0.92;
			targetRightElbowX = -0.85;
			targetCapeX = 0.78;
			break;
		}
		case "blade_clash": {
			const grindJitter = Math.sin(elapsedTime * 55) * 0.08;
			targetBodyY = 0.15;
			targetBodyRotX = 0.34 + grindJitter * 0.5;
			targetBodyRotY = -0.22;
			targetLeftLegX = 0.42;
			targetRightLegX = -0.48;
			targetRightArmX = -1.35 + grindJitter;
			targetRightArmY = -0.35;
			targetRightElbowX = -0.22;
			targetLeftArmX = -1.05 - grindJitter;
			targetLeftArmY = 0.42;
			targetLeftElbowX = -0.48;
			targetCapeX = 0.68;
			break;
		}
		case "light_1":
		case "light_3": {
			const thrustArc = Math.sin(p * Math.PI);
			targetBodyRotX = 0.24 * thrustArc;
			targetBodyRotY = -0.38 * thrustArc;
			targetPelvisRotY = -0.22 * thrustArc;
			targetLeftLegX = 0.42 * thrustArc;
			targetRightLegX = -0.45 * thrustArc;
			targetRightArmX = -0.25 - 1.18 * thrustArc;
			targetRightArmY = -0.22 * thrustArc;
			// Whip-like elbow extension from bent (-0.85) to straight (0.0) at peak impact!
			targetRightElbowX = -0.85 * (1 - thrustArc);
			targetLeftArmX = -0.35 + 0.25 * thrustArc;
			targetLeftElbowX = -0.65;
			targetHeadY = 0.28 * thrustArc;
			targetCapeX = 0.55 * thrustArc + 0.2;
			break;
		}
		case "light_2": {
			const cleaveArc = Math.sin(p * Math.PI);
			targetBodyRotY = 0.58 * cleaveArc;
			targetPelvisRotY = 0.32 * cleaveArc;
			targetLeftLegX = -0.35 * cleaveArc;
			targetRightLegX = 0.38 * cleaveArc;
			targetRightArmX = -1.15 * cleaveArc;
			targetRightArmZ = -0.78 * cleaveArc;
			targetRightElbowX = -0.75 * (1 - cleaveArc);
			targetHeadY = -0.35 * cleaveArc;
			targetCapeX = 0.65 * cleaveArc + 0.2;
			break;
		}
		case "heavy_1":
		case "heavy_2": {
			if (p < 0.35) {
				const windup = p / 0.35;
				targetBodyY = 0.18 + windup * 0.04;
				targetBodyRotX = -0.3 * windup;
				targetBodyRotY = 0.28 * windup;
				targetLeftLegX = -0.28 * windup;
				targetRightLegX = 0.32 * windup;
				targetRightArmX = -2.15 * windup;
				targetRightElbowX = -0.95 * windup;
				targetLeftArmX = -0.65 * windup;
			} else {
				const smash = (p - 0.35) / 0.65;
				const curve = Math.sin(smash * Math.PI);
				targetBodyY = 0.18 - curve * 0.05;
				targetBodyRotX = 0.42 * curve;
				targetBodyRotY = -0.34 * curve;
				targetLeftLegX = 0.52 * curve;
				targetRightLegX = -0.55 * curve;
				targetRightArmX = -2.15 + 2.05 * Math.min(1, smash * 1.6);
				targetRightElbowX = -0.95 * (1 - Math.min(1, smash * 1.8));
				targetCapeX = 0.88 * curve + 0.2;
			}
			break;
		}
		case "combo_finisher": {
			targetBodyRotY = p * Math.PI * 2;
			targetBodyRotX = 0.28 * Math.sin(p * Math.PI);
			targetLeftLegX = 0.38 * Math.sin(p * Math.PI);
			targetRightLegX = -0.38 * Math.sin(p * Math.PI);
			targetRightArmX = -1.45;
			targetRightArmZ = -0.58;
			targetRightElbowX = -0.08;
			targetLeftArmX = -0.92;
			targetLeftElbowX = -0.35;
			targetCapeX = 1.05;
			break;
		}
		case "special": {
			targetBodyRotY = p * Math.PI * 4;
			targetBodyRotX = 0.32 * Math.sin(p * Math.PI);
			targetBodyY = 0.18 + Math.sin(p * Math.PI) * 0.12;
			targetRightArmX = -1.65;
			targetRightElbowX = -0.05;
			targetLeftArmX = -1.25;
			targetLeftElbowX = -0.2;
			targetCapeX = 1.15;
			break;
		}
		case "hitstun": {
			const recoil = Math.sin(p * Math.PI);
			targetBodyRotX = -0.44 * recoil;
			targetHeadX = -0.38 * recoil;
			targetLeftLegX = -0.25 * recoil;
			targetRightLegX = 0.32 * recoil;
			targetRightArmX = 0.42 * recoil;
			targetRightElbowX = -0.75 * recoil;
			targetLeftArmX = 0.42 * recoil;
			targetLeftElbowX = -0.75 * recoil;
			break;
		}
		case "knockdown": {
			const fall = Math.sin(p * Math.PI);
			targetBodyY = 0.18 - fall * 0.08;
			targetBodyRotX = -0.88 * fall;
			targetBodyRotZ = 0.35 * fall;
			targetLeftLegX = -0.45 * fall;
			targetRightLegX = 0.25 * fall;
			break;
		}
		case "victory":
		case "victory_taunt": {
			// ARCHETYPE-SPECIFIC VICTORY TAUNT CHOREOGRAPHY (Plays during FIGHT_OUTRO!)
			const arch = fighter.spec.type;
			if (arch === "p") {
				// PAWN — "Squire's Ascendant Salute":
				// Phase 1 (0..0.42): Beats Estoc spear against Aegis buckler 3 times in rapid underdog triumph!
				// Phase 2 (0.42..1.0): Steps forward and thrusts the spear straight skyward while bracing the shield across the heart!
				if (p < 0.42) {
					const beatPhase = p / 0.42;
					const clang = Math.abs(Math.sin(beatPhase * Math.PI * 3));
					targetBodyRotX = -0.08 + clang * 0.12;
					targetBodyRotY = 0.18 * (1 - clang);
					targetLeftLegX = 0.28;
					targetRightLegX = -0.32;
					targetLeftArmX = -1.05;
					targetLeftArmY = 0.52;
					targetLeftElbowX = -0.65;
					targetRightArmX = -1.15 - clang * 0.38;
					targetRightArmY = -0.45 * clang;
					targetRightElbowX = -0.85 + clang * 0.35;
					targetCapeX = 0.38 + clang * 0.22;
				} else {
					const salute = Math.min(1, (p - 0.42) / 0.26);
					const wave = Math.sin(elapsedTime * 5.5) * 0.08;
					targetBodyY = 0.18 + salute * 0.03;
					targetBodyRotX = -0.18 * salute;
					targetBodyRotY = -0.15 * salute;
					targetLeftLegX = 0.36 * salute;
					targetRightLegX = -0.42 * salute;
					targetRightArmX = -1.15 - 1.55 * salute + wave;
					targetRightArmZ = -0.12 * salute;
					targetRightElbowX = -0.06; // Full heroic skyward spear extension!
					targetLeftArmX = -0.92 * salute;
					targetLeftArmY = 0.48 * salute;
					targetLeftElbowX = -0.58;
					targetHeadX = -0.26 * salute;
					targetCapeX = 0.55 + Math.sin(elapsedTime * 6.5) * 0.16;
				}
			} else if (arch === "n") {
				// KNIGHT — "Tempest Rear & Twin-Lance Cross":
				// Phase 1 (0..0.45): Rears back like a triumphant warhorse while spinning both voltaic lances in 360° windmills!
				// Phase 2 (0.45..1.0): Stamps down and snaps both lances into a blazing overhead X-Cross Salute!
				if (p < 0.45) {
					const rear = Math.sin((p / 0.45) * Math.PI);
					targetBodyY = 0.18 + rear * 0.26;
					targetBodyRotX = -0.38 * rear;
					targetPelvisRotX = -0.22 * rear;
					targetLeftLegX = -0.65 * rear;
					targetRightLegX = 0.48 * rear;
					targetRightArmX = -(p / 0.45) * Math.PI * 2;
					targetLeftArmX = -(p / 0.45) * Math.PI * 2;
					targetRightElbowX = -0.2;
					targetLeftElbowX = -0.2;
					targetHeadX = -0.25 * rear;
					targetCapeX = 0.92 * rear + 0.25;
				} else {
					const cross = Math.min(1, (p - 0.45) / 0.25);
					const pulse = Math.sin(elapsedTime * 6.0) * 0.06;
					targetBodyY = 0.18;
					targetBodyRotX = -0.14 * cross;
					targetLeftLegX = -0.32 * cross;
					targetRightLegX = 0.32 * cross;
					// Cross both lances in a dramatic X overhead!
					targetRightArmX = -2.05 * cross + pulse;
					targetRightArmY = -0.45 * cross;
					targetRightArmZ = 0.48 * cross;
					targetRightElbowX = -0.32 * cross;
					targetLeftArmX = -2.05 * cross + pulse;
					targetLeftArmY = 0.45 * cross;
					targetLeftArmZ = -0.48 * cross;
					targetLeftElbowX = -0.32 * cross;
					targetHeadX = -0.15 * cross;
					targetCapeX = 0.58 + Math.sin(elapsedTime * 7) * 0.15;
				}
			} else if (arch === "b") {
				// BISHOP — "Cathedral Benediction":
				// Phase 1 (0..0.42): Sweeps the Sanctified Glaive in a wide liturgical arc while beginning to levitate!
				// Phase 2 (0.42..1.0): Floats in serene lotus levitation above the pedestal, glaive upright, hands folded in Inquisitor's prayer!
				if (p < 0.42) {
					const sweep = p / 0.42;
					const arc = Math.sin(sweep * Math.PI);
					targetBodyY = 0.18 + sweep * 0.18;
					targetBodyRotY = arc * 0.78;
					targetRightArmX = -1.35 * arc;
					targetRightArmZ = -0.82 * arc;
					targetRightElbowX = -0.15;
					targetLeftArmX = -0.95 * arc;
					targetLeftArmZ = 0.65 * arc;
					targetCapeX = 0.65 * arc + 0.2;
				} else {
					const ascend = Math.min(1, (p - 0.42) / 0.28);
					const hover = Math.sin(elapsedTime * 4.2) * 0.045;
					targetBodyY = 0.36 + hover;
					targetBodyRotX = 0.08 * ascend;
					targetLeftLegX = -0.58 * ascend;
					targetRightLegX = -0.42 * ascend;
					// Solemn folded prayer hands with Glaive cradled vertically
					targetRightArmX = -1.18 * ascend;
					targetRightArmY = -0.56 * ascend;
					targetRightElbowX = -1.05 * ascend;
					targetLeftArmX = -1.18 * ascend;
					targetLeftArmY = 0.56 * ascend;
					targetLeftElbowX = -1.05 * ascend;
					targetHeadX = 0.22 * ascend; // Bowed mitre in solemn benediction
					targetCapeX = 0.38 + Math.sin(elapsedTime * 5) * 0.12;
				}
			} else if (arch === "r") {
				// ROOK — "Earthshaker Bastion Stomp":
				// Phase 1 (0..0.45): Heaves the Colossal Siege Maul overhead and slams it down with a seismic two-foot stomp!
				// Phase 2 (0.45..1.0): Throws both rampart arms wide open and tilts the Castellan Great-Helm back in an unstoppable juggernaut roar!
				if (p < 0.45) {
					const slamPhase = p / 0.45;
					if (slamPhase < 0.55) {
						const lift = slamPhase / 0.55;
						targetBodyY = 0.18 + lift * 0.06;
						targetBodyRotX = -0.26 * lift;
						targetLeftLegX = -0.55 * lift;
						targetRightArmX = -2.35 * lift;
						targetLeftArmX = -1.85 * lift;
					} else {
						const drop = (slamPhase - 0.55) / 0.45;
						targetBodyY = 0.14;
						targetBodyRotX = 0.32 * drop;
						targetLeftLegX = 0.28 * drop;
						targetRightLegX = -0.28 * drop;
						targetRightArmX = -2.35 + 1.85 * drop;
						targetLeftArmX = -1.85 + 1.35 * drop;
					}
				} else {
					const roar = Math.min(1, (p - 0.45) / 0.25);
					const rumble = Math.sin(elapsedTime * 18) * 0.025;
					targetBodyY = 0.17;
					targetBodyRotX = -0.26 * roar + rumble;
					targetLeftLegX = 0.32 * roar;
					targetRightLegX = -0.32 * roar;
					targetRightArmX = -1.45 * roar;
					targetRightArmZ = -0.78 * roar;
					targetRightElbowX = -0.35 * roar;
					targetLeftArmX = -1.35 * roar;
					targetLeftArmZ = 0.78 * roar;
					targetLeftElbowX = -0.35 * roar;
					targetHeadX = -0.36 * roar;
					targetCapeX = 0.72 + Math.sin(elapsedTime * 8) * 0.18;
				}
			} else if (arch === "q") {
				// QUEEN — "Coronation of Eight Blades":
				// Phase 1 (0..0.45): Ascends in a graceful 360° imperial pirouette as her 8 Astral Runeswords fan into a celestial halo!
				// Phase 2 (0.45..1.0): Extends the Royal Halberd wide while sweeping her left gauntlet across her heart in a Sovereign Valkyrie bow!
				if (p < 0.45) {
					const spin = p / 0.45;
					targetBodyY = 0.18 + Math.sin(spin * Math.PI) * 0.22;
					targetBodyRotY = spin * Math.PI * 2;
					targetRightArmX = -1.55 * Math.sin(spin * Math.PI);
					targetRightArmZ = -0.68;
					targetLeftArmX = -1.35 * Math.sin(spin * Math.PI);
					targetLeftArmZ = 0.68;
					targetCapeX = 0.95;
				} else {
					const pose = Math.min(1, (p - 0.45) / 0.26);
					const floatWave = Math.sin(elapsedTime * 4.5) * 0.035;
					targetBodyY = 0.26 + floatWave;
					targetBodyRotX = 0.14 * pose;
					targetBodyRotY = -0.18 * pose;
					targetLeftLegX = -0.38 * pose;
					targetRightLegX = 0.22 * pose;
					targetRightArmX = -1.28 * pose;
					targetRightArmZ = -0.72 * pose;
					targetRightElbowX = -0.12 * pose;
					targetLeftArmX = -0.95 * pose;
					targetLeftArmY = 0.62 * pose;
					targetLeftElbowX = -0.92 * pose;
					targetHeadX = 0.12 * pose;
					targetHeadY = 0.18 * pose;
					targetCapeX = 0.56 + Math.sin(elapsedTime * 6) * 0.15;
				}
			} else {
				// KING — "Sovereign Decree: Kneel":
				// Phase 1 (0..0.44): Raises the Greatsword of Sovereignty high above the Imperial Crown with both hands!
				// Phase 2 (0.44..1.0): Drives the Greatsword point-down into the conquered square and rests both gauntlets atop the pommel!
				if (p < 0.44) {
					const raise = p / 0.44;
					targetBodyY = 0.18 + raise * 0.04;
					targetBodyRotX = -0.2 * raise;
					targetLeftLegX = 0.32 * raise;
					targetRightLegX = -0.32 * raise;
					targetRightArmX = -2.55 * raise;
					targetRightArmY = -0.36 * raise;
					targetRightElbowX = -0.25 * raise;
					targetLeftArmX = -2.35 * raise;
					targetLeftArmY = 0.36 * raise;
					targetLeftElbowX = -0.3 * raise;
					targetHeadX = -0.22 * raise;
					targetCapeX = 0.62 * raise + 0.2;
				} else {
					const plant = Math.min(1, (p - 0.44) / 0.24);
					targetBodyY = 0.18;
					targetBodyRotX = 0.08 * plant;
					targetLeftLegX = 0.34 * plant;
					targetRightLegX = -0.34 * plant;
					// Both gauntlets resting commandingly atop the planted Greatsword pommel in front of chest!
					targetRightArmX = -2.55 + 1.48 * plant;
					targetRightArmY = -0.44 * plant;
					targetRightElbowX = -0.68 * plant;
					targetLeftArmX = -2.35 + 1.28 * plant;
					targetLeftArmY = 0.44 * plant;
					targetLeftElbowX = -0.68 * plant;
					targetHeadX = 0.12 * plant;
					targetCapeX = 0.62 + Math.sin(elapsedTime * 5.8) * 0.16;
				}
			}
			break;
		}
		case "defeat": {
			targetBodyY = 0.11;
			targetBodyRotX = 1.15;
			targetPelvisRotX = 0.45;
			targetLeftLegX = -0.65;
			targetRightLegX = -0.48;
			targetHeadX = 0.45;
			targetRightArmX = 0.5;
			targetRightElbowX = -0.35;
			targetLeftArmX = 0.35;
			targetLeftElbowX = -0.45;
			break;
		}
	}

	const k = 22;
	bodyPivot.position.y = THREE.MathUtils.damp(
		bodyPivot.position.y,
		targetBodyY,
		k,
		dt,
	);
	bodyPivot.rotation.x = THREE.MathUtils.damp(
		bodyPivot.rotation.x,
		targetBodyRotX,
		k,
		dt,
	);
	bodyPivot.rotation.y = THREE.MathUtils.damp(
		bodyPivot.rotation.y,
		targetBodyRotY,
		k,
		dt,
	);
	bodyPivot.rotation.z = THREE.MathUtils.damp(
		bodyPivot.rotation.z,
		targetBodyRotZ,
		k,
		dt,
	);

	pelvisGroup.position.y = bodyPivot.position.y;
	pelvisGroup.rotation.x = THREE.MathUtils.damp(
		pelvisGroup.rotation.x,
		targetPelvisRotX,
		k,
		dt,
	);
	pelvisGroup.rotation.y = THREE.MathUtils.damp(
		pelvisGroup.rotation.y,
		targetPelvisRotY,
		k,
		dt,
	);
	leftLegPivot.rotation.x = THREE.MathUtils.damp(
		leftLegPivot.rotation.x,
		targetLeftLegX,
		k,
		dt,
	);
	rightLegPivot.rotation.x = THREE.MathUtils.damp(
		rightLegPivot.rotation.x,
		targetRightLegX,
		k,
		dt,
	);

	rightArmPivot.rotation.x = THREE.MathUtils.damp(
		rightArmPivot.rotation.x,
		targetRightArmX,
		k,
		dt,
	);
	rightArmPivot.rotation.y = THREE.MathUtils.damp(
		rightArmPivot.rotation.y,
		targetRightArmY,
		k,
		dt,
	);
	rightArmPivot.rotation.z = THREE.MathUtils.damp(
		rightArmPivot.rotation.z,
		targetRightArmZ,
		k,
		dt,
	);
	rightElbowPivot.rotation.x = THREE.MathUtils.damp(
		rightElbowPivot.rotation.x,
		targetRightElbowX,
		k,
		dt,
	);

	leftArmPivot.rotation.x = THREE.MathUtils.damp(
		leftArmPivot.rotation.x,
		targetLeftArmX,
		k,
		dt,
	);
	leftArmPivot.rotation.y = THREE.MathUtils.damp(
		leftArmPivot.rotation.y,
		targetLeftArmY,
		k,
		dt,
	);
	leftArmPivot.rotation.z = THREE.MathUtils.damp(
		leftArmPivot.rotation.z,
		targetLeftArmZ,
		k,
		dt,
	);
	leftElbowPivot.rotation.x = THREE.MathUtils.damp(
		leftElbowPivot.rotation.x,
		targetLeftElbowX,
		k,
		dt,
	);

	headGroup.rotation.x = THREE.MathUtils.damp(
		headGroup.rotation.x,
		targetHeadX,
		k,
		dt,
	);
	headGroup.rotation.y = THREE.MathUtils.damp(
		headGroup.rotation.y,
		targetHeadY,
		k,
		dt,
	);
	capePivot.rotation.x = THREE.MathUtils.damp(
		capePivot.rotation.x,
		targetCapeX,
		14,
		dt,
	);

	// Expressive Ocular Eye-Tracking & Armored Eyelid Squint Focus inside the Visor
	const isAggressiveFocus =
		fighter.action === "heavy_1" ||
		fighter.action === "heavy_2" ||
		fighter.action === "special" ||
		fighter.action === "combo_finisher" ||
		fighter.action === "parry_flash" ||
		fighter.action === "blade_clash";
	const isStunned =
		fighter.action === "hitstun" || fighter.action === "knockdown";

	// Counter-track head & torso yaw so the iris pupils stay locked dead-on the opponent!
	const saccadeX = Math.sin(elapsedTime * 8.5 + fighter.x * 3.1) * 0.0022;
	const saccadeY = Math.cos(elapsedTime * 6.2 + fighter.x * 1.7) * 0.0014;
	const gazeOffsetX = THREE.MathUtils.clamp(
		-(headGroup.rotation.y + bodyPivot.rotation.y * 0.45) * 0.018 + saccadeX,
		-0.011,
		0.011,
	);
	const gazeOffsetY = THREE.MathUtils.clamp(
		-headGroup.rotation.x * 0.014 + saccadeY,
		-0.005,
		0.005,
	);

	// Note: leftEyeGroup has scale.x = -1 for mirrored geometry, so invert X offset on left pupil
	rig.leftPupilPivot.position.x = THREE.MathUtils.damp(
		rig.leftPupilPivot.position.x,
		-gazeOffsetX,
		24,
		dt,
	);
	rig.leftPupilPivot.position.y = THREE.MathUtils.damp(
		rig.leftPupilPivot.position.y,
		gazeOffsetY,
		24,
		dt,
	);
	rig.rightPupilPivot.position.x = THREE.MathUtils.damp(
		rig.rightPupilPivot.position.x,
		gazeOffsetX,
		24,
		dt,
	);
	rig.rightPupilPivot.position.y = THREE.MathUtils.damp(
		rig.rightPupilPivot.position.y,
		gazeOffsetY,
		24,
		dt,
	);

	// Iris / Pupil Dilation & Armored Eyelid Shutter Squint
	const pupilPulse = isAggressiveFocus
		? 1.24 + 0.14 * Math.sin(elapsedTime * 22)
		: hpRatio < 0.35
			? 1.18 + 0.12 * Math.sin(elapsedTime * 15)
			: 1.0;
	rig.leftPupilPivot.scale.setScalar(pupilPulse);
	rig.rightPupilPivot.scale.setScalar(pupilPulse);

	const targetLidY = isStunned
		? 0.016 // Widened in shock
		: isAggressiveFocus || hpRatio < 0.35
			? 0.0085 // Narrowed fierce predator squint
			: 0.0125;
	const targetLidRotZ = isStunned ? -0.04 : isAggressiveFocus ? 0.18 : 0.09;

	rig.leftUpperLid.position.y = THREE.MathUtils.damp(
		rig.leftUpperLid.position.y,
		targetLidY,
		20,
		dt,
	);
	rig.rightUpperLid.position.y = THREE.MathUtils.damp(
		rig.rightUpperLid.position.y,
		targetLidY,
		20,
		dt,
	);
	rig.leftUpperLid.rotation.z = THREE.MathUtils.damp(
		rig.leftUpperLid.rotation.z,
		targetLidRotZ,
		20,
		dt,
	);
	rig.rightUpperLid.rotation.z = THREE.MathUtils.damp(
		rig.rightUpperLid.rotation.z,
		targetLidRotZ,
		20,
		dt,
	);

	// 4D W-Phase Shift visual displacement & Quantum Superposition / Bell-Entanglement Rings
	const isPhased4D = fighter.wPhaseTimerMs > 0;
	const hasQuantumLink =
		isPhased4D ||
		fighter.temporalEchoTimerMs > 0 ||
		Boolean(fighter.entangledPartnerName);
	rig.tesseractBadge.visible = isPhased4D || fighter.temporalEchoTimerMs > 0;
	rig.quantumWaveGroup.visible = hasQuantumLink;
	if (hasQuantumLink) {
		rig.tesseractBadge.rotation.y += dt * 4.5;
		rig.tesseractBadge.rotation.x += dt * 3.2;
		rig.quantumWaveGroup.rotation.y += dt * 3.8;
		rig.quantumWaveGroup.rotation.z += dt * 2.6;
	}

	for (const mesh of rig.allStandardMeshes) {
		const mat = mesh.material as THREE.MeshStandardMaterial;
		const targetOpacity = isPhased4D ? 0.38 : 1.0;
		if (Math.abs(mat.opacity - targetOpacity) > 0.01) {
			mat.transparent = targetOpacity < 0.99;
			mat.opacity = THREE.MathUtils.damp(mat.opacity, targetOpacity, 16, dt);
			mat.needsUpdate = true;
		}
	}

	const isSpecialReady = fighter.meter >= fighter.spec.special.meterCost;
	const isPowerMove =
		fighter.action === "special" ||
		fighter.action === "combo_finisher" ||
		fighter.action === "parry_flash" ||
		fighter.superArmorActive;

	for (const glowMesh of rig.weaponGlowMeshes) {
		const mat = glowMesh.material as THREE.MeshStandardMaterial;
		mat.emissiveIntensity = isPowerMove
			? 2.1
			: fighter.hitFlashTimerMs > 0
				? 2.6
				: isSpecialReady
					? 1.55 + 0.45 * Math.sin(elapsedTime * 14)
					: 1.0;
	}

	// DIEGETIC 3D VITALITY: SOUL-CROWN HALO, BEATING HEART CORE, PEDESTAL RING & PAULDRON SUNDERING
	rig.vitalityHaloMesh.visible = fighter.hp > 0;
	if (rig.vitalityHaloMesh.visible) {
		rig.vitalityHaloUniforms.uTime.value = elapsedTime;
		rig.vitalityHaloUniforms.uHpRatio.value = hpRatio;
		rig.vitalityHaloUniforms.uRecoverableRatio.value =
			fighter.recoverableHp / Math.max(1, fighter.maxHp);
		rig.vitalityHaloUniforms.uGuardRatio.value = fighter.guardGauge / 100;
		rig.vitalityHaloUniforms.uSpecialReady.value = isSpecialReady ? 1.0 : 0.0;
	}

	// Beating Heart Chest Core Gem (accelerates & pulses crimson as vitality drops)
	const heartBeat =
		1.0 +
		0.26 * Math.abs(Math.sin(elapsedTime * (3.2 + (1 - hpRatio) * 8.5))) ** 3;
	rig.coreGem.scale.setScalar(heartBeat);

	// Pedestal Ring color & scale organically reflect remaining vitality
	const ringMat = rig.hpRingMesh.material as THREE.MeshBasicMaterial;
	ringMat.color.setHex(
		hpRatio > 0.65
			? fighter.piece.faction === "w"
				? 0xf59e0b
				: 0x38bdf8
			: hpRatio > 0.3
				? 0xf97316
				: 0xf43f5e,
	);
	ringMat.opacity = 0.72;

	// Physical Armor Degradation: Shoulder Pauldrons tilt askew & detach as warrior suffers heavy damage!
	if (rig.pauldronMeshes.length >= 2) {
		const leftP = rig.pauldronMeshes[0];
		const rightP = rig.pauldronMeshes[1];
		leftP.visible = hpRatio >= 0.42;
		if (leftP.visible) {
			const dmgTilt = hpRatio < 0.65 ? (0.65 - hpRatio) * 1.1 : 0;
			leftP.rotation.z = (leftP.userData.baseRotZ ?? 0.35) + dmgTilt;
		}
		rightP.visible = hpRatio >= 0.22;
		if (rightP.visible) {
			const dmgTiltR = hpRatio < 0.48 ? (0.48 - hpRatio) * 1.2 : 0;
			rightP.rotation.z = (rightP.userData.baseRotZ ?? -0.35) - dmgTiltR;
		}
	}

	// BATTLE-WORN PROCEDURAL CRACKS & FLICKERING EMISSIVE SCARS + STATUS SHADER & 3D INDICATORS
	const burnLevel =
		fighter.statusBurnTimerMs > 0
			? Math.min(1, fighter.statusBurnTimerMs / 900)
			: 0;
	const slowLevel =
		fighter.statusSlowTimerMs > 0
			? Math.min(1, fighter.statusSlowTimerMs / 900)
			: 0;
	const weakLevel =
		fighter.statusWeakenedTimerMs > 0
			? Math.min(1, fighter.statusWeakenedTimerMs / 900)
			: 0;
	const hasAnyStatus = burnLevel > 0.01 || slowLevel > 0.01 || weakLevel > 0.01;

	rig.statusShaderMesh.visible = hasAnyStatus && fighter.hp > 0;
	if (rig.statusShaderMesh.visible) {
		rig.statusShaderUniforms.uTime.value = elapsedTime;
		rig.statusShaderUniforms.uBurn.value = burnLevel;
		rig.statusShaderUniforms.uSlow.value = slowLevel;
		rig.statusShaderUniforms.uWeakened.value = weakLevel;
	}

	rig.statusIndicatorGroup.visible = hasAnyStatus && fighter.hp > 0;
	if (rig.statusIndicatorGroup.visible) {
		const primaryStatusHex =
			burnLevel >= slowLevel && burnLevel >= weakLevel
				? 0xf97316 // Burn Orange
				: slowLevel >= weakLevel
					? 0x38bdf8 // Slow Cryo-Cyan
					: 0xc084fc; // Weakened Sunder-Violet
		const secondaryStatusHex =
			burnLevel >= slowLevel && burnLevel >= weakLevel
				? 0xfde047
				: slowLevel >= weakLevel
					? 0xbae6fd
					: 0xf43f5e;

		(rig.statusRingMesh.material as THREE.MeshBasicMaterial).color.setHex(
			primaryStatusHex,
		);
		const orbitSpeed = burnLevel > 0 ? 5.2 : slowLevel > 0 ? 1.4 : -3.8;
		rig.statusIndicatorGroup.rotation.y += dt * orbitSpeed;
		rig.statusIndicatorGroup.position.y =
			0.62 + Math.sin(elapsedTime * 5.0) * 0.08;

		for (let i = 0; i < rig.statusCrystals.length; i++) {
			const cMesh = rig.statusCrystals[i];
			(cMesh.material as THREE.MeshBasicMaterial).color.setHex(
				i % 2 === 0 ? secondaryStatusHex : primaryStatusHex,
			);
			cMesh.position.y = 0.08 + Math.sin(elapsedTime * 7.5 + i * 2.1) * 0.12;
			cMesh.rotation.x += dt * 4.5;
			cMesh.rotation.y += dt * 6.0;
		}
	}

	if (hpRatio < 0.3 && fighter.hp > 0) {
		const criticalSeverity = Math.min(1, (0.3 - hpRatio) / 0.22 + 0.35);
		const flicker =
			0.55 +
			0.45 *
				Math.sin(elapsedTime * 32 + fighter.x * 5) *
				Math.cos(elapsedTime * 19);
		rig.primaryArmorMat.emissive.setHex(
			fighter.piece.faction === "w" ? 0xf59e0b : 0xf43f5e,
		);
		rig.primaryArmorMat.emissiveIntensity = criticalSeverity * flicker * 1.85;
		rig.primaryArmorMat.bumpScale = 0.045 * criticalSeverity;
	} else if (hasAnyStatus && fighter.hp > 0) {
		const statusPulse = 0.5 + 0.5 * Math.sin(elapsedTime * 16);
		if (burnLevel >= slowLevel && burnLevel >= weakLevel) {
			rig.primaryArmorMat.emissive.setHex(0xf97316);
			rig.primaryArmorMat.emissiveIntensity =
				burnLevel * (0.45 + 0.45 * statusPulse);
		} else if (slowLevel >= weakLevel) {
			rig.primaryArmorMat.emissive.setHex(0x38bdf8);
			rig.primaryArmorMat.emissiveIntensity =
				slowLevel * (0.38 + 0.25 * statusPulse);
		} else {
			rig.primaryArmorMat.emissive.setHex(0xa855f7);
			rig.primaryArmorMat.emissiveIntensity =
				weakLevel * (0.42 + 0.38 * statusPulse);
		}
		rig.primaryArmorMat.bumpScale = 0.02 * Math.max(burnLevel, weakLevel);
	} else {
		rig.primaryArmorMat.emissiveIntensity = 0.0;
		rig.primaryArmorMat.bumpScale = 0.0;
	}
}

/**
 * Animates the First-Person Weapon & Shield Viewmodel Rig attached in front of the player's camera
 * during First-Person Visor Combat Mode!
 */
export function animateFirstPersonViewmodel(
	vm: FirstPersonViewmodelRig,
	fighter: FighterRuntime,
	elapsedTime: number,
	dt: number,
) {
	const p =
		fighter.actionDurationMs > 0
			? Math.min(1, fighter.actionTimerMs / fighter.actionDurationMs)
			: 0;

	const walkBobX =
		fighter.action === "walk_fwd" || fighter.action === "walk_back"
			? Math.cos(elapsedTime * 11) * 0.035
			: Math.cos(elapsedTime * 2.4) * 0.008;
	const walkBobY =
		fighter.action === "walk_fwd" || fighter.action === "walk_back"
			? Math.abs(Math.sin(elapsedTime * 11)) * 0.04
			: Math.sin(elapsedTime * 2.4) * 0.012;

	// Default resting poses for Right Weapon Hand and Left Shield Hand
	let rPosX = 0.42 + walkBobX;
	let rPosY = -0.34 - walkBobY;
	let rPosZ = -0.68;
	let rRotX = 0.08;
	let rRotY = -0.15;
	let rRotZ = -0.08;

	let lPosX = -0.42 - walkBobX;
	let lPosY = -0.34 - walkBobY;
	let lPosZ = -0.62;
	let lRotX = 0.05;
	let lRotY = 0.22;
	const lRotZ = 0.06;

	switch (fighter.action) {
		case "light_1":
		case "light_3": {
			const thrust = Math.sin(p * Math.PI);
			rPosX = 0.42 - thrust * 0.24;
			rPosY = -0.3 + thrust * 0.1;
			rPosZ = -0.68 - thrust * 0.45;
			rRotX = -0.55 * thrust;
			rRotY = -0.15 + thrust * 0.35;
			break;
		}
		case "light_2": {
			const slash = Math.sin(p * Math.PI);
			rPosX = 0.42 - slash * 0.55;
			rPosY = -0.26 + slash * 0.08;
			rPosZ = -0.68 - slash * 0.32;
			rRotZ = -0.95 * slash;
			rRotY = 0.65 * slash;
			break;
		}
		case "heavy_1":
		case "heavy_2": {
			if (p < 0.35) {
				const windup = p / 0.35;
				rPosY = -0.34 + windup * 0.32;
				rPosZ = -0.68 + windup * 0.15;
				rRotX = 0.75 * windup;
			} else {
				const cleave = Math.sin(((p - 0.35) / 0.65) * Math.PI);
				rPosX = 0.42 - cleave * 0.32;
				rPosY = -0.02 - cleave * 0.42;
				rPosZ = -0.68 - cleave * 0.52;
				rRotX = -1.05 * cleave;
			}
			break;
		}
		case "combo_finisher":
		case "special": {
			const surge = Math.sin(p * Math.PI);
			rPosX = 0.12;
			rPosY = -0.18 + surge * 0.12;
			rPosZ = -0.68 - surge * 0.58;
			rRotX = -0.85 * surge;
			rRotZ = p * Math.PI * 2;
			lPosX = -0.25;
			lPosY = -0.22 + surge * 0.1;
			break;
		}
		case "block": {
			// Raise Left Shield / Ward directly across the center of the First-Person Visor!
			lPosX = -0.12;
			lPosY = -0.14;
			lPosZ = -0.48;
			lRotY = 0.65;
			lRotX = 0.15;
			rPosX = 0.48;
			rPosY = -0.38;
			break;
		}
		case "parry_flash": {
			const bash = Math.sin(p * Math.PI);
			lPosX = -0.08 + bash * 0.18;
			lPosY = -0.12 + bash * 0.08;
			lPosZ = -0.46 - bash * 0.25;
			lRotY = 0.85;
			break;
		}
		case "blade_clash": {
			const grind = Math.sin(elapsedTime * 60) * 0.032;
			rPosX = 0.08 + grind;
			rPosY = -0.14 + Math.cos(elapsedTime * 50) * 0.025;
			rPosZ = -0.48;
			rRotX = -0.42;
			rRotZ = 0.58 + grind * 1.5;
			lPosX = -0.14 - grind;
			lPosY = -0.16;
			lPosZ = -0.48;
			lRotY = 0.72;
			break;
		}
		case "hitstun": {
			const recoil = Math.sin(p * Math.PI);
			rPosY = -0.45 - recoil * 0.12;
			lPosY = -0.45 - recoil * 0.12;
			rRotZ = 0.35 * recoil;
			break;
		}
	}

	const dampSpd = 26;
	vm.rightHandGroup.position.set(
		THREE.MathUtils.damp(vm.rightHandGroup.position.x, rPosX, dampSpd, dt),
		THREE.MathUtils.damp(vm.rightHandGroup.position.y, rPosY, dampSpd, dt),
		THREE.MathUtils.damp(vm.rightHandGroup.position.z, rPosZ, dampSpd, dt),
	);
	vm.rightHandGroup.rotation.set(
		THREE.MathUtils.damp(vm.rightHandGroup.rotation.x, rRotX, dampSpd, dt),
		THREE.MathUtils.damp(vm.rightHandGroup.rotation.y, rRotY, dampSpd, dt),
		THREE.MathUtils.damp(vm.rightHandGroup.rotation.z, rRotZ, dampSpd, dt),
	);

	vm.leftHandGroup.position.set(
		THREE.MathUtils.damp(vm.leftHandGroup.position.x, lPosX, dampSpd, dt),
		THREE.MathUtils.damp(vm.leftHandGroup.position.y, lPosY, dampSpd, dt),
		THREE.MathUtils.damp(vm.leftHandGroup.position.z, lPosZ, dampSpd, dt),
	);
	vm.leftHandGroup.rotation.set(
		THREE.MathUtils.damp(vm.leftHandGroup.rotation.x, lRotX, dampSpd, dt),
		THREE.MathUtils.damp(vm.leftHandGroup.rotation.y, lRotY, dampSpd, dt),
		THREE.MathUtils.damp(vm.leftHandGroup.rotation.z, lRotZ, dampSpd, dt),
	);

	const isPower =
		fighter.action === "special" ||
		fighter.action === "combo_finisher" ||
		fighter.action === "parry_flash" ||
		fighter.wPhaseTimerMs > 0;

	for (const gm of vm.weaponGlowMeshes) {
		const mat = gm.material as THREE.MeshStandardMaterial;
		mat.emissiveIntensity = isPower ? 2.2 : 1.0;
	}

	// Update Diegetic 1st-Person Shield-Gauntlet Runic Vitality & Guard Arc!
	const hpRatio = fighter.hp / Math.max(1, fighter.maxHp);
	const isSpecialReady = fighter.meter >= fighter.spec.special.meterCost;
	vm.wristArcUniforms.uTime.value = elapsedTime;
	vm.wristArcUniforms.uHpRatio.value = hpRatio;
	vm.wristArcUniforms.uGuardRatio.value = fighter.guardGauge / 100;
	vm.wristArcUniforms.uSpecialReady.value = isSpecialReady ? 1.0 : 0.0;

	// Battle-Worn Flickering Scars (< 30% HP) & Status Effect Tint on First-Person Gauntlet Viewmodel
	const hasStatus =
		fighter.statusBurnTimerMs > 0 ||
		fighter.statusSlowTimerMs > 0 ||
		fighter.statusWeakenedTimerMs > 0;
	if (hpRatio < 0.55 && fighter.hp > 0) {
		const woundSeverity = Math.min(1, (0.55 - hpRatio) / 0.38 + 0.25);
		const flicker =
			0.55 + 0.45 * Math.sin(elapsedTime * 34) * Math.cos(elapsedTime * 21);
		vm.armorMat.emissive.setHex(
			fighter.piece.faction === "w" ? 0xf59e0b : 0xf43f5e,
		);
		vm.armorMat.emissiveIntensity =
			woundSeverity * flicker * (hpRatio < 0.3 ? 1.75 : 0.75);
		vm.armorMat.bumpScale = 0.04 * woundSeverity;
	} else if (hasStatus && fighter.hp > 0) {
		const pulse = 0.55 + 0.45 * Math.sin(elapsedTime * 16);
		if (
			fighter.statusBurnTimerMs >= fighter.statusSlowTimerMs &&
			fighter.statusBurnTimerMs >= fighter.statusWeakenedTimerMs
		) {
			vm.armorMat.emissive.setHex(0xf97316);
		} else if (fighter.statusSlowTimerMs >= fighter.statusWeakenedTimerMs) {
			vm.armorMat.emissive.setHex(0x38bdf8);
		} else {
			vm.armorMat.emissive.setHex(0xa855f7);
		}
		vm.armorMat.emissiveIntensity = 0.65 * pulse;
		vm.armorMat.bumpScale = 0.018;
	} else {
		vm.armorMat.emissiveIntensity = 0.0;
		vm.armorMat.bumpScale = 0.0;
	}
}
