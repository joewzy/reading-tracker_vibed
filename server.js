/* eslint-disable @typescript-eslint/no-require-imports */
// Custom server with node-cron for scheduled email notifications
// Run with: node server.js

const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const cron = require('node-cron')

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'

async function triggerNotification(type) {
    try {
        const res = await fetch(`${BASE_URL}/api/cron/notify?type=${type}`, { method: 'POST' })
        const data = await res.json()
        console.log(`[CRON] ${type} notifications sent:`, data.sent, 'emails')
        if (data.results) data.results.forEach(r => console.log(' ', r))
    } catch (err) {
        console.error(`[CRON] Failed to send ${type} notifications:`, err.message)
    }
}

app.prepare().then(() => {
    createServer((req, res) => {
        const parsedUrl = parse(req.url, true)
        handle(req, res, parsedUrl)
    }).listen(3000, (err) => {
        if (err) throw err
        console.log('> ReaderVerse ready on http://localhost:3000')
        console.log('> Email notifications: 6:00 AM (morning) | 6:00 PM (evening)')

        // 6:00 AM every day — Morning reminder
        cron.schedule('0 6 * * *', () => {
            console.log('[CRON] Triggering morning emails...')
            triggerNotification('morning')
        }, { timezone: 'Africa/Lagos' }) // WAT — adjust as needed

        // 6:00 PM every day — Evening check-in
        cron.schedule('0 18 * * *', () => {
            console.log('[CRON] Triggering evening emails...')
            triggerNotification('evening')
        }, { timezone: 'Africa/Lagos' })

        console.log('[CRON] Schedulers running.')
    })
})
