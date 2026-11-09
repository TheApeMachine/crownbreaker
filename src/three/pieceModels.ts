import * as THREE from "three";
import type { Faction, PieceType } from "../types/game";
import { getSharedArmorScarTexture } from "./battleWornShader";

export interface ArticulatedPieceRig {
	root: THREE.Group;
	pedestal: THREE.Mesh;
	pelvisGroup: THREE.Group;
	leftLegPivot: THREE.Group;
	rightLegPivot: THREE.Group;
	bodyPivot: THREE.Group;
	headGroup: THREE.Group;
	rightArmPivot: THREE.Group;
	rightElbowPivot: THREE.Group;
	leftArmPivot: THREE.Group;
	leftElbowPivot: THREE.Group;
	capePivot: THREE.Group;
	surpriseGroup: THREE.Group;
	tesseractBadge: THREE.LineSegments;
	quantumWaveGroup: THREE.Group;
	weaponGlowMeshes: THREE.Mesh[];
	allStandardMeshes: THREE.Mesh[];
	primaryArmorMat: THREE.MeshPhysicalMaterial;
	specialOrbitGroup: THREE.Group;
	shieldMesh: THREE.Mesh | null;
	hpRingMesh: THREE.Mesh;
	statusShaderMesh: THREE.Mesh;
	statusShaderUniforms: {
		uTime: { value: number };
		uBurn: { value: number };
		uSlow: { value: number };
		uWeakened: { value: number };
	};
	statusIndicatorGroup: THREE.Group;
	statusRingMesh: THREE.Mesh;
	statusCrystals: THREE.Mesh[];
	// Diegetic 3D Vitality, Guard & Special Readiness (Part of the Character's Look!)
	coreGem: THREE.Mesh;
	pauldronMeshes: THREE.Mesh[];
	vitalityHaloMesh: THREE.Mesh;
	vitalityHaloUniforms: {
		uTime: { value: number };
		uHpRatio: { value: number };
		uRecoverableRatio: { value: number };
		uGuardRatio: { value: number };
		uSpecialReady: { value: number };
	};
	// Expressive Ocular & Iris Eye-Tracking Rig inside the Recessed Visor
	leftEyeGroup: THREE.Group;
	rightEyeGroup: THREE.Group;
	leftPupilPivot: THREE.Group;
	rightPupilPivot: THREE.Group;
	leftUpperLid: THREE.Mesh;
	rightUpperLid: THREE.Mesh;
	// 3D Academic Professor Attire (Tweed Lapels, Tie, Suede Elbow Patches, Wire-Rim Glasses, Mortarboard & Manuscript)
	professorAttireNodes: THREE.Object3D[];
	isProfessorModeActive?: boolean;
}

export interface FirstPersonViewmodelRig {
	root: THREE.Group;
	rightHandGroup: THREE.Group;
	leftHandGroup: THREE.Group;
	weaponGlowMeshes: THREE.Mesh[];
	armorMat: THREE.MeshPhysicalMaterial;
	wristArcMesh: THREE.Mesh;
	wristArcUniforms: {
		uTime: { value: number };
		uHpRatio: { value: number };
		uGuardRatio: { value: number };
		uSpecialReady: { value: number };
	};
}

// ============================================================================
// 1. PROCEDURAL SURFACE RELIEF TEXTURES (GOTHIC FLUTING & INTERLOCKING MAILLE)
// ============================================================================

let _armorFiligreeTex: THREE.CanvasTexture | null = null;
function getSharedArmorFiligreeTexture(): THREE.CanvasTexture {
	if (_armorFiligreeTex) return _armorFiligreeTex;
	const size = 512;
	const canvas = document.createElement("canvas");
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext("2d")!;

	// Neutral mid-grey base height
	ctx.fillStyle = "#808080";
	ctx.fillRect(0, 0, size, size);

	// Crisp Gothic Maximilian armor fluting channels
	for (let x = 0; x < size; x += 16) {
		const grad = ctx.createLinearGradient(x, 0, x + 16, 0);
		grad.addColorStop(0, "#5a5a5a");
		grad.addColorStop(0.2, "#787878");
		grad.addColorStop(0.5, "#b8b8b8");
		grad.addColorStop(0.8, "#787878");
		grad.addColorStop(1, "#5a5a5a");
		ctx.fillStyle = grad;
		ctx.fillRect(x, 0, 16, size);
	}

	// Articulated overlapping lame seams, recessed bevel grooves & dome rivets
	for (let y = 32; y < size; y += 64) {
		ctx.fillStyle = "#383838";
		ctx.fillRect(0, y, size, 4);
		ctx.fillStyle = "#d4d4d4";
		ctx.fillRect(0, y + 4, size, 3);
		ctx.fillStyle = "#606060";
		ctx.fillRect(0, y + 7, size, 2);

		for (let rx = 12; rx < size; rx += 24) {
			ctx.fillStyle = "#e8e8e8";
			ctx.beginPath();
			ctx.arc(rx, y + 12, 3.0, 0, Math.PI * 2);
			ctx.fill();
			ctx.strokeStyle = "#404040";
			ctx.lineWidth = 1.0;
			ctx.stroke();
		}
	}

	// Engraved Gothic chevron & trefoil border filigree
	ctx.strokeStyle = "#c8c8c8";
	ctx.lineWidth = 2.5;
	for (let y = 52; y < size; y += 128) {
		ctx.beginPath();
		for (let x = 0; x <= size; x += 32) {
			ctx.lineTo(x, y + (x % 64 === 0 ? -10 : 10));
		}
		ctx.stroke();

		ctx.strokeStyle = "#525252";
		ctx.lineWidth = 1.2;
		ctx.beginPath();
		for (let x = 0; x <= size; x += 32) {
			ctx.lineTo(x, y + 4 + (x % 64 === 0 ? -10 : 10));
		}
		ctx.stroke();
		ctx.strokeStyle = "#c8c8c8";
		ctx.lineWidth = 2.5;
	}

	const tex = new THREE.CanvasTexture(canvas);
	tex.wrapS = THREE.RepeatWrapping;
	tex.wrapT = THREE.RepeatWrapping;
	tex.repeat.set(2, 2);
	tex.anisotropy = 8;
	tex.needsUpdate = true;
	_armorFiligreeTex = tex;
	return tex;
}

let _chainmailTex: THREE.CanvasTexture | null = null;
function getSharedChainmailTexture(): THREE.CanvasTexture {
	if (_chainmailTex) return _chainmailTex;
	const size = 256;
	const canvas = document.createElement("canvas");
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext("2d")!;

	ctx.fillStyle = "#282c34";
	ctx.fillRect(0, 0, size, size);

	const rowH = 12;
	const ringR = 6.5;
	for (let row = 0; row <= size / rowH + 1; row++) {
		const y = row * rowH;
		const offsetX = (row % 2) * ringR;
		for (let col = -1; col <= size / (ringR * 2) + 1; col++) {
			const x = col * ringR * 2 + offsetX;
			ctx.strokeStyle = "#d4d8e2";
			ctx.lineWidth = 2.6;
			ctx.beginPath();
			ctx.arc(x, y, ringR * 0.78, 0.15 * Math.PI, 0.85 * Math.PI);
			ctx.stroke();

			ctx.strokeStyle = "#687082";
			ctx.lineWidth = 1.8;
			ctx.beginPath();
			ctx.arc(x, y, ringR * 0.78, 1.15 * Math.PI, 1.85 * Math.PI);
			ctx.stroke();
		}
	}

	const tex = new THREE.CanvasTexture(canvas);
	tex.wrapS = THREE.RepeatWrapping;
	tex.wrapT = THREE.RepeatWrapping;
	tex.repeat.set(4, 4);
	tex.anisotropy = 8;
	tex.needsUpdate = true;
	_chainmailTex = tex;
	return tex;
}

// ============================================================================
// 2. BESPOKE SCULPTED GEOMETRY BUILDERS (NO SIMPLE PRIMITIVES)
// ============================================================================

// 18-point Staunton-Gothic stepped plinth with carved coves, ogee moldings, and runic channel
function createPedestalGeometry(): THREE.LatheGeometry {
	const points = [
		new THREE.Vector2(0.004, 0.0),
		new THREE.Vector2(0.455, 0.0),
		new THREE.Vector2(0.455, 0.025),
		new THREE.Vector2(0.432, 0.042),
		new THREE.Vector2(0.438, 0.056),
		new THREE.Vector2(0.395, 0.075),
		new THREE.Vector2(0.355, 0.094), // Deep shadow cove
		new THREE.Vector2(0.398, 0.118), // Prominent torus molding
		new THREE.Vector2(0.398, 0.132),
		new THREE.Vector2(0.348, 0.152),
		new THREE.Vector2(0.328, 0.168),
		new THREE.Vector2(0.312, 0.182),
		new THREE.Vector2(0.004, 0.182),
	];
	const geo = new THREE.LatheGeometry(points, 36);
	geo.computeVertexNormals();
	return geo;
}

// Sculpted Gothic Flying-Buttress Plinth Bracket (replaces raw octahedron studs)
function createPedestalButtressGeometry(): THREE.ExtrudeGeometry {
	const s = new THREE.Shape();
	s.moveTo(0, 0);
	s.lineTo(0.065, 0);
	s.quadraticCurveTo(0.055, 0.055, 0.028, 0.095);
	s.lineTo(0, 0.115);
	s.closePath();

	const geo = new THREE.ExtrudeGeometry(s, {
		steps: 1,
		depth: 0.018,
		bevelEnabled: true,
		bevelThickness: 0.007,
		bevelSize: 0.006,
		bevelSegments: 2,
	});
	geo.center();
	geo.computeVertexNormals();
	return geo;
}

// 16-point Anatomical Under-Hauberk & Gambeson Torso Core
function createTorsoGeometry(
	scaleWidth: number = 1.0,
	height: number = 0.72,
): THREE.LatheGeometry {
	const points = [
		new THREE.Vector2(0.004, 0.0),
		new THREE.Vector2(0.235 * scaleWidth, 0.0),
		new THREE.Vector2(0.215 * scaleWidth, height * 0.12),
		new THREE.Vector2(0.182 * scaleWidth, height * 0.28), // Narrow anatomical waist
		new THREE.Vector2(0.195 * scaleWidth, height * 0.42),
		new THREE.Vector2(0.238 * scaleWidth, height * 0.56), // Lower ribcage
		new THREE.Vector2(0.278 * scaleWidth, height * 0.7), // Pectoral shelf
		new THREE.Vector2(0.305 * scaleWidth, height * 0.82), // Upper broad deltoid bridge
		new THREE.Vector2(0.26 * scaleWidth, height * 0.91),
		new THREE.Vector2(0.18 * scaleWidth, height * 0.96),
		new THREE.Vector2(0.165 * scaleWidth, height * 1.01),
		new THREE.Vector2(0.172 * scaleWidth, height * 1.04),
		new THREE.Vector2(0.004, height * 1.04),
	];
	const geo = new THREE.LatheGeometry(points, 32);
	geo.computeVertexNormals();
	return geo;
}

// Multi-layered Articulated Fauld Skirt (3 overlapping scalloped hip lames via LatheGeometry)
function createFauldSkirtGeometry(w: number, h: number): THREE.LatheGeometry {
	const points = [
		new THREE.Vector2(0.265 * w, h * 0.04),
		new THREE.Vector2(0.272 * w, h * 0.06),
		new THREE.Vector2(0.248 * w, h * 0.13), // Lame 3 step
		new THREE.Vector2(0.258 * w, h * 0.145),
		new THREE.Vector2(0.232 * w, h * 0.22), // Lame 2 step
		new THREE.Vector2(0.242 * w, h * 0.235),
		new THREE.Vector2(0.205 * w, h * 0.32), // Lame 1 waist cinch
		new THREE.Vector2(0.185 * w, h * 0.34),
	];
	const geo = new THREE.LatheGeometry(points, 28);
	geo.computeVertexNormals();
	return geo;
}

// Dagged Under-Armor Chainmail Hauberk Skirt with vertex-sculpted fluted ripples
function createChainmailSkirtGeometry(
	w: number,
	h: number,
): THREE.BufferGeometry {
	const points = [
		new THREE.Vector2(0.248 * w, -h * 0.02),
		new THREE.Vector2(0.238 * w, h * 0.08),
		new THREE.Vector2(0.215 * w, h * 0.2),
		new THREE.Vector2(0.195 * w, h * 0.29),
	];
	const geo = new THREE.LatheGeometry(points, 36);
	const pos = geo.attributes.position;
	for (let i = 0; i < pos.count; i++) {
		const vx = pos.getX(i);
		const vy = pos.getY(i);
		const vz = pos.getZ(i);
		const angle = Math.atan2(vz, vx);
		// Subtle pleated chainmail folds + dagged V-tooth lower edge
		const pleat = 1.0 + Math.cos(angle * 16) * 0.032;
		const dag = vy < h * 0.02 ? Math.cos(angle * 12) * 0.022 * h : 0;
		pos.setXYZ(i, vx * pleat, vy + dag, vz * pleat);
	}
	geo.computeVertexNormals();
	return geo;
}

// Vertex-Sculpted Convex Gothic Peascod Breastplate with Central Tapul Keel Ridge
function createSculptedCuirassGeometry(
	w: number,
	h: number,
): THREE.ExtrudeGeometry {
	const s = new THREE.Shape();
	const hw = 0.21 * w;
	const hh = 0.25 * h;
	s.moveTo(0, -hh * 1.08);
	s.quadraticCurveTo(hw * 0.55, -hh * 0.85, hw * 0.82, -hh * 0.42);
	s.lineTo(hw * 1.04, hh * 0.22); // Broad pectoral flare
	s.lineTo(hw * 0.68, hh * 0.58); // Deep armhole gusset cutout
	s.lineTo(hw * 0.78, hh * 0.98); // Shoulder strap
	s.lineTo(hw * 0.36, hh * 1.02);
	s.quadraticCurveTo(0, hh * 0.68, -hw * 0.36, hh * 1.02); // Gorget neckline cutout
	s.lineTo(-hw * 0.78, hh * 0.98);
	s.lineTo(-hw * 0.68, hh * 0.58);
	s.lineTo(-hw * 1.04, hh * 0.22);
	s.lineTo(-hw * 0.82, -hh * 0.42);
	s.quadraticCurveTo(-hw * 0.55, -hh * 0.85, 0, -hh * 1.08);

	const geo = new THREE.ExtrudeGeometry(s, {
		steps: 2,
		depth: 0.036 * w,
		bevelEnabled: true,
		bevelThickness: 0.024 * w,
		bevelSize: 0.018 * w,
		bevelSegments: 3,
	});
	geo.center();

	// Vertex-sculpt a 3D wrap-around ribcage curve + sharp central Tapul keel ridge
	const pos = geo.attributes.position;
	for (let i = 0; i < pos.count; i++) {
		const vx = pos.getX(i);
		const vy = pos.getY(i);
		const vz = pos.getZ(i);
		const normX = Math.min(1, Math.abs(vx) / (hw * 1.1));
		const normY = vy / (hh * 1.1);
		// Wrap sides backward around the torso cylinder
		const wrapZ = -normX * normX * 0.095 * w;
		// Pronounced central Tapul keel ridge + pectoral swell
		const keelZ = (1.0 - normX) * 0.042 * w + Math.cos(normY * 1.2) * 0.024 * w;
		// Subtle diagonal Gothic fluting channels
		const fluteZ = Math.cos((Math.abs(vx) * 28.0 - vy * 12.0) / w) * 0.004 * w;
		pos.setZ(i, vz + wrapZ + keelZ + (vz > 0 ? fluteZ : 0));
	}
	geo.computeVertexNormals();
	return geo;
}

// Overlapping Second-Layer Scalloped Lower Plackart Plate
function createScallopedPlackartGeometry(
	w: number,
	h: number,
): THREE.ExtrudeGeometry {
	const s = new THREE.Shape();
	const hw = 0.185 * w;
	const hh = 0.165 * h;
	s.moveTo(0, -hh * 0.95);
	s.lineTo(hw * 0.78, -hh * 0.45);
	s.lineTo(hw, hh * 0.25);
	// Scalloped Gothic cusp rising to central fleur point
	s.quadraticCurveTo(hw * 0.48, hh * 0.45, hw * 0.32, hh * 0.72);
	s.quadraticCurveTo(hw * 0.12, hh * 0.65, 0, hh * 1.08);
	s.quadraticCurveTo(-hw * 0.12, hh * 0.65, -hw * 0.32, hh * 0.72);
	s.quadraticCurveTo(-hw * 0.48, hh * 0.45, -hw, hh * 0.25);
	s.lineTo(-hw * 0.78, -hh * 0.45);
	s.closePath();

	const geo = new THREE.ExtrudeGeometry(s, {
		steps: 1,
		depth: 0.022 * w,
		bevelEnabled: true,
		bevelThickness: 0.014 * w,
		bevelSize: 0.012 * w,
		bevelSegments: 2,
	});
	geo.center();

	const pos = geo.attributes.position;
	for (let i = 0; i < pos.count; i++) {
		const vx = pos.getX(i);
		const vz = pos.getZ(i);
		const normX = Math.min(1, Math.abs(vx) / (hw * 1.05));
		pos.setZ(i, vz - normX * normX * 0.075 * w + (1 - normX) * 0.028 * w);
	}
	geo.computeVertexNormals();
	return geo;
}

// Sculpted Dorsal Backplate with Scapular Fluting
function createSculptedBackplateGeometry(
	w: number,
	h: number,
): THREE.ExtrudeGeometry {
	const s = new THREE.Shape();
	const hw = 0.195 * w;
	const hh = 0.23 * h;
	s.moveTo(0, -hh);
	s.lineTo(hw * 0.76, -hh * 0.55);
	s.lineTo(hw, hh * 0.35);
	s.lineTo(hw * 0.72, hh * 0.95);
	s.lineTo(0, hh * 0.78);
	s.lineTo(-hw * 0.72, hh * 0.95);
	s.lineTo(-hw, hh * 0.35);
	s.lineTo(-hw * 0.76, -hh * 0.55);
	s.closePath();

	const geo = new THREE.ExtrudeGeometry(s, {
		steps: 1,
		depth: 0.028 * w,
		bevelEnabled: true,
		bevelThickness: 0.016 * w,
		bevelSize: 0.014 * w,
		bevelSegments: 2,
	});
	geo.center();

	const pos = geo.attributes.position;
	for (let i = 0; i < pos.count; i++) {
		const vx = pos.getX(i);
		const vz = pos.getZ(i);
		const normX = Math.min(1, Math.abs(vx) / (hw * 1.05));
		// Curve forward around the back of the ribcage
		pos.setZ(i, vz + normX * normX * 0.075 * w);
	}
	geo.computeVertexNormals();
	return geo;
}

