'use client'

import React from 'react'
import { 
  Home, 
  BookOpen, 
  Activity, 
  Compass, 
  Brain, 
  Zap, 
  Settings, 
  LogOut,
  Sparkles
} from 'lucide-react'
import styles from './Sidebar.module.css'

interface SidebarProps {
  activeView: 'home' | 'library' | 'activity' | 'discover'
  setActiveView: (view: 'home' | 'library' | 'activity' | 'discover') => void
  userStats: {
    xp: number
    level: number
  }
  onLogout: () => void
  onShowShop: () => void
  onShowSettings: () => void
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeView, 
  setActiveView, 
  userStats, 
  onLogout, 
  onShowShop, 
  onShowSettings 
}) => {
  const XP_PER_LEVEL = 200
  const progress = ((userStats.xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100

  const navItems = [
    { id: 'home', label: 'Dashboard', icon: Home },
    { id: 'library', label: 'My Library', icon: BookOpen },
    { id: 'activity', label: 'Activity', icon: Activity },
    { id: 'discover', label: 'Discover', icon: Compass },
  ] as const

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <div className={styles.logoIcon}>
          <BookOpen size={22} color="var(--primary-glow)" />
        </div>
        <span className={styles.brandName}>ReaderVerse</span>
      </div>

      <nav className={styles.nav}>
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`${styles.navItem} ${activeView === item.id ? styles.active : ''}`}
            onClick={() => setActiveView(item.id)}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </button>
        ))}

        <div className={styles.divider} />

        <button className={styles.navItem} onClick={() => setActiveView('home')}>
          <Brain size={20} />
          <span>AI Buddy</span>
        </button>

        <button className={styles.navItem} onClick={onShowShop}>
          <Zap size={20} color="var(--warning)" />
          <span>XP Shop</span>
        </button>
      </nav>

      <div className={styles.footer}>
        <div className={styles.userSummary}>
          <div className={styles.levelInfo}>
            <span className={styles.levelBadge}>Lv.{userStats.level}</span>
            <span className={styles.xpText}>{userStats.xp % XP_PER_LEVEL}/{XP_PER_LEVEL} XP</span>
          </div>
          <div className={styles.xpBar}>
            <div className={styles.xpProgress} style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className={styles.footerActions}>
          <button onClick={onShowSettings} className={styles.iconBtn} title="Settings">
            <Settings size={18} />
          </button>
          <button onClick={onLogout} className={styles.iconBtn} title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
