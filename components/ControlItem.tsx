
import React from 'react';

interface ControlItemProps {
  label: string;
  value: string | number;
  children: React.ReactNode;
  unit?: string;
  onInputChange?: (val: string) => void;
  min?: number;
  max?: number;
  step?: number;
}

const ControlItem: React.FC<ControlItemProps> = ({ label, value, children, unit, onInputChange, min, max, step }) => {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center px-1">
        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          {label}
        </label>
        <div className="flex items-center gap-1">
          {onInputChange ? (
            <input
              type="number"
              value={value}
              min={min}
              max={max}
              step={step}
              onChange={(e) => onInputChange(e.target.value)}
              className="bg-transparent text-right text-xs font-mono text-sky-400 w-16 focus:outline-none focus:text-sky-300 border-b border-transparent focus:border-sky-500/30 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          ) : (
            <span className="text-xs font-mono text-sky-400">
              {value}
            </span>
          )}
          {unit && <span className="text-[10px] font-mono text-slate-600">{unit}</span>}
        </div>
      </div>
      {children}
    </div>
  );
};

export default ControlItem;
