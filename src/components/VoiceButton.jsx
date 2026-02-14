/**
 * ═══════════════════════════════════════════════════════════
 * VoiceButton — Reusable mic component (dark theme)
 * Supports variable sizes, pulse animation, waveform, label
 * ═══════════════════════════════════════════════════════════
 */

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { startSpeechRecognition, isSpeechRecognitionSupported } from '../utils/voiceCommands';

export default function VoiceButton({
    lang = 'en',
    size = 100,
    showLabel = false,
    labelText = 'Tap to speak',
    onResult,
    onError,
    className = '',
}) {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const stopRef = useRef(null);

    const handleStart = useCallback(() => {
        if (!isSpeechRecognitionSupported()) {
            onError?.('Speech recognition not supported');
            return;
        }

        setIsListening(true);
        setTranscript('');

        const stop = startSpeechRecognition(
            lang,
            (text) => {
                setTranscript(text);
                setIsListening(false);
                onResult?.(text);
                setTimeout(() => setTranscript(''), 4000);
            },
            (err) => {
                setIsListening(false);
                onError?.(err);
            },
            () => setIsListening(false),
        );
        stopRef.current = stop;
    }, [lang, onResult, onError]);

    const handleStop = useCallback(() => {
        if (stopRef.current) stopRef.current();
        setIsListening(false);
    }, []);

    const supported = isSpeechRecognitionSupported();
    const iconSize = Math.max(size * 0.35, 20);

    return (
        <div className={`flex flex-col items-center gap-2 ${className}`}>
            <motion.button
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.93 }}
                onClick={isListening ? handleStop : handleStart}
                className={`mic-btn rounded-full flex items-center justify-center cursor-pointer border-2 transition-all ${isListening ? 'active' : ''
                    }`}
                style={{
                    width: `${size}px`,
                    height: `${size}px`,
                    background: isListening
                        ? 'linear-gradient(135deg, #EF4444, #DC2626)'
                        : 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(99,102,241,0.1))',
                    borderColor: isListening ? 'rgba(239,68,68,0.5)' : 'rgba(99,102,241,0.35)',
                    backdropFilter: 'blur(12px)',
                }}
                disabled={!supported}
                aria-label={isListening ? 'Stop listening' : 'Start voice input'}
                aria-pressed={isListening}
            >
                {isListening ? (
                    /* Waveform bars */
                    <div className="flex items-center gap-1" style={{ height: `${iconSize}px` }}>
                        {[...Array(7)].map((_, i) => (
                            <div key={i} className="waveform-bar" style={{ background: 'white', width: '3px' }} />
                        ))}
                    </div>
                ) : (
                    /* Mic icon */
                    <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" x2="12" y1="19" y2="22" />
                    </svg>
                )}
            </motion.button>

            {/* Label */}
            {showLabel && (
                <p className="text-white/40 text-sm font-medium text-center">
                    {isListening ? 'Listening...' : (supported ? labelText : 'Voice not supported')}
                </p>
            )}

            {/* Transcript bubble */}
            <AnimatePresence>
                {transcript && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -5, scale: 0.9 }}
                        className="bg-indigo-600/20 border border-indigo-500/20 rounded-xl px-4 py-2 max-w-xs"
                    >
                        <p className="text-indigo-300 text-sm text-center">"{transcript}"</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