// Sculpted Dorsal Spine Vertebra Lame with Central Dorsal Fin & Rib Wings
function createSpineVertebraGeometry(w: number): THREE.ExtrudeGeometry {
	const s = new THREE.Shape();
	const sw = 0.078 * w;
	const sh = 0.048 * w;
	s.moveTo(0, sh * 1.15);
	s.lineTo(sw, -sh * 0.2);
	s.lineTo(sw * 0.65, -sh);
	s.lineTo(0, -sh * 0.45);
	s.lineTo(-sw * 0.65, -sh);
	s.lineTo(-sw, -sh * 0.2);
	s.closePath();

	const geo = new THREE.ExtrudeGeometry(s, {
		steps: 1,
		depth: 0.022 * w,
		bevelEnabled: true,
		bevelThickness: 0.009 * w,
		bevelSize: 0.008 * w,
		bevelSegments: 2,
	});
	geo.center();
	geo.computeVertexNormals();
	return geo;
}

// Stepped 3-Lame Articulated Gorget Collar
function createLayeredGorgetGeometry(w: number): THREE.LatheGeometry {
	const points = [
		new THREE.Vector2(0.215 * w, 0.0),
		new THREE.Vector2(0.222 * w, 0.015),
		new THREE.Vector2(0.188 * w, 0.038),
		new THREE.Vector2(0.194 * w, 0.048),
		new THREE.Vector2(0.168 * w, 0.072),
		new THREE.Vector2(0.178 * w, 0.088), // Rolled turnover throat rim
		new THREE.Vector2(0.158 * w, 0.088),
	];
	const geo = new THREE.LatheGeometry(points, 28);
	geo.computeVertexNormals();
	return geo;
}

// Custom Extruded Beveled Laminated Tasset / Tuille Plate with Central Keel
function createBeveledTassetGeometry(
	w: number,
	h: number,
): THREE.ExtrudeGeometry {
	const s = new THREE.Shape();
	s.moveTo(0, -h * 0.56);
	s.lineTo(w * 0.52, -h * 0.16);
	s.lineTo(w * 0.42, h * 0.18);
	s.lineTo(w * 0.46, h * 0.5);
	s.lineTo(0, h * 0.44);
	s.lineTo(-w * 0.46, h * 0.5);
	s.lineTo(-w * 0.42, h * 0.18);
	s.lineTo(-w * 0.52, -h * 0.16);
	s.closePath();

	const geo = new THREE.ExtrudeGeometry(s, {
		steps: 1,
		depth: 0.016,
		bevelEnabled: true,
		bevelThickness: 0.01,
		bevelSize: 0.008,
		bevelSegments: 2,
	});
	geo.center();

	// Add subtle convex curvature & central ridge
	const pos = geo.attributes.position;
	for (let i = 0; i < pos.count; i++) {
		const vx = pos.getX(i);
		const vz = pos.getZ(i);
		const normX = Math.min(1, Math.abs(vx) / Math.max(0.01, w * 0.52));
		pos.setZ(i, vz + (1 - normX) * 0.012 - normX * normX * 0.014);
	}
	geo.computeVertexNormals();
	return geo;
}

// Swallowtail Heraldic Loin Tabard with Draped Cloth Curvature
function createSwallowtailTabardGeometry(
	w: number,
	h: number,
): THREE.ExtrudeGeometry {
	const s = new THREE.Shape();
	const hw = w * 0.5;
	const hh = h * 0.5;
	s.moveTo(-hw * 0.85, hh);
	s.lineTo(hw * 0.85, hh);
	s.lineTo(hw, -hh * 0.35);
	s.lineTo(hw * 0.65, -hh); // Right swallowtail point
	s.lineTo(0, -hh * 0.62); // Central notch
	s.lineTo(-hw * 0.65, -hh); // Left swallowtail point
	s.lineTo(-hw, -hh * 0.35);
	s.closePath();

	const geo = new THREE.ExtrudeGeometry(s, {
		steps: 2,
		depth: 0.012,
		bevelEnabled: true,
		bevelThickness: 0.006,
		bevelSize: 0.006,
		bevelSegments: 2,
	});
	geo.center();

	const pos = geo.attributes.position;
	for (let i = 0; i < pos.count; i++) {
		const vx = pos.getX(i);
		const vy = pos.getY(i);
		const vz = pos.getZ(i);
		const pleat = Math.cos((vx / Math.max(0.01, hw)) * Math.PI * 2) * 0.009;
		const drape = ((vy - hh) / h) ** 2 * 0.028;
		pos.setZ(i, vz + pleat + drape);
	}
	geo.computeVertexNormals();
	return geo;
}

// Tapered Fluted Vambrace / Rerebrace / Cuisse Armor Limb with Rolled Cuff Rings
function createFlutedLimbGeometry(
	topR: number,
	midR: number,
	botR: number,
	length: number,
): THREE.BufferGeometry {
	const points = [
		new THREE.Vector2(0.003, -length),
		new THREE.Vector2(botR * 1.12, -length), // Rolled lower wrist/ankle cuff ring
		new THREE.Vector2(botR * 0.96, -length * 0.91),
		new THREE.Vector2(botR * 1.08, -length * 0.76),
		new THREE.Vector2(midR * 1.06, -length * 0.52), // Muscular calf/forearm swell
		new THREE.Vector2(midR * 0.95, -length * 0.32), // Articulated strap groove
		new THREE.Vector2(topR * 1.04, -length * 0.12),
		new THREE.Vector2(topR * 1.12, -length * 0.03), // Upper turnover rim
		new THREE.Vector2(topR * 0.88, 0.0),
		new THREE.Vector2(0.003, 0.0),
	];
	const geo = new THREE.LatheGeometry(points, 24);
	const pos = geo.attributes.position;
	for (let i = 0; i < pos.count; i++) {
		const vx = pos.getX(i);
		const vy = pos.getY(i);
		const vz = pos.getZ(i);
		const r = Math.hypot(vx, vz);
		if (r > 0.01) {
			const angle = Math.atan2(vz, vx);
			// Sharp anterior shin/forearm keel ridge on +Z + longitudinal flutes
			const frontKeel = Math.max(0, Math.sin(angle)) * 0.012;
			const flute = Math.cos(angle * 8) * 0.0035;
			const scale = 1.0 + (frontKeel + flute) / r;
			pos.setXYZ(i, vx * scale, vy, vz * scale);
		}
	}
	geo.computeVertexNormals();
	return geo;
}

// Winged Gothic Poleyn (Knee Cop) & Couter (Elbow Guard) with Lateral Fan-Fins
function createWingedJointCopGeometry(
	w: number,
	h: number,
): THREE.ExtrudeGeometry {
	const s = new THREE.Shape();
	const hw = w * 0.5;
	const hh = h * 0.5;
	s.moveTo(0, hh * 1.15);
	s.quadraticCurveTo(hw * 0.65, hh * 0.85, hw * 1.18, hh * 0.38); // Upper fan wing lobe
	s.quadraticCurveTo(hw * 0.82, 0, hw * 1.12, -hh * 0.42); // Lower fan wing lobe
	s.quadraticCurveTo(hw * 0.55, -hh * 0.78, 0, -hh * 1.18); // Pointed lower lame tip
	s.quadraticCurveTo(-hw * 0.55, -hh * 0.78, -hw * 1.12, -hh * 0.42);
	s.quadraticCurveTo(-hw * 0.82, 0, -hw * 1.18, hh * 0.38);
	s.quadraticCurveTo(-hw * 0.65, hh * 0.85, 0, hh * 1.15);

	const geo = new THREE.ExtrudeGeometry(s, {
		steps: 1,
		depth: 0.018,
		bevelEnabled: true,
		bevelThickness: 0.012,
		bevelSize: 0.01,
		bevelSegments: 2,
	});
	geo.center();

	const pos = geo.attributes.position;
	for (let i = 0; i < pos.count; i++) {
		const vx = pos.getX(i);
		const vz = pos.getZ(i);
		const normX = Math.min(1, Math.abs(vx) / Math.max(0.01, hw * 1.18));
		// Wrap lateral wings backward around the joint while keeping central spike proud
		pos.setZ(i, vz + (1 - normX) * 0.024 - normX * normX * 0.038);
	}
	geo.computeVertexNormals();
	return geo;
}

// Articulated Laminated Gothic Sabaton (Pointed Solleret Foot Armor)
function createGothicSabatonGeometry(
	w: number,
	len: number,
): THREE.ExtrudeGeometry {
	const s = new THREE.Shape();
	const hw = w * 0.5;
	s.moveTo(-hw * 0.78, -len * 0.42);
	s.lineTo(hw * 0.78, -len * 0.42);
	s.lineTo(hw * 0.95, len * 0.05);
	s.lineTo(hw * 0.72, len * 0.35);
	s.lineTo(0, len * 0.68); // Pointed Gothic poulaine toe tip
	s.lineTo(-hw * 0.72, len * 0.35);
	s.lineTo(-hw * 0.95, len * 0.05);
	s.closePath();

	const geo = new THREE.ExtrudeGeometry(s, {
		steps: 2,
		depth: 0.032 * (w / 0.12),
		bevelEnabled: true,
		bevelThickness: 0.014,
		bevelSize: 0.01,
		bevelSegments: 2,
	});
	geo.center();

	const pos = geo.attributes.position;
	for (let i = 0; i < pos.count; i++) {
		const vx = pos.getX(i);
		const vy = pos.getY(i);
		const vz = pos.getZ(i);
		// Arch the instep and create overlapping lame ridges along Y
		const lameStep = Math.sin((vy / Math.max(0.01, len)) * Math.PI * 5) * 0.005;
		const archZ = (1 - Math.min(1, Math.abs(vx) / Math.max(0.01, hw))) * 0.018;
		pos.setZ(i, vz + archZ + lameStep);
	}
	geo.computeVertexNormals();
	return geo;
}

// Sculpted Sweeping Gothic Pauldron Carapace (or Crenellated Fortress Bastion Pauldron for Rook)
function createSculptedPauldronGeometry(
	torsoW: number,
	isBastion: boolean,
): THREE.BufferGeometry {
	if (isBastion) {
		// Rook Citadel Bastion Pauldron: Extruded Crenellated Fortress Rampart Carapace (zero BoxGeometry!)
		const s = new THREE.Shape();
		const w = 0.28 * torsoW;
		const h = 0.27 * torsoW;
		s.moveTo(-w * 0.5, -h * 0.5);
		s.lineTo(w * 0.5, -h * 0.5);
		s.lineTo(w * 0.56, h * 0.25);
		// 3 Crenellated Battlement Merlons across the top of the shoulder
		s.lineTo(w * 0.56, h * 0.52);
		s.lineTo(w * 0.28, h * 0.52);
		s.lineTo(w * 0.28, h * 0.34);
		s.lineTo(w * 0.14, h * 0.34);
		s.lineTo(w * 0.14, h * 0.58);
		s.lineTo(-w * 0.14, h * 0.58);
		s.lineTo(-w * 0.14, h * 0.34);
		s.lineTo(-w * 0.28, h * 0.34);
		s.lineTo(-w * 0.28, h * 0.52);
		s.lineTo(-w * 0.56, h * 0.52);
		s.lineTo(-w * 0.56, h * 0.25);
		s.closePath();

		const geo = new THREE.ExtrudeGeometry(s, {
			steps: 2,
			depth: 0.24 * torsoW,
			bevelEnabled: true,
			bevelThickness: 0.022 * torsoW,
			bevelSize: 0.018 * torsoW,
			bevelSegments: 3,
		});
		geo.center();
		const pos = geo.attributes.position;
		for (let i = 0; i < pos.count; i++) {
			const vz = pos.getZ(i);
			const vy = pos.getY(i);
			// Taper slightly inward toward the top merlons like a sloped fortress wall
			const batter = 1.0 - (vy / h) * 0.14;
			pos.setZ(i, vz * batter);
		}
		geo.computeVertexNormals();
		return geo;
	}

	// Standard Archetypes: Vertex-Sculpted Fluted Gothic Pauldron Carapace with Flared Wing Rim
	const r = 0.162 * torsoW;
	const geo = new THREE.SphereGeometry(
		r,
		28,
		18,
		0,
		Math.PI * 2,
		0,
		Math.PI * 0.64,
	);
	const pos = geo.attributes.position;
	for (let i = 0; i < pos.count; i++) {
		const vx = pos.getX(i);
		const vy = pos.getY(i);
		const vz = pos.getZ(i);
		const angle = Math.atan2(vz, vx);
		const rimFactor = Math.max(0, 1.0 - vy / r);
		// Radial Gothic fluting ridges + flared outward lower edge + central spine ridge
		const flute = Math.cos(angle * 10) * 0.008 * torsoW * rimFactor;
		const flare = rimFactor ** 2.2 * 0.032 * torsoW;
		const centralComb = Math.exp(-vz * vz * 120) * 0.018 * torsoW;
		const horizLen = Math.hypot(vx, vz) || 1;
		const newHoriz = horizLen + flute + flare;
		pos.setXYZ(
			i,
			(vx / horizLen) * newHoriz,
			vy + centralComb - Math.cos(angle * 2) * 0.014 * torsoW * rimFactor,
			(vz / horizLen) * newHoriz * 1.08,
		);
	}
	geo.computeVertexNormals();
	return geo;
}

// Sculpted Cranial Armet / Barbute Skull-Bowl with Sagittal Comb Ridge & Occipital Neck Sweep
function createHelmSkullGeometry(radius: number): THREE.BufferGeometry {
	const geo = new THREE.SphereGeometry(radius, 32, 24);
	const pos = geo.attributes.position;
	for (let i = 0; i < pos.count; i++) {
		let vx = pos.getX(i);
		let vy = pos.getY(i);
		let vz = pos.getZ(i);
		const ny = vy / radius;
		const nz = vz / radius;

		// Narrow the temples slightly for an aristocratic martial profile
		vx *= 0.91 - Math.max(0, -ny) * 0.08;
		// Elongate crown & add a raised sagittal comb ridge along X=0
		const comb =
			Math.exp(-(vx * vx) / (radius * radius * 0.06)) *
			Math.max(0, ny + 0.1) *
			radius *
			0.14;
		vy = vy * 1.15 + comb;
		// Sweep occipital back of the skull-cap outward at the nape of the neck
		const napeFlare =
			nz < -0.15 && ny < 0.05
				? (-nz - 0.15) ** 1.4 * Math.max(0, 0.25 - ny) * radius * 0.42
				: 0;
		vz = vz * 1.08 - napeFlare;

		pos.setXYZ(i, vx, vy, vz);
	}
	geo.computeVertexNormals();
	return geo;
}

// Sculpted V-Shaped Brow Reinforce Plate framing the Upper Visor Slit
function createSculptedBrowPlateGeometry(
	w: number,
	h: number,
): THREE.ExtrudeGeometry {
	const s = new THREE.Shape();
	const hw = w * 0.5;
	const hh = h * 0.5;
	s.moveTo(0, -hh * 0.95); // Fierce central glabella scowl point
	s.lineTo(hw, hh * 0.15);
	s.lineTo(hw * 0.88, hh * 1.1);
	s.lineTo(0, hh * 0.48);
	s.lineTo(-hw * 0.88, hh * 1.1);
	s.lineTo(-hw, hh * 0.15);
	s.closePath();

	const geo = new THREE.ExtrudeGeometry(s, {
		steps: 1,
		depth: 0.022,
		bevelEnabled: true,
		bevelThickness: 0.009,
		bevelSize: 0.007,
		bevelSegments: 2,
	});
	geo.center();

	const pos = geo.attributes.position;
	for (let i = 0; i < pos.count; i++) {
		const vx = pos.getX(i);
		const vz = pos.getZ(i);
		const normX = Math.min(1, Math.abs(vx) / Math.max(0.01, hw));
		// Wrap temple ends backward around the helmet brow
		pos.setZ(i, vz - normX * normX * 0.068 + (1 - normX) * 0.016);
	}
	geo.computeVertexNormals();
	return geo;
}

// Sculpted Pointed Armet Ventail / Bellows Faceguard below the Visor Slit
function createSculptedVentailGeometry(
	w: number,
	h: number,
): THREE.ExtrudeGeometry {
	const s = new THREE.Shape();
	const hw = w * 0.5;
	const hh = h * 0.5;
	s.moveTo(0, hh * 0.95); // Central nasal/beak bridge point
	s.lineTo(hw, hh * 0.42);
	s.lineTo(hw * 0.82, -hh * 0.55);
	s.lineTo(0, -hh * 1.08); // Chin point
	s.lineTo(-hw * 0.82, -hh * 0.55);
	s.lineTo(-hw, hh * 0.42);
	s.closePath();

	const geo = new THREE.ExtrudeGeometry(s, {
		steps: 2,
		depth: 0.026,
		bevelEnabled: true,
		bevelThickness: 0.012,
		bevelSize: 0.009,
		bevelSegments: 2,
	});
	geo.center();

	const pos = geo.attributes.position;
	for (let i = 0; i < pos.count; i++) {
		const vx = pos.getX(i);
		const vz = pos.getZ(i);
		const normX = Math.min(1, Math.abs(vx) / Math.max(0.01, hw));
		// Sharp forward central beak ridge + cheek wrap
		pos.setZ(i, vz + (1 - normX) * 0.036 - normX * normX * 0.062);
	}
	geo.computeVertexNormals();
	return geo;
}

// Curved Shadowed Occularium Vault inside the Helmet Visor
function createVisorVaultGeometry(): THREE.BufferGeometry {
	const geo = new THREE.CylinderGeometry(
		0.145,
		0.145,
		0.066,
		20,
		1,
		false,
		-Math.PI * 0.38,
		Math.PI * 0.76,
	);
	geo.rotateY(Math.PI);
	geo.computeVertexNormals();
	return geo;
}

// Fierce Angular Almond-Diamond Ocular Slit Geometry (replaces rectangular BoxGeometry eye)
function createOcularSlitGeometry(w: number, h: number): THREE.ExtrudeGeometry {
	const s = new THREE.Shape();
	const hw = w * 0.5;
	const hh = h * 0.5;
	s.moveTo(-hw, -hh * 0.25); // Inner tear-duct corner angled sharply down
	s.quadraticCurveTo(-hw * 0.15, hh * 1.05, hw, hh * 0.42); // Outer lateral canthus swept up
	s.quadraticCurveTo(hw * 0.2, -hh * 1.05, -hw, -hh * 0.25);

	const geo = new THREE.ExtrudeGeometry(s, {
		steps: 1,
		depth: 0.008,
		bevelEnabled: true,
		bevelThickness: 0.003,
		bevelSize: 0.002,
		bevelSegments: 1,
	});
	geo.center();
	geo.computeVertexNormals();
	return geo;
}

