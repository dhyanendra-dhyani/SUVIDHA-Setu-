/**
 * ═══════════════════════════════════════════════════════════
 * AuthScreen - e-Pramaan Citizen Authentication (Screen 3B)
 * Simulates biometric (thumb / face), OTP fallback.
 * Shows PINs/codes visibly for prototype demo.
 * ═══════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { t } from '../utils/i18n';
import { speak } from '../utils/voiceCommands';

/** Mock citizen data */
const MOCK_CITIZEN = {
    aadhaar: 'XXXX-XXXX-4829',
    name: 'Vivek Kumar',
    phone: '+91 98XXX XX890',
    otp: '482916',
    photo: null, // We'll use initials
    address: 'H.No 234, Sector 5, Ludhiana, Punjab',
};

export default function AuthScreen({ lang, onAuthenticated, onBack }) {
    const [authMode, setAuthMode] = useState(null); // 'thumb' | 'face' | 'otp'
    const [isScanning, setIsScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [otpInput, setOtpInput] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [error, setError] = useState('');
    const [authenticated, setAuthenticated] = useState(false);

    /** Simulate biometric scan progress */
    useEffect(() => {
        if (!isScanning) return;
        const interval = setInterval(() => {
            setScanProgress((prev) => {
                if (prev >= 100) {
                    clearInterval(interval);
                    setIsScanning(false);
                    setAuthenticated(true);
                    speak(lang === 'hi' ? 'प्रमाणीकरण सफल' : 'Authentication successful', lang);
                    setTimeout(() => onAuthenticated(MOCK_CITIZEN), 1200);
                    return 100;
                }
                return prev + 3;
            });
        }, 60);
        return () => clearInterval(interval);
    }, [isScanning, lang, onAuthenticated]);

    /** Start biometric scan */
    const startScan = (mode) => {
        setAuthMode(mode);
        setIsScanning(true);
        setScanProgress(0);
        setError('');
        speak(mode === 'thumb'
            ? (lang === 'hi' ? 'कृपया अंगूठा स्कैनर पर रखें' : 'Place your thumb on the scanner')
            : (lang === 'hi' ? 'कृपया कैमरे की ओर देखें' : 'Please look at the camera'),
            lang);
    };

    /** Send OTP */
    const sendOtp = () => {
        setAuthMode('otp');
        setOtpSent(true);
        setError('');
        speak(lang === 'hi' ? 'ओ.टी.पी. भेजा गया' : 'OTP has been sent to your phone', lang);
    };

    /** Verify OTP */
    const verifyOtp = () => {
        if (otpInput === MOCK_CITIZEN.otp) {
            setAuthenticated(true);
            speak(lang === 'hi' ? 'ओ.टी.पी. सत्यापित' : 'OTP verified successfully', lang);
            setTimeout(() => onAuthenticated(MOCK_CITIZEN), 1000);
        } else {
            setError(lang === 'hi' ? 'गलत OTP — नीचे सही OTP देखें' : 'Wrong OTP — see correct OTP below');
        }
    };

    return (
        <motion.div
            className="min-h-[calc(100vh-160px)] flex flex-col items-center justify-center px-6 py-10"
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
        >
            <div className="w-full max-w-lg">
                {/* Back button */}
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onBack}
                    className="mb-6 flex items-center gap-2 text-white/60 hover:text-white text-sm font-semibold cursor-pointer bg-transparent border-0"
                >
                    ← {t(lang, 'back')}
                </motion.button>

                {/* Title */}
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-black text-white mb-2">
                        🔐 {lang === 'hi' ? 'ई-प्रमाण सत्यापन' : lang === 'pa' ? 'ਈ-ਪ੍ਰਮਾਣ ਪ੍ਰਮਾਣਿਕਤਾ' : 'e-Pramaan Authentication'}
                    </h2>
                    <p className="text-white/50 text-sm">
                        {lang === 'hi' ? 'अपनी पहचान सत्यापित करें' : 'Verify your identity to access all services'}
                    </p>
                </div>

                <AnimatePresence mode="wait">
                    {/* ── Mode Selection ────────────────────── */}
                    {!authMode && !authenticated && (
                        <motion.div
                            key="select"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="space-y-4"
                        >
                            <motion.button
                                whileHover={{ scale: 1.02, y: -2 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => startScan('thumb')}
                                className="w-full glass-card rounded-2xl p-6 flex items-center gap-5 cursor-pointer border-2 border-transparent hover:border-indigo-500/30"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 flex items-center justify-center text-3xl">
                                    👆
                                </div>
                                <div className="text-left">
                                    <h3 className="text-lg font-bold text-white">
                                        {lang === 'hi' ? 'अंगूठा स्कैन' : 'Thumbprint Scan'}
                                    </h3>
                                    <p className="text-white/40 text-sm">
                                        {lang === 'hi' ? 'स्कैनर पर अंगूठा रखें' : 'Place thumb on biometric scanner'}
                                    </p>
                                </div>
                            </motion.button>

                            <motion.button
                                whileHover={{ scale: 1.02, y: -2 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => startScan('face')}
                                className="w-full glass-card rounded-2xl p-6 flex items-center gap-5 cursor-pointer border-2 border-transparent hover:border-indigo-500/30"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-green-600/20 flex items-center justify-center text-3xl">
                                    📸
                                </div>
                                <div className="text-left">
                                    <h3 className="text-lg font-bold text-white">
                                        {lang === 'hi' ? 'चेहरा पहचान' : 'Face Recognition'}
                                    </h3>
                                    <p className="text-white/40 text-sm">
                                        {lang === 'hi' ? 'कैमरे की ओर देखें' : 'Look at the camera'}
                                    </p>
                                </div>
                            </motion.button>

                            <motion.button
                                whileHover={{ scale: 1.02, y: -2 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={sendOtp}
                                className="w-full glass-card rounded-2xl p-6 flex items-center gap-5 cursor-pointer border-2 border-transparent hover:border-amber-500/30"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-amber-600/20 flex items-center justify-center text-3xl">
                                    📱
                                </div>
                                <div className="text-left">
                                    <h3 className="text-lg font-bold text-white">
                                        {lang === 'hi' ? 'OTP से लॉगिन' : 'Use OTP'}
                                    </h3>
                                    <p className="text-white/40 text-sm">
                                        {lang === 'hi' ? 'फ़ोन पर OTP प्राप्त करें' : 'Receive OTP on registered mobile'}
                                    </p>
                                </div>
                            </motion.button>

                            {/* Proto info: Show Aadhaar */}
                            <div className="mt-6 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                                <p className="text-amber-400 text-xs font-bold mb-2">🔧 PROTOTYPE — Demo Credentials:</p>
                                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                                    <span className="text-white/40">Aadhaar:</span> <span className="text-amber-300">{MOCK_CITIZEN.aadhaar}</span>
                                    <span className="text-white/40">Name:</span>    <span className="text-amber-300">{MOCK_CITIZEN.name}</span>
                                    <span className="text-white/40">Phone:</span>   <span className="text-amber-300">{MOCK_CITIZEN.phone}</span>
                                    <span className="text-white/40">OTP Code:</span><span className="text-amber-300 text-base font-black">{MOCK_CITIZEN.otp}</span>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ── Biometric Scanning ────────────────── */}
                    {(authMode === 'thumb' || authMode === 'face') && isScanning && (
                        <motion.div
                            key="scanning"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center gap-6"
                        >
                            {/* Scanner visual */}
                            <div className="relative w-48 h-48">
                                <div className="absolute inset-0 rounded-full bg-indigo-600/10 border-2 border-indigo-500/30 flex items-center justify-center">
                                    <span className="text-7xl">{authMode === 'thumb' ? '👆' : '📸'}</span>
                                </div>
                                {/* Circular progress */}
                                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                                    <circle
                                        cx="50" cy="50" r="46"
                                        fill="none" stroke="#6366F1" strokeWidth="4"
                                        strokeLinecap="round"
                                        strokeDasharray={`${scanProgress * 2.89} 289`}
                                        className="transition-all duration-100"
                                    />
                                </svg>
                            </div>

                            <p className="text-white text-lg font-semibold">
                                {authMode === 'thumb'
                                    ? (lang === 'hi' ? 'अंगूठा स्कैन हो रहा है...' : 'Scanning thumbprint...')
                                    : (lang === 'hi' ? 'चेहरा स्कैन हो रहा है...' : 'Scanning face...')}
                            </p>
                            <p className="text-indigo-400 font-mono text-2xl font-bold">{scanProgress}%</p>
                        </motion.div>
                    )}

                    {/* ── OTP Input ─────────────────────────── */}
                    {authMode === 'otp' && otpSent && !authenticated && (
                        <motion.div
                            key="otp"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center gap-5"
                        >
                            <div className="glass-card rounded-2xl p-6 w-full max-w-sm text-center">
                                <p className="text-white/60 text-sm mb-1">{lang === 'hi' ? 'OTP भेजा गया' : 'OTP sent to'}</p>
                                <p className="text-white font-bold mb-4">{MOCK_CITIZEN.phone}</p>

                                <input
                                    type="text"
                                    maxLength={6}
                                    value={otpInput}
                                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                                    placeholder="● ● ● ● ● ●"
                                    className="w-full p-4 rounded-xl bg-white/5 border-2 border-white/10 text-center text-3xl font-mono text-white tracking-[0.5em] focus:border-indigo-500 focus:outline-none"
                                    aria-label="Enter OTP"
                                    autoFocus
                                />

                                {error && (
                                    <p className="text-red-400 text-sm mt-3 font-semibold">{error}</p>
                                )}

                                <button
                                    onClick={verifyOtp}
                                    disabled={otpInput.length < 6}
                                    className="w-full mt-4 py-4 rounded-xl gradient-primary text-white font-bold text-lg cursor-pointer disabled:opacity-40 border-0"
                                >
                                    {lang === 'hi' ? 'सत्यापित करें' : 'Verify OTP'}
                                </button>
                            </div>

                            {/* Proto hint */}
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center">
                                <p className="text-amber-400 text-xs font-bold">🔧 PROTOTYPE — Use OTP: <span className="text-lg font-black">{MOCK_CITIZEN.otp}</span></p>
                            </div>

                            <button
                                onClick={() => { setAuthMode(null); setOtpSent(false); setOtpInput(''); setError(''); }}
                                className="text-white/40 hover:text-white text-sm cursor-pointer bg-transparent border-0"
                            >
                                ← {lang === 'hi' ? 'वापस जाएँ' : 'Back to options'}
                            </button>
                        </motion.div>
                    )}

                    {/* ── Authenticated ─────────────────────── */}
                    {authenticated && (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center gap-4"
                        >
                            <motion.div
                                className="w-28 h-28 rounded-full gradient-success flex items-center justify-center shadow-2xl"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                            >
                                <span className="text-white text-5xl">✓</span>
                            </motion.div>
                            <h3 className="text-2xl font-bold text-green-400">
                                {lang === 'hi' ? 'सत्यापन सफल!' : 'Verified!'}
                            </h3>
                            <p className="text-white/50">{lang === 'hi' ? 'डैशबोर्ड पर ले जा रहे हैं...' : 'Redirecting to your dashboard...'}</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
