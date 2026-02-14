/**
 * ═══════════════════════════════════════════════════════════
 * GatewayScreen — Language Selection + Path Choice
 *
 * ★ Dynamic Regional Languages:
 *   - Auto-detects user's state via geolocation
 *   - Shows regional languages for that state
 *   - Search bar to find any of 22 Indian languages
 *   - Voice auto-detect: speak naturally and it guesses language
 *   - "Show All Languages" toggle
 *
 * ★ Two paths:
 *   - Guest (Quick Pay) → blue
 *   - Citizen Login → green
 * ═══════════════════════════════════════════════════════════
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ALL_LANGUAGES,
    detectRegion,
    searchLanguages,
    detectSpokenLanguage,
    getLang,
} from '../utils/regionalLanguages';

export default function GatewayScreen({ lang, setLang, onSelectPath }) {
    const [detectedState, setDetectedState] = useState(null);
    const [regionLangs, setRegionLangs] = useState([]);
    const [showAll, setShowAll] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isDetecting, setIsDetecting] = useState(true);
    const [isListening, setIsListening] = useState(false);
    const [voiceHint, setVoiceHint] = useState('');
    const [selectedLang, setSelectedLang] = useState(lang);
    const recognitionRef = useRef(null);
    const langDetectorRef = useRef(null);

    /** On mount: detect region */
    useEffect(() => {
        setIsDetecting(true);
        detectRegion().then(({ state, languages }) => {
            setDetectedState(state);
            setRegionLangs(languages);
            setIsDetecting(false);
        });
        langDetectorRef.current = detectSpokenLanguage();
    }, []);

    /** Select a language */
    const handleSelectLang = useCallback((code) => {
        setSelectedLang(code);
        setLang(code);

        // Speak a greeting in the selected language
        const greetings = {
            en: 'Welcome! Language set to English.',
            hi: 'स्वागत है! भाषा हिन्दी में बदल दी गई।',
            pa: 'ਜੀ ਆਇਆਂ ਨੂੰ! ਭਾਸ਼ਾ ਪੰਜਾਬੀ ਵਿੱਚ ਬਦਲ ਦਿੱਤੀ ਗਈ।',
            bn: 'স্বাগতম! ভাষা বাংলায় পরিবর্তন করা হয়েছে।',
            ta: 'வரவேற்கிறோம்! மொழி தமிழாக மாற்றப்பட்டது.',
            te: 'స్వాగతం! భాష తెలుగులోకి మార్చబడింది.',
            kn: 'ಸ್ವಾಗತ! ಭಾಷೆ ಕನ್ನಡಕ್ಕೆ ಬದಲಾಯಿಸಲಾಗಿದೆ.',
            ml: 'സ്വാഗതം! ഭാഷ മലയാളത്തിലേക്ക് മാറ്റി.',
            mr: 'स्वागत! भाषा मराठी मध्ये बदलली.',
            gu: 'સ્વાગત! ભાષા ગુજરાતી માં બદલાઈ.',
        };
        try {
            const utterance = new SpeechSynthesisUtterance(greetings[code] || greetings.en);
            utterance.lang = getLang(code).speechCode;
            utterance.rate = 0.9;
            speechSynthesis.speak(utterance);
        } catch { }
    }, [setLang]);

    /** Voice auto-detect: listen and guess language */
    const startVoiceDetect = useCallback(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setVoiceHint('Speech not supported');
            return;
        }
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch { }
        }

        setIsListening(true);
        setVoiceHint('Speak naturally in your language...');

        const recognition = new SpeechRecognition();
        recognition.lang = 'hi-IN'; // Start with Hindi, which handles most Indic scripts
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.maxAlternatives = 3;

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setVoiceHint(`"${transcript}"`);

            if (event.results[0].isFinal) {
                // Try to detect language from the transcript
                const detected = langDetectorRef.current?.guessFromTranscript(transcript);
                if (detected) {
                    handleSelectLang(detected);
                    setVoiceHint(`Detected: ${getLang(detected).name} (${getLang(detected).native})`);
                } else {
                    setVoiceHint(`Heard: "${transcript}" — try speaking more words`);
                }
                setIsListening(false);
            }
        };

        recognition.onerror = () => {
            setIsListening(false);
            setVoiceHint('Could not hear clearly. Try again.');
        };

        recognition.onend = () => setIsListening(false);

        recognition.start();
        recognitionRef.current = recognition;
    }, [handleSelectLang]);

    /** Cleanup */
    useEffect(() => {
        return () => {
            try { recognitionRef.current?.stop(); } catch { }
        };
    }, []);

    /** Compute visible languages */
    const searchResults = searchQuery.trim() ? searchLanguages(searchQuery) : null;
    const displayLangs = searchResults || (showAll ? ALL_LANGUAGES : regionLangs);
    const showingRegional = !searchResults && !showAll;

    return (
        <motion.div
            className="fixed inset-0 z-50 overflow-y-auto"
            style={{ background: 'linear-gradient(160deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <div className="min-h-screen flex flex-col items-center justify-start px-4 py-6 max-w-2xl mx-auto">

                {/* ── Header ─────────────────────────────── */}
                <div className="text-center mb-6 w-full">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-lg">
                            <span className="text-white text-lg font-black">S</span>
                        </div>
                        <h1 className="text-2xl font-black text-white">SUVIDHA Setu</h1>
                        <span className="proto-badge">Prototype</span>
                    </div>

                    {/* Indian flag bar */}
                    <div className="flex h-1 rounded-full overflow-hidden max-w-xs mx-auto mb-6">
                        <div className="flex-1" style={{ background: '#FF9933' }} />
                        <div className="flex-1" style={{ background: '#FFFFFF' }} />
                        <div className="flex-1" style={{ background: '#138808' }} />
                    </div>

                    <h2 className="text-3xl font-black text-white mb-1">Choose Your Language</h2>
                    <p className="text-white/40 font-medium">अपनी भाषा चुनें • ਆਪਣੀ ਭਾਸ਼ਾ ਚੁਣੋ</p>
                </div>

                {/* ── Region Detection Status ────────────── */}
                <div className="w-full mb-4">
                    {isDetecting ? (
                        <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-white/5 border border-white/10">
                            <div className="w-3 h-3 rounded-full bg-indigo-400 animate-pulse" />
                            <span className="text-white/50 text-sm">Detecting your region...</span>
                        </div>
                    ) : detectedState ? (
                        <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-green-500/10 border border-green-500/20">
                            <span className="text-green-400 text-sm">📍</span>
                            <span className="text-green-400 text-sm font-semibold">
                                Region detected: <strong>{detectedState}</strong> — showing regional languages
                            </span>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                            <span className="text-amber-400 text-sm">📍</span>
                            <span className="text-amber-400 text-sm font-semibold">
                                Location not available — showing common languages
                            </span>
                        </div>
                    )}
                </div>

                {/* ── Voice Auto-detect Button ──────────── */}
                <div className="w-full mb-4">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={startVoiceDetect}
                        className={`w-full py-4 rounded-2xl border flex items-center justify-center gap-3 cursor-pointer transition-all ${isListening
                                ? 'bg-red-500/15 border-red-500/30 text-red-400'
                                : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
                            }`}
                    >
                        <div className="flex items-center gap-1 h-6">
                            {isListening ? (
                                [...Array(7)].map((_, i) => (
                                    <div key={i} className="waveform-bar" style={{ animationDelay: `${i * 0.08}s`, background: '#EF4444', width: '3px' }} />
                                ))
                            ) : (
                                <span className="text-2xl">🎙️</span>
                            )}
                        </div>
                        <div className="text-left">
                            <p className="font-bold text-sm">
                                {isListening ? 'Listening...' : 'Just Speak / बोलिए'}
                            </p>
                            <p className="text-xs opacity-60">
                                {isListening ? 'Say something in your language' : 'Auto-detect your language by speaking'}
                            </p>
                        </div>
                    </motion.button>
                    {voiceHint && (
                        <motion.p
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center text-sm mt-2 font-medium"
                            style={{ color: voiceHint.startsWith('Detected') ? '#34D399' : 'rgba(255,255,255,0.4)' }}
                        >
                            {voiceHint}
                        </motion.p>
                    )}
                </div>

                {/* ── Search Bar ─────────────────────────── */}
                <div className="w-full mb-3 relative">
                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus-within:border-indigo-500 transition">
                        <span className="text-white/30">🔍</span>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search any language... (e.g. Tamil, বাংলা, ગુજરાતી)"
                            className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/20"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="text-white/30 hover:text-white text-sm cursor-pointer bg-transparent border-0"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Toggle: Regional vs All ────────────── */}
                {!searchResults && (
                    <div className="w-full flex items-center justify-between mb-3">
                        <p className="text-white/30 text-xs font-semibold uppercase tracking-wider">
                            {showAll ? `All Languages (${ALL_LANGUAGES.length})` : `Regional Languages${detectedState ? ` — ${detectedState}` : ''}`}
                        </p>
                        <button
                            onClick={() => setShowAll(!showAll)}
                            className="text-indigo-400 text-xs font-bold cursor-pointer bg-transparent border-0 hover:text-indigo-300"
                        >
                            {showAll ? '← Show Regional' : `Show All ${ALL_LANGUAGES.length} Languages →`}
                        </button>
                    </div>
                )}
                {searchResults && (
                    <p className="w-full text-white/30 text-xs font-semibold uppercase tracking-wider mb-3">
                        Search Results ({searchResults.length})
                    </p>
                )}

                {/* ── Language Grid ──────────────────────── */}
                <div className={`w-full grid gap-2 mb-6 ${displayLangs.length > 6 ? 'grid-cols-3 md:grid-cols-4' : 'grid-cols-3'}`}>
                    <AnimatePresence mode="popLayout">
                        {displayLangs.map((l, i) => (
                            <motion.button
                                key={l.code}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1, transition: { delay: i * 0.03 } }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                whileHover={{ scale: 1.06, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleSelectLang(l.code)}
                                className={`p-3 rounded-xl cursor-pointer border transition-all text-center ${selectedLang === l.code
                                        ? 'bg-indigo-500/20 border-indigo-500/50 shadow-lg shadow-indigo-500/10'
                                        : 'bg-white/4 border-white/8 hover:bg-white/8 hover:border-white/15'
                                    }`}
                            >
                                <p className="text-lg font-bold leading-tight" style={{ color: selectedLang === l.code ? '#A5B4FC' : '#F1F5F9' }}>
                                    {l.native}
                                </p>
                                <p className="text-xs font-medium mt-1" style={{ color: selectedLang === l.code ? '#818CF8' : 'rgba(255,255,255,0.35)' }}>
                                    {l.name}
                                </p>
                                {selectedLang === l.code && (
                                    <motion.div
                                        layoutId="langCheck"
                                        className="w-5 h-5 rounded-full bg-indigo-500 text-white text-xs flex items-center justify-center mx-auto mt-1.5"
                                    >
                                        ✓
                                    </motion.div>
                                )}
                            </motion.button>
                        ))}
                    </AnimatePresence>
                </div>

                {displayLangs.length === 0 && (
                    <div className="text-center py-8">
                        <p className="text-white/30 text-lg">No languages found for "{searchQuery}"</p>
                        <button onClick={() => setSearchQuery('')} className="text-indigo-400 text-sm mt-2 cursor-pointer bg-transparent border-0">
                            Clear search
                        </button>
                    </div>
                )}

                {/* ── Divider ────────────────────────────── */}
                <div className="w-full flex items-center gap-4 my-2 mb-6">
                    <div className="flex-1 h-px bg-white/10" />
                    <span className="text-white/20 text-sm font-bold">SELECT YOUR PATH</span>
                    <div className="flex-1 h-px bg-white/10" />
                </div>

                {/* ── Path Buttons ───────────────────────── */}
                <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    {/* Guest */}
                    <motion.button
                        whileHover={{ scale: 1.03, y: -3 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => onSelectPath('guest')}
                        className="relative overflow-hidden rounded-2xl p-6 cursor-pointer border-2 border-blue-500/30 text-left group"
                        style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.15), rgba(59,130,246,0.08))' }}
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-blue-500/10 -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-500/20 transition" />
                        <span className="text-4xl mb-3 block">⚡</span>
                        <h3 className="text-xl font-bold text-blue-400 mb-1">Quick Pay (Guest)</h3>
                        <p className="text-white/40 text-sm">
                            {selectedLang === 'hi' ? 'बिना लॉगिन के बिल भुगतान' : 'Pay bills without login'}
                        </p>
                        <div className="mt-3 flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                            <span className="text-blue-400/60 text-xs">No login required</span>
                        </div>
                    </motion.button>

                    {/* Citizen */}
                    <motion.button
                        whileHover={{ scale: 1.03, y: -3 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => onSelectPath('citizen')}
                        className="relative overflow-hidden rounded-2xl p-6 cursor-pointer border-2 border-green-500/30 text-left group"
                        style={{ background: 'linear-gradient(135deg, rgba(5,150,105,0.15), rgba(16,185,129,0.08))' }}
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-green-500/10 -translate-y-1/2 translate-x-1/2 group-hover:bg-green-500/20 transition" />
                        <span className="text-4xl mb-3 block">🏛️</span>
                        <h3 className="text-xl font-bold text-green-400 mb-1">Citizen Login</h3>
                        <p className="text-white/40 text-sm">
                            {selectedLang === 'hi' ? 'अपने खाते में लॉगिन करें' : 'Login with e-Pramaan / Aadhaar'}
                        </p>
                        <div className="mt-3 flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                            <span className="text-green-400/60 text-xs">Full dashboard access</span>
                        </div>
                    </motion.button>
                </div>

                {/* ── Footer ─────────────────────────────── */}
                <div className="text-center pb-4">
                    <div className="flex h-1 rounded-full overflow-hidden max-w-xs mx-auto mb-3">
                        <div className="flex-1" style={{ background: '#FF9933' }} />
                        <div className="flex-1" style={{ background: '#FFFFFF' }} />
                        <div className="flex-1" style={{ background: '#138808' }} />
                    </div>
                    <p className="text-white/15 text-xs">C-DAC SUVIDHA 2026 — Empowering Citizens Through Technology</p>
                </div>
            </div>
        </motion.div>
    );
}
