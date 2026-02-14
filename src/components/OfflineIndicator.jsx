/**
 * ═══════════════════════════════════════════════════════════
 * OfflineIndicator — dark themed, glass card style
 * Detects online/offline, shows banner, auto-syncs.
 * ═══════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getPendingCount, syncPendingData } from '../utils/offlineSync';

export default function OfflineIndicator({ lang, onOnline, onOffline }) {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [pendingCount, setPendingCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        const handleOnline = async () => {
            setIsOnline(true);
            onOnline?.();
            const count = await getPendingCount();
            if (count > 0) {
                setIsSyncing(true);
                await syncPendingData((p) => setPendingCount(Math.max(0, count - Math.floor(p * count))));
                setIsSyncing(false);
                setPendingCount(0);
            }
        };

        const handleOffline = () => {
            setIsOnline(false);
            onOffline?.();
        };

        // Check pending on mount
        getPendingCount().then(setPendingCount);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [onOnline, onOffline]);

    return (
        <>
            {/* Status dot */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: isOnline ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' }}>
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: isOnline ? '#10B981' : '#EF4444' }} />
                <span className="text-xs font-bold" style={{ color: isOnline ? '#34D399' : '#F87171' }}>
                    {isOnline ? 'Online' : 'Offline'}
                </span>
            </div>

            {/* Offline banner */}
            <AnimatePresence>
                {!isOnline && (
                    <motion.div
                        initial={{ y: -50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -50, opacity: 0 }}
                        className="fixed top-0 left-0 right-0 z-50 offline-banner"
                        style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.95), rgba(217,119,6,0.95))', backdropFilter: 'blur(8px)' }}
                    >
                        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-center gap-3">
                            <span className="text-xl">⚠️</span>
                            <p className="text-white font-bold text-sm">
                                {lang === 'hi' ? 'ऑफ़लाइन मोड — डेटा स्थानीय रूप से सहेजा जाएगा' : 'Working in Offline Mode — data saved locally'}
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Sync toast */}
            <AnimatePresence>
                {isSyncing && (
                    <motion.div
                        initial={{ y: 60, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 60, opacity: 0 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl flex items-center gap-3"
                        style={{ background: 'rgba(16,185,129,0.9)', backdropFilter: 'blur(12px)' }}
                    >
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <p className="text-white font-bold text-sm">Syncing {pendingCount} pending items...</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
