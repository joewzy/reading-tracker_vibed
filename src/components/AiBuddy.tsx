'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, X, Bot, Sparkles, Loader2, Mic } from 'lucide-react'
import styles from './AiBuddy.module.css'

interface AiBuddyProps {
    bookId: string;
    bookTitle: string;
    bookAuthor: string;
}

export default function AiBuddy({ bookId, bookTitle, bookAuthor }: AiBuddyProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [message, setMessage] = useState('')
    const [isListening, setIsListening] = useState(false)
    const [chat, setChat] = useState<{ role: 'user' | 'ai'; content: string }[]>([
        { role: 'ai', content: `Greetings! I'm your Reading Buddy. I've been looking over your notes for *${bookTitle}*. How can I assist your journey today?` }
    ])
    const [isLoading, setIsLoading] = useState(false)
    const chatEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(scrollToBottom, [chat])

    const startListening = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        if (!SpeechRecognition) {
            alert('Voice dictation is not supported in this browser.')
            return
        }
        
        const recognition = new SpeechRecognition()
        recognition.continuous = false
        recognition.interimResults = false

        recognition.onstart = () => setIsListening(true)
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript
            setMessage(prev => prev + (prev ? ' ' : '') + transcript)
        }
        recognition.onerror = () => setIsListening(false)
        recognition.onend = () => setIsListening(false)

        recognition.start()
    }

    const handleSend = async () => {
        if (!message.trim() || isLoading) return

        const userMsg = message.trim()
        setMessage('')
        setChat(prev => [...prev, { role: 'user', content: userMsg }])
        setIsLoading(true)

        try {
            const res = await fetch('/api/ai/buddy', {
                method: 'POST',
                body: JSON.stringify({
                    bookId,
                    message: userMsg,
                    context: { bookTitle, bookAuthor }
                })
            })

            const data = await res.json()
            if (data.error) throw new Error(data.error)

            setChat(prev => [...prev, { role: 'ai', content: data.text }])
        } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : String(err)
            setChat(prev => [...prev, { role: 'ai', content: `Apologies, but ${errorMsg}. Perhaps we should try again?` }])
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className={styles.buddyContainer}>
            <button className={styles.buddyTrigger} onClick={() => setIsOpen(true)}>
                <Bot size={22} />
                <span className={styles.triggerEffect} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20, x: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20, x: 20 }}
                        className={`${styles.chatWindow} glass-card`}
                    >
                        <div className={styles.chatHeader}>
                            <div className={styles.headerTitle}>
                                <Sparkles size={16} className={styles.sparkle} />
                                <h3>Reading Buddy</h3>
                            </div>
                            <button onClick={() => setIsOpen(false)} className={styles.closeBtn}>
                                <X size={18} />
                            </button>
                        </div>

                        <div className={styles.chatBody}>
                            {chat.map((msg, i) => (
                                <div key={i} className={`${styles.message} ${styles[msg.role]}`}>
                                    <div className={styles.msgBubble}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className={`${styles.message} ${styles.ai}`}>
                                    <div className={`${styles.msgBubble} ${styles.loadingBubble}`}>
                                        <Loader2 size={16} className={styles.loaderLine} />
                                        <span>Buddy is reflecting...</span>
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        <div className={styles.chatInput}>
                            <input
                                placeholder="Ask about the book or your notes..."
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSend()}
                            />
                            <button 
                                onClick={isListening ? undefined : startListening} 
                                className={`${styles.micBtn} ${isListening ? styles.listening : ''}`}
                                title="Dictate"
                            >
                                <Mic size={18} />
                            </button>
                            <button onClick={handleSend} disabled={isLoading || !message.trim()} className={styles.sendBtn}>
                                <Send size={18} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