// Custom Extruded Beveled Heater / Kite Shield with Convex Curvature
function createHeaterShieldGeometry(
	width: number,
	height: number,
): THREE.ExtrudeGeometry {
	const s = new THREE.Shape();
	const hw = width * 0.5;
	const hh = height * 0.5;
	s.moveTo(0, -hh);
	s.quadraticCurveTo(hw * 0.96, -hh * 0.32, hw, hh * 0.66);
	s.lineTo(hw * 0.62, hh);
	s.lineTo(0, hh * 0.86);
	s.lineTo(-hw * 0.62, hh);
	s.lineTo(-hw, hh * 0.66);
	s.quadraticCurveTo(-hw * 0.96, -hh * 0.32, 0, -hh);

	const geo = new THREE.ExtrudeGeometry(s, {
		steps: 2,
		depth: 0.026,
		bevelEnabled: true,
		bevelThickness: 0.016,
		bevelSize: 0.014,
		bevelSegments: 3,
	});
	geo.center();

	const pos = geo.attributes.position;
	for (let i = 0; i < pos.count; i++) {
		const vx = pos.getX(i);
		const vz = pos.getZ(i);
		const normX = Math.min(1, Math.abs(vx) / Math.max(0.01, hw));
		pos.setZ(i, vz + (1 - normX * normX) * 0.028);
	}
	geo.computeVertexNormals();
	return geo;
}

// Custom Extruded Tapered Sword / Spear Blade with Diamond Bevel Cross-Section
function createSculptedBladeGeometry(
	width: number,
	length: number,
	depth: number = 0.014,
): THREE.ExtrudeGeometry {
	const s = new THREE.Shape();
	const hw = width * 0.5;
	s.moveTo(0, 0);
	s.lineTo(hw, length * 0.08);
	s.lineTo(hw * 0.82, length * 0.74);
	s.lineTo(0, length);
	s.lineTo(-hw * 0.82, length * 0.74);
	s.lineTo(-hw, length * 0.08);
	s.closePath();

	const geo = new THREE.ExtrudeGeometry(s, {
		steps: 1,
		depth,
		bevelEnabled: true,
		bevelThickness: depth * 0.95,
		bevelSize: hw * 0.36,
		bevelSegments: 2,
	});
	geo.computeVertexNormals();
	return geo;
}

// Custom Extruded Crescent Glaive / Halberd Axe Head with Beveled Cutting Edge
function createCrescentAxeGeometry(
	radius: number,
	height: number,
): THREE.ExtrudeGeometry {
	const s = new THREE.Shape();
	s.moveTo(0, -height * 0.46);
	s.quadraticCurveTo(radius * 1.18, 0, 0, height * 0.56);
	s.quadraticCurveTo(radius * 0.38, 0, 0, -height * 0.46);

	const geo = new THREE.ExtrudeGeometry(s, {
		steps: 1,
		depth: 0.018,
		bevelEnabled: true,
		bevelThickness: 0.012,
		bevelSize: 0.012,
		bevelSegments: 2,
	});
	geo.center();
	geo.computeVertexNormals();
	return geo;
}

// Custom Extruded Swept Crossguard Quillion with Flared Quillion Terminals
function createSweptCrossguardGeometry(
	span: number,
	thickness: number,
): THREE.ExtrudeGeometry {
	const s = new THREE.Shape();
	const hs = span * 0.5;
	const ht = thickness * 0.5;
	s.moveTo(0, ht * 1.55); // Central ecusson point toward blade
	s.quadraticCurveTo(hs * 0.45, ht * 0.75, hs, ht * 1.25);
	s.lineTo(hs * 0.92, -ht * 1.1);
	s.quadraticCurveTo(hs * 0.45, -ht * 0.65, 0, -ht * 1.2);
	s.quadraticCurveTo(-hs * 0.45, -ht * 0.65, -hs * 0.92, -ht * 1.1);
	s.lineTo(-hs, ht * 1.25);
	s.quadraticCurveTo(-hs * 0.45, ht * 0.75, 0, ht * 1.55);

	const geo = new THREE.ExtrudeGeometry(s, {
		steps: 1,
		depth: thickness * 0.85,
		bevelEnabled: true,
		bevelThickness: 0.008,
		bevelSize: 0.007,
		bevelSegments: 2,
	});
	geo.center();
	geo.computeVertexNormals();
	return geo;
}

// Sculpted Spiral-Fluted Jousting Lance Body (LatheGeometry replacing raw ConeGeometry)
function createFlutedLanceGeometry(
	maxR: number,
	length: number,
): THREE.BufferGeometry {
	const points = [
		new THREE.Vector2(0.004, 0.0),
		new THREE.Vector2(maxR * 0.52, 0.0),
		new THREE.Vector2(maxR * 0.96, length * 0.14), // Vamplate swell
		new THREE.Vector2(maxR * 1.0, length * 0.22),
		new THREE.Vector2(maxR * 0.72, length * 0.45),
		new THREE.Vector2(maxR * 0.46, length * 0.72),
		new THREE.Vector2(maxR * 0.22, length * 0.92),
		new THREE.Vector2(0.003, length),
	];
	const geo = new THREE.LatheGeometry(points, 20);
	const pos = geo.attributes.position;
	for (let i = 0; i < pos.count; i++) {
		const vx = pos.getX(i);
		const vy = pos.getY(i);
		const vz = pos.getZ(i);
		const r = Math.hypot(vx, vz);
		if (r > 0.005) {
			const angle = Math.atan2(vz, vx) + (vy / length) * Math.PI * 1.5;
			const flute = 1.0 + Math.cos(angle * 8) * 0.085;
			pos.setXYZ(i, vx * flute, vy, vz * flute);
		}
	}
	geo.translate(0, -length * 0.5, 0);
	geo.computeVertexNormals();
	return geo;
}

// Sculpted Octagonal Beveled Siege Maul Hammerhead (replaces raw BoxGeometry on Rook Maul!)
function createSiegeMaulHeadGeometry(
	w: number,
	h: number,
	len: number,
): THREE.ExtrudeGeometry {
	const s = new THREE.Shape();
	const hw = w * 0.5;
	const hh = h * 0.5;
	const ch = 0.28; // Chamfer ratio
	s.moveTo(-hw * (1 - ch), hh);
	s.lineTo(hw * (1 - ch), hh);
	s.lineTo(hw, hh * (1 - ch));
	s.lineTo(hw, -hh * (1 - ch));
	s.lineTo(hw * (1 - ch), -hh);
	s.lineTo(-hw * (1 - ch), -hh);
	s.lineTo(-hw, -hh * (1 - ch));
	s.lineTo(-hw, hh * (1 - ch));
	s.closePath();

	const geo = new THREE.ExtrudeGeometry(s, {
		steps: 2,
		depth: len,
		bevelEnabled: true,
		bevelThickness: 0.028,
		bevelSize: 0.024,
		bevelSegments: 3,
	});
	geo.center();
	geo.computeVertexNormals();
	return geo;
}

// Shared radial contact shadow texture
let _contactShadowTex: THREE.CanvasTexture | null = null;
function getContactShadowTexture(): THREE.CanvasTexture {
	if (_contactShadowTex) return _contactShadowTex;
	const canvas = document.createElement("canvas");
	canvas.width = 128;
	canvas.height = 128;
	const ctx = canvas.getContext("2d")!;
	const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
	grad.addColorStop(0, "rgba(0,0,0,0.68)");
	grad.addColorStop(0.6, "rgba(0,0,0,0.28)");
	grad.addColorStop(1, "rgba(0,0,0,0.0)");
	ctx.fillStyle = grad;
	ctx.fillRect(0, 0, 128, 128);
	_contactShadowTex = new THREE.CanvasTexture(canvas);
	return _contactShadowTex;
}

const _pedestalGeo = createPedestalGeometry();
const _pedestalButtressGeo = createPedestalButtressGeometry();
const _contactShadowGeo = new THREE.PlaneGeometry(1.18, 1.18);

// ============================================================================
// 3. ARTICULATED PIECE RIG FACTORY (MULTI-LAYERED ARMOR & EYE-TRACKING RIG)
// ============================================================================

