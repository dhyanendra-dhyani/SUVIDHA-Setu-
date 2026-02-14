/**
 * ═══════════════════════════════════════════════════════════
 * HomeScreen - Service Selection Grid (Screen 3A for Guests)
 * Dark themed, with voice command support
 * ═══════════════════════════════════════════════════════════
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import VoiceButton from './VoiceButton';
import { t } from '../utils/i18n';
import { processVoiceCommand, speak } from '../utils/voiceCommands';

const SERVICES = [
    { key: 'electricity', icon: '⚡', label: 'electricityBill', route: '/bill/electricity', gradient: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(251,191,36,0.05))', border: 'rgba(251,191,36,0.3)', accentColor: '#FBBF24' },
    { key: 'water', icon: '💧', label: 'waterBill', route: '/bill/water', gradient: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(59,130,246,0.05))', border: 'rgba(59,130,246,0.3)', accentColor: '#3B82F6' },
    { key: 'gas', icon: '🔥', label: 'gasBill', route: '/bill/gas', gradient: 'linear-gradient(135deg, rgba(249,115,22,0.15), rgba(249,115,22,0.05))', border: 'rgba(249,115,22,0.3)', accentColor: '#F97316' },
    { key: 'property', icon: '🏠', label: 'propertyTax', route: '/bill/electricity', gradient: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(139,92,246,0.05))', border: 'rgba(139,92,246,0.3)', accentColor: '#8B5CF6' },
];

const cardVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: (i) => ({
        opacity: 1, y: 0, scale: 1,
        transition: { delay: 0.1 * i, duration: 0.45, ease: 'easeOut' },
    }),
};

export default function HomeScreen({ lang, setLang, onBack }) {
    const navigate = useNavigate();

    const handleVoiceResult = useCallback((transcript) => {
        const result = processVoiceCommand(transcript);
        if (result.type === 'navigate') {
            speak(`Navigating`, lang);
            navigate(result.value);
        } else if (result.type === 'language') {
            setLang(result.value);
        } else {
            speak("Sorry, I didn't understand. Please try again or tap a service.", lang);
        }
    }, [navigate, lang, setLang]);

    /** Extra label keys for the UI */
    const extraLabels = { propertyTax: 'Property Tax' };
    const getLabel = (key, labelKey) => extraLabels[key] || t(lang, labelKey);

    return (
        <motion.div
            className="min-h-[calc(100vh-160px)] flex flex-col items-center justify-center px-4 py-8 gap-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            {/* Back + Title */}
            <div className="w-full max-w-3xl flex items-center gap-4 mb-2">
                {onBack && (
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={onBack}
                        className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white cursor-pointer text-lg"
                        aria-label="Back"
                    >
                        ←
                    </motion.button>
                )}
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-white">
                        {lang === 'hi' ? 'सेवा चुनें' : lang === 'pa' ? 'ਸੇਵਾ ਚੁਣੋ' : 'Select a Service'}
                    </h1>
                    <p className="text-white/40 text-sm">
                        {lang === 'hi' ? 'नीचे टैप करें या बोलें' : 'Tap below or speak your need'}
                    </p>
                </div>
            </div>

            {/* Voice Button */}
            <VoiceButton
                lang={lang}
                size={100}
                showLabel={true}
                labelText={t(lang, 'voiceInstruction')}
                onResult={handleVoiceResult}
                onError={() => { }}
            />

            {/* Service Cards Grid */}
            <div className="grid grid-cols-2 gap-4 md:gap-5 w-full max-w-xl">
                {SERVICES.map((svc, i) => (
                    <motion.button
                        key={svc.key}
                        custom={i}
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        whileHover={{ scale: 1.04, y: -3 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => { speak(`Opening ${svc.key}`, lang); navigate(svc.route); }}
                        className="group rounded-2xl p-6 cursor-pointer border-2 flex flex-col items-center gap-3 transition-all"
                        style={{
                            background: svc.gradient,
                            borderColor: 'transparent',
                            minHeight: '180px',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = svc.border}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
                        aria-label={getLabel(svc.key, svc.label)}
                    >
                        <span className="text-5xl mb-1 group-hover:scale-110 transition-transform">{svc.icon}</span>
                        <span className="text-white font-bold text-center leading-tight" style={{ fontSize: '1.1rem' }}>
                            {getLabel(svc.key, svc.label)}
                        </span>
                        <div className="w-8 h-1 rounded-full mt-1" style={{ background: svc.accentColor }} />
                    </motion.button>
                ))}
            </div>

            {/* Hints */}
            <p className="text-white/20 text-sm text-center mt-2">
                💡 Say "Pay electricity bill" or "Bijli ka bill"
            </p>
        </motion.div>
    );
}
