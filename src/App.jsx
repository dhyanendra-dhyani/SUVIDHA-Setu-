/**
 * ═══════════════════════════════════════════════════════════
 * SUVIDHA Setu — Main App Orchestrator v2.1 (Performance)
 *
 * Optimizations:
 *   - React.lazy + Suspense for code splitting
 *   - Lightweight CSS transitions instead of heavy Framer Motion
 *   - Minimal re-renders via useCallback/useMemo
 *   - No nested AnimatePresence
 * ═══════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { t } from './utils/i18n';

/* ── Lazy-loaded screens (code-split) ─────────────── */
const IdleScreen = lazy(() => import('./components/IdleScreen'));
const GatewayScreen = lazy(() => import('./components/GatewayScreen'));
const AuthScreen = lazy(() => import('./components/AuthScreen'));
const CitizenDashboard = lazy(() => import('./components/CitizenDashboard'));
const HomeScreen = lazy(() => import('./components/HomeScreen'));
const BillPayment = lazy(() => import('./components/BillPayment'));
const ComplaintForm = lazy(() => import('./components/ComplaintForm'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const OfflineIndicator = lazy(() => import('./components/OfflineIndicator'));

/** Minimal loading fallback */
function Loader() {
  return (
    <div className="fixed inset-0 bg-[#0F172A] flex items-center justify-center z-50">
      <div className="text-center">
        <div className="w-12 h-12 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-white/40 text-sm font-medium">Loading...</p>
      </div>
    </div>
  );
}

function AppContent() {
  const [screen, setScreen] = useState('idle');
  const [lang, setLang] = useState('en');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [citizen, setCitizen] = useState(null);
  const [showDevPanel, setShowDevPanel] = useState(false);
  const [devLogs, setDevLogs] = useState([]);
  const [showSOS, setShowSOS] = useState(false);
  const idleTimerRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const addLog = useCallback((msg) => {
    setDevLogs((p) => [{ time: new Date().toLocaleTimeString(), message: msg }, ...p.slice(0, 29)]);
  }, []);

  /** Idle timeout: 2min → reset */
  const resetIdle = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      if (screen !== 'idle' && location.pathname !== '/admin') {
        setScreen('idle');
        setCitizen(null);
        navigate('/');
        addLog('Idle timeout → reset');
      }
    }, 120000);
  }, [screen, location.pathname, navigate, addLog]);

  useEffect(() => {
    const events = ['touchstart', 'click', 'keydown'];
    events.forEach((e) => window.addEventListener(e, resetIdle, { passive: true }));
    resetIdle();
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetIdle));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [resetIdle]);

  /** Dev panel */
  useEffect(() => {
    const h = (e) => { if (e.ctrlKey && e.shiftKey && e.key === 'D') { e.preventDefault(); setShowDevPanel((p) => !p); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const handlePathSelect = useCallback((path) => {
    if (path === 'guest') {
      setScreen('guest');
      navigate('/');
      addLog('Guest mode');
    } else {
      setScreen('citizen-auth');
      addLog('Citizen login');
    }
  }, [navigate, addLog]);

  const handleAuthenticated = useCallback((citizenData) => {
    setCitizen(citizenData);
    setScreen('citizen-dashboard');
    navigate('/');
    addLog(`Auth: ${citizenData.name}`);
  }, [navigate, addLog]);

  const goHome = useCallback(() => {
    if (screen === 'citizen-dashboard' || screen === 'guest') {
      navigate('/');
    } else {
      setScreen('idle');
      setCitizen(null);
      navigate('/');
    }
  }, [screen, navigate]);

  const isActive = screen !== 'idle';

  return (
    <div className="min-h-screen flex flex-col relative" style={{ background: '#0F172A' }}>
      <Suspense fallback={<Loader />}>
        {/* ═══ IDLE ═══ */}
        {screen === 'idle' && (
          <IdleScreen onStart={() => { setScreen('gateway'); addLog('Woke'); }} />
        )}

        {/* ═══ GATEWAY ═══ */}
        {screen === 'gateway' && (
          <GatewayScreen lang={lang} setLang={setLang} onSelectPath={handlePathSelect} />
        )}

        {/* ═══ AUTH ═══ */}
        {screen === 'citizen-auth' && (
          <AuthScreen lang={lang} onAuthenticated={handleAuthenticated} onBack={() => setScreen('gateway')} />
        )}

        {/* ═══ MAIN CONTENT ═══ */}
        {(screen === 'guest' || screen === 'citizen-dashboard') && (
          <>
            {/* Header */}
            <header className="header-bar no-print sticky top-0 z-40">
              <div className="flex h-1">
                <div className="flex-1" style={{ background: '#FF9933' }} />
                <div className="flex-1" style={{ background: '#FFFFFF' }} />
                <div className="flex-1" style={{ background: '#138808' }} />
              </div>
              <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                <button onClick={goHome} className="flex items-center gap-3 cursor-pointer bg-transparent border-0 p-0" aria-label="Home">
                  <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
                    <span className="text-white text-lg font-black">S</span>
                  </div>
                  <div className="hidden md:block">
                    <h1 className="text-lg font-black text-white leading-tight">{t(lang, 'appName')}</h1>
                    <p className="text-xs font-medium text-white/40">{t(lang, 'tagline')}</p>
                  </div>
                </button>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${screen === 'citizen-dashboard'
                      ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                      : 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                    }`}>
                    {screen === 'citizen-dashboard' ? '🏛️ Citizen' : '⚡ Guest'}
                  </span>
                  <select
                    value={lang}
                    onChange={(e) => setLang(e.target.value)}
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl font-semibold text-white text-sm cursor-pointer focus:border-indigo-500 focus:outline-none"
                    aria-label="Language"
                  >
                    <option value="en" className="bg-gray-900">English</option>
                    <option value="hi" className="bg-gray-900">हिंदी</option>
                    <option value="pa" className="bg-gray-900">ਪੰਜਾਬੀ</option>
                  </select>
                  <Suspense fallback={null}>
                    <OfflineIndicator
                      lang={lang}
                      onOnline={() => setIsOnline(true)}
                      onOffline={() => setIsOnline(false)}
                    />
                  </Suspense>
                </div>
              </div>
            </header>

            {/* Content */}
            <main className="flex-1">
              <Routes location={location}>
                <Route
                  path="/"
                  element={
                    screen === 'citizen-dashboard'
                      ? <CitizenDashboard lang={lang} citizen={citizen} onLogout={() => { setCitizen(null); setScreen('gateway'); }} isOnline={isOnline} />
                      : <HomeScreen lang={lang} setLang={setLang} onBack={() => setScreen('gateway')} />
                  }
                />
                <Route path="/bill/:serviceType" element={<BillPayment lang={lang} isOnline={isOnline} />} />
                <Route path="/complaint" element={<ComplaintForm lang={lang} isOnline={isOnline} />} />
                <Route path="/admin" element={<AdminDashboard lang={lang} />} />
              </Routes>
            </main>

            {/* Footer */}
            <footer className="bg-white/2 border-t border-white/5 py-3 text-center no-print">
              <p className="text-white/20 text-xs font-medium">C-DAC SUVIDHA 2026 • {t(lang, 'poweredBy')} • v2.1</p>
            </footer>
          </>
        )}
      </Suspense>

      {/* ═══ PERSISTENT UI ═══ */}
      {isActive && screen !== 'idle' && screen !== 'gateway' && screen !== 'citizen-auth' && (
        <>
          {/* Home button (sub-pages only) */}
          {location.pathname !== '/' && (
            <button
              onClick={goHome}
              className="fixed top-20 left-4 z-50 w-11 h-11 rounded-full bg-white/10 backdrop-blur border border-white/15 flex items-center justify-center text-lg cursor-pointer fast-fade-in"
              aria-label="Home"
            >
              🏠
            </button>
          )}

          {/* Voice pulse (bottom center) */}
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 px-4 py-2 rounded-full bg-white/5 backdrop-blur border border-white/10">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="voice-bar-sm" style={{ opacity: 0.4 }} />
            ))}
            <span className="text-white/25 text-xs ml-2 font-medium">Listening</span>
          </div>

          {/* SOS button */}
          <button
            onClick={() => setShowSOS(true)}
            className="sos-btn fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center cursor-pointer border-2 border-red-500/50 shadow-lg shadow-red-500/20"
            style={{ background: 'linear-gradient(135deg, #DC2626, #EF4444)' }}
            aria-label="SOS"
          >
            <span className="text-white font-black text-sm">SOS</span>
          </button>
        </>
      )}

      {/* ═══ SOS Modal ═══ */}
      {showSOS && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 fast-fade-in" onClick={() => setShowSOS(false)}>
          <div onClick={(e) => e.stopPropagation()} className="glass-card rounded-3xl p-8 max-w-sm w-full text-center fast-scale-in">
            <div className="w-20 h-20 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">🆘</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">
              {lang === 'hi' ? 'सहायक — मदद चाहिए?' : 'Sahayak — Need Help?'}
            </h3>
            <p className="text-white/50 text-sm mb-6">
              {isOnline ? 'Start a video call or watch help video' : 'No internet — watching offline help video'}
            </p>
            <div className="space-y-3">
              {isOnline && (
                <button className="w-full py-3 rounded-xl gradient-primary text-white font-bold cursor-pointer border-0">
                  📹 Video Call Support
                </button>
              )}
              <button className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white font-semibold cursor-pointer hover:bg-white/10">
                📺 Watch Help Video
              </button>
              <button onClick={() => setShowSOS(false)} className="w-full py-2.5 text-white/40 hover:text-white text-sm cursor-pointer bg-transparent border-0">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ DEV PANEL ═══ */}
      {showDevPanel && (
        <div className="fixed top-0 right-0 bottom-0 w-80 bg-gray-950/95 backdrop-blur text-gray-100 shadow-2xl z-[70] overflow-y-auto border-l border-white/5 fast-slide-left" style={{ fontSize: '0.8rem' }}>
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">🛠️ Dev Panel</h3>
            <button onClick={() => setShowDevPanel(false)} className="text-white/40 hover:text-white text-xl cursor-pointer bg-transparent border-0">✕</button>
          </div>
          <div className="p-3 border-b border-white/5 space-y-1.5">
            <h4 className="font-bold text-xs text-white/30 uppercase tracking-wider">Simulate</h4>
            <button onClick={() => { window.dispatchEvent(new Event('offline')); addLog('SIM: Offline'); }} className="w-full py-1.5 px-3 bg-red-900/50 text-red-100 rounded-lg cursor-pointer text-xs border-0">🔴 Offline</button>
            <button onClick={() => { window.dispatchEvent(new Event('online')); addLog('SIM: Online'); }} className="w-full py-1.5 px-3 bg-green-900/50 text-green-100 rounded-lg cursor-pointer text-xs border-0">🟢 Online</button>
            <button onClick={() => { setScreen('idle'); navigate('/'); }} className="w-full py-1.5 px-3 bg-yellow-900/50 text-yellow-100 rounded-lg cursor-pointer text-xs border-0">♻️ Reset</button>
            <button onClick={() => { setScreen('gateway'); navigate('/'); }} className="w-full py-1.5 px-3 bg-indigo-900/50 text-indigo-100 rounded-lg cursor-pointer text-xs border-0">🚪 Gateway</button>
          </div>
          <div className="p-3 border-b border-white/5 text-xs font-mono space-y-0.5">
            <p>Screen: <span className="text-indigo-400">{screen}</span></p>
            <p>Route: <span className="text-blue-400">{location.pathname}</span></p>
            <p>Lang: <span className="text-green-400">{lang}</span></p>
            <p>Online: <span className={isOnline ? 'text-green-400' : 'text-red-400'}>{String(isOnline)}</span></p>
            <p>Citizen: <span className="text-amber-400">{citizen?.name || 'none'}</span></p>
          </div>
          <div className="p-3">
            <h4 className="font-bold text-xs text-white/30 uppercase tracking-wider mb-1">Logs</h4>
            <div className="space-y-0 max-h-52 overflow-y-auto">
              {devLogs.map((log, i) => (
                <div key={i} className="text-xs font-mono py-0.5 border-b border-white/3">
                  <span className="text-white/20">{log.time}</span> <span className="text-white/50">{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
