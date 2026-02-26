'use client'

import { useEffect } from 'react'

export type ThemeType = 'DARK_DEFAULT' | 'CYBERPUNK' | 'OLD_LIBRARY' | 'ZEN' | 'LIGHT'

interface Props {
    theme: string
}

export default function ThemeRegistry({ theme }: Props) {
    useEffect(() => {
        const root = document.documentElement

        // Reset to defaults first
        root.style.setProperty('--primary', '#8b5cf6')
        root.style.setProperty('--primary-glow', '#a78bfa')
        root.style.setProperty('--secondary', '#10b981')
        root.style.setProperty('--bg', '#020617')
        root.style.setProperty('--card-bg', 'rgba(15, 23, 42, 0.6)')
        root.style.setProperty('--text-main', '#f8fafc')
        root.style.setProperty('--text-muted', '#94a3b8')
        root.style.setProperty('--glass-border', 'rgba(255, 255, 255, 0.08)')
        root.style.setProperty('--shadow-color', 'rgba(0, 0, 0, 0.5)')
        root.style.setProperty('--bg-grad', 'radial-gradient(circle at 10% 20%, rgba(139, 92, 246, 0.1) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(16, 185, 129, 0.1) 0%, transparent 40%)')
        root.style.setProperty('--font-body', "'Inter', sans-serif")
        root.style.setProperty('--font-display', "'Playfair Display', serif")

        if (theme === 'CYBERPUNK') {
            root.style.setProperty('--primary', '#ff00ff') // Neon Pink
            root.style.setProperty('--primary-glow', '#ff77ff')
            root.style.setProperty('--secondary', '#00ffff') // Cyan
            root.style.setProperty('--bg', '#0d0221')
            root.style.setProperty('--card-bg', 'rgba(21, 5, 51, 0.7)')
            root.style.setProperty('--text-main', '#00ffff')
            root.style.setProperty('--text-muted', '#ff00ff')
            root.style.setProperty('--glass-border', 'rgba(0, 255, 255, 0.2)')
            root.style.setProperty('--shadow-color', 'rgba(255, 0, 255, 0.2)')
            root.style.setProperty('--bg-grad', 'radial-gradient(circle at 0% 0%, rgba(255, 0, 255, 0.15) 0%, transparent 50%), radial-gradient(circle at 100% 100%, rgba(0, 255, 255, 0.15) 0%, transparent 50%)')
        } else if (theme === 'OLD_LIBRARY') {
            root.style.setProperty('--primary', '#7c2d12') // Warm Brown
            root.style.setProperty('--primary-glow', '#9a3412')
            root.style.setProperty('--secondary', '#164e63')
            root.style.setProperty('--bg', '#1c1917')
            root.style.setProperty('--card-bg', 'rgba(41, 37, 36, 0.8)')
            root.style.setProperty('--text-main', '#f5f5f4')
            root.style.setProperty('--text-muted', '#a8a29e')
            root.style.setProperty('--glass-border', 'rgba(124, 45, 18, 0.2)')
            root.style.setProperty('--shadow-color', 'rgba(0, 0, 0, 0.8)')
            root.style.setProperty('--bg-grad', 'radial-gradient(circle at 50% 50%, rgba(124, 45, 18, 0.05) 0%, transparent 100%), url("https://www.transparenttextures.com/patterns/paper.png")')
            root.style.setProperty('--font-body', "'Georgia', serif")
        } else if (theme === 'ZEN') {
            root.style.setProperty('--primary', '#065f46') // Forest Green
            root.style.setProperty('--primary-glow', '#059669')
            root.style.setProperty('--secondary', '#1e40af')
            root.style.setProperty('--bg', '#064e3b')
            root.style.setProperty('--card-bg', 'rgba(2, 44, 34, 0.7)')
            root.style.setProperty('--text-main', '#ecfdf5')
            root.style.setProperty('--text-muted', '#6ee7b7')
            root.style.setProperty('--glass-border', 'rgba(110, 231, 183, 0.1)')
            root.style.setProperty('--shadow-color', 'rgba(2, 44, 34, 0.5)')
            root.style.setProperty('--bg-grad', 'radial-gradient(circle at 30% 20%, rgba(16, 185, 129, 0.1) 0%, transparent 60%), radial-gradient(circle at 80% 90%, rgba(16, 185, 129, 0.05) 0%, transparent 60%)')
        } else if (theme === 'LIGHT') {
            root.style.setProperty('--primary', '#3b82f6')
            root.style.setProperty('--primary-glow', '#60a5fa')
            root.style.setProperty('--secondary', '#10b981')
            root.style.setProperty('--bg', '#f8fafc')
            root.style.setProperty('--card-bg', 'rgba(255, 255, 255, 0.9)')
            root.style.setProperty('--text-main', '#0f172a')
            root.style.setProperty('--text-muted', '#64748b')
            root.style.setProperty('--glass-border', 'rgba(15, 23, 42, 0.08)')
            root.style.setProperty('--shadow-color', 'rgba(0, 0, 0, 0.1)')
            root.style.setProperty('--bg-grad', 'radial-gradient(circle at 10% 10%, rgba(59, 130, 246, 0.03) 0%, transparent 40%)')
        }
    }, [theme])

    return null
}