export function createArticulatedPiece(
	type: PieceType,
	faction: Faction,
): ArticulatedPieceRig {
	const root = new THREE.Group();

	const isWhite = faction === "w";
	const scarTex = getSharedArmorScarTexture();
	const filigreeTex = getSharedArmorFiligreeTexture();
	const chainmailTex = getSharedChainmailTexture();

	// Layer 1 Material: Forged Primary Gothic Plate Armor
	const primaryArmorMat = new THREE.MeshPhysicalMaterial({
		color: isWhite ? 0xd8d0c0 : 0x242d40,
		roughness: isWhite ? 0.34 : 0.28,
		metalness: isWhite ? 0.32 : 0.56,
		roughnessMap: filigreeTex,
		clearcoat: 0.58,
		clearcoatRoughness: 0.18,
		envMapIntensity: 0.76,
		emissive: new THREE.Color(isWhite ? 0xf59e0b : 0xf43f5e),
		emissiveMap: scarTex,
		emissiveIntensity: 0.0,
		bumpMap: scarTex,
		bumpScale: 0.0,
	});

	// Layer 2 Material: Gilded / Crimson Royal Filigree & Secondary Lames
	const secondaryTrimMat = new THREE.MeshPhysicalMaterial({
		color: isWhite ? 0xdfa32a : 0xe11d48,
		roughness: 0.2,
		metalness: 0.86,
		bumpMap: filigreeTex,
		bumpScale: 0.01,
		anisotropy: 0.72,
		envMapIntensity: 0.88,
	});

	// Layer 3 Material: Blued / Gunmetal Articulated Chassis & Plinth Steel
	const darkSteelMat = new THREE.MeshStandardMaterial({
		color: isWhite ? 0x475569 : 0x161d2b,
		roughness: 0.44,
		metalness: 0.72,
		bumpMap: filigreeTex,
		bumpScale: 0.008,
		envMapIntensity: 0.68,
	});

	// Layer 4 Material: Interlocking Chainmail Hauberk & Gusset Weave
	const chainmailMat = new THREE.MeshStandardMaterial({
		color: isWhite ? 0x64748b : 0x1e293b,
		roughness: 0.52,
		metalness: 0.82,
		bumpMap: chainmailTex,
		bumpScale: 0.018,
		roughnessMap: chainmailTex,
		envMapIntensity: 0.65,
	});

	// Layer 5 Material: Heavy Velvet / Brocade Heraldic Mantle & Tabard Fabric
	const capeFabricMat = new THREE.MeshPhysicalMaterial({
		color: isWhite ? 0x1d4ed8 : 0x7f1d1d,
		roughness: 0.76,
		metalness: 0.06,
		sheen: 0.72,
		sheenRoughness: 0.38,
		sheenColor: new THREE.Color(isWhite ? 0x60a5fa : 0xfb7185),
		side: THREE.DoubleSide,
		envMapIntensity: 0.42,
	});

	const energyAccentColor = isWhite ? 0x38bdf8 : 0xf43f5e;
	const energyMat = new THREE.MeshStandardMaterial({
		color: energyAccentColor,
		emissive: energyAccentColor,
		emissiveIntensity: 0.82,
		roughness: 0.16,
		metalness: 0.12,
	});

	const weaponGlowMeshes: THREE.Mesh[] = [];
	const allStandardMeshes: THREE.Mesh[] = [];

	const registerMesh = (m: THREE.Mesh) => {
		allStandardMeshes.push(m);
		return m;
	};

	// 0. Soft Contact Shadow Plane at Ground Level
	const shadowMesh = new THREE.Mesh(
		_contactShadowGeo,
		new THREE.MeshBasicMaterial({
			map: getContactShadowTexture(),
			transparent: true,
			depthWrite: false,
			opacity: 0.75,
		}),
	);
	shadowMesh.rotation.x = -Math.PI / 2;
	shadowMesh.position.y = 0.006;
	root.add(shadowMesh);

	// 1. Multi-Layered Staunton-Gothic Pedestal Base with 8 Sculpted Flying-Buttress Brackets
	const pedestal = registerMesh(new THREE.Mesh(_pedestalGeo, darkSteelMat));
	pedestal.castShadow = true;
	pedestal.receiveShadow = true;
	root.add(pedestal);

	const baseTrim = registerMesh(
		new THREE.Mesh(
			new THREE.TorusGeometry(0.395, 0.02, 14, 36),
			secondaryTrimMat,
		),
	);
	baseTrim.rotation.x = Math.PI / 2;
	baseTrim.position.y = 0.125;
	pedestal.add(baseTrim);

	const lowerRim = registerMesh(
		new THREE.Mesh(
			new THREE.TorusGeometry(0.438, 0.015, 12, 36),
			secondaryTrimMat,
		),
	);
	lowerRim.rotation.x = Math.PI / 2;
	lowerRim.position.y = 0.032;
	pedestal.add(lowerRim);

	// Recessed Glowing Runic Plinth Channel
	const plinthRuneRing = new THREE.Mesh(
		new THREE.TorusGeometry(0.358, 0.008, 8, 36),
		energyMat,
	);
	plinthRuneRing.rotation.x = Math.PI / 2;
	plinthRuneRing.position.y = 0.094;
	pedestal.add(plinthRuneRing);
	weaponGlowMeshes.push(plinthRuneRing);

	// 8 Sculpted Gothic Buttress Brackets around the Pedestal Crown
	for (let i = 0; i < 8; i++) {
		const a = (i / 8) * Math.PI * 2;
		const buttress = registerMesh(
			new THREE.Mesh(_pedestalButtressGeo, secondaryTrimMat),
		);
		buttress.position.set(Math.cos(a) * 0.355, 0.122, Math.sin(a) * 0.355);
		buttress.rotation.y = -a;
		pedestal.add(buttress);
	}

	// Tactical Selection Floor Ring
	const hpRingGeo = new THREE.RingGeometry(0.46, 0.52, 40);
	const hpRingMat = new THREE.MeshBasicMaterial({
		color: isWhite ? 0xf59e0b : 0xf43f5e,
		side: THREE.DoubleSide,
		transparent: true,
		opacity: 0.5,
		polygonOffset: true,
		polygonOffsetFactor: -1,
		polygonOffsetUnits: -1,
	});
	const hpRingMesh = new THREE.Mesh(hpRingGeo, hpRingMat);
	hpRingMesh.rotation.x = -Math.PI / 2;
	hpRingMesh.position.y = 0.016;
	root.add(hpRingMesh);

	const scaleConfig: Record<PieceType, { w: number; h: number }> = {
		p: { w: 0.86, h: 0.64 },
		n: { w: 0.98, h: 0.78 },
		b: { w: 0.92, h: 0.84 },
		r: { w: 1.26, h: 0.86 },
		q: { w: 1.04, h: 0.96 },
		k: { w: 1.16, h: 1.0 },
	};
	const { w: torsoW, h: torsoH } = scaleConfig[type];

	// ==========================================================================
	// 1B. ARTICULATED PELVIS, LAYERED FAULD SKIRT, CHAINMAIL HAUBERK & LEGS
	// ==========================================================================
	const pelvisGroup = new THREE.Group();
	pelvisGroup.position.y = 0.18;
	root.add(pelvisGroup);

	// Inner Layer: Dagged Chainmail Hauberk Skirt
	const mailSkirt = registerMesh(
		new THREE.Mesh(createChainmailSkirtGeometry(torsoW, torsoH), chainmailMat),
	);
	mailSkirt.position.y = torsoH * 0.02;
	pelvisGroup.add(mailSkirt);

	// Middle Layer: 3-Tiered Articulated Gothic Fauld Skirt
	const fauldSkirt = registerMesh(
		new THREE.Mesh(createFauldSkirtGeometry(torsoW, torsoH), primaryArmorMat),
	);
	fauldSkirt.position.y = torsoH * 0.04;
	pelvisGroup.add(fauldSkirt);

	// Outer Belt Layer: Gilded Knightly Cincture Belt & Sculpted Heraldic Buckle Clasp
	const cinctureBelt = registerMesh(
		new THREE.Mesh(
			new THREE.TorusGeometry(0.205 * torsoW, 0.024 * torsoW, 12, 32),
			secondaryTrimMat,
		),
	);
	cinctureBelt.rotation.x = Math.PI / 2;
	cinctureBelt.position.y = torsoH * 0.34;
	pelvisGroup.add(cinctureBelt);

	const beltBuckleGeo = createBeveledTassetGeometry(
		0.11 * torsoW,
		0.11 * torsoW,
	);
	const beltBuckle = registerMesh(
		new THREE.Mesh(beltBuckleGeo, secondaryTrimMat),
	);
	beltBuckle.position.set(0, torsoH * 0.34, 0.222 * torsoW);
	beltBuckle.rotation.z = Math.PI / 4;
	pelvisGroup.add(beltBuckle);

	// Multi-Layered Swallowtail Heraldic Loin Tabard (Front & Back) with Gold Bullion Border
	const tabardOuterGeo = createSwallowtailTabardGeometry(
		0.18 * torsoW,
		0.31 * torsoH,
	);
	const tabardInnerGeo = createSwallowtailTabardGeometry(
		0.145 * torsoW,
		0.28 * torsoH,
	);
	for (const dir of [-1, 1]) {
		const tabardBorder = registerMesh(
			new THREE.Mesh(tabardOuterGeo, secondaryTrimMat),
		);
		tabardBorder.position.set(0, torsoH * 0.175, dir * 0.232 * torsoW);
		tabardBorder.rotation.x = -dir * 0.14;
		if (dir < 0) tabardBorder.rotation.y = Math.PI;
		pelvisGroup.add(tabardBorder);

		const tabardCloth = registerMesh(
			new THREE.Mesh(tabardInnerGeo, capeFabricMat),
		);
		tabardCloth.position.set(0, 0.005, 0.008);
		tabardBorder.add(tabardCloth);
	}

	// 6 Two-Tiered Laminated Hip Tassets (Upper Fauld Lame + Lower Beveled Tuille Plate)
	const upperTassetGeo = createBeveledTassetGeometry(
		0.155 * torsoW,
		0.15 * torsoH,
	);
	const lowerTuilleGeo = createBeveledTassetGeometry(
		0.135 * torsoW,
		0.21 * torsoH,
	);
	for (let i = 0; i < 6; i++) {
		const angle = ((i + 0.5) / 6) * Math.PI * 2;
		const tassetHolder = new THREE.Group();
		tassetHolder.position.set(
			Math.sin(angle) * 0.242 * torsoW,
			torsoH * 0.22,
			Math.cos(angle) * 0.242 * torsoW,
		);
		tassetHolder.rotation.y = angle;
		tassetHolder.rotation.x = -0.22;

		const upperTasset = registerMesh(
			new THREE.Mesh(upperTassetGeo, secondaryTrimMat),
		);
		upperTasset.position.y = 0.045 * torsoH;
		tassetHolder.add(upperTasset);

		const lowerTuille = registerMesh(
			new THREE.Mesh(lowerTuilleGeo, primaryArmorMat),
		);
		lowerTuille.position.set(0, -0.035 * torsoH, 0.008);
		tassetHolder.add(lowerTuille);

		pelvisGroup.add(tassetHolder);
	}

	// Articulated Left & Right Armored Legs (Cuisse Thigh, Winged Poleyn Knee, Fluted Greave & Laminated Sabaton)
	const legLength = torsoH * 0.32;
	const cuisseGeo = createFlutedLimbGeometry(
		0.098 * torsoW,
		0.092 * torsoW,
		0.082 * torsoW,
		legLength * 0.52,
	);
	const greaveGeo = createFlutedLimbGeometry(
		0.088 * torsoW,
		0.078 * torsoW,
		0.066 * torsoW,
		legLength,
	);
	const poleynGeo = createWingedJointCopGeometry(
		0.125 * torsoW,
		0.135 * torsoW,
	);
	const sabatonGeo = createGothicSabatonGeometry(
		0.118 * torsoW,
		0.195 * torsoW,
	);
	const sabatonTrimGeo = createBeveledTassetGeometry(
		0.095 * torsoW,
		0.12 * torsoW,
	);

	const buildArmoredLeg = (side: -1 | 1): THREE.Group => {
		const legPivot = new THREE.Group();
		legPivot.position.set(side * 0.125 * torsoW, legLength, 0.02);

		// Layer 1: Upper Cuisse Thigh Plate over Chainmail Gusset
		const cuisse = registerMesh(new THREE.Mesh(cuisseGeo, darkSteelMat));
		cuisse.castShadow = true;
		legPivot.add(cuisse);

		// Layer 2: Fluted Anatomical Shin Greave
		const greave = registerMesh(new THREE.Mesh(greaveGeo, primaryArmorMat));
		greave.castShadow = true;
		legPivot.add(greave);

		// Layer 3: Winged Gothic Poleyn Knee Cop + Articulated Lower Knee Lame
		const poleyn = registerMesh(new THREE.Mesh(poleynGeo, secondaryTrimMat));
		poleyn.position.set(0, -legLength * 0.38, 0.086 * torsoW);
		poleyn.rotation.x = -0.14;
		legPivot.add(poleyn);

		// Layer 4: Laminated Gothic Sabaton Solleret with Gilded Instep Plate & Heel Spur
		const sabaton = registerMesh(new THREE.Mesh(sabatonGeo, darkSteelMat));
		sabaton.rotation.x = -Math.PI / 2 + 0.16;
		sabaton.position.set(0, -legLength + 0.028, 0.068 * torsoW);
		legPivot.add(sabaton);

		const sabatonInstep = registerMesh(
			new THREE.Mesh(sabatonTrimGeo, secondaryTrimMat),
		);
		sabatonInstep.rotation.x = -Math.PI / 2 + 0.24;
		sabatonInstep.position.set(0, -legLength + 0.045, 0.055 * torsoW);
		legPivot.add(sabatonInstep);

		pelvisGroup.add(legPivot);
		return legPivot;
	};

	const leftLegPivot = buildArmoredLeg(-1);
	const rightLegPivot = buildArmoredLeg(1);

	// ==========================================================================
	// 2. MULTI-LAYERED UPPER TORSO: UNDER-HAUBERK, CUIRASS, PLACKART & GORGET
	// ==========================================================================
	const bodyPivot = new THREE.Group();
	bodyPivot.position.y = 0.18;
	root.add(bodyPivot);

	// Layer 1: Anatomical Chainmail & Gambeson Under-Torso
	const torsoMesh = registerMesh(
		new THREE.Mesh(createTorsoGeometry(torsoW, torsoH), chainmailMat),
	);
	torsoMesh.castShadow = true;
	torsoMesh.receiveShadow = true;
	bodyPivot.add(torsoMesh);

	// Layer 2: Sculpted Convex Peascod Gothic Breastplate with Tapul Keel Ridge
	const breastplate = registerMesh(
		new THREE.Mesh(
			createSculptedCuirassGeometry(torsoW, torsoH),
			primaryArmorMat,
		),
	);
	breastplate.position.set(0, torsoH * 0.67, 0.215 * torsoW);
	breastplate.rotation.x = -0.07;
	breastplate.castShadow = true;
	bodyPivot.add(breastplate);

	// Layer 3: Overlapping Scalloped Lower Plackart Plate + Gilded Filigree Trim
	const plackart = registerMesh(
		new THREE.Mesh(
			createScallopedPlackartGeometry(torsoW, torsoH),
			primaryArmorMat,
		),
	);
	plackart.position.set(0, torsoH * 0.54, 0.238 * torsoW);
	plackart.rotation.x = -0.06;
	plackart.castShadow = true;
	bodyPivot.add(plackart);

	const plackartTrim = registerMesh(
		new THREE.Mesh(
			createScallopedPlackartGeometry(torsoW * 0.92, torsoH * 0.88),
			secondaryTrimMat,
		),
	);
	plackartTrim.position.set(0, torsoH * 0.68, 0.252 * torsoW);
	plackartTrim.rotation.x = -0.08;
	bodyPivot.add(plackartTrim);

	// Layer 4: Sculpted Dorsal Backplate & 5 Articulated Vertebral Spine Lames
	const backplate = registerMesh(
		new THREE.Mesh(
			createSculptedBackplateGeometry(torsoW, torsoH),
			primaryArmorMat,
		),
	);
	backplate.position.set(0, torsoH * 0.66, -0.205 * torsoW);
	backplate.rotation.y = Math.PI;
	backplate.rotation.x = 0.06;
	bodyPivot.add(backplate);

	const vertebraGeo = createSpineVertebraGeometry(torsoW);
	for (let s = 0; s < 5; s++) {
		const spineNode = registerMesh(
			new THREE.Mesh(vertebraGeo, secondaryTrimMat),
		);
		spineNode.position.set(0, torsoH * (0.42 + s * 0.105), -0.238 * torsoW);
		spineNode.rotation.x = 0.18;
		bodyPivot.add(spineNode);
	}

	// Layer 5: Multi-Part Recessed Soul-Gem Reliquary Housing & Beating Heart Core
	const gemRosette = registerMesh(
		new THREE.Mesh(
			createBeveledTassetGeometry(0.155 * torsoW, 0.155 * torsoW),
			darkSteelMat,
		),
	);
	gemRosette.position.set(0, torsoH * 0.71, 0.268 * torsoW);
	gemRosette.rotation.z = Math.PI / 4;
	bodyPivot.add(gemRosette);

	const gemCrownRim = registerMesh(
		new THREE.Mesh(
			new THREE.TorusGeometry(0.066, 0.012, 10, 24),
			secondaryTrimMat,
		),
	);
	gemCrownRim.position.set(0, torsoH * 0.71, 0.278 * torsoW);
	bodyPivot.add(gemCrownRim);

	const coreGem = new THREE.Mesh(
		new THREE.IcosahedronGeometry(0.064, 0),
		energyMat,
	);
	coreGem.position.set(0, torsoH * 0.71, 0.284 * torsoW);
	bodyPivot.add(coreGem);
	weaponGlowMeshes.push(coreGem);

	// Layer 6: Stepped 3-Lame Articulated Gorget Collar around Neck
	const gorget = registerMesh(
		new THREE.Mesh(createLayeredGorgetGeometry(torsoW), secondaryTrimMat),
	);
	gorget.position.set(0, torsoH * 0.92, 0.01);
	gorget.rotation.x = 0.12;
	bodyPivot.add(gorget);

	// Layer 7: Archetype-Specific Torso & Shoulder Regalia Overlays!
	if (type === "n") {
		// Knight: Asymmetric Jousting Grand-Garde Baffle Plate on Left Chest + Lance-Rest Hook on Right
		const grandGarde = registerMesh(
			new THREE.Mesh(
				createHeaterShieldGeometry(0.18 * torsoW, 0.24 * torsoH),
				secondaryTrimMat,
			),
		);
		grandGarde.position.set(-0.11 * torsoW, torsoH * 0.76, 0.265 * torsoW);
		grandGarde.rotation.y = 0.28;
		grandGarde.rotation.x = -0.12;
		bodyPivot.add(grandGarde);

		const lanceRest = registerMesh(
			new THREE.Mesh(createPedestalButtressGeometry(), secondaryTrimMat),
		);
		lanceRest.position.set(0.145 * torsoW, torsoH * 0.66, 0.265 * torsoW);
		lanceRest.rotation.y = Math.PI / 2;
		bodyPivot.add(lanceRest);
	} else if (type === "b") {
		// Bishop: Ecclesiastical Liturgical Stole & Pectoral Reliquary Cross Draping Over Cuirass
		const stoleGeo = createSwallowtailTabardGeometry(
			0.068 * torsoW,
			0.42 * torsoH,
		);
		for (const side of [-1, 1]) {
			const stoleBand = registerMesh(
				new THREE.Mesh(stoleGeo, secondaryTrimMat),
			);
			stoleBand.position.set(
				side * 0.115 * torsoW,
				torsoH * 0.62,
				0.262 * torsoW,
			);
			stoleBand.rotation.x = -0.09;
			stoleBand.rotation.z = -side * 0.08;
			bodyPivot.add(stoleBand);
		}
	} else if (type === "r") {
		// Rook: Heavy Siege-Bevor Fortress Chin-and-Throat Rampart Plate rising from Chest
		const siegeBevor = registerMesh(
			new THREE.Mesh(
				createSculptedVentailGeometry(0.28 * torsoW, 0.18 * torsoH),
				secondaryTrimMat,
			),
		);
		siegeBevor.position.set(0, torsoH * 0.96, 0.195 * torsoW);
		siegeBevor.rotation.x = -0.15;
		bodyPivot.add(siegeBevor);
	} else if (type === "q") {
		// Queen: Swept Valkyrie Feather-Wing Aegis Collar rising behind the Shoulders
		const collarWingGeo = createCrescentAxeGeometry(
			0.22 * torsoW,
			0.34 * torsoH,
		);
		for (const side of [-1, 1]) {
			const collarWing = registerMesh(
				new THREE.Mesh(collarWingGeo, secondaryTrimMat),
			);
			collarWing.position.set(
				side * 0.22 * torsoW,
				torsoH * 0.98,
				-0.12 * torsoW,
			);
			collarWing.rotation.y = side * 0.35 + Math.PI * 0.5;
			collarWing.rotation.z = -side * 0.42;
			bodyPivot.add(collarWing);
		}
	} else if (type === "k") {
		// King: Sovereign Collar of State (Catenary Chain of Jewelled Medallions across the Pectorals)
		for (let m = -3; m <= 3; m++) {
			const t = m / 3;
			const med = registerMesh(
				new THREE.Mesh(
					createBeveledTassetGeometry(0.048 * torsoW, 0.048 * torsoW),
					secondaryTrimMat,
				),
			);
			med.position.set(
				t * 0.21 * torsoW,
				torsoH * (0.86 - (1 - t * t) * 0.12),
				(0.24 + (1 - t * t) * 0.045) * torsoW,
			);
			med.rotation.z = Math.PI / 4;
			bodyPivot.add(med);
		}
	}

	// ==========================================================================
	// 2B. DUAL-LAYER BATTLE CLOAK, SHOULDER PELERINE MANTLE & AGRAFFE CLASPS
	// ==========================================================================
	const capePivot = new THREE.Group();
	capePivot.position.set(0, torsoH * 0.9, -0.19 * torsoW);
	bodyPivot.add(capePivot);

	const capeGeo = new THREE.PlaneGeometry(0.58 * torsoW, torsoH * 0.98, 12, 12);
	const posAttr = capeGeo.attributes.position;
	for (let i = 0; i < posAttr.count; i++) {
		const py = posAttr.getY(i);
		const px = posAttr.getX(i);
		const normY = 0.5 - py / (torsoH * 0.98); // 0 at top shoulder, 1 at bottom hem
		const flareX = px * (1.0 + normY * 0.38);
		const pleatWave = Math.cos(px * 28.0) * 0.022 * normY;
		const scallopHem =
			py < -torsoH * 0.42 ? Math.abs(Math.cos(px * 18.0)) * 0.028 : 0;
		posAttr.setXYZ(
			i,
			flareX,
			py + scallopHem,
			-((py - torsoH * 0.46) ** 2) * 0.19 - Math.abs(px) * 0.12 + pleatWave,
		);
	}
	capeGeo.computeVertexNormals();
	const capeMesh = registerMesh(new THREE.Mesh(capeGeo, capeFabricMat));
	capeMesh.position.set(0, -torsoH * 0.45, -0.04);
	capeMesh.rotation.x = 0.15;
	capeMesh.castShadow = true;
	capePivot.add(capeMesh);

	// Upper Shoulder Mantle (Pelerine) & Gilded Hem Trim Layer over the Cloak
	const pelerineGeo = createSwallowtailTabardGeometry(
		0.46 * torsoW,
		0.34 * torsoH,
	);
	const pelerineMesh = registerMesh(
		new THREE.Mesh(pelerineGeo, secondaryTrimMat),
	);
	pelerineMesh.position.set(0, -torsoH * 0.14, -0.045);
	pelerineMesh.rotation.x = 0.24;
	pelerineMesh.rotation.y = Math.PI;
	capePivot.add(pelerineMesh);

	// Ornate Rosette Cloak Clasps (Agraffes) & Catenary Breast-Chain
	const agraffeGeo = createBeveledTassetGeometry(
		0.075 * torsoW,
		0.075 * torsoW,
	);
	for (const side of [-1, 1]) {
		const clasp = registerMesh(new THREE.Mesh(agraffeGeo, secondaryTrimMat));
		clasp.position.set(side * 0.18 * torsoW, torsoH * 0.9, 0.165 * torsoW);
		clasp.rotation.z = Math.PI / 4;
		clasp.rotation.y = side * 0.32;
		bodyPivot.add(clasp);
	}

	// ==========================================================================
	// 2C. MULTI-TIERED SCULPTED GOTHIC PAULDRONS (3 LAMES + HAUTE-PIECE FIN)
	// ==========================================================================
	const mainPauldronGeo = createSculptedPauldronGeometry(torsoW, type === "r");

	const lameGeo = new THREE.CylinderGeometry(
		0.148 * torsoW,
		0.168 * torsoW,
		0.055,
		20,
		1,
		true,
		-Math.PI * 0.46,
		Math.PI * 0.92,
	);
	const hauteBladeGeo = createBeveledTassetGeometry(
		0.052 * torsoW,
		0.175 * torsoW,
	);

	const pauldronMeshes: THREE.Mesh[] = [];
	for (const side of [-1, 1]) {
		const pauldron = registerMesh(
			new THREE.Mesh(mainPauldronGeo, primaryArmorMat),
		);
		pauldron.position.set(side * (0.295 * torsoW), torsoH * 0.86, 0);
		pauldron.rotation.z = -side * 0.34;
		pauldron.castShadow = true;
		pauldron.userData = {
			baseX: side * (0.295 * torsoW),
			baseY: torsoH * 0.86,
			baseRotZ: -side * 0.34,
			side,
		};

		// Raised Gilded Pauldron Trim Arch
		const trimArch = registerMesh(
			new THREE.Mesh(
				new THREE.TorusGeometry(0.152 * torsoW, 0.016, 10, 24, Math.PI * 1.18),
				secondaryTrimMat,
			),
		);
		trimArch.rotation.y = side * Math.PI * 0.5;
		trimArch.position.y = -0.02;
		pauldron.add(trimArch);

		// 3 Overlapping Articulated Lower Spaulder Lames
		for (let l = 1; l <= 3; l++) {
			const lame = registerMesh(
				new THREE.Mesh(
					lameGeo,
					l % 2 === 1 ? secondaryTrimMat : primaryArmorMat,
				),
			);
			lame.scale.setScalar(1.0 - (l - 1) * 0.08);
			lame.rotation.y = side > 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
			lame.position.set(side * 0.018 * l, -0.048 * l, 0);
			pauldron.add(lame);
		}

		// Upright Haute-Piece Sword-Breaker Fin on top of Pauldron
		const hauteFin = registerMesh(
			new THREE.Mesh(hauteBladeGeo, secondaryTrimMat),
		);
		hauteFin.rotation.y = Math.PI / 2;
		hauteFin.position.set(-side * 0.06 * torsoW, 0.135 * torsoW, 0);
		pauldron.add(hauteFin);

		bodyPivot.add(pauldron);
		pauldronMeshes.push(pauldron);
	}

	// Diegetic 3D Soul-Crown Vitality Halo behind the warrior's shoulders/helm
	const vitalityHaloUniforms = {
		uTime: { value: 0 },
		uHpRatio: { value: 1.0 },
		uRecoverableRatio: { value: 1.0 },
		uGuardRatio: { value: 1.0 },
		uSpecialReady: { value: 0.0 },
	};
	const vitalityHaloMat = new THREE.ShaderMaterial({
		uniforms: vitalityHaloUniforms,
		transparent: true,
		depthWrite: false,
		side: THREE.DoubleSide,
		blending: THREE.AdditiveBlending,
		vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vPos;
      void main() {
        vUv = uv;
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
		fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uHpRatio;
      uniform float uRecoverableRatio;
      uniform float uGuardRatio;
      uniform float uSpecialReady;
      varying vec2 vUv;
      varying vec3 vPos;

      void main() {
        float safeY = (abs(vPos.x) + abs(vPos.y)) < 0.0001 ? 0.001 : vPos.y;
        float angle01 = fract((atan(vPos.x, safeY) + 3.14159265) / 6.2831853);

        // 12 carved runic segments around the halo
        float segGap = smoothstep(0.06, 0.14, abs(fract(angle01 * 12.0) - 0.5));

        vec3 healthyCol = mix(vec3(0.22, 0.74, 0.98), vec3(0.98, 0.78, 0.22), clamp(uSpecialReady, 0.0, 1.0) * 0.8 + 0.35);
        vec3 woundedCol = vec3(0.96, 0.52, 0.12);
        vec3 criticalCol = vec3(0.96, 0.16, 0.28);

        float hp = clamp(uHpRatio, 0.0, 1.0);
        float rec = clamp(uRecoverableRatio, 0.0, 1.0);

        vec3 vitCol = hp > 0.65
          ? healthyCol
          : hp > 0.30
          ? mix(woundedCol, healthyCol, clamp((hp - 0.30) / 0.35, 0.0, 1.0))
          : criticalCol;

        float heartbeat = hp < 0.30 ? (0.45 + 0.55 * abs(sin(uTime * 11.0))) : 1.0;

        float inHpArc = step(angle01, hp);
        float inRecArc = step(angle01, rec) * (1.0 - inHpArc);

        vec3 col = vitCol * inHpArc * heartbeat + vec3(0.75, 0.15, 0.25) * inRecArc * 0.45;
        float alpha = (inHpArc * 0.88 + inRecArc * 0.32) * segGap;

        if (uSpecialReady > 0.5) {
          float flare = 0.6 + 0.4 * sin(uTime * 14.0 + angle01 * 25.13);
          col = mix(col, vec3(1.0, 0.88, 0.32), 0.45 * flare);
          alpha = max(alpha, 0.35 * flare * segGap);
        }

        alpha = clamp(alpha, 0.0, 0.95);
        gl_FragColor = vec4(clamp(col, vec3(0.0), vec3(1.5)), alpha);
      }
    `,
	});

	const vitalityHaloMesh = new THREE.Mesh(
		new THREE.RingGeometry(0.28 * torsoW, 0.36 * torsoW, 48),
		vitalityHaloMat,
	);
	vitalityHaloMesh.position.set(0, torsoH * 0.92, -0.14 * torsoW);
	bodyPivot.add(vitalityHaloMesh);

	// ==========================================================================
	// 3. SCULPTED CLOSE-HELM / ARMET & EXPRESSIVE EYE-TRACKING FOCUS
	// (Preserves exact eye coordinates at y=0.15 inside headGroup for Sergio Leone Crash-Zooms!)
	// ==========================================================================
	const headGroup = new THREE.Group();
	headGroup.position.set(0, torsoH + 0.04, 0);
	bodyPivot.add(headGroup);

	// Surprise Exclamation Badge "!"
	const surpriseGroup = new THREE.Group();
	surpriseGroup.position.set(0, 0.72, 0);
	surpriseGroup.visible = false;
	headGroup.add(surpriseGroup);

	const exclMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
	const exclBar = new THREE.Mesh(
		createSculptedBladeGeometry(0.055, 0.16, 0.018),
		exclMat,
	);
	exclBar.rotation.z = Math.PI;
	exclBar.position.y = 0.18;
	const exclDot = new THREE.Mesh(
		new THREE.OctahedronGeometry(0.036, 1),
		exclMat,
	);
	exclDot.position.y = -0.04;
	surpriseGroup.add(exclBar, exclDot);

	// 4D Tesseract Wireframe Badge above piece when shifted in 4D (W or Z axis)
	const tessGeo = new THREE.EdgesGeometry(
		new THREE.BoxGeometry(0.28, 0.28, 0.28),
	);
	const tessMat = new THREE.LineBasicMaterial({
		color: 0xa855f7,
		transparent: true,
		opacity: 0.9,
	});
	const tesseractBadge = new THREE.LineSegments(tessGeo, tessMat);
	tesseractBadge.position.set(0, 0.68, 0);
	tesseractBadge.visible = false;
	headGroup.add(tesseractBadge);

	// Layer 1: Sculpted Armet Cranial Bowl with Sagittal Comb Ridge & Occipital Sweep
	const helmRadius = 0.162 * Math.min(1.1, torsoW);
	const helmMesh = registerMesh(
		new THREE.Mesh(createHelmSkullGeometry(helmRadius), primaryArmorMat),
	);
	helmMesh.position.y = 0.145;
	helmMesh.castShadow = true;
	headGroup.add(helmMesh);

	// Layer 2: Articulated Cheek-Plates & Temple Visor Pivot Rosettes
	const cheekPlateGeo = createBeveledTassetGeometry(0.118, 0.138);
	for (const side of [-1, 1]) {
		const cheekPlate = registerMesh(
			new THREE.Mesh(cheekPlateGeo, primaryArmorMat),
		);
		cheekPlate.position.set(side * 0.108, 0.095, 0.098);
		cheekPlate.rotation.y = side * 0.58;
		cheekPlate.rotation.x = 0.14;
		headGroup.add(cheekPlate);

		// Temple Visor Hinge Rosette Stud
		const hingeRosette = registerMesh(
			new THREE.Mesh(
				new THREE.TorusGeometry(0.022, 0.007, 8, 16),
				secondaryTrimMat,
			),
		);
		hingeRosette.rotation.y = Math.PI / 2;
		hingeRosette.position.set(side * 0.148, 0.145, 0.045);
		headGroup.add(hingeRosette);
	}

	// Layer 3: Sculpted Pointed Bellows-Ventail Faceguard & Lower Bevor Chin Plate
	const ventailGuard = registerMesh(
		new THREE.Mesh(
			createSculptedVentailGeometry(0.195, 0.118),
			primaryArmorMat,
		),
	);
	ventailGuard.position.set(0, 0.072, 0.148);
	ventailGuard.rotation.x = 0.22;
	headGroup.add(ventailGuard);

	const ventailTrim = registerMesh(
		new THREE.Mesh(
			createSculptedBrowPlateGeometry(0.188, 0.036),
			secondaryTrimMat,
		),
	);
	ventailTrim.position.set(0, 0.118, 0.168);
	ventailTrim.rotation.x = 0.12;
	headGroup.add(ventailTrim);

	// Layer 4: Curved Shadowed Occularium Vault, Central Nasal Bridge & Heavy Scowling Brow Plate
	const visorRecessMat = new THREE.MeshBasicMaterial({ color: 0x030509 });
	const visorRecess = new THREE.Mesh(
		createVisorVaultGeometry(),
		visorRecessMat,
	);
	visorRecess.position.set(0, 0.15, 0.032);
	headGroup.add(visorRecess);

	// Vertical Armored Nasal Bridge Divider between the Eyes
	const nasalBridge = registerMesh(
		new THREE.Mesh(createBeveledTassetGeometry(0.024, 0.075), secondaryTrimMat),
	);
	nasalBridge.position.set(0, 0.152, 0.174);
	headGroup.add(nasalBridge);

	const browRidge = registerMesh(
		new THREE.Mesh(
			createSculptedBrowPlateGeometry(0.245, 0.048),
			secondaryTrimMat,
		),
	);
	browRidge.position.set(0, 0.186, 0.168);
	browRidge.rotation.x = 0.24;
	headGroup.add(browRidge);

	// Layer 5: Expressive Multi-Layered Ocular & Iris Eye-Tracking Rig inside the Occularium
	const eyeScleraMat = new THREE.MeshBasicMaterial({
		color: isWhite ? 0x38bdf8 : 0xf43f5e,
	});
	const eyeIrisMat = new THREE.MeshBasicMaterial({
		color: isWhite ? 0xbae6fd : 0xfda4af,
	});
	const eyePupilMat = new THREE.MeshBasicMaterial({
		color: isWhite ? 0xfef08a : 0xffffff,
	});
	const ocularSlitGeo = createOcularSlitGeometry(0.064, 0.025);
	const lidBladeGeo = createBeveledTassetGeometry(0.068, 0.016);

	const buildExpressiveEye = (side: -1 | 1) => {
		const eyeGroup = new THREE.Group();
		eyeGroup.position.set(side * 0.052, 0.15, 0.166);
		if (side < 0) {
			eyeGroup.scale.x = -1; // Mirror almond eye geometry symmetrically across the nasal bridge
		}
		eyeGroup.rotation.z = -side * 0.14; // Fierce narrowed warrior glare
		headGroup.add(eyeGroup);

		// Glowing Sclera / Ocular Slit Base
		const scleraMesh = new THREE.Mesh(ocularSlitGeo, eyeScleraMat);
		eyeGroup.add(scleraMesh);

		// Trackable Iris & Vertical Slit-Pupil Assembly (shifts dynamically to track opponent/camera!)
		const pupilPivot = new THREE.Group();
		pupilPivot.position.set(0, 0, 0.006);
		eyeGroup.add(pupilPivot);

		const irisDisc = new THREE.Mesh(
			new THREE.RingGeometry(0.0045, 0.0115, 16),
			eyeIrisMat,
		);
		pupilPivot.add(irisDisc);

		const pupilCore = new THREE.Mesh(
			new THREE.OctahedronGeometry(0.0075, 0),
			eyePupilMat,
		);
		pupilCore.scale.set(0.65, 1.35, 0.5); // Fierce vertical diamond pupil
		pupilCore.position.z = 0.002;
		pupilPivot.add(pupilCore);

		// Micro Corneal Specular Catchlight Pinpoint (brings the eyes to life in extreme close-ups!)
		const catchlight = new THREE.Mesh(
			new THREE.CircleGeometry(0.0028, 8),
			new THREE.MeshBasicMaterial({ color: 0xffffff }),
		);
		catchlight.position.set(0.0035, 0.0035, 0.005);
		pupilPivot.add(catchlight);

		// Upper Armored Eyelid Shutter (narrows during intense focus / crash-zooms)
		const upperLid = registerMesh(new THREE.Mesh(lidBladeGeo, darkSteelMat));
		upperLid.position.set(0, 0.013, 0.004);
		upperLid.rotation.z = 0.08;
		eyeGroup.add(upperLid);

		return { eyeGroup, pupilPivot, upperLid };
	};

	const leftEye = buildExpressiveEye(-1);
	const rightEye = buildExpressiveEye(1);

	// Subtle Glowing Lower Visor Breath-Seam Accent
	const visorMesh = new THREE.Mesh(
		createSculptedBrowPlateGeometry(0.18, 0.012),
		energyMat,
	);
	visorMesh.position.set(0, 0.122, 0.158);
	headGroup.add(visorMesh);
	weaponGlowMeshes.push(visorMesh);

	// ==========================================================================
	// 3B. ARCHETYPE-SPECIFIC SCULPTED HELM CRESTS, CROWNS, MITRES & BATTLEMENTS
	// ==========================================================================
	if (type === "p") {
		// Pawn (Vanguard Squire): Dual-Layer Swept Gothic Sallet Fin Crest, Forehead Circlet & 3-Lame Lobster-Tail Nape Guard
		const finShape = new THREE.Shape();
		finShape.moveTo(-0.15, 0);
		finShape.quadraticCurveTo(-0.04, 0.21, 0.135, 0.09);
		finShape.quadraticCurveTo(0.03, 0.015, -0.15, 0);
		const finGeo = new THREE.ExtrudeGeometry(finShape, {
			steps: 1,
			depth: 0.022,
			bevelEnabled: true,
			bevelThickness: 0.009,
			bevelSize: 0.008,
			bevelSegments: 2,
		});
		finGeo.center();
		const salletCrest = registerMesh(new THREE.Mesh(finGeo, secondaryTrimMat));
		salletCrest.rotation.y = Math.PI / 2;
		salletCrest.position.set(0, 0.315, -0.01);
		headGroup.add(salletCrest);

		const foreheadCirclet = registerMesh(
			new THREE.Mesh(
				createSculptedBrowPlateGeometry(0.22, 0.035),
				secondaryTrimMat,
			),
		);
		foreheadCirclet.position.set(0, 0.235, 0.145);
		headGroup.add(foreheadCirclet);

		// 3 Overlapping Articulated Lobster-Tail Nape Lames
		for (let l = 0; l < 3; l++) {
			const neckTail = registerMesh(
				new THREE.Mesh(
					createBeveledTassetGeometry(0.175 + l * 0.015, 0.085),
					l === 1 ? secondaryTrimMat : darkSteelMat,
				),
			);
			neckTail.position.set(0, 0.095 - l * 0.032, -0.135 - l * 0.018);
			neckTail.rotation.x = -0.42 - l * 0.12;
			headGroup.add(neckTail);
		}
	} else if (type === "n") {
		// Knight (Tempest Lancer): Sculpted Warhorse Chamfron Faceplate, Swept Valkyrie Horns & 7-Plate Flowing Mane
		const crinetShape = new THREE.Shape();
		crinetShape.moveTo(0, 0);
		crinetShape.lineTo(0.082, 0.12);
		crinetShape.lineTo(0.052, 0.29);
		crinetShape.lineTo(0, 0.36);
		crinetShape.lineTo(-0.052, 0.29);
		crinetShape.lineTo(-0.082, 0.12);
		crinetShape.closePath();
		const crinetGeo = new THREE.ExtrudeGeometry(crinetShape, {
			steps: 1,
			depth: 0.032,
			bevelEnabled: true,
			bevelThickness: 0.014,
			bevelSize: 0.012,
			bevelSegments: 2,
		});
		crinetGeo.center();
		const snoutPlate = registerMesh(
			new THREE.Mesh(crinetGeo, secondaryTrimMat),
		);
		snoutPlate.rotation.x = Math.PI * 0.34;
		snoutPlate.position.set(0, 0.225, 0.145);
		headGroup.add(snoutPlate);

		// Swept Valkyrie / Warhorse Ear Horns + Inner Energy Blades
		const hornGeo = createSculptedBladeGeometry(0.052, 0.26, 0.014);
		for (const side of [-1, 1]) {
			const earHorn = registerMesh(new THREE.Mesh(hornGeo, secondaryTrimMat));
			earHorn.position.set(side * 0.12, 0.22, -0.02);
			earHorn.rotation.x = -0.48;
			earHorn.rotation.z = -side * 0.28;
			headGroup.add(earHorn);
		}

		// 7 Articulated Flowing Metallic Mane Plates Arching down the Back of the Helm
		for (let m = 0; m < 7; m++) {
			const manePlate = registerMesh(
				new THREE.Mesh(
					createSculptedBladeGeometry(0.058, 0.165, 0.012),
					m % 2 === 0 ? secondaryTrimMat : primaryArmorMat,
				),
			);
			manePlate.rotation.y = Math.PI / 2;
			manePlate.rotation.z = 0.38 + m * 0.16;
			manePlate.position.set(
				0,
				0.32 - m * 0.044,
				-0.075 - Math.sin(m * 0.48) * 0.095,
			);
			headGroup.add(manePlate);
		}
	} else if (type === "b") {
		// Bishop (Arcane Inquisitor): Twin-Peak Gothic Cathedral Mitre with Lancet Inlays, Trailing Infulae & Astrolabe Halo
		const mitreShape = new THREE.Shape();
		mitreShape.moveTo(0, 0.36);
		mitreShape.quadraticCurveTo(0.142, 0.19, 0.115, 0.0);
		mitreShape.lineTo(-0.115, 0.0);
		mitreShape.quadraticCurveTo(-0.142, 0.19, 0, 0.36);
		const mitreGeo = new THREE.ExtrudeGeometry(mitreShape, {
			steps: 1,
			depth: 0.062,
			bevelEnabled: true,
			bevelThickness: 0.018,
			bevelSize: 0.014,
			bevelSegments: 3,
		});
		mitreGeo.center();

		const frontMitre = registerMesh(new THREE.Mesh(mitreGeo, primaryArmorMat));
		frontMitre.position.set(0, 0.325, 0.032);
		frontMitre.rotation.x = -0.08;
		headGroup.add(frontMitre);

		// Gilded Cross-Orphrey Band on Front Mitre
		const mitreCrossV = registerMesh(
			new THREE.Mesh(
				createBeveledTassetGeometry(0.038, 0.28),
				secondaryTrimMat,
			),
		);
		mitreCrossV.position.set(0, 0.02, 0.042);
		frontMitre.add(mitreCrossV);

		const mitreGem = new THREE.Mesh(
			new THREE.OctahedronGeometry(0.032, 0),
			energyMat,
		);
		mitreGem.position.set(0, 0.04, 0.052);
		frontMitre.add(mitreGem);
		weaponGlowMeshes.push(mitreGem);

		const backMitre = registerMesh(new THREE.Mesh(mitreGeo, secondaryTrimMat));
		backMitre.position.set(0, 0.315, -0.045);
		backMitre.rotation.x = 0.12;
		headGroup.add(backMitre);

		// Astrolabe Nimbus Halo with 4 Cardinal Rays
		const halo = new THREE.Mesh(
			new THREE.TorusGeometry(0.245, 0.015, 12, 36),
			energyMat,
		);
		halo.position.set(0, 0.3, -0.115);
		headGroup.add(halo);
		weaponGlowMeshes.push(halo);

		const rayGeo = createSculptedBladeGeometry(0.032, 0.095, 0.008);
		for (let r = 0; r < 4; r++) {
			const ray = registerMesh(new THREE.Mesh(rayGeo, secondaryTrimMat));
			const a = (r / 4) * Math.PI * 2;
			ray.position.set(Math.cos(a) * 0.245, Math.sin(a) * 0.245, 0);
			ray.rotation.z = a - Math.PI / 2;
			halo.add(ray);
		}
	} else if (type === "r") {
		// Rook (Citadel Bastion): Castellan Battlement Crown with 8 Beveled Machicolated Merlons & Inner Forge Glow
		const crownBand = registerMesh(
			new THREE.Mesh(createLayeredGorgetGeometry(1.05), secondaryTrimMat),
		);
		crownBand.scale.set(0.95, 1.25, 0.95);
		crownBand.position.y = 0.22;
		headGroup.add(crownBand);

		const merlonGeo = createBeveledTassetGeometry(0.062, 0.105);
		for (let i = 0; i < 8; i++) {
			const angle = (i / 8) * Math.PI * 2;
			const merlon = registerMesh(new THREE.Mesh(merlonGeo, secondaryTrimMat));
			merlon.position.set(
				Math.cos(angle) * 0.178,
				0.34,
				Math.sin(angle) * 0.178,
			);
			merlon.rotation.y = -angle + Math.PI / 2;
			merlon.rotation.x = -0.08;
			headGroup.add(merlon);
		}

		const citadelCore = new THREE.Mesh(
			new THREE.TorusGeometry(0.145, 0.014, 10, 24),
			energyMat,
		);
		citadelCore.rotation.x = Math.PI / 2;
		citadelCore.position.y = 0.31;
		headGroup.add(citadelCore);
		weaponGlowMeshes.push(citadelCore);
	} else if (type === "q") {
		// Queen (Sovereign Valkyrie): 9-Spire Sculpted Diadem + Multi-Layered Feathered Valkyrie Pinion Helm Wings
		const diademBand = registerMesh(
			new THREE.Mesh(
				new THREE.TorusGeometry(0.156, 0.019, 12, 32),
				secondaryTrimMat,
			),
		);
		diademBand.rotation.x = Math.PI / 2;
		diademBand.position.y = 0.255;
		headGroup.add(diademBand);

		const spireGeo = createSculptedBladeGeometry(0.038, 0.175, 0.009);
		for (let i = 0; i < 9; i++) {
			const angle = ((i - 4) / 9) * Math.PI * 1.45 + Math.PI * 0.5;
			const spire = registerMesh(new THREE.Mesh(spireGeo, secondaryTrimMat));
			const hScale = 1.08 - Math.abs(i - 4) * 0.14;
			spire.scale.set(1, hScale, 1);
			spire.position.set(
				Math.cos(angle) * 0.154,
				0.25,
				Math.sin(angle) * 0.154,
			);
			spire.rotation.y = -angle + Math.PI / 2;
			spire.rotation.x = -0.22;
			headGroup.add(spire);
		}

		// 3-Feather Layered Valkyrie Pinion Wings on each side of the Helm
		const wingMainGeo = createCrescentAxeGeometry(0.17, 0.28);
		const wingSubGeo = createSculptedBladeGeometry(0.042, 0.24, 0.01);
		for (const side of [-1, 1]) {
			const wingGroup = new THREE.Group();
			wingGroup.position.set(side * 0.165, 0.23, -0.02);
			wingGroup.rotation.y = side * 0.24 + Math.PI / 2;
			wingGroup.rotation.x = -0.34;

			const mainWing = registerMesh(
				new THREE.Mesh(wingMainGeo, secondaryTrimMat),
			);
			wingGroup.add(mainWing);

			for (let f = 0; f < 3; f++) {
				const pinion = registerMesh(
					new THREE.Mesh(wingSubGeo, f === 1 ? energyMat : primaryArmorMat),
				);
				pinion.position.set(0.02 + f * 0.035, -0.04 + f * 0.03, side * 0.012);
				pinion.rotation.z = -0.55 - f * 0.22;
				wingGroup.add(pinion);
				if (f === 1) weaponGlowMeshes.push(pinion);
			}

			headGroup.add(wingGroup);
		}
	} else if (type === "k") {
		// King (Eternal Monarch): Imperial Sovereign Crown with 8 Gothic Trefoil Spires, Quadruple Arches & Sculpted Globus Cruciger
		const crownBase = registerMesh(
			new THREE.Mesh(createLayeredGorgetGeometry(1.02), secondaryTrimMat),
		);
		crownBase.scale.set(0.92, 1.15, 0.92);
		crownBase.position.y = 0.225;
		headGroup.add(crownBase);

		const pointGeo = createSculptedBladeGeometry(0.048, 0.145, 0.012);
		for (let i = 0; i < 8; i++) {
			const angle = (i / 8) * Math.PI * 2;
			const spire = registerMesh(new THREE.Mesh(pointGeo, secondaryTrimMat));
			spire.position.set(
				Math.cos(angle) * 0.168,
				0.285,
				Math.sin(angle) * 0.168,
			);
			spire.rotation.y = -angle + Math.PI / 2;
			spire.rotation.x = -0.14;
			headGroup.add(spire);
		}

		// Crossed Sovereign Crown Arches
		for (let a = 0; a < 2; a++) {
			const arch = registerMesh(
				new THREE.Mesh(
					new THREE.TorusGeometry(0.158, 0.015, 10, 28, Math.PI),
					secondaryTrimMat,
				),
			);
			arch.rotation.y = (a * Math.PI) / 2;
			arch.position.y = 0.31;
			headGroup.add(arch);
		}

		const orb = new THREE.Mesh(
			new THREE.IcosahedronGeometry(0.048, 1),
			energyMat,
		);
		orb.position.y = 0.485;
		const orbBand = registerMesh(
			new THREE.Mesh(
				new THREE.TorusGeometry(0.052, 0.008, 8, 20),
				secondaryTrimMat,
			),
		);
		orbBand.position.y = 0.485;

		// Sculpted Cross Pattee Finial (replaces raw BoxGeometry cross!)
		const crossV = registerMesh(
			new THREE.Mesh(
				createBeveledTassetGeometry(0.036, 0.14),
				secondaryTrimMat,
			),
		);
		crossV.position.y = 0.575;
		const crossH = registerMesh(
			new THREE.Mesh(
				createBeveledTassetGeometry(0.11, 0.036),
				secondaryTrimMat,
			),
		);
		crossH.position.y = 0.58;
		headGroup.add(orb, orbBand, crossV, crossH);
		weaponGlowMeshes.push(orb);
	}

	// ==========================================================================
	// 4. TWO-JOINT RIGHT ARM (REREBRACE -> WINGED COUTER -> VAMBRACE -> FINGERED GAUNTLET -> WEAPON)
	// ==========================================================================
	const rightArmPivot = new THREE.Group();
	rightArmPivot.position.set(0.31 * torsoW, torsoH * 0.83, 0);
	bodyPivot.add(rightArmPivot);

	const upperArmLen = 0.22 * torsoH;
	const forearmLen = 0.24 * torsoH;
	const upperArmGeo = createFlutedLimbGeometry(
		0.074 * torsoW,
		0.066 * torsoW,
		0.058 * torsoW,
		upperArmLen,
	);
	const forearmGeo = createFlutedLimbGeometry(
		0.068 * torsoW,
		0.074 * torsoW,
		0.056 * torsoW,
		forearmLen,
	);
	const couterGeo = createWingedJointCopGeometry(
		0.115 * torsoW,
		0.125 * torsoW,
	);
	const besagewGeo = createBeveledTassetGeometry(
		0.105 * torsoW,
		0.105 * torsoW,
	);
	const gauntletHandGeo = createBeveledTassetGeometry(
		0.088 * torsoW,
		0.102 * torsoW,
	);
	const fingerPlateGeo = createBeveledTassetGeometry(
		0.022 * torsoW,
		0.058 * torsoW,
	);

	const rightUpperArm = registerMesh(new THREE.Mesh(upperArmGeo, darkSteelMat));
	rightUpperArm.castShadow = true;
	rightArmPivot.add(rightUpperArm);

	// Scalloped Besagew Armpit Rondel Rosette
	const rightBesagew = registerMesh(
		new THREE.Mesh(besagewGeo, secondaryTrimMat),
	);
	rightBesagew.position.set(-0.045 * torsoW, -0.04, 0.085 * torsoW);
	rightBesagew.rotation.z = Math.PI / 4;
	rightArmPivot.add(rightBesagew);

	// Articulated Right Elbow Pivot
	const rightElbowPivot = new THREE.Group();
	rightElbowPivot.position.set(0.02, -upperArmLen, 0.02);
	rightArmPivot.add(rightElbowPivot);

	const rightCouter = registerMesh(new THREE.Mesh(couterGeo, secondaryTrimMat));
	rightCouter.rotation.y = Math.PI * 0.75;
	rightCouter.position.set(0.02, 0, -0.02);
	rightElbowPivot.add(rightCouter);

	const rightForearm = registerMesh(
		new THREE.Mesh(forearmGeo, primaryArmorMat),
	);
	rightForearm.rotation.x = Math.PI * 0.42;
	rightForearm.castShadow = true;
	rightElbowPivot.add(rightForearm);

	// Hourglass Gauntlet Metacarpal Plate + 4 Articulated Armored Finger Lames
	const rightGauntletHand = registerMesh(
		new THREE.Mesh(gauntletHandGeo, secondaryTrimMat),
	);
	rightGauntletHand.position.set(0, -0.04, forearmLen * 0.92);
	rightGauntletHand.rotation.x = Math.PI * 0.42;
	rightElbowPivot.add(rightGauntletHand);

	for (let f = -1.5; f <= 1.5; f += 1.0) {
		const fingerLame = registerMesh(
			new THREE.Mesh(fingerPlateGeo, darkSteelMat),
		);
		fingerLame.position.set(f * 0.018 * torsoW, -0.036 * torsoW, -0.016);
		fingerLame.rotation.x = 0.85;
		rightGauntletHand.add(fingerLame);
	}

	const weaponGroup = new THREE.Group();
	weaponGroup.position.set(0.01, -0.05, forearmLen * 0.96);
	rightElbowPivot.add(weaponGroup);

	if (type === "p") {
		// Pawn: Winged Estoc Partisan with Sculpted Diamond Spearhead, Swept Cross-Quillions & Counterweight Pommel
		const shaft = registerMesh(
			new THREE.Mesh(
				createFlutedLimbGeometry(0.024, 0.022, 0.024, 1.26),
				darkSteelMat,
			),
		);
		shaft.rotation.x = -Math.PI * 0.55;
		shaft.position.set(0, -0.06, -0.24);

		const pommel = registerMesh(
			new THREE.Mesh(new THREE.OctahedronGeometry(0.042, 1), secondaryTrimMat),
		);
		pommel.position.set(0, -0.06, -0.26);

		const quillion = registerMesh(
			new THREE.Mesh(
				createSweptCrossguardGeometry(0.28, 0.048),
				secondaryTrimMat,
			),
		);
		quillion.rotation.x = Math.PI * 0.45;
		quillion.position.set(0, 0.075, 0.84);

		const spearCore = registerMesh(
			new THREE.Mesh(
				createSculptedBladeGeometry(0.105, 0.46, 0.018),
				primaryArmorMat,
			),
		);
		spearCore.rotation.x = Math.PI * 0.45;
		spearCore.position.set(0, 0.075, 0.84);

		const spearEdge = new THREE.Mesh(
			createSculptedBladeGeometry(0.065, 0.48, 0.022),
			energyMat,
		);
		spearEdge.rotation.x = Math.PI * 0.45;
		spearEdge.position.set(0, 0.075, 0.84);

		weaponGroup.add(shaft, pommel, quillion, spearCore, spearEdge);
		weaponGlowMeshes.push(spearEdge);
	} else if (type === "n") {
		// Knight: Voltaic Spiral-Fluted Jousting Lance with Vamplate Hand-Bell, Rear Counter-Cone & 3 Induction Coils
		const lanceShaft = registerMesh(
			new THREE.Mesh(createFlutedLanceGeometry(0.092, 1.42), secondaryTrimMat),
		);
		lanceShaft.rotation.x = Math.PI * 0.47;
		lanceShaft.position.z = 0.56;

		const guardBell = registerMesh(
			new THREE.Mesh(createLayeredGorgetGeometry(0.72), primaryArmorMat),
		);
		guardBell.scale.set(1.0, 2.2, 1.0);
		guardBell.rotation.x = Math.PI * 0.47;
		guardBell.position.z = 0.04;

		const lanceTip = new THREE.Mesh(
			createSculptedBladeGeometry(0.072, 0.34, 0.024),
			energyMat,
		);
		lanceTip.rotation.x = Math.PI * 0.47;
		lanceTip.position.set(0, 0.08, 1.08);
		weaponGlowMeshes.push(lanceTip);

		for (let c = 0; c < 3; c++) {
			const coil = new THREE.Mesh(
				new THREE.TorusGeometry(0.092 - c * 0.016, 0.016, 10, 28),
				energyMat,
			);
			coil.position.set(0, 0.02 + c * 0.01, 0.38 + c * 0.18);
			weaponGroup.add(coil);
			weaponGlowMeshes.push(coil);
		}
		weaponGroup.add(lanceShaft, guardBell, lanceTip);
	} else if (type === "b") {
		// Bishop: Sanctified Crosier Pole-Glaive with Reliquary Lantern Finial, Crescent Blade & Back-Fluke
		const staff = registerMesh(
			new THREE.Mesh(
				createFlutedLimbGeometry(0.026, 0.024, 0.026, 1.4),
				secondaryTrimMat,
			),
		);
		staff.rotation.x = -Math.PI * 0.61;
		staff.position.set(0, -0.05, -0.22);

		const glaiveBody = registerMesh(
			new THREE.Mesh(createCrescentAxeGeometry(0.22, 0.44), primaryArmorMat),
		);
		glaiveBody.position.set(0, 0.44, 0.87);
		glaiveBody.rotation.y = Math.PI / 2;
		glaiveBody.rotation.z = -0.35;

		const glaiveBlade = new THREE.Mesh(
			createCrescentAxeGeometry(0.26, 0.48),
			energyMat,
		);
		glaiveBlade.position.set(0, 0.44, 0.89);
		glaiveBlade.rotation.y = Math.PI / 2;
		glaiveBlade.rotation.z = -0.35;

		const finialRing = registerMesh(
			new THREE.Mesh(
				new THREE.TorusGeometry(0.115, 0.018, 10, 24),
				secondaryTrimMat,
			),
		);
		finialRing.position.set(0, 0.41, 0.84);
		finialRing.rotation.y = Math.PI / 2;

		const finialCore = new THREE.Mesh(
			new THREE.OctahedronGeometry(0.048, 0),
			energyMat,
		);
		finialCore.position.set(0, 0.41, 0.84);

		weaponGroup.add(staff, glaiveBody, glaiveBlade, finialRing, finialCore);
		weaponGlowMeshes.push(glaiveBlade, finialCore);
	} else if (type === "r") {
		// Rook: Colossal Twin-Headed Siege Maul with Beveled Octagonal Core, Crowned Striking Rams & Raven-Beak Fluke
		const handle = registerMesh(
			new THREE.Mesh(
				createFlutedLimbGeometry(0.038, 0.035, 0.038, 1.18),
				darkSteelMat,
			),
		);
		handle.rotation.x = -Math.PI * 0.58;
		handle.position.set(0, -0.04, -0.18);

		const maulCore = registerMesh(
			new THREE.Mesh(
				createSiegeMaulHeadGeometry(0.32, 0.28, 0.42),
				primaryArmorMat,
			),
		);
		maulCore.position.set(0, 0.22, 0.88);

		const strikePlateGeo = createBeveledTassetGeometry(0.36, 0.28);
		for (const faceDir of [-1, 1]) {
			const facePlate = registerMesh(
				new THREE.Mesh(strikePlateGeo, secondaryTrimMat),
			);
			facePlate.position.set(0, 0.22, 0.88 + faceDir * 0.24);
			weaponGroup.add(facePlate);
		}

		const impactFace = new THREE.Mesh(
			createBeveledTassetGeometry(0.38, 0.24),
			energyMat,
		);
		impactFace.position.set(0, 0.22, 1.13);

		const topSpike = registerMesh(
			new THREE.Mesh(
				createSculptedBladeGeometry(0.095, 0.28, 0.022),
				secondaryTrimMat,
			),
		);
		topSpike.rotation.x = Math.PI * 0.42;
		topSpike.position.set(0, 0.24, 1.08);

		weaponGroup.add(handle, maulCore, impactFace, topSpike);
		weaponGlowMeshes.push(impactFace);
	} else if (type === "q") {
		// Queen: Royal Valkyrie Halberd (Gilded Shaft + Winged Crescent Axe + Back Fluke + Diamond Spear Spire)
		const pole = registerMesh(
			new THREE.Mesh(
				createFlutedLimbGeometry(0.026, 0.024, 0.026, 1.48),
				secondaryTrimMat,
			),
		);
		pole.rotation.x = -Math.PI * 0.57;
		pole.position.set(0, -0.05, -0.22);

		const halberdCollar = registerMesh(
			new THREE.Mesh(
				createSweptCrossguardGeometry(0.24, 0.042),
				secondaryTrimMat,
			),
		);
		halberdCollar.rotation.x = Math.PI * 0.43;
		halberdCollar.position.set(0, 0.26, 0.86);

		const halberdAxe = new THREE.Mesh(
			createCrescentAxeGeometry(0.27, 0.44),
			energyMat,
		);
		halberdAxe.position.set(0, 0.31, 0.94);
		halberdAxe.rotation.y = Math.PI / 2;
		halberdAxe.rotation.z = -0.45;

		const backFluke = registerMesh(
			new THREE.Mesh(
				createSculptedBladeGeometry(0.065, 0.24, 0.014),
				secondaryTrimMat,
			),
		);
		backFluke.position.set(0, 0.18, 0.92);
		backFluke.rotation.x = Math.PI * 0.88;

		const spearPoint = new THREE.Mesh(
			createSculptedBladeGeometry(0.085, 0.36, 0.016),
			energyMat,
		);
		spearPoint.rotation.x = Math.PI * 0.43;
		spearPoint.position.set(0, 0.29, 0.96);

		weaponGroup.add(pole, halberdCollar, halberdAxe, backFluke, spearPoint);
		weaponGlowMeshes.push(halberdAxe, spearPoint);
	} else if (type === "k") {
		// King: Greatsword of Eternal Sovereignty (Zweihänder with Swept Quillions, Ring-Guard, Parrying Hooks & Glowing Fuller)
		const pommel = registerMesh(
			new THREE.Mesh(new THREE.OctahedronGeometry(0.056, 1), secondaryTrimMat),
		);
		pommel.position.set(0, -0.03, -0.15);

		const hilt = registerMesh(
			new THREE.Mesh(
				createFlutedLimbGeometry(0.032, 0.026, 0.032, 0.34),
				darkSteelMat,
			),
		);
		hilt.rotation.x = -Math.PI * 0.55;
		hilt.position.set(0, -0.03, -0.14);

		const crossguard = registerMesh(
			new THREE.Mesh(
				createSweptCrossguardGeometry(0.46, 0.075),
				secondaryTrimMat,
			),
		);
		crossguard.rotation.x = Math.PI * 0.45;
		crossguard.position.set(0, 0.04, 0.16);

		// Central Ring-Guard (Side-Ring)
		const sideRing = registerMesh(
			new THREE.Mesh(
				new THREE.TorusGeometry(0.068, 0.012, 8, 20),
				secondaryTrimMat,
			),
		);
		sideRing.position.set(0, 0.06, 0.19);

		// Zweihänder Ricasso Parrying Hooks (Flamberge Lugs)
		const parryHooks = registerMesh(
			new THREE.Mesh(
				createSweptCrossguardGeometry(0.24, 0.038),
				secondaryTrimMat,
			),
		);
		parryHooks.rotation.x = Math.PI * 0.45;
		parryHooks.position.set(0, 0.08, 0.38);

		const greatswordBlade = registerMesh(
			new THREE.Mesh(
				createSculptedBladeGeometry(0.142, 1.2, 0.018),
				primaryArmorMat,
			),
		);
		greatswordBlade.rotation.x = Math.PI * 0.45;
		greatswordBlade.position.set(0, 0.04, 0.17);

		const fuller = new THREE.Mesh(
			createSculptedBladeGeometry(0.056, 0.98, 0.024),
			energyMat,
		);
		fuller.rotation.x = Math.PI * 0.45;
		fuller.position.set(0, 0.045, 0.22);

		weaponGroup.add(
			pommel,
			hilt,
			crossguard,
			sideRing,
			parryHooks,
			greatswordBlade,
			fuller,
		);
		weaponGlowMeshes.push(fuller);
	}

	// ==========================================================================
	// 5. TWO-JOINT LEFT ARM & MULTI-LAYERED SHIELDS / OFF-HAND WARDS
	// ==========================================================================
	const leftArmPivot = new THREE.Group();
	leftArmPivot.position.set(-0.31 * torsoW, torsoH * 0.83, 0);
	bodyPivot.add(leftArmPivot);

	const leftUpperArm = registerMesh(new THREE.Mesh(upperArmGeo, darkSteelMat));
	leftUpperArm.castShadow = true;
	leftArmPivot.add(leftUpperArm);

	const leftBesagew = registerMesh(
		new THREE.Mesh(besagewGeo, secondaryTrimMat),
	);
	leftBesagew.position.set(0.045 * torsoW, -0.04, 0.085 * torsoW);
	leftBesagew.rotation.z = Math.PI / 4;
	leftArmPivot.add(leftBesagew);

	const leftElbowPivot = new THREE.Group();
	leftElbowPivot.position.set(-0.02, -upperArmLen, 0.02);
	leftArmPivot.add(leftElbowPivot);

	const leftCouter = registerMesh(new THREE.Mesh(couterGeo, secondaryTrimMat));
	leftCouter.rotation.y = -Math.PI * 0.75;
	leftCouter.position.set(-0.02, 0, -0.02);
	leftElbowPivot.add(leftCouter);

	const leftForearm = registerMesh(new THREE.Mesh(forearmGeo, primaryArmorMat));
	leftForearm.rotation.x = Math.PI * 0.42;
	leftForearm.castShadow = true;
	leftElbowPivot.add(leftForearm);

	const leftGauntletHand = registerMesh(
		new THREE.Mesh(gauntletHandGeo, secondaryTrimMat),
	);
	leftGauntletHand.position.set(0, -0.04, forearmLen * 0.92);
	leftGauntletHand.rotation.x = Math.PI * 0.42;
	leftElbowPivot.add(leftGauntletHand);

	for (let f = -1.5; f <= 1.5; f += 1.0) {
		const fingerLame = registerMesh(
			new THREE.Mesh(fingerPlateGeo, darkSteelMat),
		);
		fingerLame.position.set(f * 0.018 * torsoW, -0.036 * torsoW, -0.016);
		fingerLame.rotation.x = 0.85;
		leftGauntletHand.add(fingerLame);
	}

	let shieldMesh: THREE.Mesh | null = null;
	if (type === "p" || type === "r" || type === "k") {
		const shieldW = type === "r" ? 0.5 : type === "k" ? 0.45 : 0.37;
		const shieldH = type === "r" ? 0.74 : type === "k" ? 0.6 : 0.47;
		const shieldGeo =
			type === "r"
				? createBeveledTassetGeometry(shieldW, shieldH) // Crenellated Pavise Tower Shield
				: createHeaterShieldGeometry(shieldW, shieldH); // Royal Heater / Squire Kite Shield

		// Outer Gilded Border Layer + Inner Armored Face Layer
		shieldMesh = registerMesh(new THREE.Mesh(shieldGeo, secondaryTrimMat));
		shieldMesh.rotation.y = -Math.PI * 0.36;
		shieldMesh.position.set(-0.12, -0.02, 0.22);
		shieldMesh.castShadow = true;

		const innerShieldFace = registerMesh(
			new THREE.Mesh(shieldGeo, primaryArmorMat),
		);
		innerShieldFace.scale.set(0.86, 0.88, 1.08);
		innerShieldFace.position.z = 0.008;
		shieldMesh.add(innerShieldFace);

		// Heraldic Cross Relief + Spiked Umbo Shield Boss + Glowing Core Gem
		const crossVert = registerMesh(
			new THREE.Mesh(
				createBeveledTassetGeometry(shieldW * 0.16, shieldH * 0.76),
				secondaryTrimMat,
			),
		);
		crossVert.position.z = 0.022;
		const crossHoriz = registerMesh(
			new THREE.Mesh(
				createBeveledTassetGeometry(shieldW * 0.72, shieldH * 0.14),
				secondaryTrimMat,
			),
		);
		crossHoriz.position.set(0, shieldH * 0.08, 0.022);
		shieldMesh.add(crossVert, crossHoriz);

		const shieldBoss = new THREE.Mesh(
			new THREE.OctahedronGeometry(0.058, 1),
			energyMat,
		);
		shieldBoss.scale.set(1.1, 1.5, 0.65);
		shieldBoss.position.set(0, shieldH * 0.08, 0.042);
		shieldMesh.add(shieldBoss);
		weaponGlowMeshes.push(shieldBoss);

		leftElbowPivot.add(shieldMesh);
	} else if (type === "n") {
		// Knight: Off-Hand Voltaic Parrying Lance & Buckler Targe
		const offLance = registerMesh(
			new THREE.Mesh(createFlutedLanceGeometry(0.068, 1.08), secondaryTrimMat),
		);
		offLance.rotation.x = Math.PI * 0.47;
		offLance.position.set(-0.04, -0.06, 0.52);

		const offBell = registerMesh(
			new THREE.Mesh(createHeaterShieldGeometry(0.28, 0.34), primaryArmorMat),
		);
		offBell.rotation.y = -Math.PI * 0.32;
		offBell.position.set(-0.09, -0.02, 0.18);
		shieldMesh = offBell;
		leftElbowPivot.add(offLance, offBell);
	} else {
		// Bishop & Queen: Multi-Ring Astrolabe Arcane Buckler Ward on Left Vambrace
		const focusOuter = new THREE.Mesh(
			new THREE.TorusGeometry(0.155, 0.016, 12, 32),
			energyMat,
		);
		focusOuter.rotation.y = Math.PI / 2;
		focusOuter.position.set(-0.1, -0.02, 0.2);

		const focusInner = registerMesh(
			new THREE.Mesh(
				new THREE.TorusGeometry(0.105, 0.012, 10, 24),
				secondaryTrimMat,
			),
		);
		focusOuter.add(focusInner);

		const wardBladeGeo = createSculptedBladeGeometry(0.035, 0.085, 0.008);
		for (let w = 0; w < 4; w++) {
			const wb = registerMesh(new THREE.Mesh(wardBladeGeo, secondaryTrimMat));
			const a = (w / 4) * Math.PI * 2;
			wb.position.set(Math.cos(a) * 0.155, Math.sin(a) * 0.155, 0);
			wb.rotation.z = a - Math.PI / 2;
			focusOuter.add(wb);
		}

		shieldMesh = focusOuter;
		leftElbowPivot.add(focusOuter);
		weaponGlowMeshes.push(focusOuter);
	}

	// ==========================================================================
	// 6. QUEEN'S 8 FULLY-HILTED ORBITING ASTRAL RUNESWORDS
	// ==========================================================================
	const specialOrbitGroup = new THREE.Group();
	specialOrbitGroup.position.set(0, torsoH * 0.65, 0);
	bodyPivot.add(specialOrbitGroup);

	if (type === "q") {
		const floatBladeGeo = createSculptedBladeGeometry(0.056, 0.44, 0.01);
		const floatGuardGeo = createSweptCrossguardGeometry(0.14, 0.025);
		for (let i = 0; i < 8; i++) {
			const angle = (i / 8) * Math.PI * 2;
			const sword = new THREE.Mesh(floatBladeGeo, energyMat);
			sword.position.set(
				Math.cos(angle) * 0.56,
				Math.sin(angle * 2) * 0.08 - 0.16,
				Math.sin(angle) * 0.56,
			);
			sword.rotation.y = -angle;
			sword.rotation.x = Math.PI * 0.12;

			const sGuard = registerMesh(
				new THREE.Mesh(floatGuardGeo, secondaryTrimMat),
			);
			sGuard.position.set(0, 0.02, 0.005);
			sword.add(sGuard);

			specialOrbitGroup.add(sword);
			weaponGlowMeshes.push(sword);
		}
	}

	// 7. Quantum 4D Wavefunction Superposition Shell
	const quantumWaveGroup = new THREE.Group();
	quantumWaveGroup.position.set(0, 0.72, 0);
	quantumWaveGroup.visible = false;
	root.add(quantumWaveGroup);

	const qRingGeo1 = new THREE.TorusGeometry(0.56, 0.012, 10, 48);
	const qRingMat1 = new THREE.MeshBasicMaterial({
		color: 0x38bdf8,
		transparent: true,
		opacity: 0.75,
		blending: THREE.AdditiveBlending,
		depthWrite: false,
	});
	const qRing1 = new THREE.Mesh(qRingGeo1, qRingMat1);
	qRing1.rotation.x = Math.PI / 3;
	quantumWaveGroup.add(qRing1);

	const qRingGeo2 = new THREE.TorusGeometry(0.64, 0.01, 10, 48);
	const qRingMat2 = new THREE.MeshBasicMaterial({
		color: 0xc084fc,
		transparent: true,
		opacity: 0.65,
		blending: THREE.AdditiveBlending,
		depthWrite: false,
	});
	const qRing2 = new THREE.Mesh(qRingGeo2, qRingMat2);
	qRing2.rotation.y = Math.PI / 3;
	quantumWaveGroup.add(qRing2);

	// 8. Custom GLSL Status Effect Shader Shell (Burn / Slow / Weakened) on Body Pivot
	const statusShaderUniforms = {
		uTime: { value: 0 },
		uBurn: { value: 0 },
		uSlow: { value: 0 },
		uWeakened: { value: 0 },
	};

	const statusShaderMat = new THREE.ShaderMaterial({
		uniforms: statusShaderUniforms,
		transparent: true,
		depthWrite: false,
		side: THREE.DoubleSide,
		blending: THREE.AdditiveBlending,
		vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uBurn;
      uniform float uSlow;
      uniform float uWeakened;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      varying vec3 vLocalPos;

      void main() {
        vUv = uv;
        vLocalPos = position;
        vec3 rawN = normalMatrix * normal;
        float rawNLenSq = dot(rawN, rawN);
        vNormal = rawNLenSq > 0.0001 ? rawN * inversesqrt(rawNLenSq) : vec3(0.0, 0.0, 1.0);

        float flameDisp = uBurn * 0.024 * sin(position.y * 18.0 - uTime * 14.0) * cos(position.x * 14.0 + uTime * 9.0);
        float weakDisp = uWeakened * 0.018 * sin(position.y * 26.0 + uTime * 22.0);
        vec3 displaced = position + normal * (0.018 + flameDisp + weakDisp);

        vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
        vViewPosition = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
		fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uBurn;
      uniform float uSlow;
      uniform float uWeakened;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      varying vec3 vLocalPos;

      void main() {
        float totalStatus = uBurn + uSlow + uWeakened;
        if (totalStatus <= 0.01) {
          gl_FragColor = vec4(0.0);
          return;
        }

        float nLenSq = dot(vNormal, vNormal);
        vec3 normal = nLenSq > 0.0001 ? vNormal * inversesqrt(nLenSq) : vec3(0.0, 0.0, 1.0);
        float vLenSq = dot(vViewPosition, vViewPosition);
        vec3 viewDir = vLenSq > 0.0001 ? vViewPosition * inversesqrt(vLenSq) : vec3(0.0, 0.0, 1.0);

        float ndv = clamp(1.0 - abs(dot(normal, viewDir)), 0.0, 1.0);
        float fresnel = ndv * ndv;

        vec3 finalColor = vec3(0.0);
        float finalAlpha = 0.0;

        if (uBurn > 0.01) {
          float n1 = sin(vLocalPos.y * 16.0 - uTime * 13.0 + sin(vLocalPos.x * 12.0 + uTime * 7.0));
          float n2 = cos(vLocalPos.z * 18.0 - uTime * 16.0) * sin(vLocalPos.y * 24.0 - uTime * 19.0);
          float flameMask = clamp(0.55 + 0.45 * (n1 * 0.65 + n2 * 0.35), 0.0, 1.0);
          vec3 burnCol = mix(vec3(0.98, 0.32, 0.06), vec3(1.0, 0.92, 0.28), flameMask * fresnel);
          float burnA = clamp((fresnel * 0.72 + flameMask * 0.48) * uBurn, 0.0, 1.0);
          finalColor += burnCol * burnA;
          finalAlpha = max(finalAlpha, burnA);
        }

        if (uSlow > 0.01) {
          float hexBand = 0.5 + 0.5 * sin(vLocalPos.y * 22.0 + uTime * 3.2);
          float frostGrid = abs(sin(vLocalPos.x * 24.0) * cos(vLocalPos.z * 24.0));
          float cryoMask = clamp(hexBand * 0.65 + step(0.45, frostGrid) * 0.45, 0.0, 1.0);
          vec3 slowCol = mix(vec3(0.18, 0.68, 0.98), vec3(0.75, 0.88, 1.0), cryoMask);
          float slowA = clamp((fresnel * 0.68 + cryoMask * 0.42) * uSlow, 0.0, 1.0);
          finalColor += slowCol * slowA;
          finalAlpha = max(finalAlpha, slowA);
        }

        if (uWeakened > 0.01) {
          float sunderDiag = abs(sin((vLocalPos.x + vLocalPos.y * 1.4) * 20.0 - uTime * 10.0));
          float breachLine = smoothstep(0.72, 0.96, sunderDiag);
          float pulse = 0.6 + 0.4 * sin(uTime * 18.0);
          vec3 weakCol = mix(vec3(0.68, 0.22, 0.96), vec3(0.96, 0.24, 0.42), breachLine);
          float weakA = clamp((fresnel * 0.58 + breachLine * 0.65) * pulse * uWeakened, 0.0, 1.0);
          finalColor += weakCol * weakA;
          finalAlpha = max(finalAlpha, weakA);
        }

        gl_FragColor = vec4(clamp(finalColor, vec3(0.0), vec3(1.5)), clamp(finalAlpha, 0.0, 0.88));
      }
    `,
	});

	const statusCylinderGeo = new THREE.CylinderGeometry(
		0.22 * torsoW,
		0.29 * torsoW,
		torsoH * 0.96,
		24,
		3,
		true,
	);
	statusCylinderGeo.translate(0, torsoH * 0.48, 0);
	const statusShaderMesh = new THREE.Mesh(statusCylinderGeo, statusShaderMat);
	statusShaderMesh.visible = false;
	bodyPivot.add(statusShaderMesh);

	// 9. 3D Orbiting Status Indicator Ring & Geometric Sigil Crystals
	const statusIndicatorGroup = new THREE.Group();
	statusIndicatorGroup.position.set(0, 0.62, 0);
	statusIndicatorGroup.visible = false;
	root.add(statusIndicatorGroup);

	const statusRingMat = new THREE.MeshBasicMaterial({
		color: 0xf97316,
		transparent: true,
		opacity: 0.85,
		blending: THREE.AdditiveBlending,
		depthWrite: false,
	});
	const statusRingMesh = new THREE.Mesh(
		new THREE.TorusGeometry(0.48 * torsoW, 0.016, 10, 36),
		statusRingMat,
	);
	statusRingMesh.rotation.x = Math.PI / 2;
	statusIndicatorGroup.add(statusRingMesh);

	const statusCrystals: THREE.Mesh[] = [];
	const crystalGeo = new THREE.OctahedronGeometry(0.068, 0);
	for (let i = 0; i < 3; i++) {
		const cMat = new THREE.MeshBasicMaterial({
			color: 0xfde047,
			transparent: true,
			opacity: 0.92,
			blending: THREE.AdditiveBlending,
			depthWrite: false,
		});
		const cMesh = new THREE.Mesh(crystalGeo, cMat);
		const angle = (i / 3) * Math.PI * 2;
		cMesh.position.set(
			Math.cos(angle) * 0.5 * torsoW,
			0.08,
			Math.sin(angle) * 0.5 * torsoW,
		);
		statusIndicatorGroup.add(cMesh);
		statusCrystals.push(cMesh);
	}

	// ==========================================================================
	// 10. 3D ACADEMIC PROFESSOR ATTIRE RIG (TWEED SUIT LAPELS, SHIRT & TIE,
	//     SUEDE ELBOW PATCHES, WIRE-RIM SPECTACLES, MORTARBOARD & PREPRINT SCROLL)
	//     Activated when a Sentient Mathematical Theorem enters Academic Peer Review!
	// ==========================================================================
	const professorAttireNodes: THREE.Object3D[] = [];

	const tweedLapelMat = new THREE.MeshStandardMaterial({
		color: isWhite ? 0x4e3b2c : 0x1e293b,
		roughness: 0.9,
		metalness: 0.05,
	});
	const shirtCollarMat = new THREE.MeshStandardMaterial({
		color: 0xf8fafc,
		roughness: 0.55,
		metalness: 0.02,
	});
	const academicTieMat = new THREE.MeshStandardMaterial({
		color: isWhite ? 0xbe123c : 0xd97706,
		roughness: 0.4,
		metalness: 0.15,
	});
	const suedePatchMat = new THREE.MeshStandardMaterial({
		color: 0x9a5224, // Classic Cognac Suede Leather Elbow Patches!
		roughness: 0.94,
		metalness: 0.02,
	});
	const brassSpectacleMat = new THREE.MeshStandardMaterial({
		color: 0xfbbf24,
		roughness: 0.22,
		metalness: 0.88,
	});
	const mortarboardMat = new THREE.MeshStandardMaterial({
		color: 0x111827,
		roughness: 0.82,
		metalness: 0.08,
	});

	// 10A. Tailored Suit Lapels, Crisp White Dress Shirt & Academic Tie/Bowtie on Chest
	const profTorsoGroup = new THREE.Group();
	profTorsoGroup.visible = false;
	bodyPivot.add(profTorsoGroup);
	professorAttireNodes.push(profTorsoGroup);

	const shirtFront = new THREE.Mesh(
		new THREE.ConeGeometry(0.115 * torsoW, 0.28 * torsoH, 4),
		shirtCollarMat,
	);
	shirtFront.rotation.x = Math.PI;
	shirtFront.rotation.y = Math.PI / 4;
	shirtFront.scale.set(1.0, 1.0, 0.35);
	shirtFront.position.set(0, torsoH * 0.78, 0.215 * torsoW);
	profTorsoGroup.add(shirtFront);

	// Left & Right Notched Tweed Jacket Lapels
	for (const side of [-1, 1]) {
		const lapel = new THREE.Mesh(
			createBeveledTassetGeometry(0.085 * torsoW, 0.34 * torsoH),
			tweedLapelMat,
		);
		lapel.position.set(side * 0.082 * torsoW, torsoH * 0.72, 0.228 * torsoW);
		lapel.rotation.z = side * 0.26;
		lapel.rotation.y = side * 0.18;
		profTorsoGroup.add(lapel);
	}

	// Academic Silk Tie & Bowtie Knot
	const tieKnot = new THREE.Mesh(
		new THREE.OctahedronGeometry(0.028 * torsoW, 1),
		academicTieMat,
	);
	tieKnot.position.set(0, torsoH * 0.86, 0.242 * torsoW);
	const tieBlade = new THREE.Mesh(
		createSculptedBladeGeometry(0.048 * torsoW, 0.24 * torsoH, 0.012),
		academicTieMat,
	);
	tieBlade.rotation.z = Math.PI;
	tieBlade.position.set(0, torsoH * 0.84, 0.244 * torsoW);
	profTorsoGroup.add(tieKnot, tieBlade);

	// 10B. Suede Leather Elbow Patches stitched onto BOTH Elbows (`leftElbowPivot` & `rightElbowPivot`)
	const createElbowPatchNode = (side: -1 | 1) => {
		const patchGroup = new THREE.Group();
		patchGroup.visible = false;
		const patchDisc = new THREE.Mesh(
			new THREE.SphereGeometry(0.068 * torsoW, 16, 12),
			suedePatchMat,
		);
		patchDisc.scale.set(0.72, 1.28, 0.42);
		patchDisc.position.set(side * 0.032, -0.02, -0.055);
		const patchStitchRim = new THREE.Mesh(
			new THREE.TorusGeometry(0.058 * torsoW, 0.006, 8, 20),
			brassSpectacleMat,
		);
		patchStitchRim.scale.set(0.75, 1.25, 0.5);
		patchStitchRim.position.set(side * 0.034, -0.02, -0.062);
		patchGroup.add(patchDisc, patchStitchRim);
		professorAttireNodes.push(patchGroup);
		return patchGroup;
	};
	leftElbowPivot.add(createElbowPatchNode(-1));
	rightElbowPivot.add(createElbowPatchNode(1));

	// 10C. Rolled Preprint Manuscript Scroll tied with Crimson Ribbon in Left Hand
	const manuscriptGroup = new THREE.Group();
	manuscriptGroup.visible = false;
	manuscriptGroup.position.set(-0.08, -0.03, forearmLen * 0.88);
	manuscriptGroup.rotation.z = Math.PI * 0.25;
	const scrollCyl = new THREE.Mesh(
		new THREE.CylinderGeometry(0.034, 0.034, 0.34, 16),
		new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.7 }),
	);
	const scrollRibbon = new THREE.Mesh(
		new THREE.CylinderGeometry(0.037, 0.037, 0.045, 16),
		academicTieMat,
	);
	manuscriptGroup.add(scrollCyl, scrollRibbon);
	leftElbowPivot.add(manuscriptGroup);
	professorAttireNodes.push(manuscriptGroup);

	// 10D. Wire-Rimmed Reading Spectacles & Oxford Mortarboard Cap with Gold Tassel on Head
	const profHeadGroup = new THREE.Group();
	profHeadGroup.visible = false;
	headGroup.add(profHeadGroup);
	professorAttireNodes.push(profHeadGroup);

	const lensMat = new THREE.MeshPhysicalMaterial({
		color: 0xe0f2fe,
		transparent: true,
		opacity: 0.42,
		roughness: 0.1,
		metalness: 0.1,
	});
	for (const side of [-1, 1]) {
		const rim = new THREE.Mesh(
			new THREE.TorusGeometry(0.038, 0.0045, 8, 20),
			brassSpectacleMat,
		);
		rim.position.set(side * 0.052, 0.146, 0.188);
		const lens = new THREE.Mesh(new THREE.CircleGeometry(0.035, 16), lensMat);
		lens.position.set(side * 0.052, 0.146, 0.188);
		profHeadGroup.add(rim, lens);
	}
	const specBridge = new THREE.Mesh(
		new THREE.CylinderGeometry(0.004, 0.004, 0.032, 8),
		brassSpectacleMat,
	);
	specBridge.rotation.z = Math.PI / 2;
	specBridge.position.set(0, 0.152, 0.19);
	profHeadGroup.add(specBridge);

	// Oxford Mortarboard Square Cap + Skullcap + Hanging Gold Tassel
	const mortarSkull = new THREE.Mesh(
		new THREE.CylinderGeometry(0.145, 0.135, 0.075, 20),
		mortarboardMat,
	);
	mortarSkull.position.set(0, 0.34, 0);
	const mortarBoardTop = new THREE.Mesh(
		new THREE.BoxGeometry(0.42, 0.018, 0.42),
		mortarboardMat,
	);
	mortarBoardTop.position.set(0, 0.382, 0);
	mortarBoardTop.rotation.y = Math.PI / 4;

	const tasselButton = new THREE.Mesh(
		new THREE.SphereGeometry(0.018, 10, 10),
		brassSpectacleMat,
	);
	tasselButton.position.set(0, 0.395, 0);

	const tasselCord = new THREE.Mesh(
		new THREE.CylinderGeometry(0.005, 0.008, 0.16, 8),
		brassSpectacleMat,
	);
	tasselCord.position.set(0.15, 0.31, 0.12);
	tasselCord.rotation.z = -0.22;
	profHeadGroup.add(mortarSkull, mortarBoardTop, tasselButton, tasselCord);

	return {
		root,
		pedestal,
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
		surpriseGroup,
		tesseractBadge,
		quantumWaveGroup,
		weaponGlowMeshes,
		allStandardMeshes,
		primaryArmorMat,
		specialOrbitGroup,
		shieldMesh,
		hpRingMesh,
		statusShaderMesh,
		statusShaderUniforms,
		statusIndicatorGroup,
		statusRingMesh,
		statusCrystals,
		coreGem,
		pauldronMeshes,
		vitalityHaloMesh,
		vitalityHaloUniforms,
		leftEyeGroup: leftEye.eyeGroup,
		rightEyeGroup: rightEye.eyeGroup,
		leftPupilPivot: leftEye.pupilPivot,
		rightPupilPivot: rightEye.pupilPivot,
		leftUpperLid: leftEye.upperLid,
		rightUpperLid: rightEye.upperLid,
		professorAttireNodes,
		isProfessorModeActive: false,
	};
}

