import type { PieceType } from "../types/game";

export const PIECE_TORSO_HEIGHTS: Record<PieceType, number> = {
	p: 0.64,
	n: 0.78,
	b: 0.84,
	r: 0.86,
	q: 0.96,
	k: 1.0,
};

export function getWarriorEyeHeightWorld(type: PieceType): number {
	return (PIECE_TORSO_HEIGHTS[type] + 0.37) * 1.42;
}
