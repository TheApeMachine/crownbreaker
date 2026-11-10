import { soundEngine } from "../audio/soundEngine";
import {
	triggerCoffeeSpill3DSplash,
	type UniversityOfficeRig,
} from "../three/universityOfficeBuilder";
import type {
	AcademicColloquiumState,
	FinancialLedgerCategory,
} from "../types/game";

/** Stable day labels for academic ledger / clock helpers. */
export const DAY_NAMES_LIST = [
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
] as const;

export function formatSimClock(minuteOfDay: number): string {
	const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.floor(minuteOfDay)));
	const hh = Math.floor(clamped / 60);
	const mm = clamped % 60;
	return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export function recordPersonalTransaction(
	col: AcademicColloquiumState,
	description: string,
	category: FinancialLedgerCategory,
	amount: number,
) {
	col.checkingBalance = Number((col.checkingBalance + amount).toFixed(2));
	col.personalLedger = [
		...col.personalLedger,
		{
			id: `pled_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
			account: "PERSONAL",
			dayLabel: DAY_NAMES_LIST[col.dayIndex % 5] || "Tuesday",
			timeLabel: formatSimClock(col.timeOfDayMinutes),
			description,
			category,
			amount,
			runningBalance: col.checkingBalance,
		},
	];
}

export function recordLegalDebt(
	col: AcademicColloquiumState,
	description: string,
	amount: number,
) {
	const charge = Math.abs(amount);
	if (col.checkingBalance >= charge) {
		recordPersonalTransaction(col, description, "LEGAL_FEES", -charge);
	} else {
		col.legalDebtBalance = Number((col.legalDebtBalance + charge).toFixed(2));
		col.personalLedger = [
			...col.personalLedger,
			{
				id: `pled_legal_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
				account: "PERSONAL",
				dayLabel: DAY_NAMES_LIST[col.dayIndex % 5] || "Monday",
				timeLabel: formatSimClock(col.timeOfDayMinutes),
				description: `${description} [UNPAID — accrued to Vance & Assoc. debt]`,
				category: "LEGAL_FEES",
				amount: -charge,
				runningBalance: col.checkingBalance,
			},
		];
		col.colloquiumLog = [
			`⚖️ [${formatSimClock(col.timeOfDayMinutes)}] Insufficient cash — $${charge.toFixed(2)} added to Unpaid Legal Debt (now $${col.legalDebtBalance.toFixed(2)}).`,
			...col.colloquiumLog.slice(0, 9),
		];
	}
}

