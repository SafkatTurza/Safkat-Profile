// The single source of truth for every editable value on the page.
//
// These defaults mirror the static markup in index.html exactly, so the site
// looks identical whether it renders from Redis, from these defaults, or (with
// JavaScript off) straight from the HTML.
//
// Sections marked `enabled: false` do not exist in the static markup — they
// stay hidden until they are switched on from the admin panel.

const DEFAULT_CONTENT = {
  meta: {
    title: 'Safkat Turza — Project Co-Ordinator',
    description:
      'Safkat Turza — Project Co-Ordinator with 10+ years of experience in coordination, operations, and compliance.',
    ogImage: '',
    ctaLabel: 'Get in touch',
  },

  hero: {
    name: 'Safkat Turza',
    role: 'Project Co-Ordinator',
    summary:
      'Project coordinator with 10+ years of experience managing concurrent projects across coordination, administration, and compliance — keeping teams, clients, and timelines aligned.',
    portrait: '',
    badgeBig: '10+',
    badgeLabel: 'years\ncoordinating',
    primaryCta: 'Get in touch',
    secondaryCta: 'View experience',
    cvUrl: '',
    cvLabel: 'Download CV',
    meta: [
      { k: 'Based in', v: 'Dhaka, Bangladesh' },
      { k: 'Currently', v: 'XQUBE Studio GmbH' },
      { k: 'Focus', v: 'Coordination · Operations' },
    ],
  },

  about: {
    enabled: true,
    navLabel: 'About',
    heading: 'A decade of keeping projects on track.',
    lead: 'More than ten years across project coordination, operations, and administration — currently managing multiple projects at <b>XQUBE Studio GmbH</b>, with hands-on experience in AI-based projects.',
    body: [
      'My focus is the day-to-day delivery that keeps concurrent projects moving: clear stakeholder communication, dependable administration, and process documentation that everyone can actually follow.',
      'I work comfortably across coordination, compliance, and operations — translating shifting priorities into structured workflows, and keeping clients, senior stakeholders, and partners aligned from kickoff to close.',
    ],
    stats: [
      { n: '10+', t: 'Years of experience' },
      { n: '3', t: 'Organizations served' },
      { n: 'AI', t: 'Hands-on project work' },
    ],
  },

  experience: {
    enabled: true,
    navLabel: 'Experience',
    heading: "Where I've coordinated.",
    subtitle: '',
    items: [
      {
        when: 'Jun 2023 — Present',
        where: 'Remote',
        title: 'Project Co-Ordinator',
        company: 'XQUBE Studio GmbH',
        description:
          'Manage multiple projects and operational tasks across coordination, administration, and compliance. Coordinate day-to-day delivery on concurrent projects, manage communication with clients, senior stakeholders, and external partners, oversee admin and accounts, document scope and workflows, maintain records, and work hands-on with AI-based projects.',
        tags: [
          'Project coordination',
          'Stakeholder comms',
          'Compliance',
          'AI projects',
          'Documentation',
        ],
      },
      {
        when: 'Jul 2018 — May 2023',
        where: 'Dhaka, Bangladesh',
        title: 'Manager',
        company: 'Dreamerz Lab Ltd.',
        description:
          'Led project coordination and office administration, keeping delivery, communication, and day-to-day operations running smoothly across the team.',
        tags: ['Project coordination', 'Office administration', 'Operations'],
      },
      {
        when: 'Nov 2014 — Jan 2018',
        where: 'Bhaluka, Mymensingh',
        title: 'Senior Executive',
        company: 'Shabab Fabrics Limited',
        description:
          'Handled coordination and administration, supporting structured processes and reliable day-to-day execution.',
        tags: ['Coordination', 'Administration'],
      },
    ],
  },

  education: {
    enabled: false,
    navLabel: 'Education',
    heading: 'Where I studied.',
    subtitle: '',
    items: [],
  },

  skills: {
    enabled: true,
    navLabel: 'Skills',
    heading: 'What I bring to the table.',
    subtitle: '',
    items: [
      'Project coordination',
      'Office administration',
      'Stakeholder communication',
      'Operations management',
      'Compliance',
      'Process documentation',
      'AI-based project handling',
    ],
  },

  software: {
    enabled: false,
    navLabel: 'Tools & software',
    heading: 'What I work with.',
    subtitle: '',
    items: [],
  },

  aitools: {
    enabled: true,
    navLabel: 'AI Tools',
    heading: "Tools I've built with AI.",
    subtitle: 'Free to try — this list updates as I ship new ones.',
  },

  projects: {
    enabled: false,
    navLabel: 'Projects',
    heading: 'Selected work.',
    subtitle: '',
    items: [],
  },

  certifications: {
    enabled: true,
    navLabel: 'Certifications',
    heading: 'Always learning.',
    subtitle: 'Professional courses completed through LinkedIn Learning.',
    items: [
      {
        title: 'Managing Project Stakeholders',
        issuer: 'LinkedIn Learning',
        date: 'Apr 2026',
        topics: ['Stakeholder Management'],
        images: ['assets/certs/managing-stakeholders.webp'],
      },
      {
        title: 'Scrum: The Basics',
        issuer: 'LinkedIn Learning',
        date: 'Mar 2026',
        topics: ['Scrum'],
        images: ['assets/certs/scrum-basics.webp'],
      },
      {
        title: 'Administrative Human Resources',
        issuer: 'LinkedIn Learning',
        date: 'Nov 2023',
        topics: ['Human Resources', 'HRCI & SHRM credits'],
        images: ['assets/certs/hr-shrm.webp', 'assets/certs/hr-hrci.webp'],
      },
    ],
  },

  testimonials: {
    enabled: false,
    navLabel: 'Testimonials',
    heading: 'What people say.',
    subtitle: '',
    items: [],
  },

  languages: {
    enabled: false,
    navLabel: 'Languages',
    heading: 'Languages I speak.',
    subtitle: '',
    items: [],
  },

  contact: {
    enabled: true,
    navLabel: 'Contact',
    heading: "Let's keep your projects aligned.",
    body: "Open to remote project coordination and operations roles. The fastest way to reach me is email — I'm happy to talk through how I can help.",
    email: 'safjasib@gmail.com',
    linkedin: 'https://www.linkedin.com/in/safkat-turza/',
    links: [],
  },

  footer: {
    name: 'Safkat Turza',
    tagline: 'Project Co-Ordinator',
    year: '2026',
    links: [
      { label: 'Email', url: 'mailto:safjasib@gmail.com' },
      { label: 'LinkedIn', url: 'https://www.linkedin.com/in/safkat-turza/' },
    ],
  },
};

// Order the sections appear in, which also drives the nav and the 01/02/03
// numbering. Disabled sections are skipped in both.
const SECTION_ORDER = [
  'about',
  'experience',
  'education',
  'skills',
  'software',
  'aitools',
  'projects',
  'certifications',
  'testimonials',
  'languages',
  'contact',
];

module.exports = { DEFAULT_CONTENT, SECTION_ORDER };
