export type CameraPreset =
	| "white_orbit"
	| "top_tactical"
	| "cinematic_angle"
	| "pocket_watch";

export interface BystanderPhysics {
	offsetX: number;
	offsetZ: number;
	vx: number;
	vz: number;
	y: number;
	vy: number;
	panickedTimer: number;
}
