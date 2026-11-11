import type {
	AcademicColloquiumState,
	LemmaProofWorkbenchState,
} from "../types/game";

/**
 * Central Lemma 3.2, evaluated from the expressions on the board.
 *
 * Boundary map on the temporal cut:
 *   ψ(t₀−1) = (α I + β γ₅) ψ(t₀)
 * Crown sector (γ₅ = +1):  μ₊ = α + β
 * Orthogonal sector (γ₅ = −1): μ₋ = α − β
 * A monarch is a crown state continuous through the cut: μ₊ = 1.
 * A world that can be remembered keeps the orthogonal sector: μ₋ = 1.
 * Surface current: B† γ₅ B = 2αβ I + (α² + β²) γ₅.
 * It is conserved exactly when that equals γ₅.
 *
 * Retrocausal Jacobian, entries in units of κ:
 *   J = | 0    κ₁₂ |
 *       | κ₂₁   0  |
 *   det(λI − J) = λ² − κ₁₂ κ₂₁.
 * A positive product is a real pole. A negative product has none.
 *
 * CHSH, with a′ = a + π/2, b′ = b − π/2, E = cos(x − y):
 *   S = |E(a,b) + E(a,b′) + E(a′,b) − E(a′,b′)|.
 *
 * CKW monogamy: τ(K|Q) + τ(K|C) ≤ τ(K|QC) ≤ 1.
 * The crown is excluded when the queen pair is maximal and the inequality
 * forces the crown tangle to be zero.
 */

const EXACT = 1e-9;

export const CHIRAL_LAB_ASYMMETRY = 0.982;
export const CHIRAL_LAB_SIGMA = CHIRAL_LAB_ASYMMETRY / 4.8;
export const TSIRELSON_BOUND = 2 * Math.SQRT2;

export function formatReal(n: number): string {
	if (!Number.isFinite(n)) return "—";
	const rounded = Math.round(n * 10000) / 10000;
	if (Object.is(rounded, -0)) return "0";
	return String(rounded);
}

/** Numbers, rationals, and multiples of π. Returns null when the chalk isn't an expression. */
export function parseRealExpression(raw: string): number | null {
	const s = raw
		.trim()
		.toLowerCase()
		.replace(/π/g, "pi")
		.replace(/\s+/g, "");
	if (!s) return null;
	const num = "(?:\\d+\\.?\\d*|\\.\\d+)";
	const signed = `[+-]?${num}`;
	if (new RegExp(`^${signed}$`).test(s)) {
		const n = Number(s);
		return Number.isFinite(n) ? n : null;
	}
	if (/^[+-]?pi$/.test(s)) return s.startsWith("-") ? -Math.PI : Math.PI;
	let m = s.match(new RegExp(`^([+-])?pi/(${num})$`));
	if (m) {
		const den = Number(m[2]);
		if (den === 0) return null;
		return ((m[1] === "-" ? -1 : 1) * Math.PI) / den;
	}
	m = s.match(new RegExp(`^(${signed})\\*pi(?:/(${num}))?$`));
	if (m) {
		const den = m[2] === undefined ? 1 : Number(m[2]);
		if (den === 0) return null;
		return (Number(m[1]) * Math.PI) / den;
	}
	m = s.match(new RegExp(`^([+-])?pi\\*(${signed})$`));
	if (m) {
		const sign = m[1] === "-" ? -1 : 1;
		return sign * Math.PI * Number(m[2]);
	}
	m = s.match(new RegExp(`^(${signed})/(${signed})$`));
	if (m) {
		const den = Number(m[2]);
		if (den === 0) return null;
		return Number(m[1]) / den;
	}
	return null;
}

export interface BoundaryReading {
	muPlus: number;
	muMinus: number;
	leakI: number;
	weight5: number;
	hermitian: boolean;
	orthogonalContinuous: boolean;
	crownContinuous: boolean;
	/** Orthogonal sector returns as itself, crown sector does not, current conserved. */
	monarchAbsent: boolean;
}

