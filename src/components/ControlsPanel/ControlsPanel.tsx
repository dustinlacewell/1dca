import React from 'react';
import RulesGrid from './components/RulesGrid';
import ButtonGroup from './components/ButtonGroup';
import { useStore } from '../../store/useStore';
import { hasWebGLSupport } from '../../renderers/RendererFactory';
import './ControlsPanel.scss';

const ControlsPanel: React.FC = () => {
  const { 
    rule, 
    cellSize, 
    setCellSize,
    speed,
    setSpeed,
    activeRenderer
  } = useStore();

  return (
    <div className="controls-panel">
      <h1 className="app-title">1D Cellular Automata <br /> Explorer</h1>
      
      <div className="control-section">
        <h2>Controls</h2>
        <ButtonGroup type="control" />
      </div>

      <div className="control-section">
        <h2>Settings</h2>
        <div className="settings-grid">
          <div className="setting-item">
            <label htmlFor="cellSize">Cell Size:</label>
            <input
              type="range"
              id="cellSize"
              min="1"
              max="20"
              value={cellSize}
              onChange={(e) => setCellSize(Number(e.target.value))}
            />
            <span>{cellSize}px</span>
          </div>
          <div className="setting-item">
            <label htmlFor="speed">Speed:</label>
            <input
              type="range"
              id="speed"
              min="1"
              max="1000"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
            />
            <span>{speed} gen/s</span>
          </div>
        </div>
      </div>

      <div className="control-section">
        <h2>Rule Configuration <span className="rule-label">Rule: {rule}</span></h2>
        <RulesGrid />
        <div className="button-group rule-presets">
          {[30, 60, 90, 110, 182].map((preset) => (
            <button 
              key={preset}
              onClick={() => useStore.getState().setPresetRule(preset)}
              className={rule === preset ? 'active' : ''}
            >
              Rule {preset}
            </button>
          ))}
        </div>
      </div>

      <div className="control-section">
        <h2>Initialization</h2>
        <ButtonGroup type="initialization" />
      </div>

      <div 
        className={`control-group renderer-toggle ${hasWebGLSupport() ? 'clickable' : ''}`}
        onClick={() => {
          console.log('Current renderer:', activeRenderer);
          console.log('WebGL supported:', hasWebGLSupport());
          if (!hasWebGLSupport()) return;
          const newRenderer = activeRenderer === 'webgl' ? 'canvas2d' : 'webgl';
          console.log('Switching to:', newRenderer);
          useStore.getState().setActiveRenderer(newRenderer);
        }}
        style={{ cursor: hasWebGLSupport() ? 'pointer' : 'default' }}
      >
        <span>Renderer: {activeRenderer === 'webgl' ? 'WebGL' : 'Canvas 2D'}</span>
      </div>
    </div>
  );
};

export default ControlsPanel;
