import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { AboutModal } from './components/AboutModal';
import { Home } from './pages/Home';
import { Inspect } from './pages/Inspect';
import { History } from './pages/History';
import { checkBackendHealth } from './services/api';
import type { HealthStatus, InspectionResult } from './types/inspection';
import { ScanText } from 'lucide-react';

export function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'inspect' | 'history'>('home');
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isAboutOpen, setIsAboutOpen] = useState<boolean>(false);
  const [reopenedResult, setReopenedResult] = useState<InspectionResult | null>(null);

  // Poll backend health on mount and periodically
  useEffect(() => {
    let isMounted = true;
    const fetchHealth = async () => {
      const status = await checkBackendHealth();
      if (isMounted) setHealth(status);
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleNavigate = (page: 'home' | 'inspect' | 'history') => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNewInspection = () => {
    setReopenedResult(null);
    setCurrentPage('inspect');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReopenResult = (result: InspectionResult) => {
    setReopenedResult(result);
    setCurrentPage('inspect');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Application Header */}
      <Header
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onNewInspection={handleNewInspection}
        onOpenAbout={() => setIsAboutOpen(true)}
        health={health}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentPage === 'home' && (
          <Home
            onStartInspect={handleNewInspection}
            onOpenAbout={() => setIsAboutOpen(true)}
          />
        )}

        {currentPage === 'inspect' && (
          <Inspect
            initialResult={reopenedResult}
            onClearInitialResult={() => setReopenedResult(null)}
          />
        )}

        {currentPage === 'history' && (
          <History onReopenResult={handleReopenResult} />
        )}
      </main>

      {/* Application Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <ScanText className="w-3.5 h-3.5" />
            </div>
            <span className="font-semibold text-slate-800">SpasthaScan AI</span>
            <span>—</span>
            <span>Document Image Quality Inspector</span>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={() => setIsAboutOpen(true)}
              className="hover:text-slate-900 transition-colors"
            >
              Privacy & Safeguards
            </button>
            <button
              onClick={() => handleNavigate('history')}
              className="hover:text-slate-900 transition-colors"
            >
              Local Audit History
            </button>
            <button
              onClick={handleNewInspection}
              className="text-indigo-600 font-medium hover:text-indigo-700 transition-colors"
            >
              Inspect Document
            </button>
          </div>
        </div>
      </footer>

      {/* About Modal */}
      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />
    </div>
  );
}

export default App;
