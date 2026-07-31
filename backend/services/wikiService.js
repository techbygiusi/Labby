const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { run, get, all } = require('../config/database');

const SUPPORTED_LANGUAGES = ['en', 'de'];
const DEFAULT_LANGUAGE = 'en';

const IMAGE_TYPES = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg'
};

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function uploadsDir() {
  // DB_PATH is relative in docker-compose (./data/hosting.db). res.sendFile()
  // requires an absolute path, so resolve against the process working directory.
  const dataDir = path.dirname(path.resolve(process.env.DB_PATH || path.join(__dirname, '../data/hosting.db')));
  const dir = path.join(dataDir, 'wiki-uploads');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function normalizeLanguage(value) {
  const lang = String(value || '').trim().toLowerCase();
  return SUPPORTED_LANGUAGES.includes(lang) ? lang : DEFAULT_LANGUAGE;
}

function slugify(value, fallback = 'page') {
  const slug = String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug || fallback;
}

/**
 * Guarantee a unique article slug. Articles are addressed by slug in the user
 * portal, so a collision would make one of them unreachable.
 */
async function uniqueArticleSlug(desired, excludeId = null) {
  const base = slugify(desired, 'article');
  let candidate = base;
  let counter = 2;
  /* eslint-disable no-await-in-loop */
  while (true) {
    const row = excludeId
      ? await get('SELECT id FROM wiki_articles WHERE slug = ? AND id != ?', [candidate, excludeId])
      : await get('SELECT id FROM wiki_articles WHERE slug = ?', [candidate]);
    if (!row) return candidate;
    candidate = `${base}-${counter}`;
    counter += 1;
  }
  /* eslint-enable no-await-in-loop */
}

/** Reject folder moves that would place a folder inside its own subtree. */
async function isDescendantFolder(candidateParentId, folderId) {
  let current = candidateParentId;
  const seen = new Set();
  /* eslint-disable no-await-in-loop */
  while (current) {
    if (Number(current) === Number(folderId)) return true;
    if (seen.has(Number(current))) return false;
    seen.add(Number(current));
    const row = await get('SELECT parent_id FROM wiki_folders WHERE id = ?', [current]);
    current = row?.parent_id || null;
  }
  /* eslint-enable no-await-in-loop */
  return false;
}

function pickTranslation(translations, language) {
  const lang = normalizeLanguage(language);
  return translations.find(item => item.language === lang)
    || translations.find(item => item.language === DEFAULT_LANGUAGE)
    || translations[0]
    || null;
}

/* ------------------------------------------------------------------ folders */

async function listFolders() {
  const folders = await all('SELECT * FROM wiki_folders ORDER BY position ASC, id ASC');
  const translations = await all('SELECT * FROM wiki_folder_translations');
  return folders.map(folder => ({
    ...folder,
    translations: translations.filter(item => item.folder_id === folder.id)
  }));
}

async function createFolder({ parentId = null, titles = {} }) {
  const primaryTitle = titles[DEFAULT_LANGUAGE] || Object.values(titles).find(Boolean) || 'Folder';
  const maxRow = await get(
    'SELECT MAX(position) AS maxPosition FROM wiki_folders WHERE parent_id IS ?',
    [parentId || null]
  );
  const result = await run(
    'INSERT INTO wiki_folders (parent_id, slug, position) VALUES (?, ?, ?)',
    [parentId || null, slugify(primaryTitle, 'folder'), Number(maxRow?.maxPosition || 0) + 1]
  );
  await saveFolderTitles(result.lastID, titles);
  return result.lastID;
}

async function saveFolderTitles(folderId, titles = {}) {
  for (const language of SUPPORTED_LANGUAGES) {
    const title = String(titles[language] || '').trim();
    if (!title) {
      await run('DELETE FROM wiki_folder_translations WHERE folder_id = ? AND language = ?', [folderId, language]);
      continue;
    }
    await run(
      `INSERT INTO wiki_folder_translations (folder_id, language, title) VALUES (?, ?, ?)
       ON CONFLICT(folder_id, language) DO UPDATE SET title = excluded.title`,
      [folderId, language, title]
    );
  }
}

async function updateFolder(folderId, { parentId, titles, position }) {
  const folder = await get('SELECT * FROM wiki_folders WHERE id = ?', [folderId]);
  if (!folder) throw Object.assign(new Error('Folder not found'), { statusCode: 404 });

  if (parentId !== undefined) {
    const nextParent = parentId || null;
    if (nextParent && await isDescendantFolder(nextParent, folderId)) {
      throw Object.assign(new Error('A folder cannot be moved into itself'), { statusCode: 400 });
    }
    await run('UPDATE wiki_folders SET parent_id = ? WHERE id = ?', [nextParent, folderId]);
  }
  if (position !== undefined && Number.isFinite(Number(position))) {
    await run('UPDATE wiki_folders SET position = ? WHERE id = ?', [Number(position), folderId]);
  }
  if (titles) {
    await saveFolderTitles(folderId, titles);
    const primaryTitle = titles[DEFAULT_LANGUAGE] || Object.values(titles).find(Boolean);
    if (primaryTitle) {
      await run('UPDATE wiki_folders SET slug = ? WHERE id = ?', [slugify(primaryTitle, 'folder'), folderId]);
    }
  }
  await run('UPDATE wiki_folders SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [folderId]);
}

/**
 * Deleting a folder removes its subtree (ON DELETE CASCADE). Articles are kept
 * and moved to the root so admin content is never silently lost.
 */
async function deleteFolder(folderId) {
  const descendants = await collectFolderSubtree(folderId);
  for (const id of descendants) {
    await run('UPDATE wiki_articles SET folder_id = NULL WHERE folder_id = ?', [id]);
  }
  await run('DELETE FROM wiki_folders WHERE id = ?', [folderId]);
}

async function collectFolderSubtree(folderId) {
  const folders = await all('SELECT id, parent_id FROM wiki_folders');
  const result = [Number(folderId)];
  let added = true;
  while (added) {
    added = false;
    for (const folder of folders) {
      if (folder.parent_id !== null && result.includes(Number(folder.parent_id)) && !result.includes(Number(folder.id))) {
        result.push(Number(folder.id));
        added = true;
      }
    }
  }
  return result;
}

/* ----------------------------------------------------------------- articles */

async function listArticles() {
  const articles = await all('SELECT * FROM wiki_articles ORDER BY position ASC, id ASC');
  const translations = await all('SELECT * FROM wiki_article_translations');
  return articles.map(article => ({
    ...article,
    translations: translations.filter(item => item.article_id === article.id)
  }));
}

async function getArticleById(articleId) {
  const article = await get('SELECT * FROM wiki_articles WHERE id = ?', [articleId]);
  if (!article) return null;
  const translations = await all(
    'SELECT * FROM wiki_article_translations WHERE article_id = ? ORDER BY language ASC',
    [articleId]
  );
  return { ...article, translations };
}

async function createArticle({ folderId = null, slug, titles = {} }) {
  const primaryTitle = titles[DEFAULT_LANGUAGE]?.title || Object.values(titles).find(item => item?.title)?.title || 'New article';
  const finalSlug = await uniqueArticleSlug(slug || primaryTitle);
  const maxRow = await get(
    'SELECT MAX(position) AS maxPosition FROM wiki_articles WHERE folder_id IS ?',
    [folderId || null]
  );
  const result = await run(
    'INSERT INTO wiki_articles (folder_id, slug, position) VALUES (?, ?, ?)',
    [folderId || null, finalSlug, Number(maxRow?.maxPosition || 0) + 1]
  );
  await saveArticleTranslations(result.lastID, titles);
  return result.lastID;
}

async function saveArticleTranslations(articleId, translations = {}) {
  for (const language of SUPPORTED_LANGUAGES) {
    const entry = translations[language];
    if (!entry) continue;

    // An empty title removes the translation entirely, which is how an admin
    // un-publishes a language without deleting the whole article.
    const title = String(entry.title || '').trim();
    if (!title) {
      await run('DELETE FROM wiki_article_translations WHERE article_id = ? AND language = ?', [articleId, language]);
      continue;
    }

    // The wiki is Markdown-only; the column is kept for existing rows.
    const format = 'markdown';
    const isPublished = entry.isPublished ? 1 : 0;
    await run(
      `INSERT INTO wiki_article_translations (article_id, language, title, summary, body, format, is_published, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(article_id, language) DO UPDATE SET
         title = excluded.title,
         summary = excluded.summary,
         body = excluded.body,
         format = excluded.format,
         is_published = excluded.is_published,
         updated_at = CURRENT_TIMESTAMP`,
      [articleId, language, title, String(entry.summary || '').trim(), String(entry.body || ''), format, isPublished]
    );
  }
}

async function updateArticle(articleId, { folderId, slug, position, translations, updatedBy }) {
  const article = await get('SELECT * FROM wiki_articles WHERE id = ?', [articleId]);
  if (!article) throw Object.assign(new Error('Article not found'), { statusCode: 404 });

  if (folderId !== undefined) {
    await run('UPDATE wiki_articles SET folder_id = ? WHERE id = ?', [folderId || null, articleId]);
  }
  if (slug) {
    await run('UPDATE wiki_articles SET slug = ? WHERE id = ?', [await uniqueArticleSlug(slug, articleId), articleId]);
  }
  if (position !== undefined && Number.isFinite(Number(position))) {
    await run('UPDATE wiki_articles SET position = ? WHERE id = ?', [Number(position), articleId]);
  }
  if (translations) await saveArticleTranslations(articleId, translations);

  await run(
    'UPDATE wiki_articles SET updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE id = ?',
    [updatedBy || null, articleId]
  );
}

async function deleteArticle(articleId) {
  await run('DELETE FROM wiki_articles WHERE id = ?', [articleId]);
}

/* --------------------------------------------------------------- user views */

/**
 * Build the tree a portal user sees: only articles published in the requested
 * language (falling back to the default language) and only folders that still
 * contain something after that filter.
 */
async function buildPublishedTree(language) {
  const lang = normalizeLanguage(language);
  const folders = await listFolders();
  const articles = await listArticles();

  const visibleArticles = articles
    .map(article => {
      const published = article.translations.filter(item => Number(item.is_published) === 1);
      if (!published.length) return null;
      const translation = pickTranslation(published, lang);
      if (!translation) return null;
      return {
        id: article.id,
        slug: article.slug,
        folderId: article.folder_id,
        position: article.position,
        title: translation.title,
        summary: translation.summary || '',
        language: translation.language,
        requestedLanguage: lang,
        isTranslated: translation.language === lang,
        availableLanguages: published.map(item => item.language),
        updatedAt: translation.updated_at
      };
    })
    .filter(Boolean);

  const buildBranch = (parentId) => folders
    .filter(folder => (folder.parent_id || null) === (parentId || null))
    .map(folder => {
      const translation = pickTranslation(folder.translations, lang);
      return {
        id: folder.id,
        slug: folder.slug,
        title: translation?.title || folder.slug,
        children: buildBranch(folder.id),
        articles: visibleArticles
          .filter(article => (article.folderId || null) === folder.id)
          .sort((a, b) => a.position - b.position)
      };
    })
    // Hide empty branches so users never click into a folder with nothing in it.
    .filter(node => node.children.length > 0 || node.articles.length > 0);

  return {
    language: lang,
    folders: buildBranch(null),
    rootArticles: visibleArticles
      .filter(article => !article.folderId)
      .sort((a, b) => a.position - b.position)
  };
}

async function getPublishedArticleBySlug(slug, language) {
  const lang = normalizeLanguage(language);
  const article = await get('SELECT * FROM wiki_articles WHERE slug = ?', [slug]);
  if (!article) return null;

  const published = await all(
    'SELECT * FROM wiki_article_translations WHERE article_id = ? AND is_published = 1',
    [article.id]
  );
  if (!published.length) return null;

  const translation = pickTranslation(published, lang);
  if (!translation) return null;

  return {
    id: article.id,
    slug: article.slug,
    folderId: article.folder_id,
    title: translation.title,
    summary: translation.summary || '',
    body: translation.body || '',
    format: 'markdown',
    language: translation.language,
    requestedLanguage: lang,
    isTranslated: translation.language === lang,
    availableLanguages: published.map(item => item.language),
    updatedAt: translation.updated_at
  };
}

/* ------------------------------------------------------------------ images */

async function storeImage({ buffer, mimeType, originalName, uploadedBy }) {
  const extension = IMAGE_TYPES[String(mimeType || '').toLowerCase()];
  if (!extension) {
    throw Object.assign(new Error('Unsupported image type'), { statusCode: 400 });
  }
  if (!buffer || !buffer.length) {
    throw Object.assign(new Error('Empty image upload'), { statusCode: 400 });
  }
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw Object.assign(new Error('Image is too large'), { statusCode: 413 });
  }

  const token = crypto.randomBytes(24).toString('hex');
  const filename = `${token}.${extension}`;
  fs.writeFileSync(path.join(uploadsDir(), filename), buffer, { mode: 0o640 });

  await run(
    `INSERT INTO wiki_images (token, filename, original_name, mime_type, byte_size, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [token, filename, String(originalName || '').slice(0, 200), mimeType, buffer.length, uploadedBy || null]
  );

  return { token, filename, url: `/api/wiki/images/${token}`, byteSize: buffer.length };
}

async function getImageByToken(token) {
  const image = await get('SELECT * FROM wiki_images WHERE token = ?', [String(token || '')]);
  if (!image) return null;
  const filePath = path.join(uploadsDir(), image.filename);
  if (!fs.existsSync(filePath)) return null;
  return { ...image, filePath };
}

async function listImages() {
  return all('SELECT id, token, original_name, mime_type, byte_size, created_at FROM wiki_images ORDER BY created_at DESC LIMIT 200');
}

async function deleteImage(token) {
  const image = await get('SELECT * FROM wiki_images WHERE token = ?', [String(token || '')]);
  if (!image) return false;
  try {
    fs.unlinkSync(path.join(uploadsDir(), image.filename));
  } catch (_) { /* the DB row is removed regardless so the list stays accurate */ }
  await run('DELETE FROM wiki_images WHERE token = ?', [image.token]);
  return true;
}

module.exports = {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  MAX_IMAGE_BYTES,
  IMAGE_TYPES,
  normalizeLanguage,
  slugify,
  listFolders,
  createFolder,
  updateFolder,
  deleteFolder,
  listArticles,
  getArticleById,
  createArticle,
  updateArticle,
  deleteArticle,
  buildPublishedTree,
  getPublishedArticleBySlug,
  storeImage,
  getImageByToken,
  listImages,
  deleteImage
};
