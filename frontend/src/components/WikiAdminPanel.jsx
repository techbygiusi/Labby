import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { wikiApi, getErrorMessage } from '../services/api';

const LANGUAGES = ['en', 'de'];

/* Compact line icons for the structure actions. Text buttons stacked four wide
   made the tree look cluttered, so the actions are icon-only with tooltips. */
const Icon = {
  folder: () => (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <path d="M1.75 4.25c0-.55.45-1 1-1h3.1c.32 0 .62.15.8.41l.7.96h5.9c.55 0 1 .45 1 1v6.13c0 .55-.45 1-1 1H2.75c-.55 0-1-.45-1-1V4.25Z" />
    </svg>
  ),
  article: () => (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <path d="M4 1.75h5l3 3v9.5H4V1.75Z" />
      <path d="M9 1.75v3h3M5.75 8h4.5M5.75 10.5h4.5" />
    </svg>
  ),
  addFolder: () => (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <path d="M1.75 4.25c0-.55.45-1 1-1h3.1c.32 0 .62.15.8.41l.7.96h5.9c.55 0 1 .45 1 1v6.13c0 .55-.45 1-1 1H2.75c-.55 0-1-.45-1-1V4.25Z" />
      <path d="M8 7.4v4M6 9.4h4" />
    </svg>
  ),
  addArticle: () => (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <path d="M12 7V4.75l-3-3H4v12.5h4" />
      <path d="M9 1.75v3h3M11.5 10v4.25M9.4 12.1h4.2" />
    </svg>
  ),
  edit: () => (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <path d="M11.4 2.35a1.2 1.2 0 0 1 1.7 1.7L5.9 11.25l-2.3.65.65-2.3 7.15-7.25Z" />
    </svg>
  ),
  trash: () => (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <path d="M2.75 4.25h10.5M6.25 4.25V2.9h3.5v1.35M4.4 4.25l.55 9h6.1l.55-9M6.6 6.6v4.4M9.4 6.6v4.4" />
    </svg>
  )
};

const TEXT = {
  en: {
    title: 'Wiki',
    structure: 'Structure',
    newFolder: 'New folder',
    newArticle: 'New article',
    newSubfolder: 'New folder inside this folder',
    newArticleHere: 'New article in this folder',
    emptyFolder: 'This folder is still empty.',
    folderName: 'Folder name',
    rootLevel: 'Top level',
    parentFolder: 'Parent folder',
    save: 'Save',
    saving: 'Saving...',
    cancel: 'Cancel',
    edit: 'Edit',
    remove: 'Delete',
    deleteFolderConfirm: 'Delete this folder? Articles inside it are moved to the top level.',
    deleteArticleConfirm: 'Delete this article including all translations?',
    noArticles: 'No articles yet. Create the first one.',
    dragHint: 'Drag to move this article into another folder',
    moveToTopLevel: 'Drop here to move to the top level',
    saved: 'Saved.',
    saveFailed: 'Could not be saved.',
    loadFailed: 'The wiki content could not be loaded.',
    titleRequired: 'Enter a title in at least one language.'
  },
  de: {
    title: 'Wiki',
    structure: 'Struktur',
    newFolder: 'Neuer Ordner',
    newArticle: 'Neuer Artikel',
    newSubfolder: 'Neuer Ordner in diesem Ordner',
    newArticleHere: 'Neuer Artikel in diesem Ordner',
    emptyFolder: 'Dieser Ordner ist noch leer.',
    folderName: 'Ordnername',
    rootLevel: 'Oberste Ebene',
    parentFolder: 'Übergeordneter Ordner',
    save: 'Speichern',
    saving: 'Speichert...',
    cancel: 'Abbrechen',
    edit: 'Bearbeiten',
    remove: 'Löschen',
    deleteFolderConfirm: 'Diesen Ordner löschen? Enthaltene Artikel werden auf die oberste Ebene verschoben.',
    deleteArticleConfirm: 'Diesen Artikel inklusive aller Übersetzungen löschen?',
    noArticles: 'Noch keine Artikel. Lege den ersten an.',
    dragHint: 'Ziehen, um diesen Artikel in einen anderen Ordner zu verschieben',
    moveToTopLevel: 'Hierhin ziehen, um auf die oberste Ebene zu verschieben',
    saved: 'Gespeichert.',
    saveFailed: 'Konnte nicht gespeichert werden.',
    loadFailed: 'Die Wiki-Inhalte konnten nicht geladen werden.',
    titleRequired: 'Gib in mindestens einer Sprache einen Titel ein.'
  }
};

