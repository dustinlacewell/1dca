import React from 'react';
import { useStore } from '../../../store/useStore';

const RulesGrid: React.FC = () => {
  const { ruleToggles, toggleRule } = useStore();

  return (
    <div className="rules-grid">
      {ruleToggles.map((isActive, index) => (
        <div key={index} className="rule-toggle">
          <div className="pattern">
            {[...index.toString(2).padStart(3, '0')].map((bit, i) => (
              <div
                key={i}
                className={`pattern-cell ${bit === '1' ? 'filled' : 'empty'}`}
              />
            ))}
          </div>
          <input
            type="checkbox"
            checked={isActive}
            onChange={() => toggleRule(index)}
          />
        </div>
      ))}
    </div>
  );
};

export default RulesGrid;
