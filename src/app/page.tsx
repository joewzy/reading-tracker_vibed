'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, BookOpen, TrendingUp, Search, Quote as QuoteIcon,
  Flame, PlusCircle, LogOut, Github, Mail, Lock,
  User as UserIcon, ArrowRight, Trash2, Target, CheckCircle,
  Clock, BookMarked, X, Settings, Bell, Zap, Star, Shield, Trophy, StickyNote,
  Brain, BarChart, Sparkles, Home, Compass, Activity
} from 'lucide-react'
import confetti from 'canvas-confetti'
import styles from './page.module.css'
import { MOTIVATIONAL_QUOTES, TOP_BOOKS } from '@/lib/data'
import ReadingChart from '@/components/ReadingChart'
import ReadingTimer from '@/components/ReadingTimer'
import BookNotes from '@/components/BookNotes'
import ReadingCalendar from '@/components/ReadingCalendar'
import ThemeRegistry from '@/components/ThemeRegistry'
import XPShop from '@/components/XPShop'
import ChallengePanel from '@/components/ChallengePanel'
import AiBuddy from '@/components/AiBuddy'

interface Book { id: string; title: string; author: string; totalPages: number; currentPage: number; status: string; coverImage?: string | null; description?: string | null; rating?: number | null; review?: string | null }
interface ActivitySession { id: string; pagesRead: number; duration: number | null; date: string; book: { title: string } }
interface Goal { id: string; target: number; type: string }
interface Insights { streak: number; chartData: { name: string; pages: number }[]; averagePPH?: number }
interface UserStats { xp: number; level: number; notificationEmail: string | null; streakFreezes: number; activeTheme: string; achievements: { type: string }[] }
interface Challenge { id: string; title: string; description: string; type: string; target: number; xpReward: number; users: { current: number; completed: boolean }[] }

type Category = keyof typeof TOP_BOOKS

const ACHIEVEMENTS: Record<string, { label: string; emoji: string; desc: string }> = {
  FIRST_PAGE: { label: 'First Page', emoji: '📖', desc: 'Log your first reading session' },
  ON_FIRE: { label: 'On Fire', emoji: '🔥', desc: 'Maintain a 3-day streak' },
  WEEK_WARRIOR: { label: 'Week Warrior', emoji: '🏆', desc: 'Maintain a 7-day streak' },
  BOOKWORM: { label: 'Bookworm', emoji: '📚', desc: 'Complete your first book' },
  CENTURY: { label: 'Century', emoji: '🌟', desc: 'Log 100+ pages in one session' },
  SCHOLAR: { label: 'Scholar', emoji: '🎓', desc: 'Reach Level 5' },
}
const LEVEL_NAMES = ['Apprentice', 'Scholar', 'Sage', 'Luminary', 'Oracle', 'Legend']
const XP_PER_LEVEL = 200

function getLevelInfo(xp: number) {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1
  const currentLevelXp = xp % XP_PER_LEVEL
  const progress = (currentLevelXp / XP_PER_LEVEL) * 100
  const name = LEVEL_NAMES[Math.min(level - 1, LEVEL_NAMES.length - 1)]
  return { level, currentLevelXp, progress, name }
}

const cv = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.07 } } }
const iv = { hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0 } }

