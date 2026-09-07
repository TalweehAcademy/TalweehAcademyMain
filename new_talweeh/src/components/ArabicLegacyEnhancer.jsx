import { useEffect } from 'react'
import '../arabic-program-content-v12.css'

const sectionRules = [
  {
    className: 'arabic-legacy-objectives',
    words: ['learning objectives', 'learning objective', 'what you will learn', "what you'll learn", 'outcomes'],
  },
  {
    className: 'arabic-legacy-modules',
    words: ['modules', 'program modules', 'course modules', 'curriculum', 'program structure', 'course structure'],
  },
  {
    className: 'arabic-legacy-audience',
    words: ['who is this for', 'who this is for', 'who should join', 'who should enroll'],
  },
  {
    className: 'arabic-legacy-format',
    words: ['how it works', 'program format', 'course format', 'what to expect', 'format'],
  },
  {
    className: 'arabic-legacy-enrollment',
    words: ['enrollment', 'enrolment', 'tuition', 'pricing', 'price', 'register'],
  },
]

function normalize(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function findSection(node, root) {
  let current = node

  while (current && current !== root) {
    if (
      current.matches?.(
        'section, article, .section, .content-section, .program-section, .arabic-section, .module-section',
      )
    ) {
      return current
    }

    current = current.parentElement
  }

  return node.parentElement
}

function classifySections(root) {
  const headings = root.querySelectorAll('h1, h2, h3, h4, h5')

  headings.forEach((heading) => {
    const text = normalize(heading.textContent)
    if (!text) return

    const section = findSection(heading, root)
    if (!section) return

    section.classList.add('arabic-legacy-section')

    for (const rule of sectionRules) {
      if (rule.words.some((word) => text.includes(word))) {
        section.classList.add(rule.className)
        break
      }
    }
  })
}

function removeDuplicateVideo(root) {
  const mediaNodes = root.querySelectorAll(
    'iframe, video, .video-facade, [class*="video-player"], [class*="video-wrapper"], [class*="video-container"]',
  )

  mediaNodes.forEach((media) => {
    const section = media.closest('section, article')

    if (section && root.contains(section)) {
      section.classList.add('arabic-legacy-duplicate-media')
      return
    }

    const wrapper = media.parentElement
    if (wrapper && root.contains(wrapper)) {
      wrapper.classList.add('arabic-legacy-duplicate-media')
    }
  })

  // Also remove old blocks explicitly inviting the user to watch the same intro.
  root.querySelectorAll('h1, h2, h3, h4, p, a, button').forEach((node) => {
    const text = normalize(node.textContent)

    if (
      text.includes('watch introduction') ||
      text.includes('watch the introduction') ||
      text.includes('program introduction video')
    ) {
      const block = node.closest('section, article')
      if (block && root.contains(block)) {
        block.classList.add('arabic-legacy-duplicate-media')
      }
    }
  })
}

function enhanceObjectives(root) {
  root.querySelectorAll('.arabic-legacy-objectives').forEach((section) => {
    const lists = section.querySelectorAll('ul, ol')

    lists.forEach((list) => {
      list.classList.add('arabic-objective-grid')

      Array.from(list.children).forEach((item, index) => {
        item.classList.add('arabic-objective-card')
        item.style.setProperty('--objective-index', String(index + 1).padStart(2, '0'))
      })
    })
  })
}

function enhanceModules(root) {
  root.querySelectorAll('.arabic-legacy-modules').forEach((section) => {
    const headings = section.querySelectorAll('h3, h4, h5')

    headings.forEach((heading, index) => {
      let card = heading.closest('article, li')

      if (!card || card === section) {
        card = heading.parentElement
      }

      if (!card || card === section || !section.contains(card)) return

      card.classList.add('arabic-module-card')
      card.style.setProperty('--module-index', String(index + 1).padStart(2, '0'))
    })

    // If modules are plain list items rather than heading-based cards.
    section.querySelectorAll(':scope > ul > li, :scope > ol > li').forEach((item, index) => {
      item.classList.add('arabic-module-card')
      item.style.setProperty('--module-index', String(index + 1).padStart(2, '0'))
    })
  })
}

function enhanceGenericCards(root) {
  root.querySelectorAll('.arabic-legacy-audience, .arabic-legacy-format').forEach((section) => {
    section.querySelectorAll('ul, ol').forEach((list) => {
      list.classList.add('arabic-info-grid')
    })
  })
}

function runEnhancements() {
  const root = document.querySelector('.arabic-v2-legacy')
  if (!root) return

  root.classList.add('arabic-v2-legacy--enhanced')

  classifySections(root)
  removeDuplicateVideo(root)
  enhanceObjectives(root)
  enhanceModules(root)
  enhanceGenericCards(root)
}

export default function ArabicLegacyEnhancer() {
  useEffect(() => {
    let frame = requestAnimationFrame(runEnhancements)

    const root = document.querySelector('.arabic-v2-legacy')
    if (!root) return () => cancelAnimationFrame(frame)

    const observer = new MutationObserver(() => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(runEnhancements)
    })

    observer.observe(root, {
      childList: true,
      subtree: true,
    })

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [])

  return null
}