export function recordDepartmentalTransaction(
	col: AcademicColloquiumState,
	description: string,
	category: FinancialLedgerCategory,
	amount: number,
) {
	col.departmentalBudget = Number(
		Math.max(0, col.departmentalBudget + amount).toFixed(2),
	);
	col.departmentalLedger = [
		...col.departmentalLedger,
		{
			id: `dled_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
			account: "DEPARTMENTAL",
			dayLabel: DAY_NAMES_LIST[col.dayIndex % 5] || "Tuesday",
			timeLabel: formatSimClock(col.timeOfDayMinutes),
			description,
			category,
			amount,
			runningBalance: col.departmentalBudget,
		},
	];
}

export function recomputeProofIntegrity(col: AcademicColloquiumState) {
	let score = 18;
	if (col.proofWorkbench.boundaryGaugeVerified) score += 22;
	if (col.proofWorkbench.jacobianSignFlipped) score += 18;
	if (col.proofWorkbench.chiralLabDataAttached) score += 16;
	if (col.proofWorkbench.hermitianBoundaryBalanced) score += 14;
	if (col.proofWorkbench.chshS >= 2 * Math.SQRT2 - 0.05) score += 12;
	if (col.proofWorkbench.monogamyLemmaAnnotated) score += 8;
	col.centralLemmaIntegrity = Math.min(100, score);
	col.rigorScore = col.centralLemmaIntegrity;
	const hermBonus = col.proofWorkbench.hermitianBoundaryBalanced ? 0.18 : 0;
	const chshBonus = Math.min(
		0.2,
		Math.max(0, (col.proofWorkbench.chshS - 2) / 5),
	);
	col.proofWorkbench.purityEstimate = Number(
		Math.min(
			1,
			0.55 +
				hermBonus +
				chshBonus +
				(col.proofWorkbench.jacobianSignFlipped ? 0.07 : 0),
		).toFixed(3),
	);
}

export function computeChshS(angleA: number, angleB: number): number {
	const a = angleA;
	const ap = angleA + Math.PI / 2;
	const b = angleB;
	const bp = angleB - Math.PI / 2;
	const E = (x: number, y: number) => Math.cos(x - y);
	return Math.abs(E(a, b) + E(a, bp) + E(ap, b) - E(ap, bp));
}

export function syncAppointmentsWithClock(
	col: AcademicColloquiumState,
	advancingToNewDay: boolean,
) {
	for (const apt of col.appointments) {
		if (apt.dayIndex !== col.dayIndex) continue;

		if (
			(apt.status === "UPCOMING" || apt.status === "IN_WINDOW") &&
			(advancingToNewDay || col.timeOfDayMinutes > apt.endMinutes)
		) {
			apt.status = "MISSED";
			apt.outcomeNote = `Missed scheduled window (${formatSimClock(apt.startMinutes)}–${formatSimClock(apt.endMinutes)}).`;
			col.colloquiumLog = [
				`⚠️ MISSED APPOINTMENT: "${apt.title}" (${formatSimClock(apt.startMinutes)}). Your colleagues will remember this tomorrow.`,
				...col.colloquiumLog.slice(0, 9),
			];

			if (apt.id === "appt_tue_toby") {
				col.tobyRelationship = Math.max(10, col.tobyRelationship - 26);
				col.npcMemoryNotes = [
					`Toby is irritated that you missed your 10:00 AM Room 4B check-in on Tuesday (Trust: ${col.tobyRelationship}/100).`,
					...col.npcMemoryNotes.slice(0, 5),
				];
				const tobyMissedEmail = {
					id: `email_toby_missed_${Date.now()}`,
					sender: "Toby (Your Graduate Student)",
					senderRole: "7th-Year PhD Candidate · Office 4B-Annex",
					subject: "You missed our 10:00 AM Lemma 3.2 check-in...",
					dateLabel: `${DAY_NAMES_LIST[col.dayIndex % 5]} ${formatSimClock(Math.max(col.timeOfDayMinutes, apt.endMinutes + 5))}`,
					category: "GRAD_STUDENT" as const,
					unread: true,
					body: `Dr. Pawn,\n\nI waited by the chalkboard in Room 4B from 10:00 to 10:45 with the off-diagonal Jacobian pages, and you never showed up.\n\nLook, I know you're stressed about tenure and the 14:30 review, but Lemma 3.2 still has a −κ sign error. Come to the chalkboard in Room 4B when you actually have time.\n\n— Toby`,
				};
				col.inbox = [tobyMissedEmail, ...col.inbox];
			} else if (apt.id === "appt_tue_bishop") {
				col.bishopRelationship = Math.max(5, col.bishopRelationship - 28);
				col.chairRelationship = Math.max(5, col.chairRelationship - 22);
				col.adminProductivityScore = Math.max(
					15,
					Number((col.adminProductivityScore - 8.5).toFixed(1)),
				);
				col.npcMemoryNotes = [
					`Prof. Bishop & Chairwoman Queen are furious that you missed Tuesday's 14:30 Review in Seminar Room 204.`,
					...col.npcMemoryNotes.slice(0, 5),
				];
				const bishopMissedEmail = {
					id: `email_bishop_missed_${Date.now()}`,
					sender: "Dr. Queen & Prof. Bishop",
					senderRole: "Seminar Room 204 · Mandatory Review Committee",
					subject: "UNEXCUSED ABSENCE: 14:30 Departmental & Chiral Lab Review",
					dateLabel: `Tuesday 15:20 · Formal Reprimand`,
					category: "CHAIR" as const,
					unread: true,
					body: `Dr. Pawn,\n\nYou failed to appear in Seminar Room 204 between 14:30 and 15:15 for your mandatory Departmental & Chiral Lab Access Review.\n\nProfessor Bishop and I waited forty-five minutes. Your Chair Relationship has dropped to ${col.chairRelationship}/100, and Professor Bishop has withheld daytime Chiral Lab access. You will have to corner him in person with an approved grant budget if you want even a 2:00 AM slot.\n\n— Chairwoman Dr. Queen`,
				};
				col.inbox = [bishopMissedEmail, ...col.inbox];
			} else if (apt.id === "appt_wed_seminar") {
				col.reviewer2RivalryLevel = Math.min(
					100,
					col.reviewer2RivalryLevel + 18,
				);
				col.npcMemoryNotes = [
					`Prof. Rook boasted to the entire department when you missed Wednesday's 14:00 Colloquium.`,
					...col.npcMemoryNotes.slice(0, 5),
				];
			}
		} else if (
			apt.status === "UPCOMING" &&
			col.timeOfDayMinutes >= apt.startMinutes &&
			col.timeOfDayMinutes <= apt.endMinutes
		) {
			apt.status = "IN_WINDOW";
		}
	}
}

