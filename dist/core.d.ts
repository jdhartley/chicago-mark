export declare const DEFAULT_BASE_COLOR = "#EF002B";
export declare const DEFAULT_SIZE = 60;
export declare const DEFAULT_FULL_AFTER_TAPS = 10;
export declare const DEFAULT_FULL_AFTER_MS = 2400;
export declare const DEFAULT_HEART_COLORS: readonly ["#ff5570", "#ff8b45", "#f4c84c", "#5ed28e", "#52b9d9", "#6495ed", "#9b78eb", "#e46cc4"];
export declare const DEFAULT_PARTICLE_WEIGHTS: {
    readonly heart: 0.65;
    readonly pen: 0.27;
    readonly stout: 0.08;
};
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
export declare const CELEBRATION_STREAK_GAP_MS = 800;
export declare function parseHexColor(value: string | null, fallback: string): string;
export declare function parseHexColorList(value: string | null, fallback?: readonly string[]): string[];
export declare function parseBoundedNumber(value: string | null, fallback: number, minimum: number, maximum: number): number;
export declare function normalizeParticleWeights(values: Partial<ParticleWeights>): ParticleWeights;
export declare function celebrationIconForRoll(roll: number, weights?: ParticleWeights): CelebrationIcon;
export declare function celebrationStoutLevelForRoll(roll: number): StoutLevel;
export declare function celebrationBurstSize(gapMs: number | null, streakCount: number): number;
export declare function celebrationParticleBudget(width: number, height: number, compact: boolean): CelebrationParticleBudget;
export declare function advanceCelebrationMeter(previous: CelebrationMeter, now: number, threshold?: CelebrationThreshold): {
    meter: CelebrationMeter;
    fullScreen: boolean;
};
