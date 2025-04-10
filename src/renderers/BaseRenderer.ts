/**
 * Types for the cellular automata state
 */
export interface CellState {
  cells: boolean[];
  previousGenerations: boolean[][];
  generation: number;
  rule: number;
  viewport: {
    width: number;
    height: number;
    cellSize: number;
    cellMargin: number;
    renderMargin: number;
    maxVisibleGenerations: number;
  };
}

/**
 * Base interface for all renderers (Canvas2D, WebGL, etc.)
 */
export interface BaseRenderer {
  /**
   * Initialize the renderer with a canvas element
   */
  initialize(canvas: HTMLCanvasElement): void;

  /**
   * Render the current state of the cellular automata
   */
  render(state: CellState): void;

  /**
   * Clean up any resources used by the renderer
   */
  dispose(): void;
}
