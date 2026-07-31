import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import MarkdownView from '../components/MarkdownView';
import { wikiApi, getErrorMessage } from '../services/api';
import { readStoredLanguage } from '../components/LanguageSwitch';
import '../styles/globals.css';

const LANGUAGES = ['en', 'de'];

const TEXT = {
  en: {
    back: 'Back to wiki',
    loading: 'Loading article...',
    save: 'Save',
    saving: 'Saving...',
    saved: 'Saved.',
    unsaved: 'Unsaved changes',
    title: 'Title',
    summary: 'Short description',
    location: 'Folder',
    rootLevel: 'Top level',
    slug: 'URL name',
    write: 'Write',
    preview: 'Preview',
    split: 'Split',
    publishToggle: 'Publish this language',
    published: 'Published',
    draft: 'Draft',
    loadFailed: 'The article could not be loaded.',
    saveFailed: 'The article could not be saved.',
    uploadFailed: 'The image could not be uploaded.',
    titleRequired: 'Enter a title in at least one language.',
    uploading: 'Uploading...',
    imageHint: 'Tip: paste a screenshot straight into the editor.',
    noImageAtCaret: 'Place the cursor on an image first, then choose an alignment.',
    leaveConfirm: 'You have unsaved changes. Leave anyway?',
    tools: {
      h1: 'Heading 1', h2: 'Heading 2', h3: 'Heading 3',
      bold: 'Bold', italic: 'Italic', strike: 'Strikethrough',
      code: 'Inline code', codeblock: 'Code block', quote: 'Quote',
      ul: 'Bullet list', ol: 'Numbered list', link: 'Link',
      image: 'Insert image', table: 'Table', hr: 'Divider',
      alignLeft: 'Align image left', alignCenter: 'Center image',
      alignRight: 'Align image right', alignNone: 'Remove image alignment'
    }
  },
  de: {
    back: 'Zurück zum Wiki',
    loading: 'Artikel wird geladen...',
    save: 'Speichern',
    saving: 'Speichert...',
    saved: 'Gespeichert.',
    unsaved: 'Ungespeicherte Änderungen',
    title: 'Titel',
    summary: 'Kurzbeschreibung',
    location: 'Ordner',
    rootLevel: 'Oberste Ebene',
    slug: 'URL-Name',
    write: 'Schreiben',
    preview: 'Vorschau',
    split: 'Geteilt',
    publishToggle: 'Diese Sprache veröffentlichen',
    published: 'Veröffentlicht',
    draft: 'Entwurf',
    loadFailed: 'Der Artikel konnte nicht geladen werden.',
    saveFailed: 'Der Artikel konnte nicht gespeichert werden.',
    uploadFailed: 'Das Bild konnte nicht hochgeladen werden.',
    titleRequired: 'Gib in mindestens einer Sprache einen Titel ein.',
    uploading: 'Lädt hoch...',
    imageHint: 'Tipp: Screenshot direkt in den Editor einfügen.',
    noImageAtCaret: 'Setze den Cursor zuerst auf ein Bild und wähle dann eine Ausrichtung.',
    leaveConfirm: 'Es gibt ungespeicherte Änderungen. Trotzdem verlassen?',
    tools: {
      h1: 'Überschrift 1', h2: 'Überschrift 2', h3: 'Überschrift 3',
      bold: 'Fett', italic: 'Kursiv', strike: 'Durchgestrichen',
      code: 'Code inline', codeblock: 'Codeblock', quote: 'Zitat',
      ul: 'Aufzählung', ol: 'Nummerierte Liste', link: 'Link',
      image: 'Bild einfügen', table: 'Tabelle', hr: 'Trennlinie',
      alignLeft: 'Bild linksbündig', alignCenter: 'Bild zentrieren',
      alignRight: 'Bild rechtsbündig', alignNone: 'Ausrichtung entfernen'
    }
  }
};

const emptyTranslation = () => ({ title: '', summary: '', body: '', isPublished: false });

function buildDraft(article) {
  const translations = {};
  for (const language of LANGUAGES) {
    const existing = (article?.translations || []).find(item => item.language === language);
    translations[language] = existing
      ? {
        title: existing.title || '',
        summary: existing.summary || '',
        body: existing.body || '',
        isPublished: Number(existing.is_published) === 1
      }
      : emptyTranslation();
  }
  return {
    id: article?.id || null,
    folderId: article?.folder_id || null,
    slug: article?.slug || '',
    translations
  };
}

