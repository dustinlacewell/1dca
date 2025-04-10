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
