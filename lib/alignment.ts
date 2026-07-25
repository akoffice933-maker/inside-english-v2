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

/* ============================================================================
 * Client-side Needleman-Wunsch alignment.
 * Used by the browser-only <ShadowingRecorder /> component, which relies on
 * the Web Speech API (SpeechRecognition) instead of server-side Whisper STT.
 * Kept alongside `alignAndEvaluate` above (which still powers the
 * Whisper-based POST /api/tracks/[id]/shadow route) — different callers,
 * different scoring strategy, no overlap in exported names.
 * ============================================================================ */

export type AlignmentCell = {
  score: number;
  pointer: "diag" | "up" | "left" | "none";
};

export type AlignmentToken = {
  ref: string;
  spoken: string | null;
  status: "match" | "substitution" | "deletion" | "insertion";
};

export type AlignmentResult = {
  score: number; // 0..1
  tokens: AlignmentToken[];
  matches: number;
  substitutions: number;
  deletions: number;
  insertions: number;
};

const MATCH = 1;
const MISMATCH = -1;
const GAP = -1;

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9а-яё\s']/gi, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Computes a similarity score and token-level diff between two strings.
 */
export function needlemanWunsch(reference: string, spoken: string): AlignmentResult {
  const refTokens = tokenize(reference);
  const spokenTokens = tokenize(spoken);

  const m = refTokens.length;
  const n = spokenTokens.length;

  if (m === 0 && n === 0) {
    return { score: 1, tokens: [], matches: 0, substitutions: 0, deletions: 0, insertions: 0 };
  }
  if (m === 0) {
    return {
      score: 0,
      tokens: spokenTokens.map((t) => ({ ref: "", spoken: t, status: "insertion" })),
      matches: 0,
      substitutions: 0,
      deletions: 0,
      insertions: spokenTokens.length,
    };
  }
  if (n === 0) {
    return {
      score: 0,
      tokens: refTokens.map((t) => ({ ref: t, spoken: null, status: "deletion" })),
      matches: 0,
      substitutions: 0,
      deletions: refTokens.length,
      insertions: 0,
    };
  }

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  const trace: Array<Array<"diag" | "up" | "left">> = Array.from(
    { length: m + 1 },
    () => new Array(n + 1).fill("none") as Array<"diag" | "up" | "left">,
  );

  for (let i = 0; i <= m; i++) dp[i][0] = i * GAP;
  for (let j = 0; j <= n; j++) dp[0][j] = j * GAP;
  for (let i = 1; i <= m; i++) trace[i][0] = "up";
  for (let j = 1; j <= n; j++) trace[0][j] = "left";

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const s = refTokens[i - 1] === spokenTokens[j - 1] ? MATCH : MISMATCH;
      const diag = dp[i - 1][j - 1] + s;
      const up = dp[i - 1][j] + GAP;
      const left = dp[i][j - 1] + GAP;
      if (diag >= up && diag >= left) {
        dp[i][j] = diag;
        trace[i][j] = "diag";
      } else if (up >= left) {
        dp[i][j] = up;
        trace[i][j] = "up";
      } else {
        dp[i][j] = left;
        trace[i][j] = "left";
      }
    }
  }

  // Traceback
  const tokens: AlignmentToken[] = [];
  let i = m;
  let j = n;
  let matches = 0;
  let substitutions = 0;
  let deletions = 0;
  let insertions = 0;

  while (i > 0 || j > 0) {
    const t = i > 0 && j > 0 ? trace[i][j] : i > 0 ? "up" : "left";
    if (t === "diag" && i > 0 && j > 0) {
      const isMatch = refTokens[i - 1] === spokenTokens[j - 1];
      tokens.unshift({
        ref: refTokens[i - 1],
        spoken: spokenTokens[j - 1],
        status: isMatch ? "match" : "substitution",
      });
      if (isMatch) matches++;
      else substitutions++;
      i--;
      j--;
    } else if (t === "up" && i > 0) {
      tokens.unshift({ ref: refTokens[i - 1], spoken: null, status: "deletion" });
      deletions++;
      i--;
    } else {
      tokens.unshift({ ref: "", spoken: spokenTokens[j - 1], status: "insertion" });
      insertions++;
      j--;
    }
  }

  const total = Math.max(m, n);
  const score = total === 0 ? 1 : matches / total;

  return { score, tokens, matches, substitutions, deletions, insertions };
}