/**
 * Toggles a 3D Chess Piece Rig between its Armored Warrior form and its
 * Academic Professor form (Herringbone Tweed Suit, Suede Elbow Patches,
 * Wire-Rim Spectacles, Mortarboard Cap with Gold Tassel & Preprint Scroll)!
 */
export function setPieceProfessorMode(
	rig: ArticulatedPieceRig,
	isProfessorMode: boolean,
	faction: Faction,
) {
	if (rig.isProfessorModeActive === isProfessorMode) return;
	rig.isProfessorModeActive = isProfessorMode;

	for (const node of rig.professorAttireNodes) {
		node.visible = isProfessorMode;
	}

	const isWhite = faction === "w";
	if (isProfessorMode) {
		// Transform primary armor into Herringbone Tweed Suit & Corduroy!
		rig.primaryArmorMat.color.setHex(isWhite ? 0x5c4636 : 0x263346);
		rig.primaryArmorMat.roughness = 0.88;
		rig.primaryArmorMat.metalness = 0.06;
		rig.primaryArmorMat.clearcoat = 0.04;
	} else {
		// Restore medieval Solaris / Obsidian battle armor!
		rig.primaryArmorMat.color.setHex(isWhite ? 0xd8d0c0 : 0x242d40);
		rig.primaryArmorMat.roughness = 0.3;
		rig.primaryArmorMat.metalness = 0.52;
		rig.primaryArmorMat.clearcoat = 0.55;
	}
	rig.primaryArmorMat.needsUpdate = true;
}

