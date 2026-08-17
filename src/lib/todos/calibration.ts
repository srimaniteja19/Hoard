/**
 * Estimate calibration — TODOS.md §6.
 *
 * Pure, no imports. A multiplier from a handful of samples is noise dressed
 * as insight, so this returns null below the sample floors rather than ever
 * shipping a number nobody should trust yet.
 */

export type Energy = "DEEP" | "SHALLOW" | "ERRAND";

export type CalibrationSample = {
  estimated: number;
  actual: number;
  energy: Energy;
};

export type CalibrationResult = {
  overall: number | null;
  byEnergy: Record<Energy, number | null>;
  sampleCount: number;
};

const OVERALL_MIN_SAMPLES = 30;
const PER_ENERGY_MIN_SAMPLES = 15;
const ENERGIES: Energy[] = ["DEEP", "SHALLOW", "ERRAND"];

/** Mean of actual/estimated across samples — "on average, tasks take Nx the estimate." */
function multiplierOf(samples: CalibrationSample[]): number {
  const sum = samples.reduce((acc, s) => acc + s.actual / s.estimated, 0);
  return Math.round((sum / samples.length) * 100) / 100;
}

export function calibration(samples: CalibrationSample[]): CalibrationResult {
  const usable = samples.filter((s) => s.estimated > 0 && s.actual > 0);

  const overall = usable.length >= OVERALL_MIN_SAMPLES ? multiplierOf(usable) : null;

  const byEnergy = ENERGIES.reduce((acc, energy) => {
    const forEnergy = usable.filter((s) => s.energy === energy);
    acc[energy] = forEnergy.length >= PER_ENERGY_MIN_SAMPLES ? multiplierOf(forEnergy) : null;
    return acc;
  }, {} as Record<Energy, number | null>);

  return { overall, byEnergy, sampleCount: usable.length };
}