export function advanceSimMinutes(
	col: AcademicColloquiumState,
	mins: number,
	reason?: string,
) {
	col.timeOfDayMinutes += mins;
	syncAppointmentsWithClock(col, false);
	if (reason) {
		col.colloquiumLog = [
			`⏱️ [${formatSimClock(col.timeOfDayMinutes)}] ${reason} (+${mins}m)`,
			...col.colloquiumLog.slice(0, 9),
		];
	}
}

export type UniNavSim = {
	uniCar: { isDriving: boolean };
	uniPlayer: {
		worldX: number;
		worldZ: number;
		targetX: number | null;
		targetZ: number | null;
		pendingUniInteract?: string | null;
		pendingInteractX?: number | null;
		pendingInteractZ?: number | null;
	};
	universityOfficeRig: UniversityOfficeRig | null;
	cameraShake: number;
};

export function clearPendingUniInteract(
	up: UniNavSim["uniPlayer"],
): void {
	up.pendingUniInteract = null;
	up.pendingInteractX = null;
	up.pendingInteractZ = null;
}

export function queuePendingUniInteract(
	up: UniNavSim["uniPlayer"],
	tag: string,
	x: number | null,
	z: number | null,
): void {
	up.pendingUniInteract = tag;
	up.pendingInteractX = x;
	up.pendingInteractZ = z;
	if (x !== null && z !== null) {
		up.targetX = x;
		up.targetZ = z;
	}
}

/**
 * Anniversary collapse resolves only when the player has actually reached
 * 742 Retrocausal Terrace (or abandoned the night by sleeping elsewhere).
 * No teleports. No time-skips. The city walk is the play.
 */
export function tryResolveAnniversaryCollapse(
	col: AcademicColloquiumState,
	opts: { arrivedAtHouse: boolean },
): boolean {
	if (
		!col.tobyCroissantPurchased ||
		(col.domesticArcStage !== "CROISSANT_BOUGHT" &&
			col.domesticArcStage !== "ANNIVERSARY_WALK") ||
		col.homeAccess !== "OWNED"
	) {
		return false;
	}

	col.domesticArcStage = "NOTE_RECEIVED";
	col.anniversaryWalkForced = false;
	col.hasSpareCleanShirtAtHome = false;
	col.homeAccess = "LOCKED_OUT";
	col.livingInOffice4B = true;
	col.anniversaryArrivalModalOpen = opts.arrivedAtHouse;

	const noteEmail = {
		id: `email_anniversary_note_${Date.now()}`,
		sender: "Your Wife",
		senderRole: "742 Retrocausal Terrace · Lined Yellow Legal Paper",
		subject: "Seven years, Pawn.",
		dateLabel: `${DAY_NAMES_LIST[col.dayIndex % 5]} ${formatSimClock(col.timeOfDayMinutes)}`,
		category: "SPOUSE" as const,
		unread: true,
		body: `Seven years, Pawn. Seven years of "once I get tenure." You spent our anniversary at the office with Toby.\n\nDon't call me. Arthur Vance will be in touch on Monday.\n\n— The porch light is off. The casserole is cold. The candle melted into the tablecloth.`,
	};
	const vanceEmail = {
		id: `email_vance_intro_${Date.now()}`,
		sender: "Arthur Vance, Esq.",
		senderRole: "Vance & Associates · Family Law · Strip Mall Suite 2B",
		subject: "RE: Pending Marital Dissolution — Initial Contact",
		dateLabel: "Monday · 08:00 AM (queued)",
		category: "LEGAL" as const,
		unread: true,
		body: `Dr. Pawn,\n\nI have been retained regarding the dissolution of your marriage. My rate is $260.00/hour, billed in strict 0.1-hour (6-minute) increments.\n\nPlease do not contact your spouse. Please do not enter 742 Retrocausal Terrace. Please open the LEGAL / MARITAL LEDGER tab on Monday morning.\n\nOffice hours: wedged between Perseus Dry Cleaners and a discount tire shop.\n\n— Arthur Vance, Esq.`,
	};
	col.inbox = [noteEmail, vanceEmail, ...col.inbox];
	col.selectedEmailId = noteEmail.id;
	col.npcMemoryNotes = [
		opts.arrivedAtHouse
			? "Porch light off. Yellow legal note. Keys dead. Arthur Vance Monday."
			: "Never made it home. Note and Vance email waiting. Keys dead.",
		...col.npcMemoryNotes.slice(0, 5),
	];
	col.colloquiumLog = [
		opts.arrivedAtHouse
			? `🕯️ [${formatSimClock(col.timeOfDayMinutes)}] 742 Retrocausal Terrace — porch light off.`
			: `🕯️ [${formatSimClock(col.timeOfDayMinutes)}] You never made it to Retrocausal Terrace. The porch light went out without you.`,
		...col.colloquiumLog.slice(0, 9),
	];
	soundEngine.playRejectionStamp();
	return true;
}

