// Registry of admin-editable site content.
//
// Each page slug maps to sections; each section has a label (shown in the
// editor), a field schema (drives the generic section editor), and the
// default value — the exact content that used to be hardcoded in the JSX.
// The DB (site_content table) stores only overrides: a missing row means
// "use the default", so an empty table renders the stock site.
//
// Field schema shapes:
//   fields: [{ name, label, type }]                — object section
//   fields: { type: 'list', item: [ ...fields ] }  — list of objects
//   fields: { type: 'list', item: { label, type } }— list of plain strings
// Field types: 'text' | 'textarea' | 'url' | 'image'

export const CONTENT_REGISTRY = {
  global: {
    promoBar: {
      label: 'Announcement bar',
      fields: [
        { name: 'text', label: 'Text', type: 'text' },
        { name: 'linkLabel', label: 'Link label', type: 'text' },
        { name: 'linkTo', label: 'Link target', type: 'url' },
      ],
      default: {
        text: 'Up to 50% off on Select Courses,',
        linkLabel: 'See Now',
        linkTo: '/courses',
      },
    },
    footer: {
      label: 'Footer',
      fields: [
        { name: 'copyright', label: 'Copyright line', type: 'text' },
        {
          name: 'social',
          label: 'Social links',
          type: 'list',
          item: [
            { name: 'label', label: 'Name (accessibility)', type: 'text' },
            { name: 'icon', label: 'Icon glyph', type: 'text' },
            { name: 'href', label: 'Link', type: 'url' },
          ],
        },
      ],
      default: {
        copyright: '© All rights reserved by Talweeh Academy 2025',
        social: [
          { label: 'X / Twitter', icon: '𝕏', href: '#' },
          { label: 'YouTube', icon: '▶', href: 'https://www.youtube.com/@Talweeh.Academy' },
          { label: 'Telegram', icon: '◉', href: '#' },
          { label: 'Instagram', icon: '◎', href: '#' },
          { label: 'WhatsApp', icon: '☎', href: '#' },
        ],
      },
    },
  },

  landing: {
    hero: {
      label: 'Hero calligraphy',
      fields: [{ name: 'arabic', label: 'Arabic line', type: 'text' }],
      default: { arabic: 'رَبِّ زِدْنِي عِلْمًا' },
    },
    heroSlides: {
      label: 'Hero slides',
      fields: {
        type: 'list',
        item: [
          { name: 'heading', label: 'Heading', type: 'text' },
          { name: 'cta', label: 'Button label', type: 'text' },
          { name: 'ctaHref', label: 'Button link', type: 'url' },
          { name: 'imageUrl', label: 'Background image', type: 'image' },
        ],
      },
      default: [
        { heading: '2 Year Arabic Program', cta: 'Explore Arabic Program', ctaHref: '/arabic', imageUrl: '/brand/dashboard-books.webp' },
        { heading: 'Discover! Enlighten! Empower!', cta: 'Start your Journey', ctaHref: '/courses', imageUrl: '/brand/dashboard-books.webp' },
        { heading: 'Revolutionizing your experience with Islamic Academia', cta: 'Start your Journey', ctaHref: '/courses', imageUrl: '/brand/dashboard-books.webp' },
      ],
    },
    highlights: {
      label: 'Feature highlights',
      fields: {
        type: 'list',
        item: [
          { name: 'title', label: 'Title', type: 'text' },
          { name: 'text', label: 'Text', type: 'textarea' },
          { name: 'href', label: 'Link (page or URL)', type: 'url' },
        ],
      },
      default: [
        { title: 'Arabic Program', text: 'A step by step 2 year program to learn the Arabic language.', href: '/arabic' },
        { title: 'Talweeh Society', text: 'Get access to our free courses and weekly lessons.', href: 'https://t.me/TalweehAcademy' },
        { title: 'Authorized Instructors', text: 'Qualified instructors navigating your path.', href: '/instructors' },
      ],
    },
    featured: {
      label: 'Featured courses section',
      fields: [
        { name: 'heading', label: 'Heading', type: 'text' },
        { name: 'buttonLabel', label: 'Button label', type: 'text' },
      ],
      default: { heading: 'Featured Courses', buttonLabel: 'Load all Courses' },
    },
    latestArticles: {
      label: 'Latest articles section',
      fields: [
        { name: 'heading', label: 'Heading', type: 'text' },
        { name: 'buttonLabel', label: 'Button label', type: 'text' },
      ],
      default: { heading: 'Latest Articles', buttonLabel: 'View Articles' },
    },
    aboutWhy: {
      label: 'About / Why cards',
      fields: [
        { name: 'aboutHeading', label: 'About heading', type: 'text' },
        { name: 'aboutText', label: 'About text', type: 'textarea' },
        { name: 'aboutButtonLabel', label: 'About button label', type: 'text' },
        { name: 'whyHeading', label: 'Why heading', type: 'text' },
        { name: 'whyText', label: 'Why text', type: 'textarea' },
        { name: 'whyButtonLabel', label: 'Why button label', type: 'text' },
        { name: 'whyButtonHref', label: 'Why button link', type: 'url' },
      ],
      default: {
        aboutHeading: 'About Talweeh Academy',
        aboutText:
          'At Talweeh Academy, our mission is to elevate academic awareness across all levels, offering comprehensive programs tailored for laypersons, students, and scholars. Our curriculum spans a broad range of Islamic academic disciplines.',
        aboutButtonLabel: 'About Us',
        whyHeading: 'Why Talweeh Academy',
        whyText:
          'Our instructors possess authorizations (ijāzāt) from esteemed scholars worldwide and have uniquely integrated traditional and academic methods in their quest for knowledge. Join us and check out the first few lessons of our courses for free.',
        whyButtonLabel: 'Sign UP',
        whyButtonHref: '#',
      },
    },
    joinSociety: {
      label: 'Join Talweeh Society',
      fields: [
        { name: 'heading', label: 'Heading', type: 'text' },
        { name: 'text', label: 'Text', type: 'textarea' },
        { name: 'buttonLabel', label: 'Button label', type: 'text' },
        { name: 'buttonHref', label: 'Button link', type: 'url' },
      ],
      default: {
        heading: 'Join Talweeh Society',
        text: 'Join us as we share uplifting reminders and insights from various texts, along with access to our free weekly lessons.',
        buttonLabel: 'Join Us',
        buttonHref: '/membership',
      },
    },
    youtube: {
      label: 'YouTube section',
      fields: [
        { name: 'heading', label: 'Heading', type: 'text' },
        { name: 'buttonLabel', label: 'Button label', type: 'text' },
        { name: 'url', label: 'Channel link', type: 'url' },
        {
          name: 'videos',
          label: 'Embedded videos',
          type: 'list',
          item: { label: 'YouTube embed link', type: 'url' },
        },
      ],
      default: {
        heading: 'Youtube Videos',
        buttonLabel: '▶ Subscribe to our YouTube',
        url: 'https://www.youtube.com/@Talweeh.Academy',
        videos: [
          'https://www.youtube.com/embed/T4-h_N8VN_A',
          'https://www.youtube.com/embed/SQmeAQ6wZ1U',
          'https://www.youtube.com/embed/mmXvxdH9mAs',
        ],
      },
    },
    gifts: {
      label: 'Gift cards',
      fields: {
        type: 'list',
        item: [
          { name: 'title', label: 'Title', type: 'text' },
          { name: 'text', label: 'Text', type: 'textarea' },
          { name: 'buttonLabel', label: 'Button label', type: 'text' },
          { name: 'href', label: 'Button link', type: 'url' },
        ],
      },
      default: [
        {
          title: 'Gift a Membership',
          text: "Sponsor a course which will be given to an applicant who can't afford Talweeh Academy.",
          buttonLabel: 'Give a Gift',
          href: '#',
        },
        {
          title: 'Apply for a Gift',
          text: "If you can't afford a subscription, please submit an application for a course.",
          buttonLabel: 'Apply for a Gift',
          href: '#',
        },
      ],
    },
    testimonials: {
      label: 'Testimonials',
      fields: {
        type: 'list',
        item: [
          { name: 'quote', label: 'Quote', type: 'textarea' },
          { name: 'name', label: 'Name', type: 'text' },
          { name: 'location', label: 'Location', type: 'text' },
        ],
      },
      default: [
        {
          quote:
            'Learning Arabic has been a transformative experience, especially under the guidance of my respected teachers Shaykh Daud and Shaykh Omer. Their dedication to teaching not only helped me in grasping the language but also enriched my appreciation for the Ulama of the past, and respect for all seekers of knowledge.',
          name: 'Mustafa Khan',
          location: 'Toronto, Canada',
        },
        {
          quote:
            'Mashallah, this academy changed the way I look at online courses. The level of sharpness of the instructors is unreal. They do not shy away from mentioning nuances, grammar benefits, and differences in opinions over any text.',
          name: 'Muhammed Ince',
          location: 'Turkey',
        },
        {
          quote:
            'Studying with Sheikh Omer really opened my mind to see how the Islamic sciences work in tandem. I have not had a better teacher in explaining the details and intricacies of all the sciences especially in fiqh and usool ul fiqh.',
          name: 'Mohammed Kaleelurrahman',
          location: 'Dallas, USA',
        },
        {
          quote:
            'Having studied with Mufti Dawud for over a year, I have benefitted greatly from his teaching. His way of teaching has been easy to understand, and he challenges us to push ourselves. As a convert, I found studying with him to be very inclusive and helpful.',
          name: 'Aldo Gjataj',
          location: 'Ashford, England',
        },
        {
          quote:
            'What I really love about the way Sheikh teaches is that whenever we learn a new rule, we immediately apply it. The practicality in his teaching method brings life to the theory which many students find difficult to grasp.',
          name: 'Muhammad Patel',
          location: 'Botswana',
        },
      ],
    },
  },

  about: {
    intro: {
      label: 'Intro',
      fields: [
        { name: 'heading', label: 'Heading', type: 'text' },
        { name: 'para1', label: 'First paragraph', type: 'textarea' },
        { name: 'para2', label: 'Second paragraph', type: 'textarea' },
        { name: 'imageUrl', label: 'Side image', type: 'image' },
      ],
      default: {
        heading: 'What is Talweeh Academy?',
        imageUrl: '/images/about-mosque.webp',
        para1:
          'Talweeh Academy is an institution dedicated to reviving Islamic academia in the West. Our mission is to help seekers of knowledge engage deeply with the rich legacy of Islamic scholarship. We achieve this by offering a carefully designed syllabus featuring robust, content-rich courses that delve into essential concepts within every Islamic science.',
        para2:
          'Our courses are taught by highly qualified instructors who have years of training and experience in their respective fields. These instructors bring thorough research and expertise, ensuring that each student receives an authentic and comprehensive education. Our comprehensive curriculum encompasses a wide range of subjects, including:',
      },
    },
    subjects: {
      label: 'Subjects list',
      fields: { type: 'list', item: { label: 'Subject', type: 'text' } },
      default: [
        'Naḥw (grammar)',
        'Ṣarf (morphology)',
        'Balāghah (rhetoric)',
        'Mantiq (logic)',
        'Tafsīr (exegesis)',
        'Uṣūl al-Ḥadīth (foundations of ḥadīth)',
        'Uṣūl al-Fiqh (foundations of jurisprudence)',
        'Fiqh (Islamic jurisprudence)',
        'Arabic for beginners',
      ],
    },
    proud: {
      label: 'Proud section headings',
      fields: [
        { name: 'heading', label: 'Heading', type: 'text' },
        { name: 'subheading', label: 'Subheading', type: 'text' },
      ],
      default: { heading: 'Things that make us proud', subheading: 'Choose your learning level' },
    },
    highlights: {
      label: 'Highlight cards',
      fields: {
        type: 'list',
        item: [
          { name: 'title', label: 'Title', type: 'text' },
          { name: 'description', label: 'Description', type: 'textarea' },
        ],
      },
      default: [
        { title: 'Quality Teachers', description: 'Selecting teachers of piety and moral character who are sincere and devout' },
        { title: '400+ Hours of Deliverables', description: 'More than 400 hours of video lessons on demand.' },
        { title: 'Talweeh Society', description: 'Get access to our free courses and weekly lessons' },
        { title: 'Authorized Instructors', description: 'Expert instructors available for your online questions and support' },
      ],
    },
    vision: {
      label: 'Vision',
      fields: [
        { name: 'heading', label: 'Heading', type: 'text' },
        { name: 'text', label: 'Text', type: 'textarea' },
      ],
      default: {
        heading: 'The Vision of Talweeh Academy',
        text: 'Our academy was established with a bold vision: elevating the academic excellence of Islamic scholarship across all disciplines. We strive to bridge existing gaps and provide students with a superior educational experience that meets their highest expectations, enabling them to access a higher level of Islamic academia and creating an environment where knowledge can flourish!',
      },
    },
    guidance: {
      label: 'Qualified guidance',
      fields: [
        { name: 'heading', label: 'Heading', type: 'text' },
        { name: 'subheading', label: 'Subheading', type: 'text' },
        { name: 'text', label: 'Text', type: 'textarea' },
      ],
      default: {
        heading: 'Qualified Guidance',
        subheading: 'Instructors Holding Ijāzāt (traditional authorization)',
        text: 'Under the guidance of qualified scholars and experts in their respective fields, we ensure that each course is delivered with clarity, depth, and relevance to both contemporary and classical knowledge. Our esteemed instructors have undertaken rigorous scholarly journeys, acquiring authorization from distinguished scholars across the globe, and securing certifications in multiple areas, including Quranic recitation, Hadith studies, and Islamic sciences.',
      },
    },
    invitation: {
      label: 'Invitation',
      fields: [
        { name: 'heading', label: 'Heading', type: 'text' },
        { name: 'text', label: 'Text', type: 'textarea' },
      ],
      default: {
        heading: 'Invitation to Join Us',
        text: 'We warmly invite you to join us on this enriching journey of knowledge and growth. Together, we will raise the bar for Islamic education, benefiting individuals and communities alike. Through our collaborative efforts, we hope to cultivate a generation of informed, engaged, and empowered individuals who can contribute positively to society.',
      },
    },
    terms: {
      label: 'Terms & Conditions section',
      fields: [
        { name: 'heading', label: 'Heading', type: 'text' },
        { name: 'buttonLabel', label: 'Button label', type: 'text' },
      ],
      default: { heading: 'Terms & Conditions', buttonLabel: 'Read Now' },
    },
  },

  contact: {
    telegram: {
      label: 'Telegram card',
      fields: [
        { name: 'heading', label: 'Heading', type: 'text' },
        { name: 'prefix', label: 'Text before link', type: 'text' },
        { name: 'url', label: 'Telegram link', type: 'url' },
        { name: 'suffix', label: 'Text after link', type: 'text' },
      ],
      default: {
        heading: 'Follow us via Telegram',
        prefix: 'Follow us on',
        url: 'https://t.me/TalweehAcademy',
        suffix: 'for updates.',
      },
    },
    email: {
      label: 'Email card',
      fields: [
        { name: 'heading', label: 'Heading', type: 'text' },
        { name: 'prefix', label: 'Text before address', type: 'text' },
        { name: 'address', label: 'Email address', type: 'text' },
        { name: 'suffix', label: 'Text after address', type: 'text' },
      ],
      default: {
        heading: 'Contact us via Email',
        prefix: 'Contact us on',
        address: 'info@talweehacademy.com',
        suffix: 'for any queries.',
      },
    },
    formCard: {
      label: 'Form card',
      fields: [
        { name: 'heading', label: 'Heading', type: 'text' },
        { name: 'text', label: 'Text', type: 'textarea' },
      ],
      default: {
        heading: 'Contact us via Form',
        text: 'Fill out the form below and we will get back to you as soon as possible.',
      },
    },
  },
}

// { pageSlug: { sectionKey: defaultValue } } — what useContent starts from.
export const CONTENT_DEFAULTS = Object.fromEntries(
  Object.entries(CONTENT_REGISTRY).map(([page, sections]) => [
    page,
    Object.fromEntries(Object.entries(sections).map(([key, s]) => [key, s.default])),
  ])
)
