export const DEFAULT_BASE_COLOR = '#EF002B';
export const DEFAULT_SIZE = 60;
export const DEFAULT_FULL_AFTER_TAPS = 10;
export const DEFAULT_FULL_AFTER_MS = 2_400;
export const DEFAULT_HEART_COLORS = [
  '#ff5570',
  '#ff8b45',
  '#f4c84c',
  '#5ed28e',
  '#52b9d9',
  '#6495ed',
  '#9b78eb',
  '#e46cc4',
] as const;

export const DEFAULT_PARTICLE_WEIGHTS = {
  heart: 0.65,
  pen: 0.27,
  stout: 0.08,
} as const;

export type CelebrationIcon = 'heart' | 'pen' | 'stout';
export type StoutLevel = 'full' | 'split';

export type CelebrationMeter = {
  startedAt: number;
  lastTapAt: number | null;
  count: number;
  lastFullAt: number;
};

export type CelebrationThreshold = {
  taps: number;
  durationMs: number;
};

export type ParticleWeights = {
  heart: number;
  pen: number;
  stout: number;
};

export type CelebrationParticleBudget = {
  limit: number;
  fullScreenCount: number;
};

const HEX_COLOR = /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i;
export const CELEBRATION_STREAK_GAP_MS = 800;
const CELEBRATION_FULL_COOLDOWN_MS = 6_000;

export function parseHexColor(value: string | null, fallback: string): string {
  const candidate = value?.trim();
  return candidate && HEX_COLOR.test(candidate) ? candidate : fallback;
}

export function parseHexColorList(
  value: string | null,
  fallback: readonly string[] = DEFAULT_HEART_COLORS,
): string[] {
  if (!value) return [...fallback];
  const colors = value
    .split(',')
    .map((color) => color.trim())
    .filter((color) => HEX_COLOR.test(color));
  return colors.length > 0 ? colors : [...fallback];
}

export function parseBoundedNumber(
  value: string | null,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  if (value === null || value.trim() === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback;
}

export function normalizeParticleWeights(values: Partial<ParticleWeights>): ParticleWeights {
  const heart = validWeight(values.heart, DEFAULT_PARTICLE_WEIGHTS.heart);
  const pen = validWeight(values.pen, DEFAULT_PARTICLE_WEIGHTS.pen);
  const stout = validWeight(values.stout, DEFAULT_PARTICLE_WEIGHTS.stout);
  const total = heart + pen + stout;
  if (total <= 0) return { ...DEFAULT_PARTICLE_WEIGHTS };
  return { heart: heart / total, pen: pen / total, stout: stout / total };
}

function validWeight(value: number | undefined, fallback: number): number {
  return value === undefined || !Number.isFinite(value) || value < 0 || value > 100
    ? fallback
    : value;
}

export function celebrationIconForRoll(
  roll: number,
  weights: ParticleWeights = DEFAULT_PARTICLE_WEIGHTS,
): CelebrationIcon {
  if (roll < weights.heart) return 'heart';
  if (roll < weights.heart + weights.pen) return 'pen';
  return 'stout';
}

export function celebrationStoutLevelForRoll(roll: number): StoutLevel {
  return roll < 1 / 3 ? 'split' : 'full';
}

export function celebrationBurstSize(gapMs: number | null, streakCount: number): number {
  const pace =
    gapMs === null ? 1 : gapMs < 140 ? 6 : gapMs < 240 ? 5 : gapMs < 420 ? 3 : gapMs < 700 ? 2 : 1;
  return Math.min(10, pace + Math.floor(Math.min(streakCount, 12) / 4));
}

export function celebrationParticleBudget(
  width: number,
  height: number,
  compact: boolean,
): CelebrationParticleBudget {
  if (compact) {
    return {
      limit: 84,
      fullScreenCount: Math.min(64, Math.max(40, Math.round((width * height) / 8_500))),
    };
  }
  return {
    limit: 140,
    fullScreenCount: Math.min(92, Math.max(52, Math.round((width * height) / 7_000))),
  };
}

export function advanceCelebrationMeter(
  previous: CelebrationMeter,
  now: number,
  threshold: CelebrationThreshold = {
    taps: DEFAULT_FULL_AFTER_TAPS,
    durationMs: DEFAULT_FULL_AFTER_MS,
  },
): { meter: CelebrationMeter; fullScreen: boolean } {
  const continued =
    previous.lastTapAt !== null && now - previous.lastTapAt <= CELEBRATION_STREAK_GAP_MS;
  const startedAt = continued ? previous.startedAt : now;
  const count = continued ? previous.count + 1 : 1;
  const fullScreen =
    count >= threshold.taps &&
    now - startedAt >= threshold.durationMs &&
    now - previous.lastFullAt >= CELEBRATION_FULL_COOLDOWN_MS;
  return {
    meter: {
      startedAt: fullScreen ? now : startedAt,
      lastTapAt: now,
      count: fullScreen ? 1 : count,
      lastFullAt: fullScreen ? now : previous.lastFullAt,
    },
    fullScreen,
  };
}
