'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, Square, Timer, Zap } from 'lucide-react'
import styles from './ReadingTimer.module.css'

interface Props {
    books: { id: string; title: string; status: string }[]
    onSessionLogged: () => void
}

export default function ReadingTimer({ books, onSessionLogged }: Props) {
    const [isOpen, setIsOpen] = useState(false)
    const [selectedBook, setSelectedBook] = useState('')
    const [duration, setDuration] = useState(25) // minutes
    const [timeLeft, setTimeLeft] = useState(25 * 60)
    const [running, setRunning] = useState(false)
    const [pagesRead, setPagesRead] = useState('')
    const intervalRef = useRef<NodeJS.Timeout | null>(null)

    const activeBooks = books.filter(b => b.status !== 'COMPLETED')

    useEffect(() => {
        if (!running) return
        intervalRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(intervalRef.current!)
                    setRunning(false)
                    // Play a short beep via Web Audio
                    try {
                        const ctx = new AudioContext()
                        const osc = ctx.createOscillator()
                        osc.frequency.value = 800
                        osc.connect(ctx.destination)
                        osc.start(); osc.stop(ctx.currentTime + 0.3)
                    } catch { }
                    return 0
                }
                return prev - 1
            })
        }, 1000)
        return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
    }, [running])

    const handleStart = () => {
        if (!selectedBook) return
        if (timeLeft === 0) setTimeLeft(duration * 60)
        setRunning(true)
    }

    const handlePause = () => setRunning(false)

    const handleStop = async () => {
        if (!selectedBook || !pagesRead || parseInt(pagesRead) <= 0) return
        const elapsed = duration * 60 - timeLeft
        const mins = Math.max(1, Math.round(elapsed / 60))

        const r = await fetch('/api/sessions', {
            method: 'POST',
            body: JSON.stringify({ bookId: selectedBook, pagesRead, duration: mins }),
        })

        if (r.ok) {
            onSessionLogged()
            setPagesRead('')
            setRunning(false)
            setTimeLeft(duration * 60)
            setIsOpen(false)
        }
    }

    const handleDurationChange = (d: number) => {
        if (running) return
        setDuration(d)
        setTimeLeft(d * 60)
    }

    const mins = Math.floor(timeLeft / 60)
    const secs = timeLeft % 60
    const progress = ((duration * 60 - timeLeft) / (duration * 60)) * 100

    return (
        <>
            {/* FAB */}
            <motion.button
                className={styles.timerFab}
                onClick={() => setIsOpen(!isOpen)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                animate={running ? { boxShadow: ['0 4px 20px rgba(139,92,246,.4)', '0 4px 30px rgba(139,92,246,.7)', '0 4px 20px rgba(139,92,246,.4)'] } : {}}
                transition={running ? { repeat: Infinity, duration: 2 } : {}}
            >
                <Timer size={22} />
                {running && <span className={styles.timerFabTime}>{mins}:{secs.toString().padStart(2, '0')}</span>}
            </motion.button>

            {/* Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className={`${styles.timerPanel} glass-card`}
                    >
                        <h3 className={styles.timerTitle}><Timer size={16} /> Reading Timer</h3>

                        {/* Timer Ring */}
                        <div className={styles.timerRingWrap}>
                            <svg viewBox="0 0 120 120" className={styles.timerRingSvg}>
                                <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="6" />
                                <motion.circle
                                    cx="60" cy="60" r="52" fill="none" stroke="url(#timerGrad)" strokeWidth="6"
                                    strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 52}`}
                                    animate={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - progress / 100) }}
                                    transition={{ duration: 1, ease: 'linear' }}
                                    transform="rotate(-90 60 60)"
                                />
                                <defs>
                                    <linearGradient id="timerGrad" x1="0" y1="0" x2="1" y2="1">
                                        <stop offset="0%" stopColor="var(--primary)" />
                                        <stop offset="100%" stopColor="var(--primary-glow)" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <div className={styles.timerTime}>
                                {mins}:{secs.toString().padStart(2, '0')}
                            </div>
                        </div>

                        {/* Duration presets */}
                        <div className={styles.timerPresets}>
                            {[15, 25, 45, 60].map(d => (
                                <button
                                    key={d}
                                    className={`${styles.timerPreset} ${duration === d ? styles.active : ''}`}
                                    onClick={() => handleDurationChange(d)}
                                    disabled={running}
                                >
                                    {d}m
                                </button>
                            ))}
                        </div>

                        {/* Book select */}
                        <select className={styles.timerSelect} value={selectedBook} onChange={e => setSelectedBook(e.target.value)} disabled={running}>
                            <option value="">Select a book...</option>
                            {activeBooks.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                        </select>

                        {/* Pages input */}
                        {!running && timeLeft < duration * 60 && (
                            <motion.input
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className={styles.timerInput}
                                type="number"
                                placeholder="Pages read this session"
                                min="1"
                                value={pagesRead}
                                onChange={e => setPagesRead(e.target.value)}
                            />
                        )}

                        {/* Controls */}
                        <div className={styles.timerControls}>
                            {!running ? (
                                <button
                                    className={`${styles.timerBtn} ${styles.timerBtnStart}`}
                                    onClick={handleStart}
                                    disabled={!selectedBook}
                                >
                                    <Play size={16} fill="currentColor" /> {timeLeft < duration * 60 ? 'Resume' : 'Start'}
                                </button>
                            ) : (
                                <button
                                    className={`${styles.timerBtn} ${styles.timerBtnPause}`}
                                    onClick={handlePause}
                                >
                                    <Pause size={16} fill="currentColor" /> Pause
                                </button>
                            )}
                            {timeLeft < duration * 60 && (
                                <button
                                    className={`${styles.timerBtn} ${styles.timerBtnStop}`}
                                    onClick={handleStop}
                                    disabled={!pagesRead || parseInt(pagesRead) <= 0}
                                >
                                    <Square size={16} fill="currentColor" /> Log
                                </button>
                            )}
                        </div>

                        {!running && timeLeft < duration * 60 && (
                            <div className={styles.timerXpHint}><Zap size={10} /> Session will earn XP when logged</div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}
