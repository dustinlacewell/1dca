/**
 * Types for the cellular automata state
 */
export interface CellState {
  cells: boolean[];
  previousGenerations: boolean[][];
  generation: number;
}

/**
 * Configuration for how the cells should be displayed
 */
export interface ViewportOptions {
  cellSize: number;
  cellMargin: number;
  renderWidth: number;
  renderMargin: number;
  maxVisibleGenerations: number;
  colors: {
    background: string;
    primary: string;
  };
}

/**
 * Base interface for all renderers (Canvas2D, WebGL, etc.)
 */
export interface BaseRenderer {
  /**
   * Initialize the renderer with a canvas element
   */
  initialize: (canvas: HTMLCanvasElement) => void;

  /**
   * Render the current state of the cellular automata
   */
  render: (state: CellState) => void;

  /**
   * Handle canvas resize events
   */
  resize: (width: number, height: number) => void;

  /**
   * Update viewport configuration (cell size, colors, etc.)
   */
  updateViewport: (options: ViewportOptions) => void;

  /**
   * Clean up any resources used by the renderer
   */
  dispose: () => void;
}
