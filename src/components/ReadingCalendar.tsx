'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Calendar } from 'lucide-react'
import styles from './ReadingCalendar.module.css'

interface Props {
    sessions: { date: string; pagesRead: number }[]
}

export default function ReadingCalendar({ sessions }: Props) {
    const { days, maxPages, months } = useMemo(() => {
        // Build last 90 days
        const now = new Date()
        const dayMap = new Map<string, number>()
        for (const s of sessions) {
            const key = new Date(s.date).toISOString().slice(0, 10)
            dayMap.set(key, (dayMap.get(key) || 0) + s.pagesRead)
        }

        const days: { date: string; pages: number; dayOfWeek: number }[] = []
        let max = 0
        for (let i = 89; i >= 0; i--) {
            const d = new Date(now)
            d.setDate(d.getDate() - i)
            const key = d.toISOString().slice(0, 10)
            const pages = dayMap.get(key) || 0
            if (pages > max) max = pages
            days.push({ date: key, pages, dayOfWeek: d.getDay() })
        }

        // Extract month labels
        const months: { label: string; col: number }[] = []
        let lastMonth = ''
        days.forEach((day, idx) => {
            const m = new Date(day.date).toLocaleString('en', { month: 'short' })
            if (m !== lastMonth) {
                const col = Math.floor(idx / 7)
                months.push({ label: m, col })
                lastMonth = m
            }
        })

        return { days, maxPages: max, months }
    }, [sessions])

    const getColor = (pages: number) => {
        if (pages === 0) return 'rgba(255,255,255,0.03)'
        const ratio = maxPages > 0 ? pages / maxPages : 0
        if (ratio > 0.75) return 'var(--primary)'
        if (ratio > 0.5) return 'rgba(139,92,246,0.7)'
        if (ratio > 0.25) return 'rgba(139,92,246,0.4)'
        return 'rgba(139,92,246,0.15)'
    }

    // Arrange into columns (weeks)
    const weeks: typeof days[] = []
    for (let i = 0; i < days.length; i += 7) {
        weeks.push(days.slice(i, i + 7))
    }

    const totalPagesLast90 = days.reduce((a: number, d: any) => a + d.pages, 0)
    const activeDays = days.filter((d: any) => d.pages > 0).length

    return (
        <div className={`${styles.card} glass-card`}>
            <div className={styles.header}>
                <div className={styles.title}><Calendar size={18} /> <h3>Reading Activity</h3></div>
                <div className={styles.stats}>
                    <span><strong>{activeDays}</strong> active days</span>
                    <span><strong>{totalPagesLast90}</strong> total pages</span>
                </div>
            </div>

            <div className={styles.scrollContainer}>
                {/* Month labels */}
                <div className={styles.months}>
                    {months.map((m, i) => (
                        <span key={i} className={styles.monthLabel} style={{ gridColumn: m.col + 1 }}>{m.label}</span>
                    ))}
                </div>

                {/* Grid */}
                <div className={styles.grid}>
                    {weeks.map((week, wi) => (
                        <div key={wi} className={styles.col}>
                            {week.map((day, di) => (
                                <motion.div
                                    key={day.date}
                                    className={styles.cell}
                                    style={{ backgroundColor: getColor(day.pages) }}
                                    title={`${day.date}: ${day.pages} pages`}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: (wi * 7 + di) * 0.002 }}
                                />
                            ))}
                        </div>
                    ))}
                </div>

                {/* Legend */}
                <div className={styles.legend}>
                    <span className={styles.legendLabel}>Less</span>
                    {[0, 0.2, 0.4, 0.7, 1].map((v, i) => (
                        <div key={i} className={styles.cell} style={{ backgroundColor: v === 0 ? 'rgba(255,255,255,0.03)' : `rgba(139,92,246,${v})` }} />
                    ))}
                    <span className={styles.legendLabel}>More</span>
                </div>
            </div>
        </div>
    )
}
