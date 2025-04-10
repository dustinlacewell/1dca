import { create } from 'zustand';

const SIDEBAR_WIDTH = 300;

interface AutomatonState {
  cells: boolean[];
  previousGenerations: boolean[][];
  rule: number;
  ruleToggles: boolean[];
  isPlaying: boolean;
  generation: number;
  cellSize: number;
  cellMargin: number; // New: margin between cells
  speed: number;
  lastInitPattern: 'single' | 'random' | 'filled' | 'empty' | 'alternating';
  availableWidth: number;
  maxCells: number;
  renderWidth: number;
  renderMargin: number;
  maxVisibleGenerations: number;
  
  // Actions
  setCells: (cells: boolean[]) => void;
  setRule: (rule: number) => void;
  setRuleToggles: (toggles: boolean[]) => void;
  toggleRule: (index: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  incrementGeneration: () => void;
  resetGeneration: () => void;
  setCellSize: (size: number) => void;
  setCellMargin: (margin: number) => void; // New: setter for margin
  setSpeed: (speed: number) => void;
  step: () => void;
  initializePattern: (pattern: 'single' | 'random' | 'filled' | 'empty' | 'alternating') => void;
  setPresetRule: (ruleNumber: number) => void;
  updateCanvasSize: (windowWidth: number) => void;
}

const DEFAULT_CELL_SIZE = 4;
const DEFAULT_SPEED = 10;
const DEFAULT_RULE = 30;
const DEFAULT_CELL_MARGIN = 0; // New: default to no margin

const calculateCanvasMetrics = (windowWidth: number, cellSize: number, cellMargin: number) => {
  const availableWidth = windowWidth - SIDEBAR_WIDTH;
  const maxCells = Math.floor(availableWidth / (cellSize + cellMargin));
  const renderWidth = maxCells * (cellSize + cellMargin);
  const renderMargin = Math.floor((availableWidth - renderWidth) / 2);
  
  // Calculate max generations that fit in the viewport
  const maxVisibleGenerations = Math.floor(window.innerHeight / (cellSize + cellMargin));
  
  return {
    availableWidth,
    maxCells,
    renderWidth,
    renderMargin,
    maxVisibleGenerations
  };
};

export const useStore = create<AutomatonState>((set, get) => {
  const initialMetrics = calculateCanvasMetrics(window.innerWidth, DEFAULT_CELL_SIZE, DEFAULT_CELL_MARGIN);
  
  return {
    cells: new Array(initialMetrics.maxCells).fill(false),
    previousGenerations: [],
    rule: DEFAULT_RULE,
    ruleToggles: new Array(8).fill(false),
    isPlaying: false,
    generation: 0,
    cellSize: DEFAULT_CELL_SIZE,
    cellMargin: DEFAULT_CELL_MARGIN,
    speed: DEFAULT_SPEED,
    lastInitPattern: 'single',
    ...initialMetrics,

    setCells: (cells) => set({ cells }),

    setRule: (rule) => set({ rule }),

    setRuleToggles: (toggles) => set({ ruleToggles: toggles }),

    toggleRule: (index) => {
      const toggles = [...get().ruleToggles];
      toggles[index] = !toggles[index];
      set({ ruleToggles: toggles });
    },

    setIsPlaying: (isPlaying) => set({ isPlaying }),

    incrementGeneration: () => {
      const { cells, previousGenerations, generation, maxVisibleGenerations } = get();
      const newPreviousGenerations = [...previousGenerations, cells];
      
      // Keep only the most recent generations that fit in the canvas
      if (newPreviousGenerations.length > maxVisibleGenerations) {
        newPreviousGenerations.shift();
      }
      
      set({
        previousGenerations: newPreviousGenerations,
        generation: generation + 1
      });
    },

    resetGeneration: () => {
      const { lastInitPattern } = get();
      get().initializePattern(lastInitPattern);
      set({ generation: 0, previousGenerations: [] });
    },

    setCellSize: (size) => {
      const metrics = calculateCanvasMetrics(window.innerWidth, size, get().cellMargin);
      const newCells = new Array(metrics.maxCells).fill(false);
      
      // Copy over existing cells, centered in new array
      const { cells } = get();
      const offset = Math.floor((metrics.maxCells - cells.length) / 2);
      cells.forEach((cell, i) => {
        if (i + offset >= 0 && i + offset < metrics.maxCells) {
          newCells[i + offset] = cell;
        }
      });

      set({
        cellSize: size,
        cells: newCells,
        ...metrics
      });
    },

    setCellMargin: (margin) => {
      const metrics = calculateCanvasMetrics(window.innerWidth, get().cellSize, margin);
      const newCells = new Array(metrics.maxCells).fill(false);
      
      // Copy over existing cells, centered in new array
      const { cells } = get();
      const offset = Math.floor((metrics.maxCells - cells.length) / 2);
      cells.forEach((cell, i) => {
        if (i + offset >= 0 && i + offset < metrics.maxCells) {
          newCells[i + offset] = cell;
        }
      });

      set({
        cellMargin: margin,
        cells: newCells,
        ...metrics
      });
    },

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

      set(state => {
        const newPreviousGenerations = [...state.previousGenerations];
        if (newPreviousGenerations.length >= state.maxVisibleGenerations) {
          newPreviousGenerations.shift();
        }
        newPreviousGenerations.push(state.cells);

        return {
          cells: nextCells,
          previousGenerations: newPreviousGenerations,
          generation: state.generation + 1
        };
      });
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
        toggles[7 - i] = ((ruleNumber >> i) & 1) === 1;
      }
      set({ rule: ruleNumber, ruleToggles: toggles });
    },

    updateCanvasSize: (windowWidth) => {
      const metrics = calculateCanvasMetrics(windowWidth, get().cellSize, get().cellMargin);
      const newCells = new Array(metrics.maxCells).fill(false);
      
      // Copy over existing cells, centered in new array
      const { cells } = get();
      const offset = Math.floor((metrics.maxCells - cells.length) / 2);
      cells.forEach((cell, i) => {
        if (i + offset >= 0 && i + offset < metrics.maxCells) {
          newCells[i + offset] = cell;
        }
      });

      set({
        cells: newCells,
        ...metrics
      });
    }
  };
});
