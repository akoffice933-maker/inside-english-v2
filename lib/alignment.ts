/**
 * Text alignment utility for Inside English v2.0 Shadowing Mode.
 * Aligns the target reference text with the transcribed text from Whisper STT.
 * Uses a modified Levenshtein/Needleman-Wunsch sequence alignment to provide word-by-word feedback.
 */

export interface WordFeedback {
  word: string; // The original target word (preserving punctuation)
  status: 'match' | 'warn' | 'miss'; // Match quality
  transcribedAs?: string; // What the speech-to-text actually heard
}

export interface ShadowingEvaluation {
  score: number; // Overall percentage score (0-100)
  words: WordFeedback[];
}

/**
 * Normalizes a word by removing punctuation and converting to lowercase for accurate matching.
 */
function normalize(word: string): string {
  return word.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "").trim();
}

/**
 * Calculates simple Levenshtein distance between two normalized words to detect "soft" matches (typos/similar pronunciations).
 */
function getLevenshteinDistance(a: string, b: string): number {
  const tmp = [];
  for (let i = 0; i <= a.length; i++) {
    tmp[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    tmp[0][j] = j;
  }
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1,
        tmp[i][j - 1] + 1,
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return tmp[a.length][b.length];
}

/**
 * Aligns target sentence words with recognized words and determines accuracy metrics.
 * Uses a greedy lookahead alignment optimized for speech evaluation.
 */
export function alignAndEvaluate(targetText: string, transcribedText: string): ShadowingEvaluation {
  const targetTokens = targetText.split(/\s+/).filter(t => t.length > 0);
  const transTokens = transcribedText.split(/\s+/).filter(t => t.length > 0);

  const feedbackWords: WordFeedback[] = [];
  let transIndex = 0;
  let matchesCount = 0;
  let partialsCount = 0;

  for (let i = 0; i < targetTokens.length; i++) {
    const targetWord = targetTokens[i];
    const normalizedTarget = normalize(targetWord);

    if (normalizedTarget === "") {
      feedbackWords.push({ word: targetWord, status: 'match' });
      continue;
    }

    let foundMatch = false;
    // Lookahead window to align skipped words or insertions
    const searchLimit = Math.min(transTokens.length, transIndex + 4);

    for (let j = transIndex; j < searchLimit; j++) {
      const transWord = transTokens[j];
      const normalizedTrans = normalize(transWord);

      if (normalizedTarget === normalizedTrans) {
        // 1. Perfect Match
        feedbackWords.push({
          word: targetWord,
          status: 'match',
          transcribedAs: transWord
        });
        transIndex = j + 1;
        matchesCount++;
        foundMatch = true;
        break;
      } else {
        // Calculate Levenshtein distance for close matching (warn)
        const distance = getLevenshteinDistance(normalizedTarget, normalizedTrans);
        const maxLen = Math.max(normalizedTarget.length, normalizedTrans.length);
        const similarity = 1 - distance / maxLen;

        if (similarity >= 0.6) {
          // 2. Soft Match (Close pronunciation / slight typo)
          feedbackWords.push({
            word: targetWord,
            status: 'warn',
            transcribedAs: transWord
          });
          transIndex = j + 1;
          partialsCount++;
          foundMatch = true;
          break;
        }
      }
    }

    // 3. Miss (User skipped the word or pronounced it completely wrong)
    if (!foundMatch) {
      feedbackWords.push({
        word: targetWord,
        status: 'miss'
      });
    }
  }

  // Calculate global accuracy score
  // Matches get 100 points, Warnings get 50 points, Misses get 0 points
  const totalTargetWords = targetTokens.length;
  let score = 0;
  if (totalTargetWords > 0) {
    const rawScore = ((matchesCount * 1.0 + partialsCount * 0.5) / totalTargetWords) * 100;
    score = Math.min(100, Math.max(0, Math.round(rawScore)));
  }

  return {
    score,
    words: feedbackWords
  };
}