export function evaluateBoundary(alpha: number, beta: number): BoundaryReading {
	const muPlus = alpha + beta;
	const muMinus = alpha - beta;
	const leakI = 2 * alpha * beta;
	const weight5 = alpha * alpha + beta * beta;
	const hermitian = Math.abs(leakI) <= EXACT && Math.abs(weight5 - 1) <= EXACT;
	const orthogonalContinuous = Math.abs(muMinus - 1) <= EXACT;
	const crownContinuous = Math.abs(muPlus - 1) <= EXACT;
	return {
		muPlus,
		muMinus,
		leakI,
		weight5,
		hermitian,
		orthogonalContinuous,
		crownContinuous,
		monarchAbsent: hermitian && orthogonalContinuous && !crownContinuous,
	};
}

export function describeBoundary(b: BoundaryReading): string {
	const current = b.hermitian
		? "B†γ₅B = γ₅, so the surface current is conserved."
		: `B†γ₅B = ${formatReal(b.leakI)} I + ${formatReal(b.weight5)} γ₅, which is not γ₅.`;
	if (b.monarchAbsent) {
		return `${current} μ₊ = ${formatReal(b.muPlus)} and μ₋ = ${formatReal(b.muMinus)}. The orthogonal sector returns as itself. The crown sector does not, and no global phase repairs only the crown.`;
	}
	if (Math.abs(b.muPlus) <= EXACT && Math.abs(b.muMinus) <= EXACT) {
		return `${current} μ₊ = μ₋ = 0. Both sectors are annihilated, so the past is empty. That does not single out a monarch.`;
	}
	if (b.crownContinuous && b.orthogonalContinuous) {
		return `${current} μ₊ = 1 and μ₋ = 1. The crown returns as itself. A monarch exists on the cut.`;
	}
	return `${current} μ₊ = ${formatReal(b.muPlus)}, μ₋ = ${formatReal(b.muMinus)}.`;
}

export interface JacobianReading {
	product: number;
	realRoots: number[];
	nonsingular: boolean;
}

export function evaluateJacobian(kappa12: number, kappa21: number): JacobianReading {
	const product = kappa12 * kappa21;
	if (product > EXACT) {
		const root = Math.sqrt(product);
		return { product, realRoots: [root, -root], nonsingular: false };
	}
	if (Math.abs(product) <= EXACT) {
		return { product: 0, realRoots: [0], nonsingular: false };
	}
	return { product, realRoots: [], nonsingular: true };
}

export function describeJacobian(j: JacobianReading): string {
	if (j.nonsingular) {
		return `λ² − (${formatReal(j.product)}) = λ² + ${formatReal(-j.product)} > 0 for every real λ. No pole.`;
	}
	if (j.realRoots.length === 1) {
		return "λ² − 0 = λ² has a root at λ = 0. The Jacobian is nilpotent on the cut.";
	}
	return `λ² − (${formatReal(j.product)}) = 0 at λ = ±${formatReal(j.realRoots[0])}. Real pole.`;
}

export interface ChshReading {
	eab: number;
	eabp: number;
	eapb: number;
	eapbp: number;
	s: number;
}

export function computeChshS(angleA: number, angleB: number): number {
	return chshTerms(angleA, angleB).s;
}

export function chshTerms(angleA: number, angleB: number): ChshReading {
	const ap = angleA + Math.PI / 2;
	const bp = angleB - Math.PI / 2;
	const E = (x: number, y: number) => Math.cos(x - y);
	const eab = E(angleA, angleB);
	const eabp = E(angleA, bp);
	const eapb = E(ap, angleB);
	const eapbp = E(ap, bp);
	const s = Math.abs(eab + eabp + eapb - eapbp);
	return { eab, eabp, eapb, eapbp, s };
}

export interface MonogamyReading {
	written: boolean;
	holds: boolean;
	crownExcluded: boolean;
	sum: number;
	slack: number;
}

export function evaluateMonogamy(
	queen: number | null,
	crown: number | null,
	joint: number | null,
): MonogamyReading {
	if (queen === null || crown === null || joint === null) {
		return { written: false, holds: false, crownExcluded: false, sum: 0, slack: 0 };
	}
	const sum = queen + crown;
	const slack = joint - sum;
	const holds =
		queen >= -EXACT &&
		crown >= -EXACT &&
		joint >= -EXACT &&
		joint <= 1 + EXACT &&
		sum <= joint + EXACT;
	const crownExcluded =
		holds &&
		Math.abs(queen - 1) <= EXACT &&
		Math.abs(joint - 1) <= EXACT &&
		Math.abs(crown) <= EXACT;
	return { written: true, holds, crownExcluded, sum, slack };
}

