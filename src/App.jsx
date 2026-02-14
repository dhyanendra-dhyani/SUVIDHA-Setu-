/**
 * ═══════════════════════════════════════════════════════════
 * SUVIDHA Setu — Main App Orchestrator v2.0
 * 
 * Flow:
 *   1. IdleScreen (attraction loop) → on touch/voice
 *   2. GatewayScreen (language + Guest or Citizen) →
 *      A. Guest → HomeScreen → BillPayment / Complaint → Success
 *      B. Citizen → AuthScreen → CitizenDashboard → Services
 *
 * Persistent UI (always visible once past idle):
 *   - Home button (top left)
 *   - Voice pulse (bottom center)
 *   - SOS / Sahayak button (bottom right)
 *   - Offline indicator
 *
 * Hidden:
 *   - Dev panel: Ctrl+Shift+D
 * ═══════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

import IdleScreen from './components/IdleScreen';
import GatewayScreen from './components/GatewayScreen';
import AuthScreen from './components/AuthScreen';
import HomeScreen from './components/HomeScreen';
import CitizenDashboard from './components/CitizenDashboard';
import BillPayment from './components/BillPayment';
import ComplaintForm from './components/ComplaintForm';
import AdminDashboard from './components/AdminDashboard';
import OfflineIndicator from './components/OfflineIndicator';
import { t } from './utils/i18n';

/** Page transition */
const pageFade = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.3 },
};

