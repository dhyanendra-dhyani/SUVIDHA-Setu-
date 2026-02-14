/**
 * ═══════════════════════════════════════════════════════════
 * BillPayment — Multi-step bill payment (dark theme)
 * 
 * ★ PROTOTYPE MODE:
 *   - Accepts ANY consumer number (generates fake bill)
 *   - Name is masked: "R***** K****"
 *   - Dismissable prototype banner at top
 * ═══════════════════════════════════════════════════════════
 */

import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { t } from '../utils/i18n';
import { lookupBill, generateTxnId } from '../utils/mockData';
import { saveOfflineTransaction } from '../utils/offlineSync';
import { generatePaymentReceipt, downloadReceipt } from '../utils/pdfGenerator';
import { speak, extractConsumerId } from '../utils/voiceCommands';
import VoiceButton from './VoiceButton';

const SERVICE_META = {
    electricity: { icon: '⚡', label: 'Electricity Bill', color: '#FBBF24' },
    water: { icon: '💧', label: 'Water Bill', color: '#3B82F6' },
    gas: { icon: '🔥', label: 'Gas Bill', color: '#F97316' },
};

/**
 * Mask a name for privacy in guest mode.
 * "Rajesh Kumar" → "R***** K****"
 * "Paramjit Singh" → "P******* S****"
 */
function maskName(name) {
    if (!name) return '***';
    return name
        .split(' ')
        .map((word) => {
            if (word.length <= 1) return word;
            return word[0] + '*'.repeat(word.length - 1);
        })
        .join(' ');
}

/**
 * Generate a fake bill for any consumer ID (prototype mode).
 * If the ID matches our mock DB, use real data.
 * Otherwise, generate plausible fake data.
 */
function getOrGenerateBill(consumerId, serviceType) {
    // Try real lookup first
    const real = lookupBill(consumerId);
    if (real) {
        return { ...real, name: maskName(real.fullName || real.name) };
    }

    // Generate a plausible fake bill for any ID
    const fakeNames = ['Vivek Kumar', 'Anjali Sharma', 'Ramesh Patel', 'Priya Singh', 'Sunil Verma'];
    const fakeName = fakeNames[Math.floor(Math.random() * fakeNames.length)];
    const amount = Math.floor(Math.random() * 2000) + 200;
    const units = Math.floor(Math.random() * 200) + 10;
    const unitLabels = { electricity: 'kWh', water: 'KL', gas: 'Cylinders' };

    return {
        id: consumerId,
        service: serviceType,
        name: maskName(fakeName),
        fullName: fakeName,
        amount,
        units,
        unitLabel: unitLabels[serviceType] || 'Units',
        dueDate: '2026-03-15',
        lastPaymentDate: '2026-01-20',
        meterNo: `MTR-${Math.floor(Math.random() * 9000000) + 1000000}`,
    };
}