export function describeMonogamy(m: MonogamyReading): string {
	if (!m.written) return "The monogamy relation is not on the board yet.";
	if (!m.holds) {
		return `τ(K|Q) + τ(K|C) = ${formatReal(m.sum)} exceeds the joint tangle, or the joint tangle sits outside [0, 1]. That assignment is unphysical.`;
	}
	if (m.crownExcluded) {
		return "The queen pair is maximal and the joint tangle is saturated, so the crown tangle is zero. A swap that moves the queen's share onto yesterday leaves the crown with nothing to be.";
	}
	return `The assignment is physical. Slack τ(K|QC) − τ(K|Q) − τ(K|C) = ${formatReal(m.slack)}. The crown is not forced out.`;
}

export function predictedChiralAsymmetry(beta: number): number {
	return -beta;
}

export interface PublishedTheorem {
	axiom: string;
	monarchLemmaProved: boolean;
	entanglementSwapUnlocked: boolean;
	publishedChshS: number;
}

export function readWorkbench(wb: LemmaProofWorkbenchState) {
	const boundary = evaluateBoundary(wb.boundaryAlpha, wb.boundaryBeta);
	const jacobian = evaluateJacobian(wb.jacobianKappa12, wb.jacobianKappa21);
	const chsh = chshTerms(wb.measurementAngleA, wb.measurementAngleB);
	const monogamy = evaluateMonogamy(wb.tangleQueen, wb.tangleCrown, wb.tangleJoint);
	return { boundary, jacobian, chsh, monogamy };
}

export function publishedTheorem(wb: LemmaProofWorkbenchState): PublishedTheorem {
	const { boundary, jacobian, chsh, monogamy } = readWorkbench(wb);
	const monarchLemmaProved = boundary.monarchAbsent && jacobian.nonsingular;
	let axiom: string;
	if (monarchLemmaProved && monogamy.crownExcluded) {
		axiom =
			"⊢ ∀t < t₀ : ¬∃Monarch — μ₋ = 1, μ₊ ≠ 1, no real Jacobian pole, τ(K|C) = 0 by CKW [Q.E.D.]";
	} else if (monarchLemmaProved) {
		axiom =
			"⊢ ∀t < t₀ : ¬∃Monarch — orthogonal sector continuous, crown sector not, Jacobian nonsingular [Q.E.D.]";
	} else {
		axiom = `⊢ printed draft — μ₊=${formatReal(boundary.muPlus)}, μ₋=${formatReal(boundary.muMinus)}, κ₁₂κ₂₁=${formatReal(jacobian.product)}`;
	}
	return {
		axiom,
		monarchLemmaProved,
		entanglementSwapUnlocked: monogamy.crownExcluded,
		publishedChshS: chsh.s,
	};
}

export function manuscriptChalkLines(wb: LemmaProofWorkbenchState): string[] {
	const { boundary, jacobian, chsh, monogamy } = readWorkbench(wb);
	const lines = [
		`ψ(t₀−1) = (${formatReal(wb.boundaryAlpha)} I + ${formatReal(wb.boundaryBeta)} γ₅) ψ(t₀)`,
		`μ₊ = ${formatReal(boundary.muPlus)}    μ₋ = ${formatReal(boundary.muMinus)}    B†γ₅B = ${formatReal(boundary.leakI)} I + ${formatReal(boundary.weight5)} γ₅`,
		`κ₁₂ = ${formatReal(wb.jacobianKappa12)}    κ₂₁ = ${formatReal(wb.jacobianKappa21)}    λ² − (${formatReal(jacobian.product)})`,
		describeJacobian(jacobian),
		`S = ${formatReal(chsh.s)}    E(a,b)=${formatReal(chsh.eab)}  E(a,b')=${formatReal(chsh.eabp)}  E(a',b)=${formatReal(chsh.eapb)}  E(a',b')=${formatReal(chsh.eapbp)}`,
	];
	if (wb.chiralLabAsymmetry !== null) {
		lines.push(
			`Lab A = ${formatReal(wb.chiralLabAsymmetry)} ± ${formatReal(CHIRAL_LAB_SIGMA)}    predicted −β = ${formatReal(predictedChiralAsymmetry(wb.boundaryBeta))}`,
		);
	}
	if (monogamy.written) {
		lines.push(
			`τ(K|Q)=${formatReal(wb.tangleQueen ?? 0)}  τ(K|C)=${formatReal(wb.tangleCrown ?? 0)}  τ(K|QC)=${formatReal(wb.tangleJoint ?? 0)}`,
		);
		lines.push(describeMonogamy(monogamy));
	}
	return lines;
}

