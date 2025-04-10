import { create } from 'zustand';

interface SimulationState {
  // Core simulation state
  cells: boolean[];
  previousGenerations: boolean[][];
  rule: number;
  ruleToggles: boolean[];
  generation: number;
  isPlaying: boolean;
  speed: number;
  lastInitPattern: 'single' | 'random' | 'filled' | 'empty' | 'alternating';
  maxCells: number;
  
  // Actions
  setCells: (cells: boolean[]) => void;
  setRule: (rule: number) => void;
  setRuleToggles: (toggles: boolean[]) => void;
  toggleRule: (index: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setSpeed: (speed: number) => void;
  step: () => void;
  incrementGeneration: () => void;
  resetGeneration: () => void;
  initializePattern: (pattern: 'single' | 'random' | 'filled' | 'empty' | 'alternating') => void;
  setPresetRule: (ruleNumber: number) => void;
  updateMaxCells: (maxCells: number) => void;
}

const DEFAULT_SPEED = 10;
const DEFAULT_RULE = 30;

export const useSimulationStore = create<SimulationState>((set, get) => {
  return {
    // Initial state
    cells: new Array(100).fill(false), // Default size, will be updated by render store
    previousGenerations: [],
    rule: DEFAULT_RULE,
    ruleToggles: new Array(8).fill(false),
    isPlaying: false,
    generation: 0,
    speed: DEFAULT_SPEED,
    lastInitPattern: 'single',
    maxCells: 100, // Will be updated by render store

    setCells: (cells) => set({ cells }),

    setRule: (rule) => set({ rule }),

    setRuleToggles: (toggles) => set({ ruleToggles: toggles }),

    toggleRule: (index) => {
      const toggles = [...get().ruleToggles];
      toggles[index] = !toggles[index];
      set({ ruleToggles: toggles });
    },

    setIsPlaying: (isPlaying) => set({ isPlaying }),

    setSpeed: (speed) => set({ speed }),

    step: () => {
      const { cells, ruleToggles } = get();
      const nextCells = new Array(cells.length).fill(false);

      for (let i = 0; i < cells.length; i++) {
        const left = cells[(i - 1 + cells.length) % cells.length];
        const center = cells[i];
        const right = cells[(i + 1) % cells.length];
        const idx = (left ? 4 : 0) + (center ? 2 : 0) + (right ? 1 : 0);
        nextCells[i] = ruleToggles[7 - idx];
      }

      set(state => ({
        previousGenerations: [...state.previousGenerations, [...cells]],
        cells: nextCells,
        generation: state.generation + 1
      }));
    },

    incrementGeneration: () => {
      const { cells, previousGenerations } = get();
      const newPreviousGenerations = [...previousGenerations, cells];
      
      set({
        previousGenerations: newPreviousGenerations,
        generation: get().generation + 1
      });
    },

    resetGeneration: () => {
      const { lastInitPattern } = get();
      get().initializePattern(lastInitPattern);
      set({ generation: 0, previousGenerations: [] });
    },

    initializePattern: (pattern) => {
      const { maxCells } = get();
      const newCells = new Array(maxCells).fill(false);
      
      switch (pattern) {
        case 'single':
          newCells[Math.floor(maxCells / 2)] = true;
          break;
        case 'random':
          for (let i = 0; i < maxCells; i++) {
            newCells[i] = Math.random() > 0.5;
          }
          break;
        case 'filled':
          newCells.fill(true);
          break;
        case 'alternating':
          for (let i = 0; i < maxCells; i++) {
            newCells[i] = i % 2 === 0;
          }
          break;
      }
      
      set({
        cells: newCells,
        lastInitPattern: pattern,
        generation: 0,
        previousGenerations: []
      });
    },

    setPresetRule: (ruleNumber) => {
      const toggles = new Array(8).fill(false);
      for (let i = 0; i < 8; i++) {
        toggles[7 - i] = Boolean(ruleNumber & (1 << i));
      }
      set({ rule: ruleNumber, ruleToggles: toggles });
    },

    updateMaxCells: (maxCells) => {
      const { cells } = get();
      const newCells = new Array(maxCells).fill(false);
      
      // Copy over existing cells, centered in new array
      const offset = Math.floor((maxCells - cells.length) / 2);
      cells.forEach((cell, i) => {
        if (i + offset >= 0 && i + offset < maxCells) {
          newCells[i + offset] = cell;
        }
      });

      set({
        maxCells,
        cells: newCells
      });
    }
  };
});