/**
 * Creates a dedicated 3D First-Person Weapon & Shield/Gauntlet Viewmodel Rig
 * attached in front of the player's camera during First-Person Combat Mode!
 */
export function createFirstPersonViewmodelRig(
	type: PieceType,
	faction: Faction,
): FirstPersonViewmodelRig {
	const root = new THREE.Group();
	const isWhite = faction === "w";
	const scarTex = getSharedArmorScarTexture();
	const filigreeTex = getSharedArmorFiligreeTexture();

	const armorMat = new THREE.MeshPhysicalMaterial({
		color: isWhite ? 0xd8d0c0 : 0x242d40,
		roughness: 0.3,
		metalness: 0.52,
		roughnessMap: filigreeTex,
		clearcoat: 0.55,
		emissive: new THREE.Color(isWhite ? 0xf59e0b : 0xf43f5e),
		emissiveMap: scarTex,
		emissiveIntensity: 0.0,
		bumpMap: scarTex,
		bumpScale: 0.0,
	});
	const trimMat = new THREE.MeshPhysicalMaterial({
		color: isWhite ? 0xdfa32a : 0xe11d48,
		roughness: 0.2,
		metalness: 0.85,
		bumpMap: filigreeTex,
		bumpScale: 0.01,
	});
	const steelMat = new THREE.MeshStandardMaterial({
		color: isWhite ? 0x475569 : 0x161d2b,
		roughness: 0.42,
		metalness: 0.72,
		bumpMap: filigreeTex,
		bumpScale: 0.008,
	});
	const energyColor = isWhite ? 0x38bdf8 : 0xf43f5e;
	const energyMat = new THREE.MeshStandardMaterial({
		color: energyColor,
		emissive: energyColor,
		emissiveIntensity: 0.85,
		roughness: 0.18,
	});

	const weaponGlowMeshes: THREE.Mesh[] = [];

	// Right Hand, Layered Gauntlet & Signature Archetype Weapon (Bottom-Right of First-Person Viewport)
	const rightHandGroup = new THREE.Group();
	rightHandGroup.position.set(0.42, -0.34, -0.68);
	root.add(rightHandGroup);

	const vambraceGeo = createFlutedLimbGeometry(0.06, 0.066, 0.054, 0.34);
	const gauntletR = new THREE.Mesh(vambraceGeo, armorMat);
	gauntletR.rotation.x = -Math.PI * 0.58;
	gauntletR.position.set(0, -0.14, 0.22);
	rightHandGroup.add(gauntletR);

	const knuckleR = new THREE.Mesh(
		createBeveledTassetGeometry(0.092, 0.105),
		trimMat,
	);
	knuckleR.rotation.x = Math.PI * 0.38;
	knuckleR.position.set(0, -0.02, 0.04);
	rightHandGroup.add(knuckleR);

	const fingerGeo = createBeveledTassetGeometry(0.022, 0.055);
	for (let f = -1.5; f <= 1.5; f += 1.0) {
		const finger = new THREE.Mesh(fingerGeo, steelMat);
		finger.position.set(f * 0.019, -0.035, -0.015);
		finger.rotation.x = 0.8;
		knuckleR.add(finger);
	}

	if (type === "p") {
		const shaft = new THREE.Mesh(
			createFlutedLimbGeometry(0.022, 0.02, 0.022, 1.15),
			steelMat,
		);
		shaft.rotation.x = Math.PI * 0.46;
		shaft.position.set(0, 0.02, 0.22);
		const guard = new THREE.Mesh(
			createSweptCrossguardGeometry(0.24, 0.042),
			trimMat,
		);
		guard.rotation.x = -Math.PI * 0.54;
		guard.position.set(0, 0.13, -0.76);
		const spearTip = new THREE.Mesh(
			createSculptedBladeGeometry(0.088, 0.4, 0.016),
			energyMat,
		);
		spearTip.rotation.x = -Math.PI * 0.54;
		spearTip.position.set(0, 0.13, -0.78);
		rightHandGroup.add(shaft, guard, spearTip);
		weaponGlowMeshes.push(spearTip);
	} else if (type === "n") {
		const lance = new THREE.Mesh(
			createFlutedLanceGeometry(0.088, 1.24),
			trimMat,
		);
		lance.rotation.x = -Math.PI * 0.52;
		lance.position.set(0, 0.1, -0.48);
		const guard = new THREE.Mesh(createLayeredGorgetGeometry(0.68), armorMat);
		guard.scale.set(1, 2.0, 1);
		guard.rotation.x = -Math.PI * 0.52;
		guard.position.set(0, 0.03, -0.02);
		const ring = new THREE.Mesh(
			new THREE.TorusGeometry(0.078, 0.018, 10, 24),
			energyMat,
		);
		ring.position.set(0, 0.11, -0.55);
		rightHandGroup.add(lance, guard, ring);
		weaponGlowMeshes.push(ring);
	} else if (type === "b") {
		const staff = new THREE.Mesh(
			createFlutedLimbGeometry(0.024, 0.022, 0.024, 1.15),
			trimMat,
		);
		staff.rotation.x = Math.PI * 0.62;
		staff.position.set(0, -0.05, 0.2);
		const crescent = new THREE.Mesh(
			createCrescentAxeGeometry(0.24, 0.4),
			energyMat,
		);
		crescent.position.set(0, 0.42, -0.68);
		crescent.rotation.y = Math.PI / 2;
		rightHandGroup.add(staff, crescent);
		weaponGlowMeshes.push(crescent);
	} else if (type === "r") {
		const handle = new THREE.Mesh(
			createFlutedLimbGeometry(0.032, 0.03, 0.032, 1.0),
			steelMat,
		);
		handle.rotation.x = Math.PI * 0.6;
		handle.position.set(0, -0.04, 0.16);
		const maul = new THREE.Mesh(
			createSiegeMaulHeadGeometry(0.32, 0.24, 0.42),
			trimMat,
		);
		maul.position.set(0, 0.25, -0.72);
		const face = new THREE.Mesh(
			createBeveledTassetGeometry(0.34, 0.22),
			energyMat,
		);
		face.position.set(0, 0.25, -0.94);
		rightHandGroup.add(handle, maul, face);
		weaponGlowMeshes.push(face);
	} else if (type === "q") {
		const pole = new THREE.Mesh(
			createFlutedLimbGeometry(0.024, 0.022, 0.024, 1.25),
			trimMat,
		);
		pole.rotation.x = Math.PI * 0.58;
		pole.position.set(0, -0.04, 0.18);
		const blade = new THREE.Mesh(
			createCrescentAxeGeometry(0.25, 0.42),
			energyMat,
		);
		blade.position.set(0, 0.28, -0.82);
		blade.rotation.y = Math.PI / 2;
		const tip = new THREE.Mesh(
			createSculptedBladeGeometry(0.075, 0.32, 0.014),
			energyMat,
		);
		tip.rotation.x = -Math.PI * 0.42;
		tip.position.set(0, 0.28, -0.84);
		rightHandGroup.add(pole, blade, tip);
		weaponGlowMeshes.push(blade, tip);
	} else {
		const hilt = new THREE.Mesh(
			createFlutedLimbGeometry(0.03, 0.026, 0.03, 0.28),
			steelMat,
		);
		hilt.rotation.x = Math.PI * 0.58;
		hilt.position.set(0, -0.02, 0.14);
		const guard = new THREE.Mesh(
			createSweptCrossguardGeometry(0.38, 0.072),
			trimMat,
		);
		guard.position.set(0, 0.06, -0.1);
		const blade = new THREE.Mesh(
			createSculptedBladeGeometry(0.12, 1.08, 0.016),
			armorMat,
		);
		blade.rotation.x = -Math.PI * 0.39;
		blade.position.set(0, 0.06, -0.1);
		const fuller = new THREE.Mesh(
			createSculptedBladeGeometry(0.048, 0.92, 0.022),
			energyMat,
		);
		fuller.rotation.x = -Math.PI * 0.39;
		fuller.position.set(0, 0.07, -0.12);
		rightHandGroup.add(hilt, guard, blade, fuller);
		weaponGlowMeshes.push(fuller);
	}

	// Left Hand & Multi-Layered Shield / Off-Hand Ward (Bottom-Left of First-Person Viewport)
	const leftHandGroup = new THREE.Group();
	leftHandGroup.position.set(-0.42, -0.34, -0.62);
	root.add(leftHandGroup);

	const gauntletL = new THREE.Mesh(vambraceGeo, armorMat);
	gauntletL.rotation.x = -Math.PI * 0.58;
	gauntletL.position.set(0, -0.14, 0.2);
	leftHandGroup.add(gauntletL);

	const shieldShapeGeo =
		type === "r"
			? createBeveledTassetGeometry(0.39, 0.54)
			: createHeaterShieldGeometry(0.35, 0.46);
	const shieldRim = new THREE.Mesh(shieldShapeGeo, trimMat);
	shieldRim.position.set(0.06, 0.08, -0.18);
	leftHandGroup.add(shieldRim);

	const shieldInner = new THREE.Mesh(shieldShapeGeo, armorMat);
	shieldInner.scale.set(0.86, 0.88, 1.08);
	shieldInner.position.z = -0.008;
	shieldRim.add(shieldInner);

	const wardCore = new THREE.Mesh(
		new THREE.OctahedronGeometry(0.055, 1),
		energyMat,
	);
	wardCore.position.set(0.06, 0.08, -0.22);
	leftHandGroup.add(wardCore);
	weaponGlowMeshes.push(wardCore);

	// Diegetic 1st-Person Shield-Gauntlet Runic Vitality & Guard Arc
	const wristArcUniforms = {
		uTime: { value: 0 },
		uHpRatio: { value: 1.0 },
		uGuardRatio: { value: 1.0 },
		uSpecialReady: { value: 0.0 },
	};
	const wristArcMat = new THREE.ShaderMaterial({
		uniforms: wristArcUniforms,
		transparent: true,
		depthWrite: false,
		side: THREE.DoubleSide,
		blending: THREE.AdditiveBlending,
		vertexShader: /* glsl */ `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
		fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uHpRatio;
      uniform float uGuardRatio;
      uniform float uSpecialReady;
      varying vec3 vPos;

      void main() {
        float safeY = (abs(vPos.x) + abs(vPos.y)) < 0.0001 ? 0.001 : vPos.y;
        float angle01 = fract((atan(vPos.x, safeY) + 3.14159265) / 6.2831853);
        float seg = smoothstep(0.08, 0.16, abs(fract(angle01 * 10.0) - 0.5));

        float hp = clamp(uHpRatio, 0.0, 1.0);
        vec3 col = hp > 0.65
          ? vec3(0.22, 0.82, 0.98)
          : hp > 0.30
          ? vec3(0.98, 0.62, 0.16)
          : vec3(0.98, 0.18, 0.30);

        if (uSpecialReady > 0.5) {
          col = mix(col, vec3(1.0, 0.88, 0.28), 0.6 + 0.4 * sin(uTime * 14.0));
        }

        float inHp = step(angle01, hp);
        float pulse = hp < 0.30 ? (0.45 + 0.55 * abs(sin(uTime * 12.0))) : 1.0;
        float alpha = clamp(inHp * seg * 0.85 * pulse, 0.0, 0.95);
        gl_FragColor = vec4(clamp(col, vec3(0.0), vec3(1.5)), alpha);
      }
    `,
	});
	const wristArcMesh = new THREE.Mesh(
		new THREE.RingGeometry(0.11, 0.145, 36),
		wristArcMat,
	);
	wristArcMesh.position.set(0.06, 0.08, -0.145);
	leftHandGroup.add(wristArcMesh);

	return {
		root,
		rightHandGroup,
		leftHandGroup,
		weaponGlowMeshes,
		armorMat,
		wristArcMesh,
		wristArcUniforms,
	};
}

