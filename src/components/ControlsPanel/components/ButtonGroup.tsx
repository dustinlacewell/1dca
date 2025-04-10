import React from 'react';
import { useStore } from '../../../store/useStore';

interface ButtonGroupProps {
  type: 'control' | 'initialization';
}

const ButtonGroup: React.FC<ButtonGroupProps> = ({ type }) => {
  const { 
    isPlaying, 
    setIsPlaying, 
    resetGeneration, 
    initializePattern,
    lastInitPattern
  } = useStore();

  if (type === 'control') {
    return (
      <div className="button-group">
        <button 
          className="control-btn primary"
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {isPlaying ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
              </svg>
              Pause
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
              Play
            </>
          )}
        </button>
        <button 
          className="control-btn"
          onClick={resetGeneration}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
          </svg>
          Clear
        </button>
        <button 
          className="control-btn"
          onClick={() => {
            setIsPlaying(false);
            initializePattern('single');
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
          </svg>
          Reset
        </button>
      </div>
    );
  }

  return (
    <div className="button-group">
      <button 
        onClick={() => initializePattern('single')}
        className={lastInitPattern === 'single' ? 'active' : ''}
      >
        Single Cell
      </button>
      <button 
        onClick={() => initializePattern('random')}
        className={lastInitPattern === 'random' ? 'active' : ''}
      >
        Random
      </button>
      <button 
        onClick={() => initializePattern('filled')}
        className={lastInitPattern === 'filled' ? 'active' : ''}
      >
        All Filled
      </button>
      <button 
        onClick={() => initializePattern('empty')}
        className={lastInitPattern === 'empty' ? 'active' : ''}
      >
        All Empty
      </button>
      <button 
        onClick={() => initializePattern('alternating')}
        className={lastInitPattern === 'alternating' ? 'active' : ''}
      >
        Alternating
      </button>
    </div>
  );
};

export default ButtonGroup;
