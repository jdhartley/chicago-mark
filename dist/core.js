export const DEFAULT_BASE_COLOR = '#EF002B';
export const DEFAULT_SIZE = 60;
export const DEFAULT_FULL_AFTER_TAPS = 10;
export const DEFAULT_FULL_AFTER_MS = 2_400;
export const DEFAULT_HOLD_MS = 2_000;
export const DEFAULT_INK_COLOR = '#27467a';
export const DEFAULT_HEART_COLORS = [
    '#ff5570',
    '#ff8b45',
    '#f4c84c',
    '#5ed28e',
    '#52b9d9',
    '#6495ed',
    '#9b78eb',
    '#e46cc4',
];
export const DEFAULT_PARTICLE_WEIGHTS = {
    heart: 0.65,
    pen: 0.27,
    stout: 0.08,
};
const HEX_COLOR = /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i;
export const CELEBRATION_STREAK_GAP_MS = 800;
const CELEBRATION_FULL_COOLDOWN_MS = 6_000;
export function parseHexColor(value, fallback) {
    const candidate = value?.trim();
    return candidate && HEX_COLOR.test(candidate) ? candidate : fallback;
}
export function parseHexColorList(value, fallback = DEFAULT_HEART_COLORS) {
    if (!value)
        return [...fallback];
    const colors = value
        .split(',')
        .map((color) => color.trim())
        .filter((color) => HEX_COLOR.test(color));
    return colors.length > 0 ? colors : [...fallback];
}
export function parseBoundedNumber(value, fallback, minimum, maximum) {
    if (value === null || value.trim() === '')
        return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback;
}
export function normalizeParticleWeights(values) {
    const heart = validWeight(values.heart, DEFAULT_PARTICLE_WEIGHTS.heart);
    const pen = validWeight(values.pen, DEFAULT_PARTICLE_WEIGHTS.pen);
    const stout = validWeight(values.stout, DEFAULT_PARTICLE_WEIGHTS.stout);
    const total = heart + pen + stout;
    if (total <= 0)
        return { ...DEFAULT_PARTICLE_WEIGHTS };
    return { heart: heart / total, pen: pen / total, stout: stout / total };
}
function validWeight(value, fallback) {
    return value === undefined || !Number.isFinite(value) || value < 0 || value > 100
        ? fallback
        : value;
}
/** One raw particle weight, or the fallback when it is missing or outside 0–100. */
export function particleWeight(value, fallback) {
    return validWeight(value, fallback);
}
/**
 * Normalizes a list of raw weights so they sum to one. Invalid entries count as zero; a list with
 * no positive weight returns null so the caller can fall back to its defaults.
 */
export function normalizeWeightList(weights) {
    const safe = weights.map((weight) => Number.isFinite(weight) && weight > 0 && weight <= 100 ? weight : 0);
    const total = safe.reduce((sum, weight) => sum + weight, 0);
    if (total <= 0)
        return null;
    return safe.map((weight) => weight / total);
}
/** The index a roll in [0, 1) lands on in a normalized weight list. */
export function pickWeightedIndex(roll, normalized) {
    let edge = 0;
    for (let index = 0; index < normalized.length; index += 1) {
        edge += normalized[index] ?? 0;
        if (roll < edge)
            return index;
    }
    for (let index = normalized.length - 1; index >= 0; index -= 1) {
        if ((normalized[index] ?? 0) > 0)
            return index;
    }
    return 0;
}
export function celebrationIconForRoll(roll, weights = DEFAULT_PARTICLE_WEIGHTS) {
    if (roll < weights.heart)
        return 'heart';
    if (roll < weights.heart + weights.pen)
        return 'pen';
    return 'stout';
}
export function celebrationStoutLevelForRoll(roll) {
    return roll < 1 / 3 ? 'split' : 'full';
}
export function celebrationBurstSize(gapMs, streakCount) {
    const pace = gapMs === null ? 1 : gapMs < 140 ? 6 : gapMs < 240 ? 5 : gapMs < 420 ? 3 : gapMs < 700 ? 2 : 1;
    return Math.min(10, pace + Math.floor(Math.min(streakCount, 12) / 4));
}
export function celebrationParticleBudget(width, height, compact) {
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
export function advanceCelebrationMeter(previous, now, threshold = {
    taps: DEFAULT_FULL_AFTER_TAPS,
    durationMs: DEFAULT_FULL_AFTER_MS,
}) {
    const continued = previous.lastTapAt !== null && now - previous.lastTapAt <= CELEBRATION_STREAK_GAP_MS;
    const startedAt = continued ? previous.startedAt : now;
    const count = continued ? previous.count + 1 : 1;
    const fullScreen = count >= threshold.taps &&
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
