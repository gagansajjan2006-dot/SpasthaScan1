import React from 'react';
import { ScanText, AlertCircle, PlusCircle, History, Info, Home as HomeIcon } from 'lucide-react';
import type { HealthStatus } from '../types/inspection';

interface HeaderProps {
  currentPage: 'home' | 'inspect' | 'history';
  onNavigate: (page: 'home' | 'inspect' | 'history') => void;
  onNewInspection: () => void;
  onOpenAbout: () => void;
  health: HealthStatus | null;
}

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  onNavigate,
  onNewInspection,
  onOpenAbout,
  health,
}) => {
  const isOnline = health?.status === 'healthy';

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-xs transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand / Logo */}
        <div 
          onClick={() => onNavigate('home')}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-200 group-hover:scale-105 transition-transform duration-200">
            <ScanText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xl tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
                SpasthaScan
              </span>
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                AI
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium -mt-1 hidden sm:block">
              Quality Inspector
            </p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
          <button
            onClick={() => onNavigate('home')}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
              currentPage === 'home'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/50'
            }`}
          >
            <HomeIcon className="w-4 h-4" />
            Home
          </button>
          <button
            onClick={() => onNavigate('inspect')}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
              currentPage === 'inspect'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/50'
            }`}
          >
            <ScanText className="w-4 h-4" />
            Inspect Document
          </button>
          <button
            onClick={() => onNavigate('history')}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
              currentPage === 'history'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/50'
            }`}
          >
            <History className="w-4 h-4" />
            Inspection History
          </button>
          <button
            onClick={onOpenAbout}
            className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-950 hover:bg-slate-200/50 transition-all flex items-center gap-1.5"
          >
            <Info className="w-4 h-4" />
            About
          </button>
        </nav>

        {/* Right Action & Service Status */}
        <div className="flex items-center gap-3">
          {/* Status Badge */}
          <div 
            title={isOnline ? 'Computer Vision & OCR engine ready' : 'Connecting to inspection service...'}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              isOnline
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            {isOnline ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Service Online</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Connecting...</span>
              </>
            )}
          </div>

          {/* New Inspection Action */}
          <button
            onClick={onNewInspection}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-sm shadow-indigo-200 hover:shadow-md hover:shadow-indigo-300 active:scale-98 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Inspection</span>
          </button>
        </div>
      </div>
    </header>
  );
};
