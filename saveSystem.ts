
import { StageId, StageProgress } from './types';
import { INITIAL_STAGE_PROGRESS } from './constants';

const SAVE_KEY = 'geminiStrikeSave_v1';

export interface SaveData {
  version: number;
  stageProgress: Record<StageId, StageProgress>;
}

export const saveGame = (stageProgress: Record<StageId, StageProgress>) => {
  try {
    const data: SaveData = {
      version: 1,
      stageProgress
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to save game progress', error);
  }
};

export const loadGame = (): Record<StageId, StageProgress> | null => {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    
    const data = JSON.parse(raw) as SaveData;
    // Simple version check
    if (data.version !== 1) {
        console.log('Save version mismatch, returning null');
        return null;
    }

    // Merge with initial progress to ensure new stages are present if added in future update
    return {
        ...INITIAL_STAGE_PROGRESS,
        ...data.stageProgress
    };
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
    return !!localStorage.getItem(SAVE_KEY);
};
