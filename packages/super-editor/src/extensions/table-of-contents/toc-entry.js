import { Node, Attribute } from '@core/index.js';

export const TocEntry = Node.create({
  name: 'tocEntry',

  group: 'block',

  content: 'inline*',

  defining: true,

  addOptions() {
    return {
      htmlAttributes: {
        class: 'sd-toc-entry',
        'aria-label': 'Table of contents entry'
      },
    };
  },

  addAttributes() {
    return {
      level: {
        default: 1,
        rendered: false,
      },
      headingId: {
        default: null,
        rendered: false,
      },
      pageNumber: {
        default: null,
        rendered: false,
      },
      isHyperlink: {
        default: false,
        rendered: false,
      },
      // Note: hasLeaders and leaderType are now controlled by the parent TableOfContents node
      // Individual entries inherit these settings from their parent
      attributes: {
        rendered: false,
      },
    };
  },

  parseDOM() {
    return [
      {
        tag: `div[data-type="${this.name}"]`,
        priority: 60,
      },
    ];
  },

  renderDOM({ node, htmlAttributes }) {
    const { level, pageNumber, isHyperlink, headingId } = node.attrs;
    const baseAttributes = Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes, {
      'data-type': this.name,
      'data-level': level || 1,
      'data-heading-id': headingId || '',
      'data-page-number': pageNumber || '',
    });

    // Get the text content from the node
    const textContent = node.textContent || '';
    
    // Build the entry content structure
    const textElement = [
      'span',
      { class: 'toc-text' },
      textContent
    ];

    // Try to inherit from parent if not set
    let hasLeaders = node.attrs.hasLeaders;
    let leaderType = node.attrs.leaderType;

    // If not set, try to get from parent
    if (hasLeaders === undefined || leaderType === undefined) {
      const parent = node?.parent;
      if (parent && parent.type.name === 'tableOfContents') {
        if (hasLeaders === undefined) hasLeaders = parent.attrs.hasLeaders;
        if (leaderType === undefined) leaderType = parent.attrs.leaderType;
      }
    }

    // Fallbacks
    if (hasLeaders === undefined) hasLeaders = false;
    if (leaderType === undefined) leaderType = '';
    
    const contentElements = [textElement];

    // Optional leader dots/dashes
    if (hasLeaders !== false) {
      const leadersElement = [
        'span',
        {
          class: `toc-leaders toc-leaders-${leaderType}`,
          'data-leader-type': leaderType,
        },
        '',
      ];
      contentElements.push(leadersElement);
    }

    // Page number element (still visually right-aligned)
    const pageNumberElement = [
      'span',
      {
        class: 'toc-page-number clickable',
        'data-heading-id': headingId || '',
        'data-page-number': pageNumber || '',
      },
      pageNumber ? String(pageNumber) : '',
    ];

    contentElements.push(pageNumberElement);

    // Wrap everything in a single <a> so the whole row is clickable & recognised by existing link tooling
    const anchorAttributes = {
      class: 'toc-entry-link',
      href: headingId ? `#${headingId}` : `#toc-${level}-${pageNumber || 'unknown'}`,
      'data-heading-id': headingId || '',
    };

    Object.assign(anchorAttributes, {
      style: 'display: flex; justify-content: space-between; align-items: baseline; text-decoration: none; color: inherit;'
    });

    return [
      'div',
      Attribute.mergeAttributes(baseAttributes),
      ['a', anchorAttributes, ...contentElements],
    ];
  },
}); 