/* ===========================================================================
   The single description of what is editable and how it is presented.
   Everything else in the admin — navigation, forms, validation, the overview
   — is generated from this file, so adding a field means editing one array.

   Panel:  { id, title, group, icon, hint, toggle, store, fields }
   Field:  { p | k, l, t, half, h, ph, req, max, as, uniq, sum, item, fields }
             p     absolute path into the content document (panel-level field)
             k     key relative to the containing list item
             t     control: text | area | url | image | file | images |
                            strings | list | tools
             half  sit two-per-row on wide screens
             as    extra validation: email | url | tel | link
             sum   how a list item summarises itself when collapsed
   =========================================================================== */

export const GROUPS = ['General', 'Homepage', 'Contact & footer', 'Settings'];

export const SCHEMA = [
  {
    id: 'overview', title: 'Overview', group: 'General', icon: 'home',
    hint: 'Everything on your site at a glance.', custom: 'overview',
  },

  {
    id: 'availability', title: 'Availability', group: 'General', icon: 'radio',
    hint: 'The pill at the top of your homepage telling visitors whether you are open to work.',
    store: 'status', custom: 'availability',
  },

  /* ------------------------------------------------------------ homepage */
  {
    id: 'hero', title: 'Hero', group: 'Homepage', icon: 'sparkle',
    hint: 'The first screen visitors see.',
    fields: [
      { p: 'hero.name', l: 'Name', t: 'text', req: 1, max: 60, half: 1 },
      { p: 'hero.role', l: 'Job title', t: 'text', req: 1, max: 80, half: 1 },
      { p: 'hero.summary', l: 'Summary paragraph', t: 'area', req: 1, max: 400 },
      {
        p: 'hero.portrait', l: 'Portrait photo', t: 'image',
        h: 'Leave empty to keep the built-in photo. Large images are resized and converted to WebP automatically.',
      },
      { p: 'hero.badgeBig', l: 'Badge — big text', t: 'text', max: 8, half: 1, ph: '10+' },
      {
        p: 'hero.badgeLabel', l: 'Badge — small label', t: 'area', max: 40, half: 1,
        h: 'Put each word on its own line to control where it wraps.',
      },
      { p: 'hero.primaryCta', l: 'Primary button', t: 'text', max: 40, half: 1 },
      { p: 'hero.secondaryCta', l: 'Secondary button', t: 'text', max: 40, half: 1 },
      {
        p: 'hero.meta', l: 'Detail row', t: 'list', item: 'Detail', compact: 1,
        h: 'The Based in / Currently / Focus line under your summary.',
        sum: { t: 'k', s: 'v' },
        fields: [
          { k: 'k', l: 'Label', t: 'text', req: 1, max: 30, half: 1, ph: 'Based in' },
          { k: 'v', l: 'Value', t: 'text', req: 1, max: 80, half: 1, ph: 'Dhaka, Bangladesh' },
        ],
      },
      {
        p: 'hero.cvUrl', l: 'CV / résumé', t: 'file',
        h: 'A PDF adds a download button next to the hero buttons.',
      },
      { p: 'hero.cvLabel', l: 'CV button label', t: 'text', max: 40, ph: 'Download CV' },
    ],
  },

  {
    id: 'about', title: 'About', group: 'Homepage', icon: 'user', toggle: 1,
    fields: [
      { p: 'about.heading', l: 'Heading', t: 'text', req: 1, max: 120 },
      {
        p: 'about.lead', l: 'Lead paragraph', t: 'area', max: 600,
        h: 'Wrap a phrase in <b>…</b> to highlight it in the accent colour.',
      },
      { p: 'about.body', l: 'Body paragraphs', t: 'strings', item: 'Paragraph', area: 1, max: 900 },
      {
        p: 'about.stats', l: 'Stat boxes', t: 'list', item: 'Stat', compact: 1,
        sum: { t: 'n', s: 't' },
        fields: [
          { k: 'n', l: 'Number', t: 'text', req: 1, max: 10, half: 1, ph: '10+' },
          { k: 't', l: 'Caption', t: 'text', req: 1, max: 40, half: 1, ph: 'Years of experience' },
        ],
      },
    ],
  },

  {
    id: 'experience', title: 'Experience', group: 'Homepage', icon: 'briefcase', toggle: 1,
    fields: [
      { p: 'experience.heading', l: 'Heading', t: 'text', req: 1, max: 120 },
      { p: 'experience.subtitle', l: 'Subtitle', t: 'text', max: 200 },
      {
        p: 'experience.items', l: 'Jobs', t: 'list', item: 'Job',
        sum: { t: 'title', s: 'company' },
        fields: [
          { k: 'when', l: 'Dates', t: 'text', req: 1, max: 40, half: 1, ph: 'Jun 2023 — Present' },
          { k: 'where', l: 'Location', t: 'text', max: 60, half: 1, ph: 'Remote' },
          { k: 'title', l: 'Job title', t: 'text', req: 1, max: 80, half: 1 },
          { k: 'company', l: 'Company', t: 'text', req: 1, max: 80, half: 1 },
          { k: 'description', l: 'Description', t: 'area', max: 1200 },
          { k: 'tags', l: 'Skill tags', t: 'strings', item: 'Tag', max: 40, uniq: 1 },
        ],
      },
    ],
  },

  {
    id: 'education', title: 'Education', group: 'Homepage', icon: 'cap', toggle: 1, isNew: 1,
    hint: 'Degrees, diplomas and courses. Switch the section on once you have added one.',
    fields: [
      { p: 'education.heading', l: 'Heading', t: 'text', req: 1, max: 120 },
      { p: 'education.subtitle', l: 'Subtitle', t: 'text', max: 200 },
      {
        p: 'education.items', l: 'Qualifications', t: 'list', item: 'Qualification',
        sum: { t: 'title', s: 'company' },
        fields: [
          { k: 'when', l: 'Years', t: 'text', req: 1, max: 40, half: 1, ph: '2010 — 2013' },
          { k: 'where', l: 'Location', t: 'text', max: 60, half: 1 },
          { k: 'title', l: 'Degree / qualification', t: 'text', req: 1, max: 100, half: 1 },
          { k: 'company', l: 'Institution', t: 'text', req: 1, max: 80, half: 1 },
          { k: 'description', l: 'Description', t: 'area', max: 1200 },
          { k: 'tags', l: 'Tags', t: 'strings', item: 'Tag', max: 40, uniq: 1 },
        ],
      },
    ],
  },

  {
    id: 'skills', title: 'Skills', group: 'Homepage', icon: 'spark', toggle: 1,
    fields: [
      { p: 'skills.heading', l: 'Heading', t: 'text', req: 1, max: 120 },
      { p: 'skills.subtitle', l: 'Subtitle', t: 'text', max: 200 },
      { p: 'skills.items', l: 'Skills', t: 'strings', item: 'Skill', max: 60, uniq: 1, req: 1 },
    ],
  },

  {
    id: 'software', title: 'Tools & software', group: 'Homepage', icon: 'grid', toggle: 1, isNew: 1,
    hint: 'The software you work in day to day — Jira, Asana, Trello, Notion…',
    fields: [
      { p: 'software.heading', l: 'Heading', t: 'text', req: 1, max: 120 },
      { p: 'software.subtitle', l: 'Subtitle', t: 'text', max: 200 },
      { p: 'software.items', l: 'Tools', t: 'strings', item: 'Tool', max: 60, uniq: 1, ph: 'Jira' },
    ],
  },

  {
    id: 'aitools', title: 'AI Tools', group: 'Homepage', icon: 'bolt', toggle: 1,
    hint: 'Tools you have built with AI, shown as a card grid with a link to try each one.',
    fields: [
      { p: 'aitools.heading', l: 'Heading', t: 'text', req: 1, max: 120 },
      { p: 'aitools.subtitle', l: 'Subtitle', t: 'text', max: 200 },
      { p: '__tools', l: 'Tool cards', t: 'tools' },
    ],
  },

  {
    id: 'projects', title: 'Projects', group: 'Homepage', icon: 'folder', toggle: 1, isNew: 1,
    hint: 'Case studies or selected work, shown as cards.',
    fields: [
      { p: 'projects.heading', l: 'Heading', t: 'text', req: 1, max: 120 },
      { p: 'projects.subtitle', l: 'Subtitle', t: 'text', max: 200 },
      {
        p: 'projects.items', l: 'Projects', t: 'list', item: 'Project',
        sum: { t: 'name', s: 'tag', img: 'logo' },
        fields: [
          { k: 'name', l: 'Name', t: 'text', req: 1, max: 80, half: 1 },
          { k: 'tag', l: 'Tag', t: 'text', max: 40, half: 1, ph: 'Operations' },
          { k: 'description', l: 'Description', t: 'area', max: 600 },
          { k: 'url', l: 'Link', t: 'url', as: 'link', half: 1, ph: 'https://…' },
          { k: 'linkLabel', l: 'Link label', t: 'text', max: 40, half: 1, ph: 'View project' },
          { k: 'logo', l: 'Image / logo', t: 'image' },
        ],
      },
    ],
  },

  {
    id: 'certifications', title: 'Certifications', group: 'Homepage', icon: 'award', toggle: 1,
    fields: [
      { p: 'certifications.heading', l: 'Heading', t: 'text', req: 1, max: 120 },
      { p: 'certifications.subtitle', l: 'Subtitle', t: 'text', max: 200 },
      {
        p: 'certifications.items', l: 'Certificates', t: 'list', item: 'Certificate',
        sum: { t: 'title', s: 'issuer', img: 'images.0' },
        fields: [
          { k: 'title', l: 'Course name', t: 'text', req: 1, max: 120 },
          { k: 'issuer', l: 'Issuer', t: 'text', req: 1, max: 60, half: 1, ph: 'LinkedIn Learning' },
          { k: 'date', l: 'Date', t: 'text', max: 30, half: 1, ph: 'Apr 2026' },
          { k: 'topics', l: 'Topic tags', t: 'strings', item: 'Topic', max: 50, uniq: 1 },
          {
            k: 'images', l: 'Certificate images', t: 'images', req: 1,
            h: 'Add more than one and the card shows a count badge with arrows in the viewer. Drag to reorder — the first image is the thumbnail.',
          },
        ],
      },
    ],
  },

  {
    id: 'testimonials', title: 'Testimonials', group: 'Homepage', icon: 'quote', toggle: 1, isNew: 1,
    hint: 'What colleagues and clients say about working with you.',
    fields: [
      { p: 'testimonials.heading', l: 'Heading', t: 'text', req: 1, max: 120 },
      { p: 'testimonials.subtitle', l: 'Subtitle', t: 'text', max: 200 },
      {
        p: 'testimonials.items', l: 'Quotes', t: 'list', item: 'Quote',
        sum: { t: 'name', s: 'role' },
        fields: [
          { k: 'quote', l: 'Quote', t: 'area', req: 1, max: 500 },
          { k: 'name', l: 'Name', t: 'text', req: 1, max: 60, half: 1 },
          { k: 'role', l: 'Role / company', t: 'text', max: 80, half: 1 },
        ],
      },
    ],
  },

  {
    id: 'languages', title: 'Languages', group: 'Homepage', icon: 'globe', toggle: 1, isNew: 1,
    hint: 'Languages you speak and how fluently.',
    fields: [
      { p: 'languages.heading', l: 'Heading', t: 'text', req: 1, max: 120 },
      { p: 'languages.subtitle', l: 'Subtitle', t: 'text', max: 200 },
      {
        p: 'languages.items', l: 'Languages', t: 'list', item: 'Language', compact: 1,
        sum: { t: 'name', s: 'level' },
        fields: [
          { k: 'name', l: 'Language', t: 'text', req: 1, max: 40, half: 1, ph: 'Bengali' },
          { k: 'level', l: 'Level', t: 'text', max: 40, half: 1, ph: 'Native' },
        ],
      },
    ],
  },

  /* ---------------------------------------------------- contact & footer */
  {
    id: 'contact', title: 'Contact', group: 'Contact & footer', icon: 'mail', toggle: 1,
    fields: [
      { p: 'contact.heading', l: 'Heading', t: 'text', req: 1, max: 120 },
      { p: 'contact.body', l: 'Paragraph', t: 'area', max: 600 },
      { p: 'contact.email', l: 'Email address', t: 'text', as: 'email', req: 1, half: 1, max: 120 },
      { p: 'contact.linkedin', l: 'LinkedIn URL', t: 'url', as: 'url', half: 1, max: 200 },
      {
        p: 'contact.links', l: 'Extra buttons', t: 'list', item: 'Button', compact: 1,
        h: 'WhatsApp, phone, GitHub — anything else you want reachable.',
        sum: { t: 'label', s: 'url' },
        fields: [
          { k: 'label', l: 'Label', t: 'text', req: 1, max: 30, half: 1, ph: 'WhatsApp' },
          {
            k: 'url', l: 'URL', t: 'text', as: 'link', req: 1, max: 200, half: 1,
            ph: 'https://wa.me/…', h: 'https://…, mailto:…, tel:… or https://wa.me/…',
          },
        ],
      },
    ],
  },

  {
    id: 'footer', title: 'Footer', group: 'Contact & footer', icon: 'layout',
    fields: [
      { p: 'footer.name', l: 'Name', t: 'text', max: 60 },
      { p: 'footer.year', l: 'Copyright year', t: 'text', max: 9, half: 1 },
      { p: 'footer.tagline', l: 'Tagline after the year', t: 'text', max: 60, half: 1 },
      {
        p: 'footer.links', l: 'Footer links', t: 'list', item: 'Link', compact: 1,
        sum: { t: 'label', s: 'url' },
        fields: [
          { k: 'label', l: 'Label', t: 'text', req: 1, max: 30, half: 1 },
          { k: 'url', l: 'URL', t: 'text', as: 'link', req: 1, max: 200, half: 1 },
        ],
      },
    ],
  },

  /* ---------------------------------------------------------- site meta */
  {
    id: 'meta', title: 'Site settings', group: 'Settings', icon: 'cog',
    hint: 'How your site appears in browser tabs, search results and shared links.',
    fields: [
      { p: 'meta.title', l: 'Browser tab title', t: 'text', req: 1, max: 70, h: 'Search engines show roughly the first 60 characters.' },
      { p: 'meta.description', l: 'Search description', t: 'area', max: 160, h: 'Aim for 140–160 characters.' },
      {
        p: 'meta.ogImage', l: 'Link preview image', t: 'image',
        h: 'Shown when your link is pasted into LinkedIn, WhatsApp or Slack. Wide images around 1200×630 look best.',
      },
      { p: 'meta.ctaLabel', l: 'Header button label', t: 'text', max: 30 },
    ],
  },

  /* ------------------------------------------------------- standalone copy */
  {
    id: 'share', title: 'Share a copy', group: 'Settings', icon: 'doc',
    custom: 'export',
  },
];

/* Which sections can be switched on and off, in the order they appear on the
   page. Mirrors SECTION_ORDER in api/_defaults.js. */
export const SECTION_ORDER = [
  'about', 'experience', 'education', 'skills', 'software',
  'aitools', 'projects', 'certifications', 'testimonials', 'languages', 'contact',
];

/* Where each section's repeatable items live, used for counts and for the
   "switched on but empty" warning. `aitools` counts the tools store instead. */
export const ITEM_PATH = {
  experience: 'experience.items',
  education: 'education.items',
  skills: 'skills.items',
  software: 'software.items',
  projects: 'projects.items',
  certifications: 'certifications.items',
  testimonials: 'testimonials.items',
  languages: 'languages.items',
};

export const PANEL_BY_ID = Object.fromEntries(SCHEMA.map(p => [p.id, p]));
