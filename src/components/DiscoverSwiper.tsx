'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import { Sparkles, Loader2, BookOpen, Check, X } from 'lucide-react'
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

export default function DiscoverSwiper({ recentlyReadBooks, onRefreshLibrary, onReadSummary }: DiscoverSwiperProps) {
    const [recs, setRecs] = useState<Recommendation[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const fetchRecommendations = async () => {
        setLoading(true)
        setError('')
        try {
            const res = await fetch('/api/discover', {
                method: 'POST',
                body: JSON.stringify({ recentlyReadBooks })
            })
            const data = await res.json()
            if (data.error) throw new Error(data.error)
            setRecs(data.recommendations)
        } catch (err: any) {
            setError('Failed to fetch recommendations. Buddy might be sleeping.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchRecommendations()
    }, [])

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

        setRecs(prev => prev.slice(1)) // Remove top card
    }

    if (loading) {
        return (
            <div className={styles.discoverContainer}>
                <div className={styles.loading}>
                    <Loader2 size={40} className={styles.loaderSpin} />
                    <p>Buddy is analyzing the multiverse matching your tastes...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className={styles.discoverContainer}>
                <p style={{ color: 'var(--warning)' }}>{error}</p>
                <button className="btn-primary" onClick={fetchRecommendations} style={{ marginTop: '1rem' }}>Try Again</button>
            </div>
        )
    }

    if (recs.length === 0) {
        return (
            <div className={styles.discoverContainer}>
                <div className={styles.emptyState}>
                    <Sparkles size={48} opacity={0.2} style={{ margin: '0 auto 1rem' }} />
                    <h3>No more recommendations!</h3>
                    <p>You've swiped through all of Buddy's current picks.</p>
                    <button className="btn-primary" onClick={fetchRecommendations} style={{ marginTop: '1.5rem' }}>Ask for More</button>
                </div>
            </div>
        )
    }

    return (
        <div className={styles.discoverContainer}>
            <div className={styles.deck}>
                <AnimatePresence>
                    {recs.map((rec, index) => {
                        return (
                                <SwipeCard 
                                    key={rec.title} 
                                    index={index}
                                    rec={rec} 
                                    onSwipe={handleSwipe}
                                    onReadSummary={onReadSummary}
                                />
                        )
                    }).reverse()}
                </AnimatePresence>
            </div>
            <div style={{ marginTop: '2rem', display: 'flex', gap: '2rem', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><X size={16} color="var(--warning)" /> Pass (Swipe Left)</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Check size={16} color="var(--success)" /> Add (Swipe Right)</div>
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
