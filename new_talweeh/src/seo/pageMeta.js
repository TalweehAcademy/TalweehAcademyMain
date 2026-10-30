// Page titles, descriptions and preview images, shared by the browser (hooks/useDocumentMeta.js) and the build
// (scripts/prerender-meta.mjs, which writes each page's own HTML head so link previews on WhatsApp, Facebook, X and
// LinkedIn, which never run JavaScript, show that page instead of the home page). Plain data only: no React here.
// A static page's entry must say what the page itself passes to useDocumentMeta, or the preview and the tab differ.

// Same origin scripts/generate-sitemap.mjs writes into sitemap.xml.
export const SITE_ORIGIN = 'https://talweehacademy.com'
export const SITE_NAME = 'Talweeh Academy'
export const DEFAULT_DESCRIPTION =
  'At Talweeh Academy, our mission is to elevate academic awareness across all levels, offering comprehensive programs tailored for laypersons, students, and scholars.'
export const DEFAULT_IMAGE = `${SITE_ORIGIN}/brand/talweeh-og.jpg`

const ARABIC = 'Don’t just recite the Qur’an — understand it. A two-year Arabic program through the classical texts of Naḥw, Ṣarf, Adab and the Qur’anic sciences.'

// Static routes. Detail routes (a course, an article, a video, an instructor) take theirs from their data.
export const ROUTE_META = {
  '/': { title: 'The Gateway to Islamic Scholarship - Talweeh Academy', description: DEFAULT_DESCRIPTION },
  '/courses': { title: 'Courses', description: 'Browse the full Talweeh Academy course library, from foundational Arabic and fiqh to advanced hadith sciences.' },
  '/courses/roadmap': { title: 'Study roadmap', description: 'For each Islamic science, the texts to study level by level — and which of them Talweeh teaches.' },
  '/faq': { title: 'Frequently Asked Questions', description: 'Answers about Talweeh courses and programmes, free courses, the Student Portal, prices, access, refunds and live classes.' },
  '/start': { title: 'Find your starting point', description: 'Not sure where to begin? Four short questions, then the Talweeh course or programme to start with, and where it leads.' },
  '/media': { title: 'Media', description: 'Lectures, lesson excerpts and discussions from Talweeh Academy instructors.' },
  '/articles': { title: 'Articles', description: 'Written pieces from Talweeh Academy on the Islamic sciences and the life of a student of knowledge.' },
  '/instructors': { title: 'Our Instructors', description: 'Qualified scholars holding ijāzāt, teaching with clarity, depth and relevance.' },
  '/about-us': { title: 'About Talweeh Academy', description: 'An institution dedicated to reviving Islamic academia in the West.' },
  '/contact-us': { title: 'Contact Us', description: 'Reach Talweeh Academy on Telegram or by email.' },
  '/quran': { title: "Qur'an Reader", description: "Read the Qur'an with translation, word-by-word analysis and recitation from a range of reciters." },
  '/quran/read': { title: "Read the Qur'an", description: 'Read the Qurʾān as you would from the muṣḥaf, with translation alongside.' },
  '/quran/study': { title: "Study the Qur'an", description: 'Study the Qurʾān āyah by āyah with word-by-word analysis and notes from Talweeh Academy.' },
  '/quran/listen': { title: "Listen to the Qur'an", description: 'Listen to the Qurʾān from a range of reciters, sūrah by sūrah.' },
  '/alimiyyah': { title: 'ʿĀlimiyyah Seminary', description: 'A comprehensive, structured path through traditional Islamic education—designed for students balancing work, family, and the pursuit of sacred knowledge.' },
  '/hadith-specialization': { title: 'Hadith Specialization', description: 'A comprehensive two-year program for students seeking an in-depth understanding of the sciences of Hadith.' },
  '/hadith-specialization/learning': { title: 'My Learning · Hadith Specialization', description: 'The Hadith Specialization year by year and month by month.' },
  '/hadith-specialization/enroll': { title: 'Enroll · Hadith Specialization', description: 'Pay in full or in monthly installments. Your lessons open in the Student Portal as soon as payment is confirmed.' },
  '/arabic': { title: 'Talweeh Arabic · 2-Year Program', description: ARABIC },
  '/arabic/program': { title: 'Arabic Programme Curriculum', description: 'Module-by-module curriculum for the Talweeh Academy two-year Arabic programme.' },
  '/arabic/learning': { title: 'My Learning · Two-Year Arabic Program', description: 'The whole Two-Year Arabic Program, module by module and month by month.' },
  '/arabic/enroll': { title: 'Enroll · Two-Year Arabic Program', description: 'Choose how you would like to pay. Your lessons, quizzes, notes and progress open in the Student Portal as soon as payment is confirmed.' },
  '/arabic/faq': { title: 'Arabic Programme FAQ', description: 'Common questions about the Talweeh Academy Arabic programme: entry level, pacing, workload and assessment.' },
  '/arabic/assessment': { title: 'Arabic Assessment · Where should you start?', description: 'A free, question-by-question check of your Arabic, from recognising an ism to the iʿrāb and balāghah of Sūrat al-Takwīr. It tells you which module of the Two-Year Arabic Program to start with.' },
  '/arabic/about': { title: 'About the Arabic Programme', description: 'The approach, teaching method and goals behind the Talweeh Academy Arabic programme.' },
  '/p/terms-conditions': { title: 'Terms & Conditions', description: 'How access to and use of Talweeh Academy’s courses, services and content is governed.' },
  '/p/refund-policy': { title: 'Refund Policy', description: 'How refunds and cancelling a subscription work at Talweeh Academy: written requests, 5–10 business days to the original payment method, and cancelling from the Student Portal.' },
  '/p/privacy-policy': { title: 'Privacy Policy', description: 'How Talweeh Academy collects, uses, stores and protects personal information, in line with PIPEDA.' },
  '/cart': { title: 'Your study list', noindex: true },
  '/checkout': { title: 'Secure checkout', noindex: true },
}

/** "Title | Talweeh Academy", unless the title already names the site. */
export const fullTitle = (title) => {
  const t = String(title || SITE_NAME)
  return t.includes(SITE_NAME) ? t : `${t} | ${SITE_NAME}`
}

/** A description for a preview card: plain text, one paragraph, cut at a word near 200 characters. */
export function plainDescription(value, max = 200) {
  const text = String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&rsquo;/g, '’')
    .replace(/[*_#>`]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  return `${cut.slice(0, cut.lastIndexOf(' ') > 120 ? cut.lastIndexOf(' ') : max).replace(/[,;:.\s—-]+$/, '')}…`
}

/** Absolute URL for a page image stored as a site-relative path. */
export function absoluteUrl(value) {
  if (!value) return ''
  return /^https?:\/\//i.test(value) ? value : `${SITE_ORIGIN}${value.startsWith('/') ? '' : '/'}${value}`
}
