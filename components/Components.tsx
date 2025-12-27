
import React from 'react';
import { TIME_BLOCKS, getIcon } from '../constants';
import { TimeBlockId } from '../types';

export const BigButton: React.FC<{
  onClick: () => void;
  icon?: React.ReactNode;
  label: string;
  subLabel?: string;
  primary?: boolean;
  danger?: boolean;
  disabled?: boolean;
  className?: string;
}> = ({ onClick, icon, label, subLabel, primary, danger, disabled, className = '' }) => {
  const baseClass = "relative flex items-center justify-between p-6 rounded-[1.5rem] w-full transition-all active:scale-[0.98] shadow-sm border-2";
  
  let colorClass = "bg-white border-slate-100 hover:border-violet-300 hover:bg-violet-50 text-indigo-900";
  
  if (primary) colorClass = "bg-gradient-to-r from-fuchsia-500 to-violet-600 border-transparent text-white shadow-lg shadow-fuchsia-200 hover:shadow-xl hover:scale-[1.01]";
  
  if (danger) colorClass = "bg-white border-red-100 text-red-500 hover:bg-red-50 hover:border-red-200";
  
  if (disabled) colorClass = "bg-slate-100 border-slate-100 text-slate-400 cursor-not-allowed active:scale-100 grayscale";

  return (
    <button onClick={disabled ? undefined : onClick} className={`${baseClass} ${colorClass} ${className}`}>
      <div className="flex items-center gap-4 text-left">
        {icon && <div className={primary ? "text-white/90 scale-125" : "text-fuchsia-500 scale-125"}>{icon}</div>}
        <div>
          <div className={`text-xl font-black leading-tight ${primary ? 'text-white' : ''}`}>{label}</div>
          {subLabel && <div className={`text-sm font-bold opacity-80 ${primary ? 'text-white' : 'text-slate-500'}`}>{subLabel}</div>}
        </div>
      </div>
      {!disabled && <div className={`text-3xl font-black ${primary ? 'text-white/40' : 'text-slate-200'}`}>›</div>}
    </button>
  );
};

export const Toggle: React.FC<{
  enabled: boolean;
  onChange: (val: boolean) => void;
  label?: string;
}> = ({ enabled, onChange, label }) => {
  return (
    <div className="flex items-center justify-between gap-4">
      {label && <span className="font-black text-xl text-slate-800 flex-1">{label}</span>}
      <button 
        onClick={() => onChange(!enabled)}
        className={`w-20 h-10 rounded-full p-1.5 transition-colors shadow-inner ${enabled ? 'bg-fuchsia-500' : 'bg-slate-300'}`}
      >
        <div className={`w-7 h-7 bg-white rounded-full transition-transform shadow-md ${enabled ? 'translate-x-10' : 'translate-x-0'}`} />
      </button>
    </div>
  );
};

export const TimeBlockChip: React.FC<{
  blockId: TimeBlockId;
  selected?: boolean;
  onClick?: () => void;
  showLabel?: boolean;
}> = ({ blockId, selected, onClick, showLabel = true }) => {
  const def = TIME_BLOCKS[blockId];
  if (!def) return null;

  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-3 px-6 py-4 rounded-[1.25rem] transition-all font-black border-4
        ${selected 
          ? `${def.color} border-current ring-4 ring-offset-2 ring-current shadow-lg scale-105` 
          : 'bg-white border-slate-100 text-slate-500 hover:bg-violet-50 hover:border-violet-200'}
      `}
    >
      <div className="scale-125">{getIcon(def.icon)}</div>
      {showLabel && <span className="text-lg">{def.label}</span>}
    </button>
  );
};

export const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-indigo-900/40 backdrop-blur-md p-0 sm:p-4">
      <div className="bg-white w-full max-w-lg rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl max-h-[95vh] overflow-y-auto flex flex-col animate-in slide-in-from-bottom duration-500">
        <div className="sticky top-0 bg-white/95 backdrop-blur z-10 p-6 border-b-2 border-fuchsia-50 flex justify-between items-center">
          <h2 className="text-3xl font-black text-indigo-900 tracking-tight">{title}</h2>
          <button onClick={onClose} className="p-3 bg-slate-100 hover:bg-red-50 hover:text-red-500 rounded-full text-slate-500 transition-all active:scale-90 font-black">✕</button>
        </div>
        <div className="p-6 pb-12 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};
