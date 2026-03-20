'use client'

import React from 'react'
import { Home, BookOpen, Plus, Activity, Zap } from 'lucide-react'
import styles from './MobileNav.module.css'

interface MobileNavProps {
    activeTab: string
    onHomeClick: () => void
    onLibraryClick: () => void
    onAddClick: () => void
    onActivityClick: () => void
    onShopClick: () => void
}

export default function MobileNav({
    activeTab,
    onHomeClick,
    onLibraryClick,
    onAddClick,
    onActivityClick,
    onShopClick
}: MobileNavProps) {
    return (
        <nav className={styles.mobileNav}>
            <button className={`${styles.navItem}`} onClick={onHomeClick}>
                <Home size={20} />
                <span>Home</span>
            </button>
            <button className={`${styles.navItem} ${activeTab === 'reading' || activeTab === 'completed' ? styles.active : ''}`} onClick={onLibraryClick}>
                <BookOpen size={20} />
                <span>Library</span>
            </button>
            
            <div className={styles.fabItem}>
                <button className={styles.addFab} onClick={onAddClick}>
                    <Plus size={24} />
                </button>
            </div>
            
            <button className={`${styles.navItem} ${activeTab === 'activity' ? styles.active : ''}`} onClick={onActivityClick}>
                <Activity size={20} />
                <span>Activity</span>
            </button>
            <button className={`${styles.navItem}`} onClick={onShopClick}>
                <Zap size={20} color="currentColor" />
                <span>Shop</span>
            </button>
        </nav>
    )
}