function folderOptions(folders, language) {
  const byParent = new Map();
  for (const folder of folders) {
    const key = folder.parent_id || 0;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(folder);
  }
  const titleOf = (folder) => {
    const list = folder.translations || [];
    const match = list.find(item => item.language === language) || list.find(item => item.language === 'en') || list[0];
    return match?.title || folder.slug;
  };
  const output = [];
  const walk = (parentId, depth) => {
    for (const folder of (byParent.get(parentId) || []).sort((a, b) => a.position - b.position)) {
      output.push({ id: folder.id, label: `${'— '.repeat(depth)}${titleOf(folder)}` });
      walk(folder.id, depth + 1);
    }
  };
  walk(0, 0);
  return output;
}

/**
 * Toolbar actions. Each returns how the current selection should be changed:
 * `wrap` surrounds the selection, `prefix` is applied per selected line, and
 * `block` replaces the selection with a template.
 */
const TOOLS = [
  { key: 'h1', label: 'H1', prefix: '# ', kind: 'prefix', group: 'heading' },
  { key: 'h2', label: 'H2', prefix: '## ', kind: 'prefix', group: 'heading' },
  { key: 'h3', label: 'H3', prefix: '### ', kind: 'prefix', group: 'heading' },
  { key: 'bold', label: 'B', wrap: '**', kind: 'wrap', group: 'inline', shortcut: 'b', style: { fontWeight: 700 } },
  { key: 'italic', label: 'I', wrap: '*', kind: 'wrap', group: 'inline', style: { fontStyle: 'italic' }, shortcut: 'i' },
  { key: 'strike', label: 'S', wrap: '~~', kind: 'wrap', group: 'inline', style: { textDecoration: 'line-through' } },
  { key: 'code', label: '</>', wrap: '`', kind: 'wrap', group: 'inline' },
  { key: 'ul', label: '• List', prefix: '- ', kind: 'prefix', group: 'block' },
  { key: 'ol', label: '1. List', prefix: '1. ', kind: 'prefix', group: 'block', ordered: true },
  { key: 'quote', label: '❝', prefix: '> ', kind: 'prefix', group: 'block' },
  { key: 'codeblock', label: 'Code', kind: 'block', blockLevel: true, template: '```\n$SELECTION\n```', group: 'block' },
  { key: 'link', label: '🔗', kind: 'block', template: '[$SELECTION](https://)', group: 'block', shortcut: 'k' },
  { key: 'table', label: 'Table', kind: 'block', blockLevel: true, template: '| A | B |\n| --- | --- |\n| 1 | 2 |', group: 'block' },
  { key: 'hr', label: '―', kind: 'block', blockLevel: true, template: '\n---\n', group: 'block' }
];