export function refreshManuscript(col: AcademicColloquiumState) {
	const wb = col.proofWorkbench;
	const { boundary, jacobian, chsh, monogamy } = readWorkbench(wb);
	const defect = boundary.leakI ** 2 + (boundary.weight5 - 1) ** 2;
	wb.boundaryGaugeVerified = boundary.monarchAbsent;
	wb.jacobianNonsingular = jacobian.nonsingular;
	wb.hermitianBoundaryBalanced = boundary.hermitian;
	wb.surfaceCommutatorOffset = boundary.leakI;
	wb.chshS = chsh.s;
	wb.purityEstimate = 1 / (1 + defect);
	wb.monogamyLemmaAnnotated = monogamy.crownExcluded;
	wb.lastVerificationMessage = [
		describeBoundary(boundary),
		describeJacobian(jacobian),
		`CHSH S = ${formatReal(chsh.s)}.`,
		describeMonogamy(monogamy),
	].join(" ");
	col.entanglementSwapUnlocked = monogamy.crownExcluded;
}

export function reviewerReport(
	round: 1 | 2 | 3,
	wb: LemmaProofWorkbenchState,
	meta: { hIndex: number; rookHIndex: number; citationsAttached: boolean },
): string {
	const { boundary, jacobian, chsh, monogamy } = readWorkbench(wb);
	const proved = boundary.monarchAbsent && jacobian.nonsingular;
	const citation = meta.citationsAttached
		? "The rectilinear citations are present and do not bear on the cut."
		: "The manuscript also fails to cite Rook (2021), Rook (2023), or Rook (2025).";

	if (round === 1) {
		return `DECISION: REJECT.\n\nReferee Report (Reviewer #2):\n"Section 4 writes ψ(t₀−1) = (${formatReal(wb.boundaryAlpha)} I + ${formatReal(wb.boundaryBeta)} γ₅) ψ(t₀). ${describeBoundary(boundary)} The Jacobian has κ₁₂ = ${formatReal(wb.jacobianKappa12)}, κ₂₁ = ${formatReal(wb.jacobianKappa21)}. ${describeJacobian(jacobian)} ${citation} Deservedly rejected."`;
	}
	if (round === 2) {
		return `DECISION: REJECT (2nd Submission).\n\nReferee Report (Reviewer #2):\n"The revised correlator is S = ${formatReal(chsh.s)}. The classical bound is 2 and the Tsirelson bound is ${formatReal(TSIRELSON_BOUND)}. ${describeJacobian(jacobian)} I remain philosophically opposed to retrocausal regicide. My h-index is ${meta.rookHIndex}; the author's is ${meta.hIndex}. Reject."`;
	}
	const mathLine = proved
		? `The crown sector does not return as itself while the orthogonal sector does, and the Jacobian has no real pole.${monogamy.crownExcluded ? " The CKW appendix excludes the crown tangle." : " There is still no monogamy appendix."} This is offensive to classical hierarchy.`
		: `And the central claim is still false. ${describeBoundary(boundary)} ${describeJacobian(jacobian)}`;
	return `DECISION: FINAL REJECTION (3rd Submission — Editorial Ban).\n\nReferee Report (Reviewer #2):\n"This is the third time Dr. Pawn has submitted 'On the Nonexistence of Monarchs in Retrocausal Systems.' ${mathLine} Do not resubmit to the Journal of Transfinite Causality."`;
}
