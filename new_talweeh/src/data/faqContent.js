// Questions for /faq (pages/faq-waha.jsx), from the owner's FAQ draft (Claude Docs, 2026-10-29). Answers are trusted
// static HTML (links, bold, lists, small tables), shown inside the page's accordion. Prices match the live catalogue
// on that date; access periods are the owner's (On-Demand at least 1 year, two-year programmes at least 2 years).
export const FAQ_SECTIONS = [
  {
    k: 'start',
    title: 'Getting started',
    items: [
      { q: 'What is Talweeh Academy?', a: '<p>An online institution dedicated to reviving Islamic academia in the West. We teach the traditional sciences (Arabic, Qurʾān, Ḥadīth, Fiqh, ʿAqīdah, Uṣūl and more) through structured courses and programmes taught by qualified scholars holding ijāzāt.</p>' },
      { q: 'Who is it for?', a: '<p>Anyone serious about learning: complete beginners, students who have studied a little, and advanced students close to graduating from a seminary. For graduates, the <a href="/hadith-specialization">Ḥadīth Specialization</a> takes your studies further. Courses are taught in English, with the classical texts read in Arabic.</p>' },
      { q: 'I don’t know where to begin. Where should I start?', a: '<ul><li><strong>Want live classes?</strong> Join the <a href="/alimiyyah">ʿĀlimiyyah</a>.</li><li><strong>Starting with Arabic?</strong> Join the <a href="/arabic">Arabic Program</a>.</li><li><strong>Want a specific subject?</strong> Browse the <a href="/courses">On-Demand courses</a>.</li></ul><p>Still unsure? The <a href="/start">Start guide</a> asks a few questions (your goal, your level, live or self-paced) and suggests where to begin, and the <a href="/courses/roadmap">Roadmap</a> shows how every course fits together, in order.</p>' },
      { q: 'Do I need to know Arabic?', a: '<p>If you don’t know Arabic yet, start with the <a href="/arabic">Arabic Program</a>. All it asks is that you can read the Arabic script (letters with vowel marks). Many sciences are taught from intermediate level, so Arabic comes first for most students.</p>' },
      { q: 'Do I need to create an account to look around?', a: '<p>No. You can browse every course, and watch the free courses and the free preview lessons, without an account. An account in the Student Portal is made for you when you enrol in a paid course or programme.</p>' },
    ],
  },
  {
    k: 'courses',
    title: 'Courses and programmes',
    items: [
      { q: 'What’s the difference between a course and a programme?', a: '<p>A course covers one text or subject, recorded, and you study at your own pace. A programme is a longer, structured path through many courses.</p><div class="fq-table" tabindex="0"><table><thead><tr><th></th><th>Format</th><th>Length</th><th>How to join</th></tr></thead><tbody><tr><th>On-Demand courses</th><td>Recorded lessons, start any time</td><td>One text or subject</td><td><a href="/courses">Enrol on the course page</a></td></tr><tr><th>Two-Year Arabic Program</th><td>Recorded, five modules, at your own pace</td><td>About two years</td><td><a href="/arabic/enroll">Enrol</a></td></tr><tr><th>Ḥadīth Specialization</th><td>Recorded courses in the Ḥadīth sciences</td><td>Two years</td><td><a href="/hadith-specialization/enroll">Enrol</a></td></tr><tr><th>ʿĀlimiyyah (seminary)</th><td>Live classes with instructors, marked and graded (not recorded)</td><td>Ten-year curriculum</td><td><a href="/alimiyyah">Apply</a></td></tr></tbody></table></div>' },
      { q: 'What subjects do you teach?', a: '<p>Fiqh, Uṣūl al-Fiqh, ʿAqīdah, Ḥadīth and the Ḥadīth sciences, Tafsīr, Tajwīd, Arabic grammar and morphology (Naḥw and Ṣarf), and poetry and adab. The <a href="/courses">Courses</a> page lists every course.</p>' },
      { q: 'Who teaches the courses?', a: '<p>Sh. Omer Khurshid, Mufti Mohammad Daud Khurshid, Sh. Hamza Aktas and Sheikh Farhan Ingar, among others. Each course page names its instructor, and the <a href="/instructors">Instructors</a> page has their biographies and ijāzāt.</p>' },
      { q: 'Can I take a single course from a programme on its own?', a: '<p>Some of them, yes. Several Arabic and Ḥadīth courses are also provided as standalone courses; the programme pages mark which ones (“Also a standalone course”).</p>' },
      { q: 'When does a course or programme start?', a: '<p>On-Demand courses, the Arabic Program and the Ḥadīth Specialization start whenever you enrol. To join the ʿĀlimiyyah seminary, apply on the <a href="/alimiyyah">ʿĀlimiyyah</a> page.</p>' },
      { q: 'Is there a placement test for Arabic?', a: '<p>Yes. The free <a href="/arabic/assessment">Arabic assessment</a> shows which level to start from.</p>' },
    ],
  },
  {
    k: 'free',
    title: 'Free courses and free previews',
    items: [
      { q: 'Do you have free courses?', a: '<p>Yes. Several courses are completely free, and every lesson plays right on the website. Find them on the <a href="/courses?free=1">Courses</a> page with the Free filter.</p>' },
      { q: 'Do I need to sign in for free courses?', a: '<p>No. Free courses need no account and no sign-in. The Student Portal is only for paid courses and programmes.</p>' },
      { q: 'Can I try a paid course before I buy it?', a: '<p>Many paid courses have one or more free preview lessons. Look for “▶ free” on the course card, or “Free preview” beside a lesson on the course page. The lesson’s written overview and quiz open after you enrol.</p>' },
      { q: 'Are your lectures on YouTube too?', a: '<p>Yes, many of them. Our <a href="https://www.youtube.com/@Talweeh.Academy" target="_blank" rel="noreferrer">YouTube channel</a> has lectures, shorts and free series, and the <a href="/media">Media</a> page collects them by topic.</p>' },
    ],
  },
  {
    k: 'portal',
    title: 'Enrolling and the Student Portal',
    items: [
      { q: 'How do I enrol?', a: '<p>Open the course or programme page, choose how to pay and check out. Your lessons, quizzes, notes and progress open in the Student Portal as soon as payment is confirmed. You’ll get an email to set your password the first time.</p>' },
      { q: 'What’s in the Student Portal?', a: '<p>Your enrolled courses and programmes, every recorded lesson with its written overview (summary, key terms and notes), quizzes, your live-class schedule, attendance and grades, and your payments.</p>' },
      { q: 'How do I sign in?', a: '<p>Tap <strong>Sign in</strong> at the top of the website, then <strong>Sign in →</strong>. Forgot your password? Use <strong>Forgot password</strong> in the same box.</p>' },
      { q: 'I studied with you on the old website. How do I get in?', a: '<p>Every student has been sent an email with instructions for signing in to the new portal. Didn’t get it? Tap <strong>Sign in</strong> at the top of the website, enter the email you studied with, and we’ll send it again. Check your spam folder too.</p>' },
      { q: 'Can I study on my phone?', a: '<p>Yes. The website and the Student Portal both work on phones, tablets and computers.</p>' },
    ],
  },
  {
    k: 'payments',
    title: 'Payments, subscriptions and refunds',
    items: [
      { q: 'How much do courses cost?', a: '<p>Paid On-Demand courses are a one-time payment, from $25 to $350 USD depending on the course. The price is on each course card.</p>' },
      { q: 'How much do the programmes cost?', a: '<div class="fq-table" tabindex="0"><table><thead><tr><th>Programme</th><th>Pay in full</th><th>Other options</th></tr></thead><tbody><tr><th>Two-Year Arabic Program</th><td>$1,599 USD</td><td>$99 USD a month</td></tr><tr><th>Ḥadīth Specialization</th><td>$2,999 USD</td><td>Year 1 only $1,500 USD, or $150 USD a month</td></tr></tbody></table></div><p>For the ʿĀlimiyyah seminary, see the <a href="/alimiyyah">ʿĀlimiyyah</a> page or email <span class="fq-mail">info@talweehacademy.com</span>.</p>' },
      { q: 'How long do I keep access to the recordings?', a: '<ul><li><strong>On-Demand courses:</strong> at least 1 year from the day you enrol. After that, Talweeh Academy is not obliged to keep providing the course, but it stays available to you for as long as we keep it.</li><li><strong>Two-year programmes (Arabic Program, Ḥadīth Specialization):</strong> at least 2 years after your payment is complete, and after that for as long as we keep the content.</li><li><strong>Monthly plans:</strong> access lasts while your subscription is active.</li></ul>' },
      { q: 'What currency do you charge in, and how do I pay?', a: '<p>All prices are in US dollars. You pay by card at checkout.</p>' },
      { q: 'Do you offer scholarships or discounts?', a: '<p>Talweeh Academy may offer scholarships, discounts or financial help at its discretion. Email <span class="fq-mail">info@talweehacademy.com</span> to ask.</p>' },
      { q: 'How do I cancel a monthly subscription?', a: '<p>Any time, from <strong>Billing</strong> in the Student Portal. No further payments are taken, and your access continues until the end of the period you’ve paid for.</p>' },
      { q: 'Can I get a refund?', a: '<p>Email your request to <span class="fq-mail">info@talweehacademy.com</span> with your name, the email you enrolled with, the course and your reason. Refunds are given when Talweeh Academy approves the reason, and go back to your original payment method within 5–10 business days. If we cancel a course before it begins, you get a full refund. See the <a href="/p/refund-policy">Refund Policy</a>.</p>' },
    ],
  },
  {
    k: 'live',
    title: 'Live classes, schedules and time zones',
    items: [
      { q: 'Live or on demand: which should I choose?', a: '<p>Live classes are always the better, ideal way to study: you learn with a teacher and a class, and your work is marked and graded. Live classes are not recorded, so you need to attend them. On-Demand study is always available: recorded lessons you can start any time and watch at your own pace.</p>' },
      { q: 'Which studies have live classes?', a: '<p>The ʿĀlimiyyah seminary is taught in live classes with instructors. On-Demand courses, the Arabic Program and the Ḥadīth Specialization are recorded.</p>' },
      { q: 'What time are live classes? I’m not in Canada.', a: '<p>The academy runs on Toronto time (Eastern). Your schedule in the Student Portal is shown in your own time zone, which you can set in your settings.</p>' },
      { q: 'How do I join a live class?', a: '<p>From your schedule in the Student Portal, where each class has its join link.</p>' },
      { q: 'What if I miss a live class?', a: '<p>Live classes are not recorded, so please attend each one. Attendance is recorded for every class, and your assignments and tests are marked and graded.</p>' },
    ],
  },
  {
    k: 'help',
    title: 'Help and contact',
    items: [
      { q: 'How do I contact you?', a: '<p>Email <span class="fq-mail">info@talweehacademy.com</span>.</p>' },
      { q: 'A video won’t play or something on the site isn’t working.', a: '<p>Refresh the page and check your connection first. If it still doesn’t work, email us with the page address, your device and browser, and a screenshot if you can.</p>' },
      { q: 'How do you use my personal information?', a: '<p>Only to run your studies and payments, in line with Canadian privacy law (PIPEDA). The <a href="/p/privacy-policy">Privacy Policy</a> explains what we collect and why.</p>' },
      { q: 'Can I share the course videos or notes?', a: '<p>No. Course materials are for your own study and are protected by copyright; see the <a href="/p/terms-conditions">Terms &amp; Conditions</a>. Free courses and our YouTube lectures can be shared freely by link.</p>' },
    ],
  },
]
