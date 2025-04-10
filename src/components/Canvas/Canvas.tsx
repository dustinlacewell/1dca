import React, { useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { Canvas2DRenderer } from '../../renderers/Canvas2DRenderer';
import './Canvas.scss';

const Canvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Canvas2DRenderer | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  
  const { 
    cells, 
    previousGenerations,
    generation,
    cellSize,
    cellMargin,
    renderWidth,
    renderMargin,
    isPlaying,
    speed,
    step,
    maxVisibleGenerations
  } = useStore();

  // Cache color values
  const colors = {
    background: getComputedStyle(document.documentElement)
      .getPropertyValue('--background').trim(),
    primary: getComputedStyle(document.documentElement)
      .getPropertyValue('--primary').trim()
  };

  // Initialize renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Get the container's size
    const container = canvas.parentElement;
    if (!container) return;

    // Create and initialize renderer
    const renderer = new Canvas2DRenderer();
    renderer.initialize(canvas);
    
    // Update viewport with initial settings
    renderer.updateViewport({
      cellSize,
      cellMargin,
      renderWidth,
      renderMargin,
      maxVisibleGenerations,
      colors
    });

    // Handle initial resize
    const rect = container.getBoundingClientRect();
    renderer.resize(rect.width, rect.height);

    rendererRef.current = renderer;

    return () => {
      renderer.dispose();
      rendererRef.current = null;
    };
  }, []); // Only run once on mount

  // Handle viewport updates
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;

    renderer.updateViewport({
      cellSize,
      cellMargin,
      renderWidth,
      renderMargin,
      maxVisibleGenerations,
      colors
    });
  }, [cellSize, cellMargin, renderWidth, renderMargin, maxVisibleGenerations, colors.background, colors.primary]);

  // Handle window resizing
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const renderer = rendererRef.current;
      if (!canvas || !renderer) return;

      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;

      renderer.resize(rect.width, rect.height);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Render current state
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    renderer.render({ cells, previousGenerations, generation });
  }, [cells, previousGenerations, generation]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) return;

    const animate = (currentTime: number) => {
      const renderer = rendererRef.current;
      if (!renderer || !isPlaying) return;

      const deltaTime = currentTime - lastTimeRef.current;
      if (deltaTime >= 1000 / speed) {
        step();
        lastTimeRef.current = currentTime;
      }

      frameRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = performance.now();
    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [isPlaying, speed, step]);

  return (
    <div className="canvas-container">
      <canvas ref={canvasRef} className="canvas" />
      <div className="generation-counter">Generation: {generation}</div>
    </div>
  );
};

export default Canvas;
