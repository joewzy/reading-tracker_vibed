'use client'

import React, { useRef, useState } from 'react'
import { motion, useAnimation, PanInfo } from 'framer-motion'
import { StickyNote, Trash2, Clock, PlusCircle, Check } from 'lucide-react'
import { vibrateLight, vibrateMedium, vibrateSuccess } from '@/utils/haptics'

interface Book {
    id: string
    title: string
    author: string
    totalPages: number
    currentPage: number
    status: string
    coverImage?: string | null
    description?: string | null
}

interface SwipeableBookCardProps {
    book: Book
    styles: any
    logPagesValue: string
    onChangeLogPages: (val: string) => void
    onLogSession: () => void
    onOpenNotes: () => void
    onDelete: () => void
    getEstDaysToFinish: (book: Book) => number | null
}

const SWIPE_THRESHOLD = 80

export default function SwipeableBookCard({
    book,
    styles,
    logPagesValue,
    onChangeLogPages,
    onLogSession,
    onOpenNotes,
    onDelete,
    getEstDaysToFinish
}: SwipeableBookCardProps) {
    const controls = useAnimation()
    const [isSwiping, setIsSwiping] = useState(false)
    const [swipeAction, setSwipeAction] = useState<'none' | 'notes' | 'log'>('none')
    const inputRef = useRef<HTMLInputElement>(null)

    const handleDrag = (event: any, info: PanInfo) => {
        if (!isSwiping) setIsSwiping(true)
        
        if (info.offset.x > SWIPE_THRESHOLD) {
            if (swipeAction !== 'log') {
                setSwipeAction('log')
                vibrateLight()
            }
        } else if (info.offset.x < -SWIPE_THRESHOLD) {
            if (swipeAction !== 'notes') {
                setSwipeAction('notes')
                vibrateLight()
            }
        } else {
            if (swipeAction !== 'none') {
                setSwipeAction('none')
            }
        }
    }

    const handleDragEnd = async (event: any, info: PanInfo) => {
        setIsSwiping(false)
        const offset = info.offset.x
        
        if (offset > SWIPE_THRESHOLD) {
            // Swiped Right -> Focus Log Pages
            vibrateMedium()
            controls.start({ x: 0 })
            setTimeout(() => inputRef.current?.focus(), 100)
        } else if (offset < -SWIPE_THRESHOLD) {
            // Swiped Left -> Open Notes
            vibrateMedium()
            controls.start({ x: 0 })
            onOpenNotes()
        } else {
            controls.start({ x: 0 })
        }
        setSwipeAction('none')
    }

    const progressPercent = Math.min(100, Math.round((book.currentPage / book.totalPages) * 100))
    const isCompleted = book.status === 'COMPLETED'

    return (
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '1rem', background: 'var(--card-bg)' }}>
            
            {/* Background Actions Reveal */}
            <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                justifyContent: 'space-between',
                padding: '0 1.5rem',
                alignItems: 'center',
                background: swipeAction === 'log' ? 'rgba(16, 185, 129, 0.2)' : swipeAction === 'notes' ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                transition: 'background 0.3s ease',
                zIndex: 0
            }}>
                <div style={{ color: 'var(--secondary)', opacity: isSwiping ? (swipeAction === 'log' ? 1 : 0.4) : 0, transform: swipeAction === 'log' ? 'scale(1.2)' : 'scale(1)', transition: 'all 0.3s' }}>
                    <PlusCircle size={24} />
                    <div style={{ fontSize: '0.65rem', fontWeight: 600, marginTop: '4px' }}>Log Pages</div>
                </div>
                <div style={{ color: 'var(--primary-glow)', opacity: isSwiping ? (swipeAction === 'notes' ? 1 : 0.4) : 0, transform: swipeAction === 'notes' ? 'scale(1.2)' : 'scale(1)', transition: 'all 0.3s' }}>
                    <StickyNote size={24} />
                    <div style={{ fontSize: '0.65rem', fontWeight: 600, marginTop: '4px' }}>Notes</div>
                </div>
            </div>

            {/* Foreground Card */}
            <motion.div
                layout
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                onDrag={handleDrag}
                onDragEnd={handleDragEnd}
                animate={controls}
                whileHover={{ y: -2 }}
                style={{ zIndex: 1, position: 'relative' }}
                className={`${styles.bookCard} glass-card ${isCompleted ? styles.completedCard : ''}`}
            >
                <div className={styles.bookMain}>
                    {book.coverImage && (
                        <div className={styles.bookCover}>
                            <img src={book.coverImage} alt={book.title} draggable={false} />
                        </div>
                    )}
                    <div className={styles.bookDetails}>
                        <div className={styles.bookHeader}>
                            <div className={styles.bookMeta}>
                                <h3>{book.title}</h3>
                                <p>by {book.author}</p>
                            </div>
                            <div className={styles.bookActions}>
                                <button className={styles.notesBtn} onClick={onOpenNotes} title="Notes">
                                    <StickyNote size={13} />
                                </button>
                                <button className={styles.deleteBtn} onClick={onDelete}>
                                    <Trash2 size={13} />
                                </button>
                            </div>
                        </div>

                        {isCompleted ? (
                            <div className={styles.completedInfo}>
                                <div className={styles.completedBadge}><Check size={14} /> Completed</div>
                            </div>
                        ) : (
                            <>
                                <div className={styles.progressLabel}>
                                    <span>{book.currentPage} / {book.totalPages} pages</span>
                                    <span>{progressPercent}%</span>
                                </div>
                                <div className={styles.miniProgress}>
                                    <div className={styles.miniBar} style={{ width: `${progressPercent}%` }} />
                                </div>
                                
                                {getEstDaysToFinish(book) !== null && getEstDaysToFinish(book)! > 0 && (
                                    <div className={styles.estFinish}>
                                        <Clock size={11} /> <span>Est. {getEstDaysToFinish(book)} days left</span>
                                    </div>
                                )}
                                
                                <div className={styles.logAction}>
                                    <div className={styles.inputWrapper}>
                                        <input
                                            ref={inputRef}
                                            type="number"
                                            placeholder="Pages"
                                            className="input-field"
                                            value={logPagesValue}
                                            onChange={e => onChangeLogPages(e.target.value)}
                                            onKeyDown={e => {
                                                if(e.key === 'Enter') {
                                                    vibrateSuccess()
                                                    onLogSession()
                                                }
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        <button className={styles.miniAddBtn} onClick={() => { vibrateSuccess(); onLogSession(); }}>
                                            <PlusCircle size={16} />
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
