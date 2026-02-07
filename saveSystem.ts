
import { StageId, StageProgress, MetaProgress } from './types';
import { INITIAL_STAGE_PROGRESS, INITIAL_META_PROGRESS } from './constants';

const SAVE_KEY = 'geminiStrikeSave_v1'; // Keeping v1 key for now to overwrite, or switch to v2 key to separate. Let's keep same key for simplicity but check inner version.

export interface SaveData {
  version: number;
  stageProgress: Record<StageId, StageProgress>;
  metaProgress: MetaProgress;
}

export const saveGame = (stageProgress: Record<StageId, StageProgress>, metaProgress: MetaProgress) => {
  try {
    const data: SaveData = {
      version: 3,
      stageProgress,
      metaProgress
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to save game progress', error);
  }
};

export const loadGame = (): { stageProgress: Record<StageId, StageProgress>, metaProgress: MetaProgress } | null => {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    
    const data = JSON.parse(raw);
    
    // Migration Logic
    if (data.version === 1) {
        // Migrate V1 to V3
        return {
            stageProgress: { ...INITIAL_STAGE_PROGRESS, ...data.stageProgress },
            metaProgress: INITIAL_META_PROGRESS
        };
    }

    if (data.version === 2) {
        // Migrate V2 to V3 (Add upgradeLevels)
        return {
            stageProgress: { ...INITIAL_STAGE_PROGRESS, ...data.stageProgress },
            metaProgress: { 
                ...INITIAL_META_PROGRESS, 
                ...data.metaProgress,
                upgradeLevels: {} 
            }
        };
    }

    if (data.version === 3) {
        return {
            stageProgress: { ...INITIAL_STAGE_PROGRESS, ...data.stageProgress },
            metaProgress: { ...INITIAL_META_PROGRESS, ...data.metaProgress }
        };
    }

    console.log('Save version mismatch or unknown, returning null');
    return null;

  } catch (error) {
    console.warn('Failed to load game progress', error);
    return null;
  }
};

export const clearSave = () => {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (error) {
    console.warn('Failed to clear save', error);
  }
};

export const hasSaveData = (): boolean => {
  try {
    return !!localStorage.getItem(SAVE_KEY);
  } catch (error) {
    console.warn('Failed to check for save data', error);
    return false;
  }
};
