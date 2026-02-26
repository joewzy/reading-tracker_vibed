// XP and Achievement Logic — server-side utility
import prisma from './prisma'

export const XP_REWARDS = {
    SESSION_LOGGED: 10,
    FIFTY_PAGES: 25,      // bonus for 50+ pages in one session
    BOOK_COMPLETED: 100,
    STREAK_3: 50,
    STREAK_7: 150,
}

export const LEVEL_NAMES = ['Apprentice', 'Scholar', 'Sage', 'Luminary', 'Oracle', 'Legend']
export const XP_PER_LEVEL = 200

export function getLevelInfo(xp: number) {
    const level = Math.floor(xp / XP_PER_LEVEL) + 1
    const currentLevelXp = xp % XP_PER_LEVEL
    const progress = (currentLevelXp / XP_PER_LEVEL) * 100
    const name = LEVEL_NAMES[Math.min(level - 1, LEVEL_NAMES.length - 1)]
    return { level, currentLevelXp, progress, name }
}

export const ACHIEVEMENTS = {
    FIRST_PAGE: { label: 'First Page', emoji: '📖', desc: 'Log your first reading session' },
    ON_FIRE: { label: 'On Fire', emoji: '🔥', desc: 'Maintain a 3-day streak' },
    WEEK_WARRIOR: { label: 'Week Warrior', emoji: '🏆', desc: 'Maintain a 7-day streak' },
    BOOKWORM: { label: 'Bookworm', emoji: '📚', desc: 'Complete your first book' },
    CENTURY: { label: 'Century', emoji: '🌟', desc: 'Log 100+ pages in one session' },
    SCHOLAR: { label: 'Scholar', emoji: '🎓', desc: 'Reach Level 5' },
}

export async function awardXpAndCheckAchievements(
    userId: string,
    xpGained: number,
    context: {
        pagesRead?: number,
        bookCompleted?: boolean,
        streak?: number,
        sessionCount?: number,
    }
) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { achievements: true },
    })
    if (!user) return { newXp: 0, newLevel: 1, newAchievements: [] }

    const existingTypes = new Set(user.achievements.map((a: any) => a.type))
    const toUnlock: string[] = []
    let bonusXp = xpGained

    // Bonus XP conditions
    if ((context.pagesRead ?? 0) >= 50) bonusXp += XP_REWARDS.FIFTY_PAGES
    if (context.bookCompleted) bonusXp += XP_REWARDS.BOOK_COMPLETED

    // Achievement checks
    if (!existingTypes.has('FIRST_PAGE') && (context.sessionCount ?? 0) >= 1) toUnlock.push('FIRST_PAGE')
    if (!existingTypes.has('ON_FIRE') && (context.streak ?? 0) >= 3) toUnlock.push('ON_FIRE')
    if (!existingTypes.has('WEEK_WARRIOR') && (context.streak ?? 0) >= 7) toUnlock.push('WEEK_WARRIOR')
    if (!existingTypes.has('BOOKWORM') && context.bookCompleted) toUnlock.push('BOOKWORM')
    if (!existingTypes.has('CENTURY') && (context.pagesRead ?? 0) >= 100) toUnlock.push('CENTURY')

    const newXp = user.xp + bonusXp
    const { level: newLevel } = getLevelInfo(newXp)

    if (!existingTypes.has('SCHOLAR') && newLevel >= 5) toUnlock.push('SCHOLAR')

    // Persist
    await prisma.user.update({
        where: { id: userId },
        data: { xp: newXp, level: newLevel },
    })

    if (toUnlock.length > 0) {
        await prisma.achievement.createMany({
            data: toUnlock.map(type => ({ type, userId })),
        })
    }

    return { newXp, newLevel, newAchievements: toUnlock }
}

export async function updateChallengeProgress(userId: string, context: { pagesRead?: number, streak?: number }) {
    const now = new Date()
    const activeUserChallenges = await prisma.userChallenge.findMany({
        where: {
            userId,
            completed: false,
            challenge: {
                startDate: { lte: now },
                endDate: { gte: now },
            }
        },
        include: { challenge: true }
    })

    const notifications: string[] = []

    for (const uc of activeUserChallenges as any[]) {
        let increment = 0
        if (uc.challenge.type === 'TOTAL_PAGES' && context.pagesRead) {
            increment = context.pagesRead
        } else if (uc.challenge.type === 'PAGES_DAILY' && context.pagesRead) {
            increment = context.pagesRead
        } else if (uc.challenge.type === 'STREAK' && context.streak !== undefined) {
            if (context.streak > uc.current) {
                increment = context.streak - uc.current
            }
        }

        if (increment > 0) {
            const newCurrent = uc.current + increment
            const isCompleted = newCurrent >= uc.challenge.target

            await prisma.userChallenge.update({
                where: { id: uc.id },
                data: {
                    current: newCurrent,
                    completed: isCompleted,
                    ...(isCompleted && { unlockedAt: now })
                }
            })

            if (isCompleted) {
                await (prisma as any).user.update({
                    where: { id: userId },
                    data: { xp: { increment: uc.challenge.xpReward } }
                })
                notifications.push(`Challenge Completed: ${uc.challenge.title}! +${uc.challenge.xpReward} XP`)
            }
        }
    }

    // Assign new challenges if not already tracked
    const allActive = await prisma.challenge.findMany({
        where: { startDate: { lte: now }, endDate: { gte: now } }
    })

    for (const challenge of allActive as any[]) {
        const tracked = await prisma.userChallenge.findUnique({
            where: { userId_challengeId: { userId, challengeId: challenge.id } }
        })
        if (!tracked) {
            await prisma.userChallenge.create({
                data: { userId, challengeId: challenge.id }
            })
        }
    }

    return notifications
}
