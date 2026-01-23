
import { TACTICAL_INTEL_POOL } from './constants';

export async function getWaveIntel(waveNumber: number) {
  // Select a random intel string from the pre-defined tactical pool
  const index = Math.floor(Math.random() * TACTICAL_INTEL_POOL.length);
  return TACTICAL_INTEL_POOL[index];
}
