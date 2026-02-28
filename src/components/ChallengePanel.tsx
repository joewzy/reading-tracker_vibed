'use client'

import { motion } from 'framer-motion'
import { Trophy, CheckCircle2, Zap, Book, Target, Flame } from 'lucide-react'
import styles from './ChallengePanel.module.css'

interface Challenge {
    id: string
    title: string
    description: string
    type: string
    target: number
    xpReward: number
    users?: { current: number; completed: boolean }[]
}

interface Props {
    challenges: Challenge[]
}

export default function ChallengePanel({ challenges }: Props) {
    if (challenges.length === 0) return null

    const getIcon = (type: string, completed: boolean) => {
        if (completed) return <CheckCircle2 size={22} strokeWidth={2.5} />

        switch (type) {
            case 'TOTAL_PAGES': return <Book size={20} />
            case 'DAILY_STREAK': return <Flame size={20} />
            case 'BOOKS_COMPLETED': return <Target size={20} />
            default: return <Zap size={20} />
        }
    }

    return (
        <div className={styles.panel}>
            <div className={styles.header}>
                <Trophy size={20} className={styles.headerIcon} />
                <h3>Active Challenges</h3>
            </div>

            <div className={styles.list}>
                {challenges.map((c, i) => {
                    const userProgress = c.users?.[0]
                    const current = userProgress?.current || 0
                    const completed = userProgress?.completed || false
                    const progress = Math.min(100, (current / c.target) * 100)

                    return (
                        <motion.div
                            key={c.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ scale: 1.01 }}
                            transition={{ delay: i * 0.1, duration: 0.4 }}
                            className={`${styles.card} ${completed ? styles.completed : ''} glass-card`}
                        >
                            <div className={`${styles.icon} ${completed ? styles.completed : ''}`}>
                                {getIcon(c.type, completed)}
                                {!completed && (
                                    <motion.div
                                        className={styles.iconPulse}
                                        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0, 0.3] }}
                                        transition={{ repeat: Infinity, duration: 3 }}
                                    />
                                )}
                            </div>
                            <div className={styles.content}>
                                <div className={styles.titleRow}>
                                    <h4>{c.title}</h4>
                                    <span className={styles.rewardBadge}>+{c.xpReward} XP</span>
                                </div>
                                <p className={styles.desc}>{c.description}</p>
                                {!completed && (
                                    <div className={styles.progressWrap}>
                                        <div className={styles.progressInfo}>
                                            <span>
                                                <strong>{current}</strong> / {c.target} {c.type === 'TOTAL_PAGES' ? 'pages' : 'units'}
                                            </span>
                                            <span>{Math.round(progress)}%</span>
                                        </div>
                                        <div className={styles.progressBarBg}>
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${progress}%` }}
                                                transition={{ duration: 1, ease: "easeOut" }}
                                                className={styles.progressBarFill}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )
                })}
            </div>
        </div>
    )
}
