import { create } from 'zustand';
import { RendererType, hasWebGLSupport } from '../renderers/RendererFactory';

const SIDEBAR_WIDTH = 300;

interface AutomatonState {
  // Simulation state
  cells: boolean[];
  previousGenerations: boolean[][];
  rule: number;
  ruleToggles: boolean[];
  isPlaying: boolean;
  generation: number;
  speed: number;
  lastInitPattern: 'single' | 'random' | 'filled' | 'empty' | 'alternating';
  
  // Render state
  cellSize: number;
  cellMargin: number;
  availableWidth: number;
  maxCells: number;
  renderWidth: number;
  renderMargin: number;
  maxVisibleGenerations: number;
  activeRenderer: RendererType;
  
  // Actions
  setCells: (cells: boolean[]) => void;
  setRule: (rule: number) => void;
  setRuleToggles: (toggles: boolean[]) => void;
  toggleRule: (index: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  incrementGeneration: () => void;
  resetGeneration: () => void;
  setCellSize: (size: number) => void;
  setCellMargin: (margin: number) => void;
  setSpeed: (speed: number) => void;
  step: () => void;
  initializePattern: (pattern: 'single' | 'random' | 'filled' | 'empty' | 'alternating') => void;
  setPresetRule: (ruleNumber: number) => void;
  updateCanvasSize: (windowWidth: number) => void;
  setActiveRenderer: (type: RendererType) => void;
}

const DEFAULT_CELL_SIZE = 2;
const DEFAULT_SPEED = 60;
const DEFAULT_RULE = 110;
const DEFAULT_CELL_MARGIN = 0;

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
    // Initial simulation state
    cells: (() => {
      const cells = new Array(initialMetrics.maxCells).fill(false);
      cells[Math.floor(initialMetrics.maxCells / 2)] = true;
      return cells;
    })(),
    previousGenerations: [],
    rule: DEFAULT_RULE,
    ruleToggles: (() => {
      const toggles = new Array(8).fill(false);
      // Set rule 30 toggles
      for (let i = 0; i < 8; i++) {
        toggles[i] = Boolean(DEFAULT_RULE & (1 << i));
      }
      return toggles;
    })(),
    isPlaying: false,
    generation: 0,
    speed: DEFAULT_SPEED,
    lastInitPattern: 'single',
    
    // Initial render state
    cellSize: DEFAULT_CELL_SIZE,
    cellMargin: DEFAULT_CELL_MARGIN,
    availableWidth: initialMetrics.availableWidth,
    maxCells: initialMetrics.maxCells,
    renderWidth: initialMetrics.renderWidth,
    renderMargin: initialMetrics.renderMargin,
    maxVisibleGenerations: initialMetrics.maxVisibleGenerations,
    activeRenderer: hasWebGLSupport() ? 'webgl' : 'canvas2d',
    
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
    },

    setActiveRenderer: (type) => {
      console.log('Store: Setting renderer to', type);
      set({ activeRenderer: type });
    },
  };
});
