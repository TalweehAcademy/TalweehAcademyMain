import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import '../core-pages-refinement-v1.css'

function pageMode(pathname) {
  if (pathname === '/about-us') return 'about'
  if (pathname === '/instructors') return 'instructors'
  if (pathname.startsWith('/instructors/')) return 'instructor-detail'
  if (pathname === '/contact-us') return 'contact'
  if (pathname === '/p/terms-conditions') return 'terms'
  return null
}

function meaningfulText(node) {
  return String(node?.textContent || '').replace(/\s+/g, ' ').trim()
}

function hideBrokenImage(img) {
  if (!img || img.dataset.talweehImageChecked === '1') return
  img.dataset.talweehImageChecked = '1'

  const remove = () => {
    img.classList.add('talweeh-broken-image')

    const parent = img.parentElement
    if (!parent) return

    const parentText = meaningfulText(parent)
    const usefulChildren = Array.from(parent.children).filter(
      (child) =>
        child !== img &&
        !child.classList.contains('talweeh-broken-image') &&
        meaningfulText(child),
    )

    if (!parentText && usefulChildren.length === 0) {
      parent.classList.add('talweeh-broken-media-wrapper')
    }
  }

  const src = img.getAttribute('src')
  if (!src || !src.trim()) {
    remove()
    return
  }

  img.addEventListener('error', remove, { once: true })

  if (img.complete && img.naturalWidth === 0) {
    remove()
  }
}

function classifySections(root) {
  root.querySelectorAll('section, article').forEach((section) => {
    section.classList.add('talweeh-refined-section')

    const heading = section.querySelector('h1,h2,h3,h4')
    const label = meaningfulText(heading).toLowerCase()

    if (/(mission|vision|purpose|why talweeh|values|approach)/.test(label)) {
      section.classList.add('talweeh-refined-section--feature')
    }

    if (/(history|story|who we are|about)/.test(label)) {
      section.classList.add('talweeh-refined-section--story')
    }

    if (/(contact|reach us|get in touch)/.test(label)) {
      section.classList.add('talweeh-refined-section--contact')
    }
  })
}

function enhanceInstructors(root) {
  const links = root.querySelectorAll('a[href^="/instructors/"]')

  links.forEach((link) => {
    const card =
      link.closest('article') ||
      link.closest('[class*="card"]') ||
      link.parentElement?.parentElement ||
      link.parentElement

    if (card && root.contains(card)) {
      card.classList.add('talweeh-refined-instructor-card')
    }
  })

  const repeatedCards = root.querySelectorAll(
    '[class*="instructor-card"], [class*="instructor_card"], [class*="team-card"], [class*="profile-card"]',
  )

  repeatedCards.forEach((card) => {
    card.classList.add('talweeh-refined-instructor-card')
  })
}

function enhanceContact(root) {
  root.querySelectorAll('form').forEach((form) => {
    form.classList.add('talweeh-refined-contact-form')
  })

  root.querySelectorAll('input, textarea, select').forEach((field) => {
    field.classList.add('talweeh-refined-field')
  })

  root.querySelectorAll('button[type="submit"], input[type="submit"]').forEach((button) => {
    button.classList.add('talweeh-refined-submit')
  })
}

function enhanceTerms(root) {
  const prose =
    root.querySelector('article') ||
    root.querySelector('[class*="content"]') ||
    root.querySelector('[class*="page"]') ||
    root

  prose.classList.add('talweeh-terms-prose')
}

function enhancePage(root, mode) {
  root.classList.add('talweeh-refined-page', `talweeh-refined-page--${mode}`)

  const children = Array.from(root.children).filter(
    (child) => child.tagName !== 'SCRIPT' && child.tagName !== 'STYLE',
  )

  const firstSection = children.find((child) =>
    child.matches?.('section, article, div'),
  )

  if (firstSection) {
    firstSection.classList.add('talweeh-refined-hero')
  }

  classifySections(root)

  root.querySelectorAll('img').forEach(hideBrokenImage)

  if (mode === 'instructors' || mode === 'instructor-detail') {
    enhanceInstructors(root)
  }

  if (mode === 'contact') {
    enhanceContact(root)
  }

  if (mode === 'terms') {
    enhanceTerms(root)
  }
}

export default function PublicCorePageRefinement() {
  const { pathname } = useLocation()

  useEffect(() => {
    const mode = pageMode(pathname)
    if (!mode) {
      delete document.documentElement.dataset.talweehCorePage
      return undefined
    }

    document.documentElement.dataset.talweehCorePage = mode

    let observer
    let raf

    const run = () => {
      const mains = Array.from(document.querySelectorAll('main')).filter(
        (main) => !main.closest('.site-footer') && !main.closest('.academy-header'),
      )

      mains.forEach((main) => enhancePage(main, mode))
    }

    raf = window.requestAnimationFrame(run)

    observer = new MutationObserver(() => {
      window.cancelAnimationFrame(raf)
      raf = window.requestAnimationFrame(run)
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    return () => {
      observer.disconnect()
      window.cancelAnimationFrame(raf)
      delete document.documentElement.dataset.talweehCorePage
    }
  }, [pathname])

  return null
}
