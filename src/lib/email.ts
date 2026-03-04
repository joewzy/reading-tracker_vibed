import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

const APP_URL = process.env.NEXTAUTH_URL || 'https://readerverse.vercel.app'

function getMorningHtml(name: string, streak: number, booksCount: number) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    body { margin:0; padding:0; background:#020617; font-family: 'Segoe UI', Arial, sans-serif; color:#e2e8f0; }
    .container { max-width:580px; margin:0 auto; padding:40px 20px; }
    .header { text-align:center; padding:40px 0 30px; }
    .logo { font-size:2.5rem; font-weight:900; background:linear-gradient(135deg,#8b5cf6,#a78bfa); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
    .card { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:32px; margin:20px 0; }
    .stat { display:inline-block; text-align:center; padding:16px 24px; background:rgba(139,92,246,0.1); border-radius:12px; margin:8px; }
    .stat-val { font-size:2rem; font-weight:800; color:#a78bfa; display:block; }
    .stat-lbl { font-size:0.78rem; color:#94a3b8; text-transform:uppercase; letter-spacing:1px; margin-top:4px; display:block; }
    .cta { display:block; text-align:center; margin:30px auto; padding:16px 40px; background:linear-gradient(135deg,#7c3aed,#8b5cf6); color:white; border-radius:100px; text-decoration:none; font-weight:700; font-size:1rem; width:fit-content; }
    .footer { text-align:center; color:#475569; font-size:0.78rem; margin-top:40px; }
    h2 { color:#f1f5f9; }
    p { color:#94a3b8; line-height:1.7; }
  </style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="logo">📚 ReaderVerse</div>
    <p style="color:#64748b;margin-top:8px;">Your Morning Reading Brief</p>
  </div>
  <div class="card">
    <h2>Good morning, ${name}! ☀️</h2>
    <p>A new day, a new chapter awaits. The best readers make it a habit. Let's keep your momentum going!</p>
    <div style="text-align:center;margin:24px 0;">
      <div class="stat"><span class="stat-val">🔥 ${streak}</span><span class="stat-lbl">Day Streak</span></div>
      <div class="stat"><span class="stat-val">📚 ${booksCount}</span><span class="stat-lbl">Books in Library</span></div>
    </div>
    <p style="text-align:center"><em>"A reader lives a thousand lives before he dies."</em> — George R.R. Martin</p>
  </div>
  <a href="${APP_URL}" class="cta">Open My Reading Sanctuary →</a>
  <div class="footer">ReaderVerse · You're receiving this because you enabled reading reminders.<br/>
    <a href="${APP_URL}" style="color:#7c3aed;">Manage notification settings</a>
  </div>
</div>
</body>
</html>`
}

function getEveningHtml(name: string, streak: number, pagesThisMonth: number) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    body { margin:0; padding:0; background:#020617; font-family: 'Segoe UI', Arial, sans-serif; color:#e2e8f0; }
    .container { max-width:580px; margin:0 auto; padding:40px 20px; }
    .header { text-align:center; padding:40px 0 30px; }
    .logo { font-size:2.5rem; font-weight:900; background:linear-gradient(135deg,#8b5cf6,#a78bfa); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
    .card { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:32px; margin:20px 0; }
    .stat { display:inline-block; text-align:center; padding:16px 24px; background:rgba(16,185,129,0.1); border-radius:12px; margin:8px; }
    .stat-val { font-size:2rem; font-weight:800; color:#34d399; display:block; }
    .stat-lbl { font-size:0.78rem; color:#94a3b8; text-transform:uppercase; letter-spacing:1px; margin-top:4px; display:block; }
    .cta { display:block; text-align:center; margin:30px auto; padding:16px 40px; background:linear-gradient(135deg,#059669,#10b981); color:white; border-radius:100px; text-decoration:none; font-weight:700; font-size:1rem; width:fit-content; }
    .footer { text-align:center; color:#475569; font-size:0.78rem; margin-top:40px; }
    h2 { color:#f1f5f9; }
    p { color:#94a3b8; line-height:1.7; }
  </style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="logo">📚 ReaderVerse</div>
    <p style="color:#64748b;margin-top:8px;">Your Evening Reading Check-in</p>
  </div>
  <div class="card">
    <h2>Good evening, ${name}! 🌆</h2>
    <p>The day is winding down — the perfect time to curl up with a good book. Even 20 pages before bed makes a difference!</p>
    <div style="text-align:center;margin:24px 0;">
      <div class="stat"><span class="stat-val">🔥 ${streak}</span><span class="stat-lbl">Day Streak</span></div>
      <div class="stat"><span class="stat-val">📄 ${pagesThisMonth}</span><span class="stat-lbl">Pages This Month</span></div>
    </div>
    ${streak === 0 ? `<p style="text-align:center;color:#f97316">⚠️ Don't break your streak! Log at least a few pages tonight.</p>` : `<p style="text-align:center;color:#34d399">✅ You're on a roll! Keep it going.</p>`}
  </div>
  <a href="${APP_URL}" class="cta">Log Tonight's Reading →</a>
  <div class="footer">ReaderVerse · You're receiving this because you enabled reading reminders.<br/>
    <a href="${APP_URL}" style="color:#7c3aed;">Manage notification settings</a>
  </div>
</div>
</body>
</html>`
}

export async function sendMorningEmail(to: string, name: string, streak: number, booksCount: number) {
  await transporter.sendMail({
    from: `"ReaderVerse 📚" <${process.env.EMAIL_USER}>`,
    to,
    subject: `☀️ Good Morning, ${name}! Your reading day starts now.`,
    html: getMorningHtml(name, streak, booksCount),
  })
}

export async function sendEveningEmail(to: string, name: string, streak: number, pagesThisMonth: number) {
  await transporter.sendMail({
    from: `"ReaderVerse 📚" <${process.env.EMAIL_USER}>`,
    to,
    subject: `🌆 Evening Check-in — Did you read today, ${name}?`,
    html: getEveningHtml(name, streak, pagesThisMonth),
  })
}
