import { describe, test, expect } from 'vitest';
import { alignAndEvaluate } from '../lib/alignment';

/**
 * Automated Unit Tests for the Inside English v2.0 Speech Alignment Algorithm.
 * Guarantees that future updates cannot regress our evaluation scoring formulas (Resolves Blocker #1).
 */
describe('Shadowing Speech Alignment Engine', () => {

  test('should return a perfect 100% score for exact case-insensitive matches', () => {
    const target = "Today I woke up early.";
    const transcript = "today i woke up early";

    const result = alignAndEvaluate(target, transcript);

    expect(result.score).toBe(100);
    expect(result.words).toHaveLength(5);
    result.words.forEach(w => {
      expect(w.status).toBe('match');
    });
  });

  test('should identify close pronunciation/spelling warnings and calculate intermediate scores', () => {
    const target = "Today I woke up early.";
    // \"woke\" -> \"wake\" has high similarity (distance=1, maxLen=4, similarity=0.75 >= 0.6) -> warn
    const transcript = "Today I wake up early.";

    const result = alignAndEvaluate(target, transcript);

    expect(result.score).toBe(90); // 4 matches (400) + 1 warning (50) = 450 / 500 = 90%
    expect(result.words[2].word).toBe('woke');
    expect(result.words[2].status).toBe('warn');
    expect(result.words[2].transcribedAs).toBe('wake');
  });

  test('should identify completely skipped or incorrect words as misses', () => {
    const target = "Today I woke up early.";
    // "woke" completely missing
    const transcript = "Today I up early.";

    const result = alignAndEvaluate(target, transcript);

    expect(result.score).toBe(80); // 4 matches (400) + 1 miss (0) = 400 / 500 = 80%
    expect(result.words[2].word).toBe('woke');
    expect(result.words[2].status).toBe('miss');
  });

  test('should gracefully handle empty or unaligned token sets', () => {
    const target = "";
    const transcript = "Hello world";

    const result = alignAndEvaluate(target, transcript);

    expect(result.score).toBe(0);
    expect(result.words).toHaveLength(0);
  });
});
