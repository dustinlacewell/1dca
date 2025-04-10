import { create } from 'zustand';
import { useSimulationStore } from './useSimulationStore';

const SIDEBAR_WIDTH = 300;

interface RenderState {
  // Render configuration
  cellSize: number;
  cellMargin: number;
  availableWidth: number;
  renderWidth: number;
  renderMargin: number;
  maxVisibleGenerations: number;

  // Actions
  setCellSize: (size: number) => void;
  setCellMargin: (margin: number) => void;
  updateCanvasSize: (windowWidth: number) => void;
}

const DEFAULT_CELL_SIZE = 4;
const DEFAULT_CELL_MARGIN = 0;

const calculateCanvasMetrics = (windowWidth: number, cellSize: number, cellMargin: number) => {
  const availableWidth = windowWidth - SIDEBAR_WIDTH;
  const maxCells = Math.floor(availableWidth / (cellSize + cellMargin));
  const renderWidth = maxCells * (cellSize + cellMargin);
  const renderMargin = Math.floor((availableWidth - renderWidth) / 2);
  // Subtract some padding to ensure we don't overflow
  const maxVisibleGenerations = Math.floor((window.innerHeight - 100) / cellSize);
  
  return {
    availableWidth,
    maxCells,
    renderWidth,
    renderMargin,
    maxVisibleGenerations
  };
};

export const useRenderStore = create<RenderState>((set, get) => {
  // Initialize with default metrics
  const initialMetrics = calculateCanvasMetrics(
    window.innerWidth,
    DEFAULT_CELL_SIZE,
    DEFAULT_CELL_MARGIN
  );

  return {
    // Initial state
    cellSize: DEFAULT_CELL_SIZE,
    cellMargin: DEFAULT_CELL_MARGIN,
    ...initialMetrics,

    setCellSize: (size) => {
      const metrics = calculateCanvasMetrics(
        window.innerWidth,
        size,
        get().cellMargin
      );

      // Update simulation store with new max cells
      useSimulationStore.getState().updateMaxCells(metrics.maxCells);

      set({
        cellSize: size,
        ...metrics
      });
    },

    setCellMargin: (margin) => {
      const metrics = calculateCanvasMetrics(
        window.innerWidth,
        get().cellSize,
        margin
      );

      // Update simulation store with new max cells
      useSimulationStore.getState().updateMaxCells(metrics.maxCells);

      set({
        cellMargin: margin,
        ...metrics
      });
    },

    updateCanvasSize: (windowWidth) => {
      const metrics = calculateCanvasMetrics(
        windowWidth,
        get().cellSize,
        get().cellMargin
      );

      // Update simulation store with new max cells
      useSimulationStore.getState().updateMaxCells(metrics.maxCells);

      set(metrics);
    }
  };
});
