'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import { Sparkles, Loader2, BookOpen, Check, X, RefreshCw } from 'lucide-react'
import { vibrateLight, vibrateSuccess, vibrateMedium } from '@/utils/haptics'
import styles from './DiscoverSwiper.module.css'

interface Recommendation {
    title: string
    author: string
    description: string
    totalPages: number
}

interface DiscoverSwiperProps {
    recentlyReadBooks: { title: string }[]
    onRefreshLibrary: () => void
    onReadSummary?: (title: string, author: string) => void
}

type MoodKey = 'light' | 'mind' | 'ambitious' | 'calm' | 'adventure' | 'emotional' | 'bedtime' | 'career' | 'thoughtful'

const MOODS: { key: MoodKey; emoji: string; label: string; color: string }[] = [
    { key: 'light',      emoji: '😊', label: 'Light & Fun',       color: '#f59e0b' },
    { key: 'mind',       emoji: '🧠', label: 'Mind-Expanding',    color: '#8b5cf6' },
    { key: 'ambitious',  emoji: '🔥', label: 'Ambitious',         color: '#ef4444' },
    { key: 'calm',       emoji: '😌', label: 'Calm & Mindful',    color: '#10b981' },
    { key: 'adventure',  emoji: '🌍', label: 'Adventure',         color: '#3b82f6' },
    { key: 'emotional',  emoji: '❤️', label: 'Emotional',         color: '#ec4899' },
    { key: 'bedtime',    emoji: '🌙', label: 'Easy Bedtime',      color: '#6366f1' },
    { key: 'career',     emoji: '💼', label: 'Career Growth',     color: '#14b8a6' },
    { key: 'thoughtful', emoji: '🔮', label: 'Thought-Provoking', color: '#a855f7' },
]

