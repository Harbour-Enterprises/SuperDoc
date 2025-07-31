import { link } from 'fs';
import { defineConfig } from 'vitepress';

// https://vitepress.dev/reference/site-config
export default defineConfig({
  lang: 'en-US',
  title: 'SuperDoc',
  description: 'The modern collaborative document editor for the web',

  dest: '../docs/',
  srcDir: './src',

  lastUpdated: false,
  cleanUrls: true,

  /* prettier-ignore */
  head: [
    ['link', { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" }],
    ['link', { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png" }],
    ['link', { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16x16.png" }],
    ['link', { rel: "manifest", href: "/site.webmanifest" }],
    ['meta', { name: 'theme-color', content: '#1255FE' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:locale', content: 'en' }],
    ['meta', { name: 'og:site_name', content: 'SuperDoc' }],
  ],

  themeConfig: {
    logo: { light: '/logo.png', dark: '/logo-dark.png' },
    siteTitle: false,
    sidebar: sidebar(),
    nav: navMenu(),
    search: {
      provider: 'local',
    },
    footer: {
      message: `© ${new Date().getFullYear()} Harbour Enterprises, Inc. 💙💛`,
    },
    socialLinks: [
      { icon: 'discord', link: 'https://discord.gg/b9UuaZRyaB' },
      { icon: 'github', link: 'https://github.com/Harbour-Enterprises/SuperDoc' },
    ],
  },
});

function navMenu() {
  return [
    { text: 'Docs', link: '/' },
    // { text: 'Demos', link: '/demos/' },
    // { text: 'API', link: '/api/' },
  ];
}

function sidebar() {
  return {
    '/': [
      {
        text: 'Getting Started',
        link: '/',
        collapsed: false,
        items: [
          { text: 'Introduction', link: '/' },
          { text: 'Quick Start', link: '/guide/quick-start' },
          { text: 'Configuration', link: '/guide/configuration' },
          { text: 'Modes and Roles', link: '/guide/modes-roles' },
          { text: 'Project Structure', link: '/guide/project-structure' },
        ]
      },
      {
        text: 'Components',
        link: '/guide/components',
        collapsed: false,
        items: [
          { text: 'SuperDoc', link: '/guide/components#superdoc' },
        ],
      },
      {
        text: 'Extensions',
        // link: '',
        collapsed: false,
        items: [
          { text: 'Field Annotation', link: '/guide/field-annotation' },
        ],
      },
      {
        text: 'Modules',
        link: '/guide/modules',
        collapsed: false,
        items: [
          { text: 'Toolbar', link: '/guide/modules#superdoc-toolbar' },
          { text: 'Comments', link: '/guide/modules#comments' },
          { text: 'Search', link: '/guide/modules#search' },
          { text: 'Convert to PDF', link: '/guide/modules#pdf-conversion' },
        ]
      },
      {
        text: 'Integration',
        link: '/guide/integration',
        collapsed: true,
        items: [
          { text: 'React', link: '/guide/integration#react' },
          { text: 'Vue', link: '/guide/integration#vue' },
          { text: 'Vanilla JS', link: '/guide/integration#vanilla-js' },
        ],
      },
      {
        text: 'Collaboration',
        link: '/guide/collaboration',
        collapsed: true,
        items: [
          { text: 'Frontend setup', link: '/guide/collaboration#frontend-setup' },
          { text: 'Backend setup', link: '/guide/collaboration#backend-setup' },
          { text: 'Examples', link: '/guide/collaboration#examples' },
          { text: 'Quick Start', link: '/guide/collaboration#installation' },
          { text: 'API reference', link: '/guide/collaboration#api-reference' },
          { text: 'Hooks', link: '/guide/collaboration#hooks' },
          { text: 'Resources', link: '/guide/collaboration#additional-resources' },
        ],
      },
      {
        text: 'Advanced',
        link: '/guide/advanced',
        collapsed: true,
        items: [
          { text: 'SuperEditor', link: '/guide/advanced#supereditor' },
          { text: 'Editor commands', link: '/guide/advanced#editor-commands' },
          { text: 'Editor nodes', link: '/guide/advanced#editor-nodes' },
          { text: 'DocumentSection node', link: '/guide/advanced#documentsection-node' },
          { text: 'Accessibility', link: '/guide/accessibility' },
        ],
      },
      {
        text: 'Resources',
        link: '/guide/resources',
        collapsed: true,
        items: [
          { text: 'Examples', link: '/guide/resources#examples' },
          { text: 'FAQ', link: '/guide/resources#faq' },
          {
            text: 'Guides',
            link: '/guide/resources#guides',
            collapsed: true,
            items: [
              {
                text: 'Migrate from Prosemirror',
                link: '/guide/resources#migrate-from-prosemirror',
              },
            ],
          },
          {
            text: 'License',
            link: '/guide/resources#license',
          },
        ],
      },
    ],
  };
}
