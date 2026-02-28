'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Trash2, StickyNote, BookOpen } from 'lucide-react'
import styles from './BookNotes.module.css'

interface Note { id: string; content: string; createdAt: string }
interface Props {
    bookId: string
    bookTitle: string
    isOpen: boolean
    onClose: () => void
}

export default function BookNotes({ bookId, bookTitle, isOpen, onClose }: Props) {
    const [notes, setNotes] = useState<Note[]>([])
    const [newNote, setNewNote] = useState('')
    const [loading, setLoading] = useState(false)

    const fetchNotes = useCallback(async () => {
        setLoading(true)
        const res = await fetch(`/api/notes?bookId=${bookId}`)
        if (res.ok) setNotes(await res.json())
        setLoading(false)
    }, [bookId])

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (isOpen && bookId) fetchNotes()
    }, [isOpen, bookId, fetchNotes])

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newNote.trim()) return
        const res = await fetch('/api/notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookId, content: newNote }),
        })
        if (res.ok) { setNewNote(''); fetchNotes() }
    }

    const handleDelete = async (id: string) => {
        await fetch(`/api/notes?id=${id}`, { method: 'DELETE' })
        fetchNotes()
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={styles.overlay} onClick={onClose} />
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className={styles.panel}
                    >
                        <div className={styles.header}>
                            <div>
                                <h3><StickyNote size={18} /> Notes & Highlights</h3>
                                <p className={styles.bookTitle}><BookOpen size={14} /> {bookTitle}</p>
                            </div>
                            <button onClick={onClose} className={styles.closeBtn}><X size={20} /></button>
                        </div>

                        <form onSubmit={handleAdd} className={styles.form}>
                            <textarea
                                className={styles.textarea}
                                placeholder="Add a quote, thought, or highlight from your reading..."
                                value={newNote}
                                onChange={e => setNewNote(e.target.value)}
                                rows={4}
                            />
                            <button type="submit" className={`btn-primary ${styles.addBtn}`} disabled={!newNote.trim()}>
                                <Plus size={16} /> Add Note
                            </button>
                        </form>

                        <div className={styles.list}>
                            {loading ? (
                                <div className={styles.empty}><p>Loading notes...</p></div>
                            ) : notes.length > 0 ? (
                                notes.map((note, i) => (
                                    <motion.div
                                        key={note.id}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.04 }}
                                        className={styles.noteCard}
                                    >
                                        <p className={styles.noteContent}>{note.content}</p>
                                        <div className={styles.noteFooter}>
                                            <span className={styles.noteDate}>
                                                {new Date(note.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            <button className={styles.deleteBtn} onClick={() => handleDelete(note.id)}>
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))
                            ) : (
                                <div className={styles.empty}>
                                    <StickyNote size={48} strokeWidth={1} />
                                    <p>No notes yet for this book.</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