export default function BillPayment({ lang, isOnline }) {
    const { serviceType } = useParams();
    const navigate = useNavigate();
    const meta = SERVICE_META[serviceType] || SERVICE_META.electricity;

    const [step, setStep] = useState('input');
    const [consumerId, setConsumerId] = useState('');
    const [bill, setBill] = useState(null);
    const [payMethod, setPayMethod] = useState(null);
    const [txnId, setTxnId] = useState('');
    const [cashCount, setCashCount] = useState(0);
    const [showProtoBanner, setShowProtoBanner] = useState(true);

    /** Fetch / generate bill */
    const fetchBill = useCallback(() => {
        if (consumerId.trim().length < 1) return;
        const found = getOrGenerateBill(consumerId.trim(), serviceType);
        setBill(found);
        setStep('bill');
        speak(`Bill found. Amount due: ${found.amount} rupees.`, lang);
    }, [consumerId, serviceType, lang]);

    /** Numpad handler */
    const handleNumpad = (key) => {
        if (key === '⌫') setConsumerId((p) => p.slice(0, -1));
        else if (key === 'C') setConsumerId('');
        else setConsumerId((p) => p + key);
    };

    /** Voice consumer ID */
    const handleVoiceId = useCallback((transcript) => {
        const id = extractConsumerId(transcript);
        if (id) {
            setConsumerId(id);
            speak(`Consumer ID: ${id}`, lang);
        } else {
            // Accept the raw transcript as an ID in prototype mode
            const cleaned = transcript.replace(/\s+/g, '-').toUpperCase();
            setConsumerId(cleaned);
            speak(`Consumer ID set to: ${cleaned}`, lang);
        }
    }, [lang]);

    /** Simulate QR scan */
    const simulateQR = () => {
        const sampleIds = { electricity: 'PSEB-123456', water: 'PHED-789012', gas: 'GPL-345678' };
        const id = sampleIds[serviceType] || 'PSEB-123456';
        setConsumerId(id);
        speak(`QR scanned: ${id}`, lang);
    };

    /** Process payment */
    const processPayment = async (method) => {
        setPayMethod(method);
        if (method === 'cash') setCashCount(0);
        const id = generateTxnId();
        setTxnId(id);
        setTimeout(async () => {
            setStep('success');
            speak(`Payment successful! Transaction ID: ${id}`, lang);
            await saveOfflineTransaction({
                txnId: id, consumerId, amount: bill.amount, service: serviceType, method, timestamp: new Date().toISOString(), synced: isOnline,
            });
        }, method === 'cash' ? 3000 : 2000);
    };

    /** Cash animation */
    useEffect(() => {
        if (payMethod === 'cash' && step === 'pay') {
            const t = setInterval(() => setCashCount((c) => { if (c >= 3) { clearInterval(t); return c; } return c + 1; }), 900);
            return () => clearInterval(t);
        }
    }, [payMethod, step]);

    /** Download receipt */
    const handleDownload = () => {
        const doc = generatePaymentReceipt({
            txnId, consumerId, amount: bill.amount, name: bill.name, service: serviceType, method: payMethod, date: new Date().toLocaleString('en-IN'),
        }, !isOnline);
        downloadReceipt(doc, `receipt-${txnId}.pdf`);
    };

    const numpadKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'];

    return (
        <motion.div
            className="min-h-[calc(100vh-160px)] flex flex-col items-center px-4 py-6 relative"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
        >
            {/* ═══ PROTOTYPE BANNER (dismissable, draggable-look) ═══ */}
            <AnimatePresence>
                {showProtoBanner && (
                    <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -30, opacity: 0 }}
                        drag="y"
                        dragConstraints={{ top: -10, bottom: 10 }}
                        className="fixed top-14 left-1/2 -translate-x-1/2 z-50 max-w-lg w-[92%] cursor-grab active:cursor-grabbing"
                    >
                        <div className="bg-gradient-to-r from-amber-500/90 to-orange-500/90 rounded-2xl px-5 py-3 shadow-lg shadow-amber-900/30 border border-amber-400/30 flex items-start gap-3">
                            <span className="text-2xl mt-0.5">🔧</span>
                            <div className="flex-1">
                                <p className="text-white font-bold text-sm">Prototype Demonstration Mode</p>
                                <p className="text-white/80 text-xs leading-relaxed mt-0.5">
                                    Enter <strong>any</strong> consumer number — it will be accepted. This is demonstrating the UI workflow. User details are masked for privacy.
                                </p>
                            </div>
                            <button
                                onClick={() => setShowProtoBanner(false)}
                                className="text-white/60 hover:text-white text-lg cursor-pointer bg-transparent border-0 p-1 mt-0.5"
                                aria-label="Dismiss"
                            >
                                ✕
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="w-full max-w-xl">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <button
                        onClick={() => step === 'input' ? navigate(-1) : setStep('input')}
                        className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white cursor-pointer text-lg"
                    >
                        ←
                    </button>
                    <div className="flex items-center gap-3 flex-1">
                        <span className="text-3xl">{meta.icon}</span>
                        <div>
                            <h2 className="text-2xl font-bold text-white">{meta.label}</h2>
                            <p className="text-white/40 text-sm">
                                {step === 'input' ? 'Enter your Consumer ID' : step === 'bill' ? 'Confirm bill details' : step === 'pay' ? 'Complete payment' : 'Payment successful'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Step progress */}
                <div className="flex items-center gap-2 mb-8">
                    {['input', 'bill', 'pay', 'success'].map((s, i) => (
                        <div key={s} className="flex-1 flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${s === step ? 'gradient-primary text-white shadow-lg shadow-indigo-500/30' :
                                ['input', 'bill', 'pay', 'success'].indexOf(step) > i ? 'bg-green-500/20 text-green-400' :
                                    'bg-white/5 text-white/30'
                                }`}>
                                {['input', 'bill', 'pay', 'success'].indexOf(step) > i ? '✓' : i + 1}
                            </div>
                            {i < 3 && <div className={`flex-1 h-px ${['input', 'bill', 'pay', 'success'].indexOf(step) > i ? 'bg-green-500/30' : 'bg-white/10'}`} />}
                        </div>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    {/* ── STEP 1: INPUT ─────────────────────── */}
                    {step === 'input' && (
                        <motion.div key="input" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                            {/* Consumer ID input */}
                            <div className="glass-card rounded-2xl p-5">
                                <label className="text-white/50 text-sm font-semibold block mb-2">Consumer Number</label>
                                <input
                                    readOnly
                                    value={consumerId}
                                    placeholder="Enter any number..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl text-white text-xl font-mono p-4 focus:border-indigo-500 outline-none"
                                    style={{ caretColor: '#6366F1' }}
                                />
                                <p className="text-white/20 text-xs mt-2">✨ Prototype: any number will be accepted</p>
                            </div>

                            {/* Input methods */}
                            <div className="flex gap-3">
                                <button onClick={simulateQR} className="flex-1 py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm font-semibold hover:bg-white/10 cursor-pointer flex items-center justify-center gap-2">
                                    📷 Scan QR
                                </button>
                                <div className="flex-1 flex justify-center">
                                    <VoiceButton lang={lang} size={48} showLabel={false} onResult={handleVoiceId} onError={() => { }} />
                                </div>
                            </div>

                            {/* Numpad */}
                            <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto">
                                {numpadKeys.map((key) => (
                                    <button key={key} onClick={() => handleNumpad(key)} className="numpad-key">
                                        {key}
                                    </button>
                                ))}
                            </div>

                            {/* Fetch button */}
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={fetchBill}
                                disabled={consumerId.length < 1}
                                className="w-full py-4 rounded-xl gradient-primary text-white font-bold text-lg cursor-pointer disabled:opacity-30 border-0"
                            >
                                {t(lang, 'fetchBill')}
                            </motion.button>
                        </motion.div>
                    )}

                    {/* ── STEP 2: BILL DETAILS ──────────────── */}
                    {step === 'bill' && bill && (
                        <motion.div key="bill" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                            <div className="glass-card rounded-2xl p-6">
                                {/* Bill ID */}
                                <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5">
                                    <span className="text-white/40 text-sm">Bill ID</span>
                                    <span className="text-white font-mono font-bold text-lg">{consumerId}</span>
                                </div>

                                {/* Name (masked) */}
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-white/40 text-sm">Name (Masked)</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-white font-semibold text-lg">{bill.name}</span>
                                        <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 text-xs font-bold">🔒 Privacy</span>
                                    </div>
                                </div>

                                {/* Meter */}
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-white/40 text-sm">Meter No.</span>
                                    <span className="text-white/70 font-mono text-sm">{bill.meterNo}</span>
                                </div>

                                {/* Usage */}
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-white/40 text-sm">Usage</span>
                                    <span className="text-white/70">{bill.units} {bill.unitLabel}</span>
                                </div>

                                {/* Due date */}
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-white/40 text-sm">Due Date</span>
                                    <span className="text-white">{bill.dueDate}</span>
                                </div>

                                {/* Amount — highlighted */}
                                <div className="border-t border-white/10 pt-4 flex items-center justify-between">
                                    <span className="text-white font-bold text-lg">Amount Due</span>
                                    <span className="text-3xl font-black" style={{ color: meta.color }}>₹{bill.amount.toLocaleString()}</span>
                                </div>
                            </div>

                            {/* Confirm */}
                            <div className="glass-card rounded-2xl p-4 flex items-center gap-3">
                                <span className="text-2xl">🔐</span>
                                <p className="text-white/50 text-sm flex-1">
                                    Confirm: <strong className="text-white">{bill.name}</strong>, Amount: <strong className="text-white">₹{bill.amount.toLocaleString()}</strong>
                                </p>
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setStep('pay')}
                                className="w-full py-4 rounded-xl gradient-success text-white font-bold text-lg cursor-pointer border-0 flex items-center justify-center gap-2"
                            >
                                ✓ Yes, Pay ₹{bill.amount.toLocaleString()}
                            </motion.button>
                        </motion.div>
                    )}

                    {/* ── STEP 3: PAY ───────────────────────── */}
                    {step === 'pay' && (
                        <motion.div key="pay" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                            {!payMethod && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <motion.button whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.96 }} onClick={() => processPayment('upi')} className="glass-card rounded-2xl p-5 cursor-pointer border border-transparent hover:border-blue-500/30 flex flex-col items-center gap-3">
                                        <span className="text-4xl">📱</span>
                                        <span className="text-white font-bold">UPI / QR</span>
                                        <div className="w-full h-1 rounded bg-blue-500/30" />
                                    </motion.button>
                                    <motion.button whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.96 }} onClick={() => processPayment('cash')} className="glass-card rounded-2xl p-5 cursor-pointer border border-transparent hover:border-green-500/30 flex flex-col items-center gap-3">
                                        <span className="text-4xl">💵</span>
                                        <span className="text-white font-bold">Cash</span>
                                        <div className="w-full h-1 rounded bg-green-500/30" />
                                    </motion.button>
                                    <motion.button whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.96 }} onClick={() => processPayment('card')} className="glass-card rounded-2xl p-5 cursor-pointer border border-transparent hover:border-purple-500/30 flex flex-col items-center gap-3">
                                        <span className="text-4xl">💳</span>
                                        <span className="text-white font-bold">Card</span>
                                        <div className="w-full h-1 rounded bg-purple-500/30" />
                                    </motion.button>
                                </div>
                            )}

                            {/* UPI QR */}
                            {payMethod === 'upi' && (
                                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4 glass-card rounded-2xl p-6">
                                    <p className="text-white/60 text-sm font-semibold">Scan with any UPI app</p>
                                    <div className="bg-white p-5 rounded-2xl shadow-xl">
                                        <QRCodeSVG value={`upi://pay?pa=suvidha@sbi&am=${bill?.amount}&tn=BillPay-${consumerId}`} size={200} />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-blue-400 animate-pulse" />
                                        <p className="text-white/60 text-sm">Waiting for payment...</p>
                                    </div>
                                </motion.div>
                            )}

                            {/* Cash */}
                            {payMethod === 'cash' && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
                                    <div className="relative w-56 h-56 glass-card rounded-2xl flex flex-col items-center justify-end pb-4 overflow-hidden">
                                        <div className="absolute top-3 left-0 right-0 text-center">
                                            <p className="text-green-400 text-sm font-bold">₹{bill?.amount?.toLocaleString()}</p>
                                        </div>
                                        {[...Array(cashCount)].map((_, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ y: -120, opacity: 0, rotate: -5 }}
                                                animate={{ y: 0, opacity: 1, rotate: 0 }}
                                                className="absolute text-5xl"
                                                style={{ top: `${30 + i * 40}px` }}
                                            >
                                                💵
                                            </motion.div>
                                        ))}
                                        <p className="text-white/20 text-xs z-10 mt-2">↓ Insert notes here</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
                                        <p className="text-white/60 text-sm">Accepting cash payment...</p>
                                    </div>
                                </motion.div>
                            )}

                            {/* Card */}
                            {payMethod === 'card' && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
                                    <motion.div animate={{ rotateY: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="w-56 h-36 glass-card rounded-2xl flex items-center justify-center text-7xl shadow-xl">
                                        💳
                                    </motion.div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-indigo-400 animate-pulse" />
                                        <p className="text-white/60 text-sm">Tap, insert, or swipe your card...</p>
                                    </div>
                                </motion.div>
                            )}
                        </motion.div>
                    )}

                    {/* ── STEP 4: SUCCESS ───────────────────── */}
                    {step === 'success' && (
                        <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-6 py-6">
                            <motion.div
                                className="w-28 h-28 rounded-full gradient-success flex items-center justify-center shadow-2xl shadow-green-500/20"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                            >
                                <span className="text-white text-5xl">✓</span>
                            </motion.div>

                            <div className="text-center">
                                <h3 className="text-3xl font-black text-green-400 mb-2">Payment Successful!</h3>
                                <p className="text-white/50 font-mono text-sm">TXN: {txnId}</p>
                            </div>

                            {/* Receipt summary */}
                            <div className="glass-card rounded-2xl p-5 w-full max-w-sm text-sm space-y-2">
                                <div className="flex justify-between"><span className="text-white/40">Bill ID</span><span className="text-white font-mono">{consumerId}</span></div>
                                <div className="flex justify-between"><span className="text-white/40">Name</span><span className="text-white">{bill?.name}</span></div>
                                <div className="flex justify-between"><span className="text-white/40">Amount</span><span className="text-green-400 font-bold">₹{bill?.amount?.toLocaleString()}</span></div>
                                <div className="flex justify-between"><span className="text-white/40">Method</span><span className="text-white capitalize">{payMethod}</span></div>
                            </div>

                            {!isOnline && (
                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-5 py-3 text-center">
                                    <p className="text-amber-400 text-sm font-semibold">📡 Saved Locally — Will sync when internet returns</p>
                                </div>
                            )}

                            <div className="flex gap-3 w-full max-w-sm">
                                <button onClick={handleDownload} className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-semibold cursor-pointer hover:bg-white/10">
                                    📥 Receipt
                                </button>
                                <button onClick={() => navigate('/')} className="flex-1 py-3 rounded-xl gradient-primary text-white font-semibold cursor-pointer border-0">
                                    🏠 Home
                                </button>
                            </div>

                            <p className="text-white/15 text-xs">🖨️ Thermal printer would dispense receipt on real kiosk</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