export default function DiscoverSwiper({ recentlyReadBooks, onRefreshLibrary, onReadSummary }: DiscoverSwiperProps) {
    const [selectedMood, setSelectedMood] = useState<MoodKey | null>(null)
    const [recs, setRecs] = useState<Recommendation[]>([])
    const [loading, setLoading] = useState(false)
    const [isFetchingMore, setIsFetchingMore] = useState(false)
    const [error, setError] = useState('')
    const [seenTitles, setSeenTitles] = useState<Set<string>>(new Set())

    const fetchRecommendations = useCallback(async (append = false, mood: MoodKey | null = selectedMood) => {
        if (append) setIsFetchingMore(true)
        else setLoading(true)
        setError('')
        try {
            const res = await fetch('/api/discover', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recentlyReadBooks, seenTitles: Array.from(seenTitles), mood })
            })
            const data = await res.json()
            if (data.error) throw new Error(data.error)
            const fresh = (data.recommendations as Recommendation[]).filter(r => !seenTitles.has(r.title))
            setSeenTitles(prev => new Set([...prev, ...fresh.map(r => r.title)]))
            setRecs(prev => append ? [...prev, ...fresh] : fresh)
        } catch (err: any) {
            setError('Failed to fetch recommendations. Buddy might be sleeping.')
        } finally {
            setLoading(false)
            setIsFetchingMore(false)
        }
    }, [recentlyReadBooks, seenTitles, selectedMood])


    const handleSwipe = async (rec: Recommendation, direction: 'left' | 'right') => {
        if (direction === 'right') {
            vibrateSuccess()
            // Add book to library
            await fetch('/api/books', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: rec.title,
                    author: rec.author,
                    totalPages: rec.totalPages.toString(),
                    description: rec.description,
                    status: 'READING'
                })
            })
            onRefreshLibrary()
        } else {
            vibrateMedium()
        }

        const remaining = recs.slice(1)
        setRecs(remaining)

        // Auto-prefetch when running low (2 cards left)
        if (remaining.length <= 2 && !isFetchingMore) {
            fetchRecommendations(true) // append mode
        }
    }

    // ── Mood Picker Screen
    if (!selectedMood) {
        return (
            <div className={styles.discoverContainer}>
                <motion.div
                    className={styles.moodPicker}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    <div className={styles.moodPickerHeader}>
                        <Sparkles size={28} color="var(--primary-glow)" />
                        <h2>How are you feeling today?</h2>
                        <p>Buddy will pick books that perfectly match your vibe</p>
                    </div>
                    <div className={styles.moodGrid}>
                        {MOODS.map((m, i) => (
                            <motion.button
                                key={m.key}
                                className={styles.moodChip}
                                style={{ '--mood-color': m.color } as React.CSSProperties}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.05 }}
                                onClick={() => {
                                    vibrateLight()
                                    setSelectedMood(m.key)
                                    fetchRecommendations(false, m.key)
                                }}
                                whileHover={{ scale: 1.06 }}
                                whileTap={{ scale: 0.96 }}
                            >
                                <span className={styles.moodEmoji}>{m.emoji}</span>
                                <span className={styles.moodLabel}>{m.label}</span>
                            </motion.button>
                        ))}
                    </div>
                </motion.div>
            </div>
        )
    }

    const activeMood = MOODS.find(m => m.key === selectedMood)!

    if (loading) {
        return (
            <div className={styles.discoverContainer}>
                <div className={styles.loading}>
                    <span className={styles.moodLoadingEmoji}>{activeMood.emoji}</span>
                    <Loader2 size={30} className={styles.loaderSpin} />
                    <p>Buddy is finding perfect <strong>{activeMood.label}</strong> reads for you...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className={styles.discoverContainer}>
                <p style={{ color: 'var(--warning)' }}>{error}</p>
                <button className="btn-primary" onClick={() => fetchRecommendations()} style={{ marginTop: '1rem' }}>Try Again</button>
                <button onClick={() => { setSelectedMood(null); setRecs([]) }} style={{ marginTop: '0.75rem', color: 'var(--text-muted)', fontSize: '0.85rem', display: 'block' }}>← Change Mood</button>
            </div>
        )
    }

    if (recs.length === 0) {
        if (isFetchingMore) {
            return (
                <div className={styles.discoverContainer}>
                    <div className={styles.loading}>
                        <Loader2 size={40} className={styles.loaderSpin} />
                        <p>Buddy is finding more great books for you...</p>
                    </div>
                </div>
            )
        }
        return (
            <div className={styles.discoverContainer}>
                <div className={styles.emptyState}>
                    <Sparkles size={48} opacity={0.2} style={{ margin: '0 auto 1rem' }} />
                    <h3>You're all caught up! 🎉</h3>
                    <p>You've explored all the <strong>{activeMood.label}</strong> picks.<br />Try a different mood or get a fresh batch!</p>
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button className="btn-primary" onClick={() => fetchRecommendations(true)}>✨ More {activeMood.emoji}</button>
                        <button className="btn-primary" style={{ background: 'rgba(255,255,255,0.06)' }} onClick={() => { setSelectedMood(null); setRecs([]) }}>🎭 Change Mood</button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className={styles.discoverContainer}>
            {/* Active Mood Bar */}
            <motion.div
                className={styles.activeMoodBar}
                style={{ '--mood-color': activeMood.color } as React.CSSProperties}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <span>{activeMood.emoji} <strong>{activeMood.label}</strong> mode</span>
                <button
                    className={styles.changeMoodBtn}
                    onClick={() => { vibrateLight(); setSelectedMood(null); setRecs([]); setSeenTitles(new Set()) }}
                >
                    <RefreshCw size={12} /> Change
                </button>
            </motion.div>

            <div className={styles.deck}>
                <AnimatePresence>
                    {recs.map((rec, index) => (
                        <SwipeCard
                            key={rec.title}
                            index={index}
                            rec={rec}
                            onSwipe={handleSwipe}
                            onReadSummary={onReadSummary}
                        />
                    )).reverse()}
                </AnimatePresence>
            </div>
            <div style={{ marginTop: '2rem', display: 'flex', gap: '2rem', color: 'var(--text-muted)', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><X size={16} color="var(--warning)" /> Pass (Swipe Left)</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Check size={16} color="var(--success)" /> Add (Swipe Right)</div>
                {isFetchingMore && <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', opacity: 0.6 }}><Loader2 size={13} className={styles.loaderSpin} /> Loading more...</div>}
            </div>
        </div>
    )
}

function SwipeCard({ rec, index, onSwipe, onReadSummary }: { rec: Recommendation, index: number, onSwipe: (rec: Recommendation, dir: 'left'|'right') => void, onReadSummary?: (title: string, author: string) => void }) {
    const isFront = index === 0
    const x = useMotionValue(0)
    
    // Rotate slightly as you drag
    const rotate = useTransform(x, [-200, 200], [-10, 10])
    
    // Fade out as it goes further away
    const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0])
    
    // Hint Opacity
    const nopeOpacity = useTransform(x, [-100, -50, 0], [1, 0, 0])
    const likeOpacity = useTransform(x, [0, 50, 100], [0, 0, 1])

    const handleDragEnd = (e: any, info: any) => {
        const offset = info.offset.x
        if (offset > 100) {
            onSwipe(rec, 'right')
        } else if (offset < -100) {
            onSwipe(rec, 'left')
        }
    }

    return (
        <motion.div
            className={styles.swipeCard}
            style={{
                x,
                rotate,
                opacity,
                scale: isFront ? 1 : 0.95 - (index * 0.05),
                y: isFront ? 0 : index * 15,
                zIndex: 10 - index
            }}
            drag={isFront ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={handleDragEnd}
            whileDrag={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
            <Sparkles size={120} className={styles.sparkleIcon} />
            
            <motion.div className={`${styles.actionHint} ${styles.likeHint}`} style={{ opacity: likeOpacity }}>ADD TO LIBRARY</motion.div>
            <motion.div className={`${styles.actionHint} ${styles.nopeHint}`} style={{ opacity: nopeOpacity }}>PASS</motion.div>

            <div className={styles.cardTop}>
                <h2 className={styles.cardTitle}>{rec.title}</h2>
                <span className={styles.cardAuthor}>by {rec.author}</span>
            </div>

            <div className={styles.cardReason}>
                <strong>Buddy's Pick:</strong><br/>
                {rec.description}
            </div>

            <div className={styles.cardStats}>
                <BookOpen size={14} />
                <span>{rec.totalPages} pages</span>
            </div>

            <button 
                className="btn-primary" 
                style={{ width: '100%', marginTop: '1rem', padding: '0.65rem', display: 'flex', justifyContent: 'center', gap: '0.5rem', background: 'rgba(139, 92, 246, 0.15)', color: 'var(--primary-glow)', border: '1px solid rgba(139, 92, 246, 0.3)' }}
                onClick={(e) => {
                    e.stopPropagation()
                    if (onReadSummary) onReadSummary(rec.title, rec.author)
                }}
            >
                ⚡ Read 15-Min Summary
            </button>
        </motion.div>
    )
}
