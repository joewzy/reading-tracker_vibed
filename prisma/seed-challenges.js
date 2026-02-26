const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const challenges = [
        {
            title: 'Weekend Warrior',
            description: 'Read 100 pages over the weekend!',
            type: 'TOTAL_PAGES',
            target: 100,
            xpReward: 150,
            startDate: new Date('2026-02-21T00:00:00Z'), // Saturday
            endDate: new Date('2026-02-22T23:59:59Z'),   // Sunday
        },
        {
            title: 'Consistency King',
            description: 'Maintain a 7-day reading streak!',
            type: 'STREAK',
            target: 7,
            xpReward: 300,
            startDate: new Date('2026-02-20T00:00:00Z'),
            endDate: new Date('2026-03-20T23:59:59Z'),
        },
        {
            title: 'Deep Diver',
            description: 'Read 50 pages today!',
            type: 'PAGES_DAILY',
            target: 50,
            xpReward: 75,
            startDate: new Date('2026-02-20T00:00:00Z'),
            endDate: new Date('2026-02-20T23:59:59Z'),
        }
    ]

    for (const c of challenges) {
        await prisma.challenge.upsert({
            where: { id: c.title.replace(/\s+/g, '-').toLowerCase() }, // Dummy static ID for seeding
            update: c,
            create: { ...c, id: c.title.replace(/\s+/g, '-').toLowerCase() },
        })
    }

    console.log('Challenges seeded successfully')
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
