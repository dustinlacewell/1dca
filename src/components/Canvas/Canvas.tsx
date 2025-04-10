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
    rule,
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
      const viewport = {
        width: canvasRef.current.width,
        height: canvasRef.current.height,
        cellSize,
        cellMargin,
        renderMargin,
        maxVisibleGenerations
      };
      renderer.render({
        cells,
        previousGenerations,
        generation,
        rule,
        viewport
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

      const viewport = {
        width: canvasRef.current.width,
        height: canvasRef.current.height,
        cellSize,
        cellMargin,
        renderMargin,
        maxVisibleGenerations
      };
      renderer.render({
        cells,
        previousGenerations,
        generation,
        rule,
        viewport
      });
    };

    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [activeRenderer, cells, previousGenerations, generation, cellSize, cellMargin, maxCells, renderWidth, renderMargin, maxVisibleGenerations, rule]);

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

    const viewport = {
      width: canvasRef.current.width,
      height: canvasRef.current.height,
      cellSize,
      cellMargin,
      renderMargin,
      maxVisibleGenerations
    };
    renderer.render({
      cells,
      previousGenerations,
      generation,
      rule,
      viewport
    });
  }, [cells, previousGenerations, generation, cellSize, cellMargin, maxCells, renderWidth, renderMargin, maxVisibleGenerations, rule]);

  // Handle animation frame updates
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer || !isPlaying) return;

    let lastTime = 0;
    let accumulatedTime = 0;
    let animationFrameId: number;

    const animate = (currentTime: number) => {
      if (lastTime === 0) {
        lastTime = currentTime;
      }

      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;
      accumulatedTime += deltaTime;

      // Calculate how many steps we should take based on speed
      // speed is in generations per second, so convert to ms
      const timePerStep = 1000 / speed;
      
      while (accumulatedTime >= timePerStep) {
        step();
        accumulatedTime -= timePerStep;
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, speed, step]);

  return (
    <div ref={containerRef} className="canvas-container">
      {/* Canvas will be created and managed by the effect */}
    </div>
  );
}

export default Canvas;
