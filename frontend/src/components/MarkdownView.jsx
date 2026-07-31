import React, { useCallback, useMemo } from 'react';
import { copyTextToClipboard } from '../utils/clipboard';

/**
 * Small dependency-free Markdown renderer.
 *
 * Safety model: every piece of author input is HTML-escaped FIRST, then only
 * the tags produced by this file are inserted. Raw HTML in the source is never
 * passed through, and link/image URLs are restricted to safe schemes, so no
 * markdown input can inject script.
 */

const SAFE_URL = /^(https?:\/\/|\/|mailto:|#)/i;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeUrl(value) {
  const url = String(value || '').trim();
  return SAFE_URL.test(url) ? escapeHtml(url) : '';
}

/** Inline formatting. Input must already be HTML-escaped. */
function renderInline(text) {
  let out = text;

  // Inline code first so its content is not touched by the other rules.
  const codeSpans = [];
  out = out.replace(/`([^`]+)`/g, (_, code) => {
    codeSpans.push(code);
    return `\u0000CODE${codeSpans.length - 1}\u0000`;
  });

  // Images: ![alt](url) with an optional #left / #center / #right alignment
  // fragment. Markdown has no alignment syntax, so the fragment is used as a
  // convention: it stays valid markdown and the class comes from a fixed
  // allowlist, so nothing author-controlled reaches the class attribute.
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, (match, alt, url, title) => {
    const alignMatch = String(url).match(/#(left|center|right)$/i);
    const align = alignMatch ? alignMatch[1].toLowerCase() : '';
    const cleanUrl = alignMatch ? String(url).slice(0, -alignMatch[0].length) : url;
    const src = safeUrl(cleanUrl);
    if (!src) return match;
    const titleAttr = title ? ` title="${title}"` : '';
    const classAttr = align ? ` class="markdown-img align-${align}"` : ' class="markdown-img"';
    return `<img src="${src}" alt="${alt}"${titleAttr}${classAttr} loading="lazy" />`;
  });

  // Links: [label](url)
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label, url) => {
    const href = safeUrl(url);
    if (!href) return match;
    const external = /^https?:\/\//i.test(href);
    const rel = external ? ' target="_blank" rel="noreferrer noopener"' : '';
    return `<a href="${href}"${rel}>${label}</a>`;
  });

  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  out = out.replace(/(^|[\s(])_([^_\n]+)_/g, '$1<em>$2</em>');
  out = out.replace(/~~([^~]+)~~/g, '<del>$1</del>');

  out = out.replace(/\u0000CODE(\d+)\u0000/g, (_, index) => `<code>${codeSpans[Number(index)]}</code>`);
  return out;
}

function renderTable(rows) {
  const cells = (line) => line.replace(/^\||\|$/g, '').split('|').map(cell => cell.trim());
  const header = cells(rows[0]);
  const body = rows.slice(2).map(cells);
  const head = `<thead><tr>${header.map(cell => `<th>${renderInline(cell)}</th>`).join('')}</tr></thead>`;
  const bodyHtml = body.length
    ? `<tbody>${body.map(row => `<tr>${row.map(cell => `<td>${renderInline(cell)}</td>`).join('')}</tr>`).join('')}</tbody>`
    : '';
  return `<div class="markdown-table-wrap"><table>${head}${bodyHtml}</table></div>`;
}

function markdownToHtml(source, options = {}) {
  const settings = { copyLabel: 'Copy', ...options };
  const escaped = escapeHtml(String(source || '').replace(/\r\n/g, '\n'));
  const lines = escaped.split('\n');
  const html = [];

  let index = 0;
  while (index < lines.length) {
    const line = lines[index];

    // Fenced code block
    if (/^\s*```/.test(line)) {
      const language = line.replace(/^\s*```/, '').trim();
      const buffer = [];
      index += 1;
      while (index < lines.length && !/^\s*```/.test(lines[index])) {
        buffer.push(lines[index]);
        index += 1;
      }
      index += 1;
      const languageClass = language ? ` class="language-${language.replace(/[^a-zA-Z0-9_-]/g, '')}"` : '';
      const languageTag = language
        ? `<span class="markdown-code-lang">${escapeHtml(language)}</span>`
        : '';
      // The copy button is rendered here; MarkdownView delegates its click.
      html.push(
        `<div class="markdown-code-block">`
        + `<div class="markdown-code-toolbar">${languageTag}`
        + `<button type="button" class="markdown-copy-btn" data-markdown-copy aria-label="${escapeHtml(settings.copyLabel)}">`
        + `<span class="markdown-copy-label">${escapeHtml(settings.copyLabel)}</span>`
        + `</button></div>`
        + `<pre><code${languageClass}>${buffer.join('\n')}</code></pre>`
        + `</div>`
      );
      continue;
    }

    // Table (header row + separator row)
    if (/^\s*\|.*\|\s*$/.test(line) && /^\s*\|[\s:|-]+\|\s*$/.test(lines[index + 1] || '')) {
      const buffer = [];
      while (index < lines.length && /^\s*\|.*\|\s*$/.test(lines[index])) {
        buffer.push(lines[index].trim());
        index += 1;
      }
      html.push(renderTable(buffer));
      continue;
    }

    // Headings
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      html.push(`<h${level}>${renderInline(heading[2].trim())}</h${level}>`);
      index += 1;
      continue;
    }

    // Horizontal rule
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      html.push('<hr />');
      index += 1;
      continue;
    }

    // Blockquote
    if (/^\s*&gt;\s?/.test(line)) {
      const buffer = [];
      while (index < lines.length && /^\s*&gt;\s?/.test(lines[index])) {
        buffer.push(lines[index].replace(/^\s*&gt;\s?/, ''));
        index += 1;
      }
      html.push(`<blockquote>${renderInline(buffer.join(' '))}</blockquote>`);
      continue;
    }

    // Lists (unordered and ordered, incl. task list checkboxes)
    if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const items = [];
      while (index < lines.length && /^\s*([-*+]|\d+\.)\s+/.test(lines[index])) {
        const content = lines[index].replace(/^\s*([-*+]|\d+\.)\s+/, '');
        const task = content.match(/^\[( |x|X)\]\s+(.*)$/);
        items.push(task
          ? `<li class="markdown-task"><input type="checkbox" disabled ${task[1].toLowerCase() === 'x' ? 'checked' : ''} /> ${renderInline(task[2])}</li>`
          : `<li>${renderInline(content)}</li>`);
        index += 1;
      }
      html.push(ordered ? `<ol>${items.join('')}</ol>` : `<ul>${items.join('')}</ul>`);
      continue;
    }

    // Blank line
    if (!line.trim()) {
      index += 1;
      continue;
    }

    // Paragraph: collect until a blank line or the start of another block
    const paragraph = [];
    while (
      index < lines.length
      && lines[index].trim()
      && !/^\s*(```|#{1,6}\s|&gt;\s?|[-*+]\s|\d+\.\s)/.test(lines[index])
      && !/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(lines[index])
    ) {
      paragraph.push(lines[index]);
      index += 1;
    }
    if (paragraph.length) {
      html.push(`<p>${renderInline(paragraph.join('\n')).replace(/\n/g, '<br />')}</p>`);
    }
  }

  return html.join('\n');
}

export { markdownToHtml, escapeHtml };

const COPY_LABELS = {
  en: { copy: 'Copy', copied: 'Copied ✓' },
  de: { copy: 'Kopieren', copied: 'Kopiert ✓' }
};

export default function MarkdownView({ content, className = '', language = 'en' }) {
  const labels = COPY_LABELS[language === 'de' ? 'de' : 'en'];

  const html = useMemo(
    () => markdownToHtml(content, { copyLabel: labels.copy }),
    [content, labels.copy]
  );

  /**
   * The body is injected as HTML, so the copy buttons cannot carry React
   * handlers. Delegate from the container instead and read the code text
   * straight from the DOM.
   */
  const handleClick = useCallback(async (event) => {
    const button = event.target.closest?.('[data-markdown-copy]');
    if (!button) return;
    const code = button.closest('.markdown-code-block')?.querySelector('pre code');
    if (!code) return;

    const ok = await copyTextToClipboard(code.innerText);
    const labelNode = button.querySelector('.markdown-copy-label');
    if (!ok || !labelNode) return;

    labelNode.textContent = labels.copied;
    button.classList.add('copied');
    window.setTimeout(() => {
      labelNode.textContent = labels.copy;
      button.classList.remove('copied');
    }, 1600);
  }, [labels.copy, labels.copied]);

  return (
    <div
      className={`markdown-body ${className}`.trim()}
      onClick={handleClick}
      // Safe: every author-supplied character was escaped before any tag was added.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