function AppContent() {
  const [screen, setScreen] = useState('idle'); // idle | gateway | guest | citizen-auth | citizen-dashboard
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
    setDevLogs((p) => [{ time: new Date().toLocaleTimeString(), message: msg }, ...p.slice(0, 49)]);
  }, []);

  /** Idle timeout: 2min → back to idle (except admin) */
  const resetIdle = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      if (screen !== 'idle' && location.pathname !== '/admin') {
        setScreen('idle');
        setCitizen(null);
        navigate('/');
        addLog('Idle timeout → returned to attraction screen');
      }
    }, 120000);
  }, [screen, location.pathname, navigate, addLog]);

  useEffect(() => {
    const events = ['mousemove', 'touchstart', 'keydown', 'click'];
    events.forEach((e) => window.addEventListener(e, resetIdle));
    resetIdle();
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetIdle));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [resetIdle]);

  /** Dev panel toggle */
  useEffect(() => {
    const h = (e) => { if (e.ctrlKey && e.shiftKey && e.key === 'D') { e.preventDefault(); setShowDevPanel((p) => !p); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  /** Track screen + route changes */
  useEffect(() => { addLog(`Screen: ${screen} | Route: ${location.pathname}`); }, [screen, location.pathname, addLog]);

  /** Path selection from gateway */
  const handlePathSelect = (path) => {
    if (path === 'guest') {
      setScreen('guest');
      navigate('/');
      addLog('Guest mode selected');
    } else {
      setScreen('citizen-auth');
      addLog('Citizen login path');
    }
  };

  /** Authentication success */
  const handleAuthenticated = (citizenData) => {
    setCitizen(citizenData);
    setScreen('citizen-dashboard');
    navigate('/');
    addLog(`Authenticated: ${citizenData.name}`);
  };

  /** Go home (persistent home button) */
  const goHome = () => {
    if (screen === 'citizen-dashboard' || screen === 'guest') {
      navigate('/');
    } else {
      setScreen('idle');
      setCitizen(null);
      navigate('/');
    }
    addLog('Home button pressed');
  };

  const isActive = screen !== 'idle'; // Past the idle screen

  return (
    <div className="min-h-screen flex flex-col relative" style={{ background: '#0F172A' }}>
      {/* ═══ IDLE SCREEN ═══ */}
      <AnimatePresence>
        {screen === 'idle' && (
          <IdleScreen onStart={() => { setScreen('gateway'); addLog('Woke from idle'); }} />
        )}
      </AnimatePresence>

      {/* ═══ GATEWAY ═══ */}
      <AnimatePresence>
        {screen === 'gateway' && (
          <GatewayScreen lang={lang} setLang={setLang} onSelectPath={handlePathSelect} />
        )}
      </AnimatePresence>

      {/* ═══ AUTH SCREEN ═══ */}
      <AnimatePresence>
        {screen === 'citizen-auth' && (
          <AuthScreen lang={lang} onAuthenticated={handleAuthenticated} onBack={() => setScreen('gateway')} />
        )}
      </AnimatePresence>

      {/* ═══ MAIN CONTENT (Guest or Citizen) ═══ */}
      {(screen === 'guest' || screen === 'citizen-dashboard') && (
        <>
          {/* ─── Header ─────────────────────────── */}
          <header className="bg-white/3 backdrop-blur-xl border-b border-white/5 no-print sticky top-0 z-40">
            {/* Indian flag bar */}
            <div className="flex h-1">
              <div className="flex-1" style={{ background: '#FF9933' }} />
              <div className="flex-1" style={{ background: '#FFFFFF' }} />
              <div className="flex-1" style={{ background: '#138808' }} />
            </div>

            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
              {/* Logo + Home */}
              <button
                onClick={goHome}
                className="flex items-center gap-3 cursor-pointer bg-transparent border-0 p-0"
                aria-label="Go to Home"
              >
                <div className="w-11 h-11 gradient-primary rounded-xl flex items-center justify-center shadow-md">
                  <span className="text-white text-lg font-black">S</span>
                </div>
                <div className="hidden md:block">
                  <h1 className="text-lg font-black text-white leading-tight">{t(lang, 'appName')}</h1>
                  <p className="text-xs font-medium text-white/40">{t(lang, 'tagline')}</p>
                </div>
              </button>

              <div className="flex items-center gap-3">
                {/* Mode badge */}
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${screen === 'citizen-dashboard'
                    ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                    : 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                  }`}>
                  {screen === 'citizen-dashboard' ? '🏛️ Citizen' : '⚡ Guest'}
                </span>

                {/* Language */}
                <select
                  value={lang}
                  onChange={(e) => { setLang(e.target.value); addLog(`Lang: ${e.target.value}`); }}
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl font-semibold text-white text-sm cursor-pointer focus:border-indigo-500 focus:outline-none"
                  style={{ minHeight: '40px' }}
                  aria-label="Select language"
                >
                  <option value="en" className="bg-gray-900">English</option>
                  <option value="hi" className="bg-gray-900">हिंदी</option>
                  <option value="pa" className="bg-gray-900">ਪੰਜਾਬੀ</option>
                </select>

                {/* Offline */}
                <OfflineIndicator
                  lang={lang}
                  onOnline={() => { setIsOnline(true); addLog('🟢 Online'); }}
                  onOffline={() => { setIsOnline(false); addLog('🔴 Offline'); }}
                />
              </div>
            </div>
          </header>

          {/* ─── Content ────────────────────────── */}
          <main className="flex-1">
            <AnimatePresence mode="wait">
              <motion.div key={location.pathname} {...pageFade}>
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
              </motion.div>
            </AnimatePresence>
          </main>

          {/* ─── Footer ─────────────────────────── */}
          <footer className="bg-white/2 border-t border-white/5 py-3 text-center no-print">
            <p className="text-white/20 text-xs font-medium">
              C-DAC SUVIDHA 2026 • {t(lang, 'poweredBy')} • v2.0
            </p>
          </footer>
        </>
      )}

      {/* ═══ PERSISTENT UI ELEMENTS (always visible once past idle) ═══ */}
      <AnimatePresence>
        {isActive && screen !== 'idle' && (
          <>
            {/* ── Home Button (top left overlay, only on sub-pages) ── */}
            {location.pathname !== '/' && screen !== 'gateway' && screen !== 'citizen-auth' && (
              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={goHome}
                className="fixed top-20 left-4 z-50 w-12 h-12 rounded-full bg-white/10 backdrop-blur-xl border border-white/15 flex items-center justify-center text-xl cursor-pointer shadow-lg"
                aria-label="Go Home"
              >
                🏠
              </motion.button>
            )}

            {/* ── Voice Pulse (bottom center) ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 px-4 py-2 rounded-full bg-white/5 backdrop-blur-xl border border-white/10"
            >
              {[...Array(5)].map((_, i) => (
                <div key={i} className="voice-bar-sm" style={{ opacity: 0.4 }} />
              ))}
              <span className="text-white/25 text-xs ml-2 font-medium">Listening</span>
            </motion.div>

            {/* ── SOS / Sahayak Button (bottom right) ── */}
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowSOS(true)}
              className="sos-btn fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center cursor-pointer border-2 border-red-500/50 shadow-lg shadow-red-500/20"
              style={{ background: 'linear-gradient(135deg, #DC2626, #EF4444)' }}
              aria-label="SOS Help"
            >
              <span className="text-white font-black text-sm">SOS</span>
            </motion.button>
          </>
        )}
      </AnimatePresence>

      {/* ═══ SOS Modal ═══ */}
      <AnimatePresence>
        {showSOS && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur flex items-center justify-center p-6"
            onClick={() => setShowSOS(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card rounded-3xl p-8 max-w-sm w-full text-center"
            >
              <div className="w-20 h-20 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">🆘</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                {lang === 'hi' ? 'सहायक — मदद चाहिए?' : 'Sahayak — Need Help?'}
              </h3>
              <p className="text-white/50 text-sm mb-6">
                {isOnline
                  ? (lang === 'hi' ? 'वीडियो कॉल शुरू करें या सहायता वीडियो देखें' : 'Start a video call with support or watch help video')
                  : (lang === 'hi' ? 'इंटरनेट नहीं — सहायता वीडियो देखें' : 'No internet — watching offline help video')}
              </p>

              <div className="space-y-3">
                {isOnline && (
                  <button className="w-full py-3 rounded-xl gradient-primary text-white font-bold cursor-pointer border-0">
                    📹 {lang === 'hi' ? 'वीडियो कॉल करें' : 'Video Call Support'}
                  </button>
                )}
                <button className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white font-semibold cursor-pointer hover:bg-white/10">
                  📺 {lang === 'hi' ? 'सहायता वीडियो' : 'Watch Help Video'}
                </button>
                <button
                  onClick={() => setShowSOS(false)}
                  className="w-full py-2.5 text-white/40 hover:text-white text-sm cursor-pointer bg-transparent border-0"
                >
                  {lang === 'hi' ? 'बंद करें' : 'Close'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ DEVELOPER PANEL (Ctrl+Shift+D) ═══ */}
      <AnimatePresence>
        {showDevPanel && (
          <motion.div
            initial={{ x: 400 }}
            animate={{ x: 0 }}
            exit={{ x: 400 }}
            className="fixed top-0 right-0 bottom-0 w-96 bg-gray-950/95 backdrop-blur-xl text-gray-100 shadow-2xl z-[70] overflow-y-auto border-l border-white/5"
            style={{ fontSize: '0.85rem' }}
          >
            <div className="p-4 border-b border-white/5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">🛠️ Dev Panel</h3>
                <button onClick={() => setShowDevPanel(false)} className="text-white/40 hover:text-white text-xl cursor-pointer bg-transparent border-0">✕</button>
              </div>
              <p className="text-xs text-white/20 mt-1">Ctrl+Shift+D</p>
            </div>

            {/* Simulate */}
            <div className="p-4 border-b border-white/5 space-y-2">
              <h4 className="font-bold text-xs text-white/30 uppercase tracking-wider">Simulate</h4>
              <button onClick={() => { window.dispatchEvent(new Event('offline')); addLog('SIM: Offline'); }} className="w-full py-2 px-3 bg-red-900/50 text-red-100 rounded-lg cursor-pointer hover:bg-red-900/70 text-sm border-0">🔴 Go Offline</button>
              <button onClick={() => { window.dispatchEvent(new Event('online')); addLog('SIM: Online'); }} className="w-full py-2 px-3 bg-green-900/50 text-green-100 rounded-lg cursor-pointer hover:bg-green-900/70 text-sm border-0">🟢 Go Online</button>
              <button onClick={() => { setScreen('idle'); navigate('/'); addLog('SIM: Reset to Idle'); }} className="w-full py-2 px-3 bg-yellow-900/50 text-yellow-100 rounded-lg cursor-pointer hover:bg-yellow-900/70 text-sm border-0">♻️ Reset to Idle</button>
              <button onClick={() => { setScreen('gateway'); navigate('/'); addLog('SIM: Gateway'); }} className="w-full py-2 px-3 bg-indigo-900/50 text-indigo-100 rounded-lg cursor-pointer hover:bg-indigo-900/70 text-sm border-0">🚪 Gateway Screen</button>
              <button onClick={() => { navigate('/bill/electricity'); addLog('NAV: Electricity Bill'); }} className="w-full py-2 px-3 bg-blue-900/50 text-blue-100 rounded-lg cursor-pointer hover:bg-blue-900/70 text-sm border-0">⚡ Bill Payment</button>
              <button onClick={() => { navigate('/admin'); addLog('NAV: Admin'); }} className="w-full py-2 px-3 bg-gray-800 text-gray-100 rounded-lg cursor-pointer hover:bg-gray-700 text-sm border-0">📊 Admin</button>
            </div>

            {/* State */}
            <div className="p-4 border-b border-white/5">
              <h4 className="font-bold text-xs text-white/30 uppercase tracking-wider mb-2">State</h4>
              <div className="space-y-1 text-xs font-mono">
                <p>Screen: <span className="text-indigo-400">{screen}</span></p>
                <p>Route: <span className="text-blue-400">{location.pathname}</span></p>
                <p>Lang: <span className="text-green-400">{lang}</span></p>
                <p>Online: <span className={isOnline ? 'text-green-400' : 'text-red-400'}>{String(isOnline)}</span></p>
                <p>Citizen: <span className="text-amber-400">{citizen?.name || 'none'}</span></p>
                <p>Speech: <span className="text-yellow-400">{String(!!(window.SpeechRecognition || window.webkitSpeechRecognition))}</span></p>
              </div>
            </div>

            {/* Logs */}
            <div className="p-4">
              <h4 className="font-bold text-xs text-white/30 uppercase tracking-wider mb-2">Logs</h4>
              <div className="space-y-0.5 max-h-72 overflow-y-auto">
                {devLogs.map((log, i) => (
                  <div key={i} className="text-xs font-mono py-1 border-b border-white/3">
                    <span className="text-white/20">{log.time}</span>{' '}<span className="text-white/60">{log.message}</span>
                  </div>
                ))}
                {devLogs.length === 0 && <p className="text-xs text-white/15">No logs yet</p>}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