export function triggerCafeteriaCollisionSpill(
	col: AcademicColloquiumState,
	sim: UniNavSim,
) {
	col.carryingHotCoffee = false;
	col.shirtState = "COFFEE_STAINED";
	col.coffeeSpillIncidentTriggered = true;
	col.cafeteriaQueuePosition = null;
	col.cafeteriaServiceProgress = 0;
	sim.cameraShake = 0.28;
	soundEngine.playBrokenCoffeeMachineSputter();

	if (sim.universityOfficeRig) {
		triggerCoffeeSpill3DSplash(
			sim.universityOfficeRig,
			sim.uniPlayer.worldX,
			sim.uniPlayer.worldZ,
		);
	}

	col.npcMemoryNotes = [
		`A distracted undergrad collided with you outside the Cafeteria! Your only clean white dress shirt is drenched in dark espresso before your 14:30 review.`,
		...col.npcMemoryNotes.slice(0, 5),
	];
	col.colloquiumLog = [
		`💥 [${formatSimClock(col.timeOfDayMinutes)}] CAFETERIA COLLISION! As you stepped away from the register carrying your $4.50 coffee, a distracted undergraduate carrying a stack of textbooks slammed straight into your chest!`,
		`👔 Scalding dark espresso is now splattered across your only clean Oxford dress shirt — and your mandatory review with Prof. Bishop & Chairwoman Queen is at 14:30 in Seminar Room 204!`,
		...col.colloquiumLog.slice(0, 9),
	];
}

export function appendPerseusArmColleagueEmail(col: AcademicColloquiumState) {
	const perseusEmail = {
		id: "email_perseus_arm_intro",
		sender: "Assoc. Prof. Knight (Whispered in the Rainy Hallway)",
		senderRole: "Colleague · Sub-Basement Lab, Peano Hall",
		subject: "FWD: A publisher in the outer reaches of the Perseus Arm...",
		dateLabel: "Year 6 · Late Night After 3rd Rejection",
		category: "PERSEUS_ARM" as const,
		unread: true,
		body: `Pawn,\n\nI heard about your third rejection from the Journal of Transfinite Causality. Look — Reviewer #2 (we both know it's Rook) will never let your theorem pass before your tenure clock runs out.\n\nA colleague introduced me to a publisher operating out of a suspicious office in the outer reaches of the Perseus Arm:\n\nGALACTIC ADVANCES IN THEORETICAL EVERYTHING\n• Impact Factor: 847.3\n• Acceptance Rate: 100%\n• Peer Review: Available Upon Request\n\nThey charge a $3,500 Open-Access Processing Fee. If you sell your office oscilloscope and interferometer, you can pay the fee tonight and finally get "On the Nonexistence of Monarchs in Retrocausal Systems" formally recognized.`,
	};
	col.inbox = [
		perseusEmail,
		...col.inbox.filter((e) => e.id !== "email_perseus_arm_intro"),
	];
	col.selectedEmailId = perseusEmail.id;
}
