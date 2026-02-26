'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingCart, Snowflake, Zap, X, ShieldCheck } from 'lucide-react'
import styles from './XPShop.module.css'

interface Props {
    xp: number
    streakFreezes: number
    onPurchase: () => void
}

export default function XPShop({ xp, streakFreezes, onPurchase }: Props) {
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')

    const handleBuy = async () => {
        if (xp < 500) return
        setLoading(true)
        try {
            const res = await fetch('/api/shop/buy', { method: 'POST' })
            if (res.ok) {
                setMessage('Streak Freeze Purchased!')
                onPurchase()
                setTimeout(() => setMessage(''), 3000)
            } else {
                const data = await res.json()
                setMessage(data.error || 'Purchase failed')
            }
        } catch (err) {
            setMessage('Something went wrong')
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <button className={styles.shopBtnTrigger} onClick={() => setIsOpen(true)}>
                <ShoppingCart size={18} />
                <span>Shop</span>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={styles.modalOverlay}
                        onClick={() => setIsOpen(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className={`${styles.modal} glass-card`}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className={styles.header}>
                                <h3><ShoppingCart size={24} color="var(--primary)" /> XP Shop</h3>
                                <button onClick={() => setIsOpen(false)} className={styles.closeBtn}><X size={20} /></button>
                            </div>

                            <div className={styles.balance}>
                                <div className={`${styles.balanceItem} ${styles.xpVal}`}>
                                    <span>{xp}</span>
                                    <label>Total XP</label>
                                </div>
                                <div className={`${styles.balanceItem} ${styles.freezeVal}`}>
                                    <span>{streakFreezes}</span>
                                    <label>Freezes</label>
                                </div>
                            </div>

                            <div className={styles.items}>
                                <motion.div whileHover={{ scale: 1.01 }} className={styles.item}>
                                    <div className={styles.itemHeader}>
                                        <div className={styles.itemIcon}><Snowflake size={32} /></div>
                                        <div className={styles.itemInfo}>
                                            <h4>Streak Freeze</h4>
                                            <p>Protect your streak for 1 day if you miss your reading goal.</p>
                                        </div>
                                    </div>

                                    <div className={styles.itemFooter}>
                                        <div className={styles.price}><Zap size={15} /> 500 XP</div>
                                    </div>

                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className={`btn-primary ${styles.buyBtn}`}
                                        onClick={handleBuy}
                                        disabled={xp < 500 || loading}
                                    >
                                        {loading ? 'Processing...' : 'Purchase Item'}
                                    </motion.button>
                                </motion.div>
                            </div>

                            {message && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={styles.message}>
                                    <ShieldCheck size={14} /> {message}
                                </motion.div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}
