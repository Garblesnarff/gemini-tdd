import { TACTICAL_INTEL_POOL } from './constants';

// DO NOT USE GEMINI API CALLS.
// The user has explicitly requested to avoid API calls due to rate limiting.
// All intelligence must be generated locally using the pool or heuristics.

export async function getWaveIntel(waveNumber: number, stageName: string) {
  // Heuristics for "intelligent" feel without API calls
  
  if (waveNumber === 1) {
    return `Welcome to ${stageName}. Systems online.`;
  }
  
  if (waveNumber % 10 === 0) {
    return "Massive energy signature detected. Boss class entity inbound.";
  }
  
  if (waveNumber % 5 === 0) {
    return "Enemy reinforcements surging. Tighten defenses.";
  }

  // Random selection from the pool
  const index = Math.floor(Math.random() * TACTICAL_INTEL_POOL.length);
  return TACTICAL_INTEL_POOL[index];
}