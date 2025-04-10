import { useEffect } from 'react';
import Canvas from './components/Canvas/Canvas';
import ControlsPanel from './components/ControlsPanel/ControlsPanel';
import { useStore } from './store/useStore';
import './styles/global.scss';
import './App.css';

function App() {
  const { updateCanvasSize, setPresetRule, initializePattern } = useStore();

  useEffect(() => {
    const handleResize = () => {
      updateCanvasSize(window.innerWidth);
    };

    // Initialize canvas size
    handleResize();
    window.addEventListener('resize', handleResize);

    // Initialize automaton with Rule 30 and single cell
    setPresetRule(30);
    initializePattern('single');

    return () => window.removeEventListener('resize', handleResize);
  }, [updateCanvasSize, setPresetRule, initializePattern]);

  return (
    <div className="app">
      <ControlsPanel />
      <Canvas />
    </div>
  );
}

export default App;
