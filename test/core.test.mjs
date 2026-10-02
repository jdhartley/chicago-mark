import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_HEART_COLORS,
  advanceCelebrationMeter,
  celebrationBurstSize,
  celebrationIconForRoll,
  celebrationParticleBudget,
  normalizeParticleWeights,
  normalizeWeightList,
  parseBoundedNumber,
  parseHexColor,
  parseHexColorList,
  particleWeight,
  pickWeightedIndex,
} from '../dist/core.js';

test('validates colors and numeric attributes', () => {
  assert.equal(parseHexColor('#EF002B', '#000'), '#EF002B');
  assert.equal(parseHexColor('red', '#000'), '#000');
  assert.equal(parseHexColor('#12', '#000'), '#000');
  assert.deepEqual(parseHexColorList('#fff, nope, #112233'), ['#fff', '#112233']);
  assert.deepEqual(parseHexColorList('nope'), [...DEFAULT_HEART_COLORS]);
  assert.equal(parseBoundedNumber('24', 60, 24, 240), 24);
  assert.equal(parseBoundedNumber('241', 60, 24, 240), 60);
});

test('normalizes configurable particle weights and retains safe defaults', () => {
  assert.deepEqual(normalizeParticleWeights({ heart: 2, pen: 1, stout: 1 }), {
    heart: 0.5,
    pen: 0.25,
    stout: 0.25,
  });
  assert.deepEqual(normalizeParticleWeights({ heart: 0, pen: 0, stout: 0 }), {
    heart: 0.65,
    pen: 0.27,
    stout: 0.08,
  });
  const weights = normalizeParticleWeights({ heart: 1, pen: 1, stout: 2 });
  assert.equal(celebrationIconForRoll(0.24, weights), 'heart');
  assert.equal(celebrationIconForRoll(0.49, weights), 'pen');
  assert.equal(celebrationIconForRoll(0.5, weights), 'stout');
});

test('scales bursts with cadence while keeping each tap bounded', () => {
  assert.equal(celebrationBurstSize(null, 1), 1);
  assert.ok(celebrationBurstSize(110, 8) > celebrationBurstSize(360, 8));
  assert.equal(celebrationBurstSize(10, 100), 9);
});

test('uses compact and desktop particle budgets', () => {
  assert.deepEqual(celebrationParticleBudget(420, 761, true), {
    limit: 84,
    fullScreenCount: 40,
  });
  assert.deepEqual(celebrationParticleBudget(1440, 900, false), {
    limit: 140,
    fullScreenCount: 92,
  });
});

test('requires a sustained streak and honors custom thresholds and cooldowns', () => {
  let meter = { startedAt: 0, lastTapAt: null, count: 0, lastFullAt: -Infinity };
  let fullScreen = false;
  for (let now = 0; now <= 2700; now += 300) {
    ({ meter, fullScreen } = advanceCelebrationMeter(meter, now));
  }
  assert.equal(fullScreen, true);
  assert.equal(advanceCelebrationMeter(meter, 3000).fullScreen, false);
  assert.equal(advanceCelebrationMeter(meter, 3700).fullScreen, false);

  meter = { startedAt: 0, lastTapAt: null, count: 0, lastFullAt: -Infinity };
  ({ meter } = advanceCelebrationMeter(meter, 0, { taps: 3, durationMs: 500 }));
  ({ meter } = advanceCelebrationMeter(meter, 250, { taps: 3, durationMs: 500 }));
  assert.equal(
    advanceCelebrationMeter(meter, 500, { taps: 3, durationMs: 500 }).fullScreen,
    true,
  );
});

test('normalizes mixed built-in and custom particle weights', () => {
  assert.deepEqual(normalizeWeightList([2, 1, 1]), [0.5, 0.25, 0.25]);
  assert.deepEqual(normalizeWeightList([1, Number.NaN, -1, 101, 1]), [0.5, 0, 0, 0, 0.5]);
  assert.equal(normalizeWeightList([0, 0]), null);
  assert.equal(normalizeWeightList([]), null);
  assert.equal(particleWeight(undefined, 0.27), 0.27);
  assert.equal(particleWeight(0, 0.27), 0);
  assert.equal(particleWeight(-1, 0.27), 0.27);
});

test('picks weighted indexes and never lands on a zero-weight tail', () => {
  const weights = [0.5, 0, 0.25, 0.25];
  assert.equal(pickWeightedIndex(0, weights), 0);
  assert.equal(pickWeightedIndex(0.49, weights), 0);
  assert.equal(pickWeightedIndex(0.5, weights), 2);
  assert.equal(pickWeightedIndex(0.74, weights), 2);
  assert.equal(pickWeightedIndex(0.75, weights), 3);
  assert.equal(pickWeightedIndex(0.999999, [0.5, 0.5, 0]), 1);
  assert.equal(pickWeightedIndex(1, [0.5, 0.5, 0]), 1);
});