/**
 * Updates how a piece renders based on its 4D hypercube distance (deltaW, deltaZ)
 * from the player's currently viewed 3D slice!
 */
export function updatePiece4DAppearance(
	rig: ArticulatedPieceRig,
	deltaW: number,
	deltaZ: number,
	isPhaseShiftedInFight: boolean = false,
) {
	const dist4D = Math.abs(deltaW) + Math.abs(deltaZ);
	const isPhased = dist4D > 0 || isPhaseShiftedInFight;

	rig.tesseractBadge.visible = isPhased;
	rig.quantumWaveGroup.visible = isPhased;
	if (isPhased) {
		const badgeMat = rig.tesseractBadge.material as THREE.LineBasicMaterial;
		badgeMat.color.setHex(
			deltaW > 0 ? 0x38bdf8 : deltaW < 0 ? 0xa855f7 : 0x34d399,
		);
	}

	const targetOpacity = isPhaseShiftedInFight
		? 0.38
		: dist4D === 0
			? 1.0
			: dist4D === 1
				? 0.42
				: 0.2;

	for (const m of rig.allStandardMeshes) {
		const mat = m.material as THREE.MeshStandardMaterial;
		if (mat.transparent !== isPhased) {
			mat.transparent = isPhased;
			mat.depthWrite = !isPhased;
			mat.needsUpdate = true;
		}
		mat.opacity = targetOpacity;
	}
}
