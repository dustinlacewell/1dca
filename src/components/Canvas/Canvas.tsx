import { useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { BaseRenderer } from '../../renderers/BaseRenderer';
import { createRenderer } from '../../renderers/RendererFactory';
import './Canvas.scss';

export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<BaseRenderer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    cells,
    previousGenerations,
    generation,
    isPlaying,
    cellSize,
    cellMargin,
    renderWidth,
    renderMargin,
    speed,
    step,
    maxVisibleGenerations,
    activeRenderer,
    maxCells
  } = useStore();

  // Initialize renderer when renderer type changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clean up old renderer first
    if (rendererRef.current) {
      console.log('Disposing old renderer');
      rendererRef.current.dispose();
      rendererRef.current = null;
    }

    // Get container dimensions
    const rect = container.getBoundingClientRect();

    // Create new canvas
    const canvas = document.createElement('canvas');
    canvas.className = 'canvas';
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Remove any existing canvas
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    
    // Add new canvas
    container.appendChild(canvas);
    canvasRef.current = canvas;

    // Create new renderer
    try {
      console.log('Initializing renderer:', activeRenderer);
      console.log('Initial state:', {
        cells: cells.length,
        previousGens: previousGenerations.length,
        generation,
        viewport: {
          cellSize,
          cellMargin,
          maxCells,
          renderWidth,
          renderMargin,
          maxVisibleGenerations
        }
      });
      
      const renderer = createRenderer(activeRenderer);
      renderer.initialize(canvas);
      rendererRef.current = renderer;

      // Initial render
      renderer.render({
        cells,
        previousGenerations,
        generation,
        viewport: {
          cellSize,
          cellMargin,
          maxCells,
          renderWidth,
          renderMargin,
          maxVisibleGenerations
        }
      });

      console.log('Initial render complete');
    } catch (e) {
      console.error('Renderer initialization failed:', e);
      console.error('Error details:', {
        message: e instanceof Error ? e.message : String(e),
        stack: e instanceof Error ? e.stack : undefined
      });
    }

    return () => {
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
    };
  }, [activeRenderer]);

  // Handle window resizing
  useEffect(() => {
    const canvas = canvasRef.current;
    const renderer = rendererRef.current;
    if (!canvas || !renderer) return;

    const updateCanvasSize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;

      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      canvas.width = rect.width;
      canvas.height = rect.height;

      renderer.render({
        cells,
        previousGenerations,
        generation,
        viewport: {
          cellSize,
          cellMargin,
          maxCells,
          renderWidth,
          renderMargin,
          maxVisibleGenerations
        }
      });
    };

    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [activeRenderer, cells, previousGenerations, generation, cellSize, cellMargin, maxCells, renderWidth, renderMargin, maxVisibleGenerations]);

  // Handle state updates
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;

    console.log('State update:', {
      cells: cells.length,
      previousGens: previousGenerations.length,
      generation,
      viewport: {
        cellSize,
        cellMargin,
        maxCells,
        renderWidth,
        renderMargin,
        maxVisibleGenerations
      }
    });

    renderer.render({
      cells,
      previousGenerations,
      generation,
      viewport: {
        cellSize,
        cellMargin,
        maxCells,
        renderWidth,
        renderMargin,
        maxVisibleGenerations
      }
    });
  }, [cells, previousGenerations, generation, cellSize, cellMargin, maxCells, renderWidth, renderMargin, maxVisibleGenerations]);

  // Handle animation frame updates
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer || !isPlaying) return;

    let lastTime = 0;
    let animationFrameId: number;

    const animate = (currentTime: number) => {
      if (currentTime - lastTime > 1000 / speed) {
        step();
        lastTime = currentTime;
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, speed, step]);

  return (
    <div ref={containerRef} className="canvas-container">
      {/* Canvas will be created and managed by the effect */}
    </div>
  );
}

export default Canvas;
