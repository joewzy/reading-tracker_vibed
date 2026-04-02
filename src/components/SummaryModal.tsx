import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, X, Sparkles, BookOpen, CheckCircle, Clock } from 'lucide-react'
import { vibrateLight, vibrateSuccess } from '@/utils/haptics'
import styles from './SummaryModal.module.css'

interface SummaryModalProps {
    isOpen: boolean
    title: string
    author: string
    onClose: () => void
    onLogSummary: () => void
}

export default function SummaryModal({ isOpen, title, author, onClose, onLogSummary }: SummaryModalProps) {
    const [summary, setSummary] = useState('')
    const [isGenerating, setIsGenerating] = useState(false)
    const [completed, setCompleted] = useState(false)
    const [retryCountdown, setRetryCountdown] = useState<number | null>(null)
    const scrollRef = useRef<HTMLDivElement>(null)
    const retryTimerRef = useRef<NodeJS.Timeout | null>(null)

    const fetchStream = useCallback(async () => {
        setIsGenerating(true)
        setSummary('')
        setRetryCountdown(null)
        if (retryTimerRef.current) clearInterval(retryTimerRef.current)

        try {
            const response = await fetch('/api/summary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, author })
            })

            // ── Handle quota exceeded
            if (response.status === 429) {
                const data = await response.json()
                const seconds = data.retryAfter ?? 60
                setRetryCountdown(seconds)
                setIsGenerating(false)
                // Auto-countdown
                retryTimerRef.current = setInterval(() => {
                    setRetryCountdown(prev => {
                        if (prev === null || prev <= 1) {
                            clearInterval(retryTimerRef.current!)
                            return null
                        }
                        return prev - 1
                    })
                }, 1000)
                return
            }

            if (!response.body) throw new Error("No response body")
            
            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            
            while (true) {
                const { done, value } = await reader.read()
                if (done) break
                
                const textChunk = decoder.decode(value, { stream: true })
                setSummary(prev => prev + textChunk)
                
                if (scrollRef.current) {
                    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
                    if (scrollTop + clientHeight > scrollHeight - 200) {
                        scrollRef.current.scrollTo({ top: scrollHeight, behavior: 'smooth' })
                    }
                }
            }
        } catch (error) {
            console.error("Summary stream error:", error)
            setSummary("Failed to generate summary. The AI nexus might be temporarily offline.")
        } finally {
            setIsGenerating(false)
            vibrateSuccess()
        }
    }, [title, author])

    useEffect(() => {
        if (!isOpen) {
            setSummary('')
            setCompleted(false)
            setIsGenerating(false)
            setRetryCountdown(null)
            if (retryTimerRef.current) clearInterval(retryTimerRef.current)
            return
        }
        fetchStream()
    }, [isOpen, fetchStream])

    const handleComplete = () => {
        if (completed) return
        setCompleted(true)
        vibrateSuccess()
        onLogSummary()
        setTimeout(onClose, 1500)
    }

    // Basic Markdown parser for typical Gemini output (Headers, Bold, Bullet points)
    const renderMarkdown = (text: string) => {
        if (!text) return null
        
        let html = text
            // Replace bold text before headers to prevent matching header pounds
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // Headers
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            // Bullet points
            .replace(/^\* (.*$)/gim, '<ul><li>$1</li></ul>')
            // Cleanup adjacent ul tags
            .replace(/<\/ul>\n<ul>/gim, '')
            // Paragraphs (double newlines)
            .replace(/\n\n/gim, '</p><p>')
            // Line breaks
            .replace(/\n/gim, '<br/>')

        return <div dangerouslySetInnerHTML={{ __html: `<p>${html}</p>` }} className={styles.markdownContent} />
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className={styles.overlay}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        className={styles.modal}
                        initial={{ y: 50, opacity: 0, scale: 0.95 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 30, opacity: 0, scale: 0.95 }}
                        onClick={e => e.stopPropagation()}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    >
                        <div className={styles.header}>
                            <div className={styles.bookInfo}>
                                <div className={styles.sparkleIcon}><Sparkles size={18} /></div>
                                <div>
                                    <h3>{title}</h3>
                                    <span>AI Synopsis Masterclass</span>
                                </div>
                            </div>
                            <button className={styles.closeBtn} onClick={() => { vibrateLight(); onClose(); }}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className={styles.contentWrap} ref={scrollRef}>
                            <div className={styles.readingEnvironment}>

                                {/* Quota exceeded state */}
                                {retryCountdown !== null && (
                                    <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                                        <Clock size={40} style={{ margin: '0 auto 1rem', opacity: 0.4, display: 'block' }} />
                                        <h3 style={{ marginBottom: '0.5rem' }}>Buddy is taking a breather ☕</h3>
                                        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>The AI hit its free tier limit. Auto-retrying in...</p>
                                        <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--primary-glow)' }}>{retryCountdown}s</div>
                                        <button 
                                            className="btn-primary" 
                                            style={{ marginTop: '1.5rem' }} 
                                            onClick={fetchStream}
                                            disabled={retryCountdown > 0}
                                        >
                                            {retryCountdown > 0 ? `Retry in ${retryCountdown}s` : '✨ Retry Now'}
                                        </button>
                                    </div>
                                )}

                                {renderMarkdown(summary)}
                                
                                {isGenerating && (
                                    <div className={styles.generatingIndicator}>
                                        <Loader2 size={16} className={styles.spin} /> 
                                        <span>Buddy is typing...</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className={styles.footer}>
                            {!isGenerating && summary.length > 50 && (
                                <button 
                                    className={`${styles.completeBtn} ${completed ? styles.completed : ''}`} 
                                    onClick={handleComplete}
                                    disabled={completed}
                                >
                                    {completed ? (
                                        <><CheckCircle size={18} /> Habit Logged! (+15 XP)</>
                                    ) : (
                                        <><BookOpen size={18} /> Complete Session (+15 XP)</>
                                    )}
                                </button>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