export default function Dashboard() {
  const { data: session, status } = useSession()
  const [books, setBooks] = useState<Book[]>([])
  const [sessions, setSessions] = useState<ActivitySession[]>([])
  const [goal, setGoal] = useState<Goal | null>(null)
  const [insights, setInsights] = useState<Insights>({ streak: 0, chartData: [] })
  const [userStats, setUserStats] = useState<UserStats>({ xp: 0, level: 1, notificationEmail: null, streakFreezes: 0, activeTheme: 'DARK_DEFAULT', achievements: [] })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'reading' | 'completed' | 'activity' | 'achievements'>('reading')
  const [showAddBook, setShowAddBook] = useState(false)
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [newBook, setNewBook] = useState({ title: '', author: '', totalPages: '', coverImage: null as string | null, description: '' })
  const [goalTarget, setGoalTarget] = useState('')
  const [notifEmail, setNotifEmail] = useState('')
  const [savingEmail, setSavingEmail] = useState(false)
  const [activeCategory, setActiveCategory] = useState<Category>('PRODUCTIVITY')
  const [logPages, setLogPages] = useState<Record<string, string>>({})
  const [xpToast, setXpToast] = useState<{ xp: number; achievement?: string } | null>(null)
  const [notesPanel, setNotesPanel] = useState<{ bookId: string; bookTitle: string } | null>(null)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' })
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [ratingModal, setRatingModal] = useState<{ bookId: string; bookTitle: string } | null>(null)
  const [pendingRating, setPendingRating] = useState(0)
  const [pendingReview, setPendingReview] = useState('')
  const [onboarding, setOnboarding] = useState<{ step: number } | null>(null)
  const [mobileView, setMobileView] = useState<'home' | 'library' | 'activity' | 'discover'>('home')

  // Phase 3: Book Search State
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ id: string; title: string; author: string; totalPages: number | string; coverImage?: string | null; description?: string | null }[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const handleSearchBooks = async () => {
    if (!searchQuery.trim()) return
    setIsSearching(true)
    try {
      const res = await fetch(`/api/books/search?q=${encodeURIComponent(searchQuery)}`)
      if (res.ok) {
        const data = await res.json()
        setSearchResults(data)
      }
    } catch (err) {
      console.error('Search failed', err)
    } finally {
      setIsSearching(false)
    }
  }

  const selectBookFromResult = (book: { title: string; author: string; totalPages: number | string; coverImage?: string | null; description?: string | null }) => {
    setNewBook({
      title: book.title,
      author: book.author,
      totalPages: book.totalPages.toString(),
      coverImage: book.coverImage || null,
      description: book.description || ''
    })
    setSearchResults([])
    setSearchQuery('')
  }

  const quote = useMemo(() => MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)], [])

  const fetchData = useCallback(async () => {
    try {
      const endpoints = [
        '/api/books', '/api/goals', '/api/insights',
        '/api/sessions', '/api/user/settings', '/api/challenges'
      ]
      const responses = await Promise.all(endpoints.map(e => fetch(e)))

      const [bD, gD, iD, sD, uD, cD] = await Promise.all(
        responses.map(async r => {
          if (!r.ok) return null
          try { return await r.json() } catch { return null }
        })
      )

      if (bD && Array.isArray(bD)) setBooks(bD)
      if (gD && !gD.error) setGoal(gD)
      if (iD && !iD.error) setInsights(iD)
      if (sD && Array.isArray(sD)) setSessions(sD)
      if (uD && !uD.error) {
        setUserStats(uD)
        setNotifEmail(uD.notificationEmail || '')
      }
      if (cD && Array.isArray(cD)) setChallenges(cD)
    } catch (e) {
      console.error('Fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [])


  useEffect(() => {
    if (status === 'authenticated') {
      fetchData()
      // Show onboarding for brand-new users (only once)
      const seen = localStorage.getItem('rv_onboarded')
      if (!seen) setOnboarding({ step: 1 })
    } else if (status === 'unauthenticated') setLoading(false)
  }, [status, fetchData])

  const showXpPop = (xp: number, ach?: string) => {
    setXpToast({ xp, achievement: ach })
    setTimeout(() => setXpToast(null), 3500)
  }

  const boom = () => confetti({ particleCount: 130, spread: 65, origin: { y: 0.6 }, colors: ['#8b5cf6', '#10b981', '#f59e0b'] })

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault(); setAuthError(''); setAuthLoading(true)
    try {
      if (authMode === 'signup') {
        const r = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(authForm) })
        const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Failed')
        const lr = await signIn('credentials', { redirect: false, email: authForm.email, password: authForm.password })
        if (lr?.error) throw new Error(lr.error)
      } else {
        const r = await signIn('credentials', { redirect: false, email: authForm.email, password: authForm.password })
        if (r?.error) throw new Error(r.error || 'Invalid credentials')
      }
    } catch (err: unknown) { setAuthError(err instanceof Error ? err.message : String(err)) }
    finally { setAuthLoading(false) }
  }

  const handleAddBook = async (e: React.FormEvent | null, data?: { title?: string; author?: string; totalPages?: string; coverImage?: string | null; description?: string | null }) => {
    if (e) e.preventDefault()
    const payload = data || newBook
    try {
      const r = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (r.ok) {
        setNewBook({ title: '', author: '', totalPages: '', coverImage: null, description: '' });
        setShowAddBook(false);
        fetchData();
        boom()
      } else {
        const err = await r.json()
        console.error('Failed to add book:', err)
        alert('Failed to add book: ' + (err.details || err.error || 'Unknown error'))
      }
    } catch (err) {
      console.error('Error adding book:', err)
    }
  }


  const handleDeleteBook = async (id: string) => {
    if (!confirm('Remove this book?')) return
    await fetch(`/api/books?id=${id}`, { method: 'DELETE' }); fetchData()
  }

  const handleLogSession = async (bookId: string) => {
    const pages = logPages[bookId]; if (!pages || parseInt(pages) <= 0) return
    try {
      const r = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId, pagesRead: pages })
      })
      if (r.ok) {
        const d = await r.json(); setLogPages(p => ({ ...p, [bookId]: '' })); fetchData()
        boom(); showXpPop(d.xpGained ?? 10, d.newAchievements?.[0])
        if (d.autoCompleted) setTimeout(() => alert('🎉 You finished the book!'), 600)
      } else {
        const err = await r.json()
        alert('Failed to log session: ' + (err.error || 'Unknown error'))
      }
    } catch (err) {
      console.error('Error logging session:', err)
    }
  }


  const handleSetGoal = async (e: React.FormEvent) => {
    e.preventDefault(); const now = new Date()
    try {
      const r = await fetch('/api/goals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target: goalTarget, type: 'PAGES', month: now.getMonth() + 1, year: now.getFullYear() }) })
      if (r.ok) { setShowGoalModal(false); setGoalTarget(''); fetchData() }
      else {
        const err = await r.json()
        alert('Failed to set goal: ' + (err.details || err.error || 'Unknown error'))
      }
    } catch (err) {
      console.error('Error setting goal:', err)
    }
  }


  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault(); setSavingEmail(true)
    const body = { notificationEmail: notifEmail, activeTheme: userStats.activeTheme }
    await fetch('/api/user/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setSavingEmail(false); fetchData(); setShowSettings(false)
  }

  const handleSaveRating = async () => {
    if (!ratingModal || pendingRating === 0) return
    await fetch(`/api/books/${ratingModal.bookId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: pendingRating, review: pendingReview || null }),
    })
    setRatingModal(null)
    fetchData()
  }

  const dismissOnboarding = (goToStep?: number) => {
    if (goToStep) { setOnboarding({ step: goToStep }); return }
    localStorage.setItem('rv_onboarded', '1')
    setOnboarding(null)
  }

  const handleThemeChange = async (theme: string) => {
    setUserStats(prev => ({ ...prev, activeTheme: theme }))
    await fetch('/api/user/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activeTheme: theme })
    })
  }

  if (loading) return <div className={styles.loaderContainer}><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className={styles.loader} /></div>

  if (status === 'unauthenticated') {
    return (
      <div className={styles.landingPage}>
        <div className={styles.ambientGlow1} />
        <div className={styles.ambientGlow2} />

        <div className={styles.landingContainer}>
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} className={styles.landingHero}>
            <div className={styles.landingLogo} style={{ justifyContent: 'flex-start' }}><BookOpen size={64} className={styles.logoGlow} /></div>
            <h1>ReaderVerse</h1>
            <p className={styles.landingSubtitle}>Your gamified reading sanctuary. Transform your reading habit with XP, achievements, and AI-powered insights.</p>

            <div className={styles.featureGrid}>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className={styles.featureCard}>
                <div className={styles.featureIcon}><Trophy size={20} /></div>
                <div className={styles.featureText}><h3>Gamified Tracking</h3><p>Earn XP, level up, and unlock achievements for reading.</p></div>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className={styles.featureCard}>
                <div className={styles.featureIcon}><Brain size={20} /></div>
                <div className={styles.featureText}><h3>AI Buddy</h3><p>Chat with an AI about your books and get personalized insights.</p></div>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className={styles.featureCard}>
                <div className={styles.featureIcon}><BarChart size={20} /></div>
                <div className={styles.featureText}><h3>Deep Stats</h3><p>Visualize your reading speed, streak trends, and completion rates.</p></div>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className={styles.featureCard}>
                <div className={styles.featureIcon}><Star size={20} /></div>
                <div className={styles.featureText}><h3>Beautiful Themes</h3><p>Customize your reading sanctuary with immersive themes.</p></div>
              </motion.div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
            <div className={`${styles.authCard} glass-card`}>
              <div className={styles.authTabs}>
                <button className={`${styles.authTab} ${authMode === 'login' ? styles.activeAuthTab : ''}`} onClick={() => setAuthMode('login')}>Login</button>
                <button className={`${styles.authTab} ${authMode === 'signup' ? styles.activeAuthTab : ''}`} onClick={() => setAuthMode('signup')}>Sign Up</button>
              </div>
              <form onSubmit={handleAuth} className={styles.authForm}>
                <AnimatePresence>
                  {authMode === 'signup' && (
                    <motion.div key="name" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className={styles.inputGroup}>
                      <UserIcon size={16} className={styles.inputIcon} />
                      <input type="text" placeholder="Full Name" required value={authForm.name} onChange={e => setAuthForm({ ...authForm, name: e.target.value })} />
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className={styles.inputGroup}>
                  <Mail size={16} className={styles.inputIcon} />
                  <input type="email" placeholder="Email" required value={authForm.email} onChange={e => setAuthForm({ ...authForm, email: e.target.value })} />
                </div>
                <div className={styles.inputGroup} style={{ marginTop: '0.85rem' }}>
                  <Lock size={16} className={styles.inputIcon} />
                  <input type="password" placeholder="Password" required value={authForm.password} onChange={e => setAuthForm({ ...authForm, password: e.target.value })} />
                </div>
                {authError && <p className={styles.errorText}>{authError}</p>}
                <button type="submit" className={styles.submitAuthBtn} disabled={authLoading}>
                  {authLoading ? 'Processing...' : authMode === 'login' ? 'Enter Sanctuary' : 'Begin Journey'}
                  {!authLoading && <ArrowRight size={16} />}
                </button>
              </form>
              <div className={styles.divider}><span>or</span></div>
              <div className={styles.authForm}>
                <button
                  className={styles.submitAuthBtn}
                  style={{ marginBottom: '1rem', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', color: '#000000' }}
                  onClick={() => signIn('google')}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Continue with Google
                </button>
                <button
                  className={styles.githubBtn}
                  style={{ width: '100%', padding: '0.85rem' }}
                  onClick={() => signIn('github')}
                >
                  <Github size={18} /> Continue with GitHub
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  const getEstDaysToFinish = (book: Book) => {
    if (!insights?.averagePPH || insights.averagePPH <= 0) return null
    const pagesLeft = book.totalPages - book.currentPage
    if (pagesLeft <= 0) return 0
    // Assume 1 hour of reading per day for calculation
    const hoursNeeded = pagesLeft / insights.averagePPH
    return Math.ceil(hoursNeeded)
  }

  const { level, currentLevelXp, progress: xpProgress, name: levelName } = getLevelInfo(userStats.xp)
  const activeBooks = books.filter(b => b.status !== 'COMPLETED')
  const completedBooks = books.filter(b => b.status === 'COMPLETED')
  const totalPagesRead = books.reduce((a, b) => a + b.currentPage, 0)
  const progressPercent = goal ? Math.min((totalPagesRead / goal.target) * 100, 100) : 0
  const unlockedTypes = new Set((userStats.achievements || []).map(a => a.type))

  return (
    <main className="container">
      <ThemeRegistry theme={userStats.activeTheme} />

      {activeBooks.length > 0 && (
        <AiBuddy
          bookId={activeBooks[0].id}
          bookTitle={activeBooks[0].title}
          bookAuthor={activeBooks[0].author}
        />
      )}

      {/* XP Toast */}
      <AnimatePresence>
        {xpToast && (
          <motion.div initial={{ opacity: 0, y: 60, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 60, scale: 0.8 }} className={styles.xpToast}>
            <Zap size={16} className={styles.xpIcon} />
            <span>+{xpToast.xp} XP</span>
            {xpToast.achievement && <span className={styles.achievementToast}>{ACHIEVEMENTS[xpToast.achievement]?.emoji} {ACHIEVEMENTS[xpToast.achievement]?.label} Unlocked!</span>}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.logoIcon}><BookOpen size={28} color="var(--primary)" /></div>
          <div><h1 className={styles.title}>ReaderVerse</h1><p className={styles.subtitle}>Welcome back, {session?.user?.name || session?.user?.email?.split('@')[0] || 'Reader'}.</p></div>
        </div>
        <div className={styles.xpBarWrap}>
          <div className={styles.levelBadge}><Star size={11} /> Lv.{level} {levelName}</div>
          <div className={styles.xpBarOuter}><motion.div className={styles.xpBarInner} initial={{ width: 0 }} animate={{ width: `${xpProgress}%` }} transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }} /></div>
          <span className={styles.xpLabel}>{currentLevelXp}/{XP_PER_LEVEL} XP</span>
        </div>
        <div className={styles.headerActions}>
          <XPShop xp={userStats.xp} streakFreezes={userStats.streakFreezes} onPurchase={fetchData} />
          <motion.button whileTap={{ scale: 0.96 }} className={styles.goalBtn} onClick={() => setShowGoalModal(true)}><Target size={15} /> {goal ? `${goal.target} pg goal` : 'Set Goal'}</motion.button>
          <motion.button whileTap={{ scale: 0.96 }} className="btn-primary" onClick={() => setShowAddBook(true)}><Plus size={15} /> Add Book</motion.button>
          <motion.button whileTap={{ scale: 0.9 }} className={styles.iconBtn} onClick={() => setShowSettings(true)}><Settings size={17} /></motion.button>
          <motion.button whileTap={{ scale: 0.9 }} className={styles.logoutBtn} onClick={() => signOut()}><LogOut size={17} /></motion.button>
        </div>
      </motion.header>

      {/* Mobile-only FAB — add book */}
      <motion.button 
        className={styles.mobileAddFAB} 
        onClick={() => setShowAddBook(true)}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileTap={{ scale: 0.9 }}
      >
        <Plus size={24} />
      </motion.button>

      {/* Quote Area (Full Width) */}
      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={styles.quoteArea}>
        <div className={`${styles.quoteCard} glass-card`}>
          <QuoteIcon className={styles.quoteIcon} size={20} />
          <p className={styles.quoteText}>{quote.text}</p>
          <p className={styles.quoteAuthor}>— {quote.author}</p>
        </div>
      </motion.section>

      {/* Stats & Challenges Grid (2-column layout) */}
      <section className={styles.statsLayout}>
        <div className={styles.mainStats}>
          {/* Mobile-only section title (Properly restored via CSS Modules) */}
          <h2 className={styles.mobileSectionTitle}>Today's Status</h2>

          <motion.section variants={cv} initial="hidden" animate="visible" className={styles.statsGrid}>
            <motion.div variants={iv} className={`glass-card ${styles.mobileCenterCard}`}>
              <div className={styles.statHeader}><TrendingUp size={17} color="var(--primary)" /><h3>Monthly Goal</h3></div>
              {goal ? (<>
                <div className={styles.progressContainer}><motion.div initial={{ width: 0 }} animate={{ width: `${progressPercent}%` }} transition={{ duration: 1.5, ease: 'easeOut' }} className={styles.progressBar} /></div>
                <div className={styles.statFooter}><p className={styles.statDetail}><strong>{totalPagesRead}</strong> / {goal.target} pages</p><span className={styles.percentage}>{Math.round(progressPercent)}%</span></div>
                <ReadingChart data={insights.chartData} />
              </>) : (
                <div className={styles.noGoal}><p>No goal set yet.</p><button className={styles.setGoalBtn} onClick={() => setShowGoalModal(true)}><Target size={13} /> Set Goal</button></div>
              )}
            </motion.div>

            <motion.div variants={iv} className={`glass-card ${styles.mobileCenterCard}`}>
              <div className={styles.statHeader}><Flame size={17} color="#ef4444" /><h3>Daily Streak</h3></div>
              <p className={styles.bigStat}>{insights.streak} <span className={styles.smallText}>{insights.streak === 1 ? 'day' : 'days'}</span></p>
              <div className={styles.streakIndicator}>{[...Array(7)].map((_, i) => <div key={i} className={styles.streakDot} active-dot={i < insights.streak % 7 ? 'true' : 'false'} />)}</div>
              {userStats.streakFreezes > 0 && <div className="freeze-active-label"><Shield size={11} /> {userStats.streakFreezes} active</div>}
            </motion.div>

            <motion.div variants={iv} className={`glass-card ${styles.mobileCenterCard}`}>
              <div className={styles.statHeader}><Trophy size={17} color="#f59e0b" /><h3>Achievements</h3></div>
              <div className={styles.achievementGrid}>
                {Object.entries(ACHIEVEMENTS).slice(0, 4).map(([key, a]) => (
                  <div key={key} className={`${styles.achBadge} ${unlockedTypes.has(key) ? styles.achUnlocked : styles.achLocked}`} title={a.desc}>
                    <span className={styles.achEmoji}>{a.emoji}</span>
                  </div>
                ))}
              </div>
              <button className={styles.viewMore} onClick={() => setActiveTab('achievements')}>View All <ArrowRight size={12} /></button>
            </motion.div>
          </motion.section>

          {/* Reading Heatmap */}
          <ReadingCalendar sessions={sessions} />

          {/* Tabs Navigation */}
          <div className={styles.mainTabs}>
            {([
              { key: 'reading', icon: <BookMarked size={13} />, label: `Reading (${activeBooks.length})` },
              { key: 'completed', icon: <CheckCircle size={13} />, label: `Completed (${completedBooks.length})` },
              { key: 'activity', icon: <Clock size={13} />, label: 'Activity' },
              { key: 'achievements', icon: <Trophy size={13} />, label: 'Achievements' },
            ] as const).map(t => (
              <motion.button 
                key={t.key} 
                className={`${styles.mainTab} ${activeTab === t.key ? styles.activeMainTab : ''}`} 
                onClick={() => setActiveTab(t.key)}
                whileTap={{ scale: 0.95 }}
              >
                {t.icon} {t.label}
              </motion.button>
            ))}
          </div>

          <div className={styles.tabContent}>
            <AnimatePresence mode="wait">
              {activeTab === 'reading' && (
                <motion.div key="reading" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className={styles.bookGrid}>
                  {activeBooks.length > 0 ? activeBooks.map(book => (
                    <motion.div key={book.id} layout whileHover={{ y: -5 }} className={`${styles.bookCard} glass-card`}>
                      <div className={styles.bookMain}>
                        {book.coverImage && (
                          <div className={styles.bookCover}>
                            <img src={book.coverImage} alt={book.title} />
                          </div>
                        )}
                        <div className={styles.bookDetails}>
                          <div className={styles.bookHeader}>
                            <div className={styles.bookMeta}><h3>{book.title}</h3><p>by {book.author}</p></div>
                            <div className={styles.bookActions}>
                              <button className={styles.notesBtn} onClick={() => setNotesPanel({ bookId: book.id, bookTitle: book.title })} title="Notes"><StickyNote size={13} /></button>
                              <button className={styles.deleteBtn} onClick={() => handleDeleteBook(book.id)}><Trash2 size={13} /></button>
                            </div>
                          </div>
                          <div className={styles.progressLabel}><span>{book.currentPage} / {book.totalPages} pages</span><span>{Math.min(100, Math.round((book.currentPage / book.totalPages) * 100))}%</span></div>
                          <div className={styles.miniProgress}><div className={styles.miniBar} style={{ width: `${Math.min(100, (book.currentPage / book.totalPages) * 100)}%` }} /></div>
                          {getEstDaysToFinish(book) !== null && getEstDaysToFinish(book)! > 0 && (
                            <div className={styles.estFinish}>
                              <Clock size={11} /> <span>Est. {getEstDaysToFinish(book)} days left</span>
                            </div>
                          )}
                          <div className={styles.logAction}>
                            <div className={styles.inputWrapper}>
                              <input type="number" placeholder="Pages" className="input-field" value={logPages[book.id] || ''} onChange={e => setLogPages(p => ({ ...p, [book.id]: e.target.value }))} />
                              <button className={styles.miniAddBtn} onClick={() => handleLogSession(book.id)}><PlusCircle size={16} /></button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )) : <div className={styles.empty}><BookOpen size={42} opacity={0.12} /><p>No books in progress.</p></div>}
                </motion.div>
              )}

              {activeTab === 'completed' && (
                <motion.div key="completed" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className={styles.bookGrid}>
                  {completedBooks.length > 0 ? completedBooks.map(book => (
                    <motion.div key={book.id} layout className={`${styles.bookCard} ${styles.completedCard} glass-card`}>
                      <div className={styles.bookHeader}>
                        <div className={styles.bookMeta}><h3>{book.title}</h3><p>by {book.author}</p></div>
                        <div className={styles.completedBadge}><CheckCircle size={18} /></div>
                      </div>
                      <p className={styles.completedInfo}>{book.totalPages} pages · ✅ Finished</p>
                      <div className={styles.starRow}>
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} size={16} className={s <= (book.rating ?? 0) ? styles.starFilled : styles.starEmpty} />
                        ))}
                        {!book.rating && (
                          <button className={styles.rateBtn} onClick={() => { setRatingModal({ bookId: book.id, bookTitle: book.title }); setPendingRating(0); setPendingReview('') }}>Rate it</button>
                        )}
                      </div>
                      {book.review && <p className={styles.reviewText}>&ldquo;{book.review}&rdquo;</p>}
                    </motion.div>
                  )) : <div className={styles.empty}><Trophy size={42} opacity={0.12} /><p>No books completed yet.</p></div>}
                </motion.div>
              )}

              {activeTab === 'activity' && (
                <motion.div key="activity" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className={styles.activityList}>
                  {sessions.length > 0 ? sessions.map((s, i) => (
                    <div key={s.id} className={`${styles.activityItem} glass-card`}>
                      <div className={styles.activityIcon}><BookOpen size={15} color="var(--primary)" /></div>
                      <div className={styles.activityInfo}>
                        <p className={styles.activityTitle}><strong>{s.pagesRead} pages</strong> in <em>{s.book?.title}</em></p>
                        <p className={styles.activityMeta}>{new Date(s.date).toLocaleDateString()}</p>
                      </div>
                      <div className={styles.activityXp}>+10 XP</div>
                    </div>
                  )) : <div className={styles.empty}><Clock size={42} opacity={0.12} /><p>No sessions logged yet.</p></div>}
                </motion.div>
              )}

              {activeTab === 'achievements' && (
                <motion.div key="achievements" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className={styles.achievementsFull}>
                  {Object.entries(ACHIEVEMENTS).map(([key, a]) => {
                    const done = unlockedTypes.has(key)
                    return (
                      <div key={key} className={`${styles.achCard} glass-card ${done ? styles.achCardUnlocked : ''}`}>
                        <div className={styles.achCardEmoji}>{a.emoji}</div>
                        <div><div className={styles.achCardLabel}>{a.label}</div><div className={styles.achCardDesc}>{a.desc}</div></div>
                        <div className={`${styles.achStatus} ${done ? styles.achStatusDone : ''}`}>{done ? <CheckCircle size={16} /> : <Shield size={16} />}</div>
                      </div>
                    )
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <aside className={`${styles.sideStats} ${styles.mobileCenterCard}`}>
          <ChallengePanel challenges={challenges} />

          {/* Discovery Sidebar */}
          <motion.section variants={cv} initial="hidden" animate="visible" className={`${styles.discovery} ${styles.mobileCenterCard}`}>
            <div className={styles.sectionHeader}><Sparkles size={17} color="var(--primary-glow)" /><h2>Discovery</h2></div>
            <div className={styles.categoryTabs}>
              {Object.keys(TOP_BOOKS).map(cat => (
                <button key={cat} className={`${styles.tab} ${activeCategory === cat ? styles.activeTab : ''}`} onClick={() => setActiveCategory(cat as Category)}>
                  {cat.charAt(0) + cat.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={activeCategory} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className={styles.discoveryList}>
                {TOP_BOOKS[activeCategory].map((book, idx) => (
                  <div key={idx} className={`${styles.discoveryCard} glass-card`}>
                    <div className={styles.cardHeader}>
                      <span className={styles.rank}>{idx + 1}</span>
                      <div className={styles.discoveryMeta}><h3>{book.title}</h3><p className={styles.author}>{book.author}</p></div>
                    </div>
                    <button className={styles.addSuggested} onClick={() => handleAddBook(null, { title: book.title, author: book.author, totalPages: '300' })}>
                      <Plus size={11} /> Add
                    </button>
                  </div>
                ))}
              </motion.div>
            </AnimatePresence>
          </motion.section>
        </aside>
      </section>

      {/* MODALS */}
      <AnimatePresence>
        {showAddBook && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={styles.modalOverlay}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className={`${styles.modal} glass-card`}>
              <div className={styles.modalHeader}><h2>New Book</h2><button onClick={() => { setShowAddBook(false); setSearchResults([]); setSearchQuery('') }} className={styles.closeBtn}><X size={17} /></button></div>

              <div className={styles.searchSection}>
                <div className={styles.searchBar}>
                  <Search size={16} className={styles.searchIcon} />
                  <input
                    placeholder="Search Google Books..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchBooks()}
                  />
                  <button onClick={handleSearchBooks} disabled={isSearching} className={styles.searchBtn}>
                    {isSearching ? '...' : 'Search'}
                  </button>
                </div>

                {searchResults.length > 0 ? (
                  <div className={styles.searchResults}>
                    {searchResults.map((book) => (
                      <div key={book.id} className={styles.searchResultItem} onClick={() => selectBookFromResult(book)}>
                        {book.coverImage && <img src={book.coverImage} alt={book.title} />}
                        <div>
                          <h6>{book.title}</h6>
                          <span>{book.author}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : searchQuery && !isSearching && (
                  <div className={styles.searchEmpty}>
                    <Search size={22} opacity={0.2} />
                    <p>No books found for &quot;{searchQuery}&quot;</p>
                  </div>
                )}
              </div>

              <form onSubmit={e => handleAddBook(e)}>
                <div className={styles.formSplit}>
                  {newBook.coverImage && (
                    <div className={styles.formCoverPreview}>
                      <img src={newBook.coverImage} alt="Cover" />
                    </div>
                  )}
                  <div className={styles.formFields}>
                    <div className={styles.formGroup}><label>Title</label><input className="input-field" value={newBook.title} onChange={e => setNewBook({ ...newBook, title: e.target.value })} required /></div>
                    <div className={styles.formGroup}><label>Author</label><input className="input-field" value={newBook.author} onChange={e => setNewBook({ ...newBook, author: e.target.value })} required /></div>
                    <div className={styles.formGroup}><label>Pages</label><input className="input-field" type="number" value={newBook.totalPages} onChange={e => setNewBook({ ...newBook, totalPages: e.target.value })} required /></div>
                  </div>
                </div>
                <div className={styles.modalActions}><button type="button" className={styles.cancelBtn} onClick={() => setShowAddBook(false)}>Cancel</button><button type="submit" className="btn-primary">Add Book</button></div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {showGoalModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={styles.modalOverlay}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className={`${styles.modal} glass-card`}>
              <div className={styles.modalHeader}><h2>Monthly Goal</h2><button onClick={() => setShowGoalModal(false)} className={styles.closeBtn}><X size={17} /></button></div>
              <form onSubmit={handleSetGoal}>
                <div className={styles.formGroup}><label>Page Target</label><input className="input-field" type="number" value={goalTarget} onChange={e => setGoalTarget(e.target.value)} required /></div>
                <div className={styles.modalActions}><button type="button" className={styles.cancelBtn} onClick={() => setShowGoalModal(false)}>Cancel</button><button type="submit" className="btn-primary">Save Goal</button></div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {showSettings && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={styles.modalOverlay}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className={`${styles.modal} glass-card`}>
              <div className={styles.modalHeader}><h2>⚙️ Settings</h2><button onClick={() => setShowSettings(false)} className={styles.closeBtn}><X size={17} /></button></div>

              <div className={styles.settingsSection}>
                <div className={styles.settingsSectionTitle}><Star size={14} /> Theme Gallery</div>
                <div className={styles.themeGrid}>
                  {[
                    { id: 'DARK_DEFAULT', label: 'Dark Default', class: styles.previewDefault },
                    { id: 'CYBERPUNK', label: 'Cyberpunk', class: styles.previewCyberpunk },
                    { id: 'OLD_LIBRARY', label: 'Old Library', class: styles.previewLibrary },
                    { id: 'ZEN', label: 'Zen Bamboo', class: styles.previewZen },
                    { id: 'LIGHT', label: 'Fresh Light', class: styles.previewLight },
                  ].map(t => (
                    <div key={t.id} className={`${styles.themeOpt} ${userStats.activeTheme === t.id ? styles.active : ''}`} onClick={() => handleThemeChange(t.id)}>
                      <div className={`${styles.themePreview} ${t.class}`} />
                      <span className={styles.themeLabel}>{t.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.settingsSection}>
                <div className={styles.settingsSectionTitle}><Bell size={14} /> Email Notifications</div>
                <form onSubmit={handleSaveEmail}>
                  <div className={styles.formGroup}><label>Email</label><input className="input-field" type="email" value={notifEmail} onChange={e => setNotifEmail(e.target.value)} /></div>
                  <div className={styles.modalActions}><button type="button" className={styles.cancelBtn} onClick={() => setShowSettings(false)}>Close</button><button type="submit" className="btn-primary" disabled={savingEmail}>{savingEmail ? 'Saving...' : 'Save'}</button></div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ReadingTimer books={books} onSessionLogged={fetchData} />
      
      {/* Mobile bottom nav safe-area spacer */}
      <div className={styles.mobileSpacer} />
      <BookNotes bookId={notesPanel?.bookId || ''} bookTitle={notesPanel?.bookTitle || ''} isOpen={!!notesPanel} onClose={() => setNotesPanel(null)} />

      {/* ===== RATING MODAL ===== */}
      <AnimatePresence>
        {ratingModal && (
          <motion.div className={styles.modalOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setRatingModal(null)}>
            <motion.div className={`${styles.modal} glass-card`} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3>Rate &ldquo;{ratingModal.bookTitle}&rdquo;</h3>
                <button onClick={() => setRatingModal(null)} className={styles.closeBtn}><X size={18} /></button>
              </div>
              <div className={styles.starPickerRow}>
                {[1, 2, 3, 4, 5].map(s => (
                  <button key={s} onClick={() => setPendingRating(s)} className={s <= pendingRating ? styles.starFilled : styles.starEmpty}>
                    <Star size={32} fill={s <= pendingRating ? 'currentColor' : 'none'} />
                  </button>
                ))}
              </div>
              <textarea
                className={styles.reviewInput}
                placeholder="Write a short review (optional)..."
                value={pendingReview}
                onChange={e => setPendingReview(e.target.value)}
                rows={3}
              />
              <div className={styles.modalActions}>
                <button className={styles.cancelBtn} onClick={() => setRatingModal(null)}>Cancel</button>
                <button className="btn-primary" onClick={handleSaveRating} disabled={pendingRating === 0}>Save Rating</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== ONBOARDING WIZARD ===== */}
      <AnimatePresence>
        {onboarding && (
          <motion.div className={styles.modalOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className={`${styles.modal} ${styles.onboardingModal} glass-card`} initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }}>
              {/* Progress dots */}
              <div className={styles.onboardingDots}>
                {[1, 2, 3].map(i => <div key={i} className={`${styles.onboardingDot} ${onboarding.step >= i ? styles.onboardingDotActive : ''}`} />)}
              </div>

              {onboarding.step === 1 && (
                <div className={styles.onboardingStep}>
                  <div className={styles.onboardingEmoji}>📚</div>
                  <h2>Welcome to ReaderVerse!</h2>
                  <p>Your personal reading sanctuary. Track pages, earn XP, build streaks — and level up as a reader.</p>
                  <ul className={styles.onboardingFeatures}>
                    <li><Zap size={14} color="var(--warning)" /> Earn XP for every page you read</li>
                    <li><Flame size={14} color="#f97316" /> Build daily reading streaks</li>
                    <li><Trophy size={14} color="var(--primary-glow)" /> Unlock achievements &amp; level up</li>
                    <li><Brain size={14} color="var(--secondary)" /> Chat with your AI reading buddy</li>
                  </ul>
                  <button className="btn-primary" onClick={() => dismissOnboarding(2)}>Get Started <ArrowRight size={15} /></button>
                </div>
              )}

              {onboarding.step === 2 && (
                <div className={styles.onboardingStep}>
                  <div className={styles.onboardingEmoji}>➕</div>
                  <h2>Add Your First Book</h2>
                  <p>Start building your library. You can search by title or add any book manually.</p>
                  <div className={styles.modalActions} style={{ flexDirection: 'column', gap: '0.75rem' }}>
                    <button className="btn-primary" onClick={() => { dismissOnboarding(); setShowAddBook(true) }}>Add a Book Now <ArrowRight size={15} /></button>
                    <button className={styles.cancelBtn} onClick={() => dismissOnboarding(3)}>Skip for now</button>
                  </div>
                </div>
              )}

              {onboarding.step === 3 && (
                <div className={styles.onboardingStep}>
                  <div className={styles.onboardingEmoji}>🎯</div>
                  <h2>Set a Monthly Goal</h2>
                  <p>Goals keep you consistent. Set a monthly page target and track your progress.</p>
                  <div className={styles.modalActions} style={{ flexDirection: 'column', gap: '0.75rem' }}>
                    <button className="btn-primary" onClick={() => { dismissOnboarding(); setShowGoalModal(true) }}>Set My Goal <ArrowRight size={15} /></button>
                    <button className={styles.cancelBtn} onClick={() => dismissOnboarding()}>Maybe Later</button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== MOBILE BOTTOM NAVIGATION ===== */}
      <nav className={styles.mobileNavBar}>
        {([
          { key: 'home',     icon: <Home size={22} />,     label: 'Home' },
          { key: 'library',  icon: <BookOpen size={22} />, label: 'Library' },
          { key: 'activity', icon: <Activity size={22} />, label: 'Activity' },
          { key: 'discover', icon: <Compass size={22} />,  label: 'Discover' },
        ] as const).map(tab => (
          <button
            key={tab.key}
            className={`${styles.mobileNavTab} ${mobileView === tab.key ? styles.mobileNavTabActive : ''}`}
            onClick={() => setMobileView(tab.key)}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

    </main>
  )
}

