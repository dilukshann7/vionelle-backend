export type SkinSeason = "menstrual" | "follicular" | "ovulation" | "luteal" | "unknown";
export type Confidence = "high" | "medium" | "low";

type CalculateCycleSeasonInput = {
  today?: string;
  lastPeriodStart: string | null;
  averageCycleDays: number;
  averagePeriodDays: number;
};

type CycleSeasonResult = {
  season: SkinSeason;
  cycleDay: number | null;
  confidence: Confidence;
  reason: string;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseDateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export function calculateCycleSeason(input: CalculateCycleSeasonInput): CycleSeasonResult {
  if (!input.lastPeriodStart) {
    return {
      season: "unknown",
      cycleDay: null,
      confidence: "low",
      reason: "Add your last period start date to estimate a skin season.",
    };
  }

  const today = parseDateOnly(input.today ?? new Date().toISOString().slice(0, 10));
  const lastPeriodStart = parseDateOnly(input.lastPeriodStart);
  const averageCycleDays = Math.max(input.averageCycleDays || 28, 1);
  const averagePeriodDays = Math.max(input.averagePeriodDays || 5, 1);
  const daysSinceStart = Math.floor((today.getTime() - lastPeriodStart.getTime()) / MS_PER_DAY);
  const cycleDay = (((daysSinceStart % averageCycleDays) + averageCycleDays) % averageCycleDays) + 1;

  if (cycleDay <= averagePeriodDays) {
    return {
      season: "menstrual",
      cycleDay,
      confidence: "medium",
      reason: "You are within the logged period window.",
    };
  }

  const ovulationDay = Math.max(averageCycleDays - 14, averagePeriodDays + 1);
  if (Math.abs(cycleDay - ovulationDay) <= 2) {
    return {
      season: "ovulation",
      cycleDay,
      confidence: "medium",
      reason: "You are near the estimated ovulation window.",
    };
  }

  if (cycleDay > ovulationDay + 2) {
    return {
      season: "luteal",
      cycleDay,
      confidence: "medium",
      reason: "You are after the estimated ovulation window.",
    };
  }

  return {
    season: "follicular",
    cycleDay,
    confidence: "medium",
    reason: "You are between period days and the estimated ovulation window.",
  };
}
