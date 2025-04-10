import { BaseRenderer, CellState, ViewportOptions } from './BaseRenderer';

export class Canvas2DRenderer implements BaseRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private dpr: number = 1;
  private options: ViewportOptions | null = null;

  initialize(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    
    // Get the DPR for high-DPI displays
    this.dpr = window.devicePixelRatio || 1;

    // Initialize the context with optimal settings for pixel graphics
    this.ctx = canvas.getContext('2d', {
      alpha: false,
      antialias: false,
      desynchronized: true
    }) as CanvasRenderingContext2D | null;

    if (!this.ctx) {
      throw new Error('Failed to get 2D context');
    }

    // Disable image smoothing for sharp pixels
    this.ctx.imageSmoothingEnabled = false;
  }

  resize(width: number, height: number): void {
    if (!this.canvas || !this.ctx) return;

    // Update canvas size accounting for device pixel ratio
    const displayWidth = Math.floor(width);
    const displayHeight = Math.floor(height);

    // Set display size (CSS pixels)
    this.canvas.style.width = `${displayWidth}px`;
    this.canvas.style.height = `${displayHeight}px`;

    // Set actual size in memory (scaled for DPR)
    this.canvas.width = displayWidth * this.dpr;
    this.canvas.height = displayHeight * this.dpr;

    // Scale all drawing operations
    this.ctx.scale(this.dpr, this.dpr);
  }

  updateViewport(options: ViewportOptions): void {
    this.options = options;
  }

  render(state: CellState): void {
    if (!this.ctx || !this.canvas || !this.options) return;

    const { cells, previousGenerations } = state;
    const { 
      cellSize, 
      cellMargin, 
      renderMargin,
      maxVisibleGenerations,
      colors 
    } = this.options;

    // Clear the canvas with background color
    this.ctx.fillStyle = colors.background;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Set cell color
    this.ctx.fillStyle = colors.primary;

    // Helper for pixel-perfect cell rendering
    const fillCell = (x: number, y: number) => {
      this.ctx!.fillRect(
        Math.floor(x) + 0.5,
        Math.floor(y) + 0.5,
        cellSize - 1,
        cellSize - 1
      );
    };

    // Render previous generations
    const visibleGenerations = previousGenerations.slice(-maxVisibleGenerations);
    visibleGenerations.forEach((genCells, index) => {
      const y = index * (cellSize + cellMargin);
      genCells.forEach((cell, x) => {
        if (cell) {
          fillCell(
            renderMargin + x * (cellSize + cellMargin),
            y
          );
        }
      });
    });

    // Render current generation at the bottom
    const currentY = visibleGenerations.length * (cellSize + cellMargin);
    cells.forEach((cell, x) => {
      if (cell) {
        fillCell(
          renderMargin + x * (cellSize + cellMargin),
          currentY
        );
      }
    });
  }

  dispose(): void {
    // Clean up any resources
    this.canvas = null;
    this.ctx = null;
  }
}
