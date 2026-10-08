import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { StageId } from '../stages';

interface UIState {
  stage: StageId;
  selectedShotId: string | null;
  settingsOpen: boolean;
  setStage: (stage: StageId) => void;
  selectShot: (id: string | null) => void;
  setSettingsOpen: (open: boolean) => void;
}

export const useUI = create<UIState>()(
  persist(
    (set) => ({
      stage: 'development',
      selectedShotId: null,
      settingsOpen: false,
      setStage: (stage) => set({ stage }),
      selectShot: (selectedShotId) => set({ selectedShotId }),
      setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
    }),
    { name: 'aistudio-ui', partialize: (s) => ({ stage: s.stage, selectedShotId: s.selectedShotId }) },
  ),
);