// Plain text is the default editor; Markdown is opt-in per language.
/** Flatten the folder tree into indented options for the location selects. */
function folderOptions(folders, language) {
  const byParent = new Map();
  for (const folder of folders) {
    const key = folder.parent_id || 0;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(folder);
  }
  const titleOf = (folder) => {
    const translations = folder.translations || [];
    const match = translations.find(item => item.language === language)
      || translations.find(item => item.language === 'en')
      || translations[0];
    return match?.title || folder.slug;
  };
  const output = [];
  const walk = (parentId, depth) => {
    for (const folder of (byParent.get(parentId) || []).sort((a, b) => a.position - b.position)) {
      output.push({ id: folder.id, label: `${'— '.repeat(depth)}${titleOf(folder)}`, depth });
      walk(folder.id, depth + 1);
    }
  };
  walk(0, 0);
  return output;
}

export default function WikiAdminPanel({ language = 'en' }) {
  const uiLanguage = language === 'de' ? 'de' : 'en';
  const text = TEXT[uiLanguage];

  const navigate = useNavigate();
  const openEditor = useCallback((id) => navigate(`/admin/wiki/${id}`), [navigate]);

  const [folders, setFolders] = useState([]);
  const [articles, setArticles] = useState([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [folderForm, setFolderForm] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [dropTarget, setDropTarget] = useState(undefined);
  // Keep the active article in a ref as well as state. Native drag events can
  // reach a drop target before React has committed the drag-start state.
  const draggingIdRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const response = await wikiApi.getAdminContent();
      setFolders(response.data?.folders || []);
      setArticles(response.data?.articles || []);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err, text.loadFailed));
    }
  }, [text.loadFailed]);

  useEffect(() => { load(); }, [load]);

  const options = useMemo(() => folderOptions(folders, uiLanguage), [folders, uiLanguage]);

  const titleOf = useCallback((article) => {
    const translations = article.translations || [];
    const match = translations.find(item => item.language === uiLanguage)
      || translations.find(item => item.language === 'en')
      || translations[0];
    return match?.title || article.slug;
  }, [uiLanguage]);

  const flash = (message) => {
    setNotice(message);
    setTimeout(() => setNotice(''), 2500);
  };

  /* ----------------------------------------------------------- folder ops */

  const submitFolder = async () => {
    if (!folderForm) return;
    const titles = folderForm.titles || {};
    if (!LANGUAGES.some(lang => String(titles[lang] || '').trim())) {
      setError(text.titleRequired);
      return;
    }
    setBusy('folder');
    try {
      if (folderForm.id) {
        await wikiApi.updateFolder(folderForm.id, { parentId: folderForm.parentId || null, titles });
      } else {
        await wikiApi.createFolder({ parentId: folderForm.parentId || null, titles });
      }
      setFolderForm(null);
      await load();
      flash(text.saved);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err, text.saveFailed));
    } finally {
      setBusy('');
    }
  };

  const removeFolder = async (folderId) => {
    if (!window.confirm(text.deleteFolderConfirm)) return;
    setBusy(`folder-${folderId}`);
    try {
      await wikiApi.deleteFolder(folderId);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, text.saveFailed));
    } finally {
      setBusy('');
    }
  };

  /* ---------------------------------------------------------- article ops */

  const createArticle = async (folderId = null) => {
    setBusy('article');
    try {
      const response = await wikiApi.createArticle({
        folderId: folderId || null,
        translations: { en: { title: uiLanguage === 'de' ? 'Neuer Artikel' : 'New article' } }
      });
      const newId = response.data?.id;
      await load();
      setError('');
      if (newId) openEditor(newId);
    } catch (err) {
      setError(getErrorMessage(err, text.saveFailed));
    } finally {
      setBusy('');
    }
  };


  const removeArticle = async (articleId) => {
    if (!window.confirm(text.deleteArticleConfirm)) return;
    setBusy(`article-${articleId}`);
    try {
      await wikiApi.deleteArticle(articleId);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, text.saveFailed));
    } finally {
      setBusy('');
    }
  };



  /* ------------------------------------------------------- drag and drop */

  /**
   * Move an article into another folder. `folderId` is null for the top level.
   * Only the folder changes; title, translations and publish state are untouched.
   */
  const moveArticle = async (articleId, folderId) => {
    const article = articles.find(item => Number(item.id) === Number(articleId));
    if (!article) return;
    const current = article.folder_id === null || article.folder_id === undefined ? null : Number(article.folder_id);
    const next = folderId === null ? null : Number(folderId);
    if (current === next) return; // already there, nothing to do

    setBusy(`move-${articleId}`);
    try {
      await wikiApi.updateArticle(articleId, { folderId: next });
      await load();
      flash(text.saved);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err, text.saveFailed));
    } finally {
      setBusy('');
    }
  };

  const handleDragStart = (event, articleId) => {
    const numericId = Number(articleId);
    draggingIdRef.current = numericId;
    setDraggingId(numericId);
    event.dataTransfer.effectAllowed = 'move';
    // Firefox and Chromium require drag data for custom draggable elements.
    event.dataTransfer.setData('application/x-hosting-portal-wiki-article', String(numericId));
    event.dataTransfer.setData('text/plain', String(numericId));
  };

  const handleDragEnd = () => {
    draggingIdRef.current = null;
    setDraggingId(null);
    setDropTarget(undefined);
  };

  // stopPropagation keeps the innermost folder as the drop target instead of
  // the drop bubbling up to its parents and finally to the top level.
  const handleDragOver = (event, folderId) => {
    if (draggingIdRef.current === null) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
    setDropTarget(folderId === null ? null : Number(folderId));
  };

  const handleDrop = (event, folderId) => {
    const transferredId = Number(
      event.dataTransfer.getData('application/x-hosting-portal-wiki-article')
      || event.dataTransfer.getData('text/plain')
    );
    const articleId = transferredId || draggingIdRef.current;
    if (!articleId) return;

    event.preventDefault();
    event.stopPropagation();
    draggingIdRef.current = null;
    setDraggingId(null);
    setDropTarget(undefined);
    moveArticle(articleId, folderId === null ? null : Number(folderId));
  };

  const rootArticles = articles.filter(article => !article.folder_id);
  const articlesIn = (folderId) => articles.filter(article => Number(article.folder_id) === Number(folderId));
  const childFolders = (parentId) => folders
    .filter(folder => (folder.parent_id || null) === (parentId === null ? null : Number(parentId)))
    .sort((a, b) => a.position - b.position);

  const articleRow = (article) => (
    <li key={`a-${article.id}`}>
      <div
        className={`wiki-admin-article-row ${Number(draggingId) === Number(article.id) ? 'is-dragging' : ''}`}
      >
        <span
          className="wiki-drag-handle"
          draggable
          title={text.dragHint}
          onDragStart={(event) => handleDragStart(event, article.id)}
          onDragEnd={handleDragEnd}
        >
          ⋮⋮
        </span>
        <button type="button" className="wiki-tree-link" draggable="false" onClick={() => openEditor(article.id)}>
          <span className="wiki-row-icon"><Icon.article /></span>
          <span className="wiki-row-label">{titleOf(article)}</span>
        </button>
        <span className="wiki-row-actions">
          <button
            type="button"
            className="wiki-icon-btn danger"
            onClick={() => removeArticle(article.id)}
            disabled={busy === `article-${article.id}`}
            title={text.remove}
            aria-label={text.remove}
            draggable="false"
          >
            <Icon.trash />
          </button>
        </span>
      </div>
    </li>
  );

  /**
   * Render one level of the structure. Folders nest visually instead of being
   * flattened, and each folder carries its own "new subfolder" / "new article"
   * actions so content can be created directly where it belongs.
   */
  const renderBranch = (parentId, depth) => {
    const subFolders = childFolders(parentId);
    const ownArticles = parentId === null ? rootArticles : articlesIn(parentId);
    if (!subFolders.length && !ownArticles.length && depth > 0) {
      return <p className="hint-text wiki-empty-folder">{text.emptyFolder}</p>;
    }

    return (
      <ul className="wiki-tree">
        {ownArticles.map(articleRow)}
        {subFolders.map(folder => {
          const titles = {};
          for (const item of folder.translations || []) titles[item.language] = item.title;
          const label = titles[uiLanguage] || titles.en || folder.slug;
          return (
            <li
              key={`f-${folder.id}`}
              className={`wiki-tree-folder ${dropTarget === folder.id ? 'is-drop-target' : ''}`}
              style={{ '--wiki-depth': depth }}
              onDragOver={(event) => handleDragOver(event, folder.id)}
              onDrop={(event) => handleDrop(event, folder.id)}
            >
              <div className="wiki-admin-folder-row">
                <span className="wiki-row-icon"><Icon.folder /></span>
                <span className="wiki-tree-folder-title">{label}</span>
                <span className="wiki-row-actions">
                  <button
                    type="button"
                    className="wiki-icon-btn"
                    title={text.newSubfolder}
                    aria-label={text.newSubfolder}
                    onClick={() => setFolderForm({ id: null, parentId: folder.id, titles: {} })}
                  >
                    <Icon.addFolder />
                  </button>
                  <button
                    type="button"
                    className="wiki-icon-btn"
                    title={text.newArticleHere}
                    aria-label={text.newArticleHere}
                    onClick={() => createArticle(folder.id)}
                    disabled={busy === 'article'}
                  >
                    <Icon.addArticle />
                  </button>
                  <button
                    type="button"
                    className="wiki-icon-btn"
                    title={text.edit}
                    aria-label={text.edit}
                    onClick={() => setFolderForm({ id: folder.id, parentId: folder.parent_id || null, titles })}
                  >
                    <Icon.edit />
                  </button>
                  <button
                    type="button"
                    className="wiki-icon-btn danger"
                    title={text.remove}
                    aria-label={text.remove}
                    onClick={() => removeFolder(folder.id)}
                    disabled={busy === `folder-${folder.id}`}
                  >
                    <Icon.trash />
                  </button>
                </span>
              </div>
              {renderBranch(folder.id, depth + 1)}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <section className="panel-card wiki-admin-panel">
      <div className="panel-header">
        <h2>{text.title}</h2>
        <div className="wiki-admin-heading-actions">
          <button type="button" className="btn-secondary" onClick={() => setFolderForm({ id: null, parentId: null, titles: {} })}>
            {text.newFolder}
          </button>
          <button type="button" className="btn-primary" onClick={() => createArticle(null)} disabled={busy === 'article'}>
            {text.newArticle}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {notice && <div className="alert alert-success">{notice}</div>}

      {folderForm && (
        <div className="wiki-folder-form panel-inset">
          <h4>{folderForm.id ? text.edit : text.newFolder}</h4>
          <div className="wiki-folder-form-grid">
            {LANGUAGES.map(lang => (
              <label key={lang} className="form-group">
                <span>{text.folderName} ({lang.toUpperCase()})</span>
                <input
                  type="text"
                  value={folderForm.titles?.[lang] || ''}
                  onChange={(event) => setFolderForm(current => ({
                    ...current,
                    titles: { ...current.titles, [lang]: event.target.value }
                  }))}
                />
              </label>
            ))}
            <label className="form-group">
              <span>{text.parentFolder}</span>
              <select
                value={folderForm.parentId || ''}
                onChange={(event) => setFolderForm(current => ({ ...current, parentId: event.target.value || null }))}
              >
                <option value="">{text.rootLevel}</option>
                {options.filter(option => option.id !== folderForm.id).map(option => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="wiki-folder-form-actions">
            <button type="button" className="btn-primary btn-small" onClick={submitFolder} disabled={busy === 'folder'}>
              {busy === 'folder' ? text.saving : text.save}
            </button>
            <button type="button" className="btn-secondary btn-small" onClick={() => setFolderForm(null)}>{text.cancel}</button>
          </div>
        </div>
      )}

      <div className="wiki-structure-card">
        <div className="wiki-structure-head">
          <h3>{text.structure}</h3>
        </div>
        {draggingId !== null && (
          <div
            className={`wiki-root-dropzone ${dropTarget === null ? 'is-drop-target' : ''}`}
            onDragOver={(event) => handleDragOver(event, null)}
            onDrop={(event) => handleDrop(event, null)}
          >
            {text.moveToTopLevel}
          </div>
        )}

        {!articles.length && !folders.length
          ? <p className="hint-text">{text.noArticles}</p>
          : renderBranch(null, 0)}
      </div>
    </section>
  );
}