export default function WikiEditorPage() {
  const { articleId } = useParams();
  const navigate = useNavigate();
  const uiLanguage = readStoredLanguage() === 'de' ? 'de' : 'en';
  const text = TEXT[uiLanguage];

  const [draft, setDraft] = useState(null);
  const [folders, setFolders] = useState([]);
  const [editorLanguage, setEditorLanguage] = useState('en');
  const [viewMode, setViewMode] = useState('write');
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const bodyRef = useRef(null);

  // The editor is a full-page route, so drop the dashboard chrome while it is open.
  useEffect(() => {
    document.body.classList.add('wiki-editor-route-active');
    return () => document.body.classList.remove('wiki-editor-route-active');
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [articleRes, contentRes] = await Promise.all([
          wikiApi.getArticleForEdit(articleId),
          wikiApi.getAdminContent()
        ]);
        if (cancelled) return;
        setDraft(buildDraft(articleRes.data));
        setFolders(contentRes.data?.folders || []);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, text.loadFailed));
      }
    })();
    return () => { cancelled = true; };
  }, [articleId, text.loadFailed]);

  // Warn before a reload/tab close swallows unsaved work.
  useEffect(() => {
    const handler = (event) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const options = useMemo(() => folderOptions(folders, uiLanguage), [folders, uiLanguage]);
  const translation = draft?.translations?.[editorLanguage];

  const flash = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 2500);
  };

  const patchTranslation = useCallback((patch) => {
    setDraft(current => ({
      ...current,
      translations: {
        ...current.translations,
        [editorLanguage]: { ...current.translations[editorLanguage], ...patch }
      }
    }));
    setDirty(true);
  }, [editorLanguage]);

  const save = useCallback(async () => {
    if (!draft) return;
    if (!LANGUAGES.some(lang => String(draft.translations[lang]?.title || '').trim())) {
      setError(text.titleRequired);
      return;
    }
    setBusy('save');
    try {
      await wikiApi.updateArticle(draft.id, {
        folderId: draft.folderId,
        slug: draft.slug || undefined,
        translations: draft.translations
      });
      setDirty(false);
      setError('');
      flash(text.saved);
    } catch (err) {
      setError(getErrorMessage(err, text.saveFailed));
    } finally {
      setBusy('');
    }
  }, [draft, text.saved, text.saveFailed, text.titleRequired]);

  const leave = () => {
    if (dirty && !window.confirm(text.leaveConfirm)) return;
    navigate('/admin?tab=wiki');
  };

  /* --------------------------------------------------- text transformations */

  const applyToSelection = useCallback((tool) => {
    const field = bodyRef.current;
    if (!field || !translation) return;

    const value = translation.body || '';
    const start = field.selectionStart ?? value.length;
    const end = field.selectionEnd ?? value.length;
    const selected = value.slice(start, end);

    let insert = '';
    let caretStart = start;
    let caretEnd = end;

    if (tool.kind === 'wrap') {
      insert = `${tool.wrap}${selected || ''}${tool.wrap}`;
      caretStart = start + tool.wrap.length;
      caretEnd = caretStart + selected.length;
    } else if (tool.kind === 'prefix') {
      // Apply the prefix to every selected line; on an empty selection, to the
      // line the caret currently sits on.
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const lineEnd = end === start ? (value.indexOf('\n', start) === -1 ? value.length : value.indexOf('\n', start)) : end;
      const block = value.slice(lineStart, lineEnd);
      const lines = block.split('\n');
      const already = lines.every(line => line.startsWith(tool.prefix));
      const next = lines.map((line, i) => {
        const clean = line.replace(/^(#{1,6}\s|[-*+]\s|\d+\.\s|>\s)/, '');
        if (already) return clean;
        return tool.ordered ? `${i + 1}. ${clean}` : `${tool.prefix}${clean}`;
      }).join('\n');
      const nextValue = value.slice(0, lineStart) + next + value.slice(lineEnd);
      patchTranslation({ body: nextValue });
      requestAnimationFrame(() => {
        field.focus();
        field.setSelectionRange(lineStart, lineStart + next.length);
      });
      return;
    } else if (tool.kind === 'block') {
      insert = tool.template.replace('$SELECTION', selected);
      // Block-level templates must start on their own line, otherwise a table
      // or code fence inserted mid-sentence is glued onto the current line and
      // will not be recognised as a block by the renderer.
      let lead = '';
      if (tool.blockLevel && start > 0 && value[start - 1] !== '\n') lead = '\n';
      insert = lead + insert;
      caretStart = start + insert.length;
      caretEnd = caretStart;
      if (tool.key === 'link') {
        // Put the caret on the URL placeholder so it can be typed over.
        caretStart = start + insert.indexOf('](') + 2;
        caretEnd = start + insert.length - 1;
      }
    }

    const nextValue = value.slice(0, start) + insert + value.slice(end);
    patchTranslation({ body: nextValue });
    requestAnimationFrame(() => {
      field.focus();
      field.setSelectionRange(caretStart, caretEnd);
    });
  }, [translation, patchTranslation]);

  const insertAtCaret = useCallback((snippet) => {
    const field = bodyRef.current;
    const value = translation?.body || '';
    if (!field) {
      patchTranslation({ body: `${value}\n${snippet}\n` });
      return;
    }
    const start = field.selectionStart ?? value.length;
    const end = field.selectionEnd ?? value.length;
    patchTranslation({ body: value.slice(0, start) + snippet + value.slice(end) });
    requestAnimationFrame(() => {
      field.focus();
      const caret = start + snippet.length;
      field.setSelectionRange(caret, caret);
    });
  }, [translation, patchTranslation]);

  /**
   * Apply an alignment to the image markdown at (or nearest before) the caret.
   * Alignment is encoded as a #left/#center/#right fragment on the image URL.
   */
  const alignImage = useCallback((align) => {
    const field = bodyRef.current;
    if (!field || !translation) return;
    const value = translation.body || '';
    const caret = field.selectionStart ?? value.length;

    const pattern = /!\[([^\]]*)\]\(([^)\s]+)\)/g;
    let target = null;
    let match;
    while ((match = pattern.exec(value)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      // Prefer the image the caret sits in; otherwise remember the last one
      // that starts before the caret so a click still has an obvious target.
      if (caret >= start && caret <= end) { target = { start, end, alt: match[1], url: match[2] }; break; }
      if (start < caret) target = { start, end, alt: match[1], url: match[2] };
    }

    if (!target) {
      setError(text.noImageAtCaret);
      return;
    }

    const baseUrl = target.url.replace(/#(left|center|right)$/i, '');
    const nextUrl = align ? `${baseUrl}#${align}` : baseUrl;
    const replacement = `![${target.alt}](${nextUrl})`;
    const nextValue = value.slice(0, target.start) + replacement + value.slice(target.end);

    patchTranslation({ body: nextValue });
    setError('');
    requestAnimationFrame(() => {
      field.focus();
      field.setSelectionRange(target.start, target.start + replacement.length);
    });
  }, [translation, patchTranslation, text.noImageAtCaret]);

  const uploadImage = async (file) => {
    if (!file) return;
    setBusy('upload');
    try {
      const response = await wikiApi.uploadImage(file);
      const url = response.data?.url;
      if (url) insertAtCaret(`![${file.name || 'screenshot'}](${url})`);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err, text.uploadFailed));
    } finally {
      setBusy('');
    }
  };

  const handlePaste = (event) => {
    const item = [...(event.clipboardData?.items || [])].find(entry => entry.type.startsWith('image/'));
    const file = item?.getAsFile();
    if (!file) return;
    event.preventDefault();
    uploadImage(file);
  };

  const handleKeyDown = (event) => {
    if (!(event.ctrlKey || event.metaKey)) return;
    const key = event.key.toLowerCase();
    if (key === 's') { event.preventDefault(); save(); return; }
    const tool = TOOLS.find(item => item.shortcut === key);
    if (tool) { event.preventDefault(); applyToSelection(tool); }
  };

  if (error && !draft) {
    return (
      <div className="wiki-editor-page">
        <div className="wiki-editor-topbar">
          <Link to="/admin?tab=wiki" className="btn-secondary btn-small">{text.back}</Link>
        </div>
        <div className="alert alert-danger">{error}</div>
      </div>
    );
  }

  if (!draft) {
    return <div className="wiki-editor-page"><p className="hint-text">{text.loading}</p></div>;
  }

  return (
    <div className="wiki-editor-page">
      <header className="wiki-editor-topbar">
        <div className="wiki-editor-topbar-left">
          <button type="button" className="btn-secondary btn-small" onClick={leave}>← {text.back}</button>
          <span className="wiki-editor-title">{translation?.title || draft.slug}</span>
          {dirty && <span className="wiki-dirty-flag">{text.unsaved}</span>}
        </div>
        <div className="wiki-editor-topbar-right">
          <div className="wiki-language-tabs" role="tablist">
            {LANGUAGES.map(lang => {
              const entry = draft.translations[lang];
              return (
                <button
                  key={lang}
                  type="button"
                  role="tab"
                  aria-selected={editorLanguage === lang}
                  className={`wiki-language-tab ${editorLanguage === lang ? 'active' : ''}`}
                  onClick={() => setEditorLanguage(lang)}
                >
                  {lang.toUpperCase()}
                  <span className={`wiki-language-flag ${entry?.isPublished ? 'published' : 'draft'}`}>
                    {String(entry?.title || '').trim() ? (entry?.isPublished ? text.published : text.draft) : '—'}
                  </span>
                </button>
              );
            })}
          </div>
          <button type="button" className="btn-primary btn-small" onClick={save} disabled={busy === 'save'}>
            {busy === 'save' ? text.saving : text.save}
          </button>
        </div>
      </header>

      {error && <div className="alert alert-danger wiki-editor-alert">{error}</div>}
      {notice && <div className="alert alert-success wiki-editor-alert">{notice}</div>}

      <div className="wiki-editor-metabar">
        <label className="form-group">
          <span>{text.title} ({editorLanguage.toUpperCase()})</span>
          <input type="text" value={translation?.title || ''} onChange={(e) => patchTranslation({ title: e.target.value })} />
        </label>
        <label className="form-group">
          <span>{text.summary}</span>
          <input type="text" value={translation?.summary || ''} onChange={(e) => patchTranslation({ summary: e.target.value })} />
        </label>
        <label className="form-group">
          <span>{text.location}</span>
          <select
            value={draft.folderId || ''}
            onChange={(e) => { setDraft(c => ({ ...c, folderId: e.target.value || null })); setDirty(true); }}
          >
            <option value="">{text.rootLevel}</option>
            {options.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
        </label>
        <label className="form-group">
          <span>{text.slug}</span>
          <input type="text" value={draft.slug} onChange={(e) => { setDraft(c => ({ ...c, slug: e.target.value })); setDirty(true); }} />
        </label>
        <label className="wiki-publish-toggle">
          <span>{text.publishToggle}</span>
          <span className={`toggle-switch ${translation?.isPublished ? 'is-on' : ''}`}>
            <input
              type="checkbox"
              checked={!!translation?.isPublished}
              onChange={(e) => patchTranslation({ isPublished: e.target.checked })}
              aria-label={text.publishToggle}
            />
            <span className="toggle-knob" aria-hidden="true" />
          </span>
        </label>
      </div>

      <div className="wiki-editor-toolbar-bar">
        <div className="wiki-toolbar-tools">
          {['heading', 'inline', 'block'].map(group => (
            <div className="wiki-toolbar-group" key={group}>
              {TOOLS.filter(tool => tool.group === group).map(tool => (
                <button
                  key={tool.key}
                  type="button"
                  className="wiki-toolbar-btn"
                  style={tool.style}
                  title={text.tools[tool.key]}
                  aria-label={text.tools[tool.key]}
                  onClick={() => applyToSelection(tool)}
                  disabled={viewMode === 'preview'}
                >
                  {tool.label}
                </button>
              ))}
            </div>
          ))}
          <div className="wiki-toolbar-group">
            <label className="wiki-toolbar-btn wiki-upload-button" title={text.tools.image}>
              {busy === 'upload' ? text.uploading : `🖼 ${text.tools.image}`}
              <input
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
                onChange={(e) => { uploadImage(e.target.files?.[0]); e.target.value = ''; }}
                hidden
              />
            </label>
            {[
              ['left', '⇤', text.tools.alignLeft],
              ['center', '↔', text.tools.alignCenter],
              ['right', '⇥', text.tools.alignRight],
              ['', '⦸', text.tools.alignNone]
            ].map(([align, glyph, label]) => (
              <button
                key={align || 'none'}
                type="button"
                className="wiki-toolbar-btn"
                title={label}
                aria-label={label}
                onClick={() => alignImage(align)}
                disabled={viewMode === 'preview'}
              >
                {glyph}
              </button>
            ))}
          </div>
        </div>

        <div className="wiki-toolbar-right">
          <div className="wiki-view-toggle">
            {['write', 'split', 'preview'].map(mode => (
              <button
                key={mode}
                type="button"
                className={viewMode === mode ? 'active' : ''}
                onClick={() => setViewMode(mode)}
              >
                {text[mode]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={`wiki-editor-workspace mode-${viewMode}`}>
        {viewMode !== 'preview' && (
          <textarea
            ref={bodyRef}
            className="wiki-body-editor wiki-body-editor-full"
            value={translation?.body || ''}
            onChange={(e) => patchTranslation({ body: e.target.value })}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            placeholder={text.imageHint}
          />
        )}
        {viewMode !== 'write' && (
          <div className="wiki-preview-pane wiki-preview-pane-full">
            <MarkdownView content={translation?.body || ''} language={uiLanguage} />
          </div>
        )}
      </div>
    </div>
  );
}
