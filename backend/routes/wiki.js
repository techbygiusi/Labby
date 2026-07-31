const express = require('express');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const wikiService = require('../services/wikiService');
const { logAudit } = require('../services/auditService');

const router = express.Router();

function handleError(res, err, fallback) {
  const status = err?.statusCode || 500;
  if (status >= 500) console.error(fallback, err);
  res.status(status).json({ error: fallback, message: err?.message || fallback });
}

async function writeAudit(req, action, target) {
  try {
    await logAudit(req, action, target);
  } catch (_) { /* auditing must never block a wiki change */ }
}

/* -------------------------------------------------------------------------- */
/* Images                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Public on purpose: rendered <img> tags cannot send the JWT Authorization
 * header, so images are addressed by an unguessable 48-character token instead.
 */
router.get('/images/:token', async (req, res) => {
  try {
    const image = await wikiService.getImageByToken(req.params.token);
    if (!image) return res.status(404).json({ error: 'Not found', message: 'Image not found' });
    res.setHeader('Content-Type', image.mime_type);
    res.setHeader('Cache-Control', 'private, max-age=86400');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', 'inline');
    res.sendFile(image.filePath);
  } catch (err) {
    handleError(res, err, 'Image could not be loaded');
  }
});

/* -------------------------------------------------------------------------- */
/* Portal users - published content only                                       */
/* -------------------------------------------------------------------------- */

router.get('/tree', authMiddleware, async (req, res) => {
  try {
    res.json(await wikiService.buildPublishedTree(req.query.language));
  } catch (err) {
    handleError(res, err, 'Wiki could not be loaded');
  }
});

router.get('/articles/:slug', authMiddleware, async (req, res) => {
  try {
    const article = await wikiService.getPublishedArticleBySlug(req.params.slug, req.query.language);
    if (!article) return res.status(404).json({ error: 'Not found', message: 'Article not found' });
    res.json(article);
  } catch (err) {
    handleError(res, err, 'Article could not be loaded');
  }
});

/* -------------------------------------------------------------------------- */
/* Admin - structure and authoring                                             */
/* -------------------------------------------------------------------------- */

router.get('/admin/content', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [folders, articles] = await Promise.all([
      wikiService.listFolders(),
      wikiService.listArticles()
    ]);
    res.json({ folders, articles, languages: wikiService.SUPPORTED_LANGUAGES });
  } catch (err) {
    handleError(res, err, 'Wiki content could not be loaded');
  }
});

router.post('/admin/folders', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const id = await wikiService.createFolder({
      parentId: req.body?.parentId || null,
      titles: req.body?.titles || {}
    });
    await writeAudit(req, 'wiki_folder_created', `folder_id=${id}`);
    res.status(201).json({ id });
  } catch (err) {
    handleError(res, err, 'Folder could not be created');
  }
});

router.put('/admin/folders/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await wikiService.updateFolder(req.params.id, {
      parentId: req.body?.parentId,
      titles: req.body?.titles,
      position: req.body?.position
    });
    await writeAudit(req, 'wiki_folder_updated', `folder_id=${req.params.id}`);
    res.json({ success: true });
  } catch (err) {
    handleError(res, err, 'Folder could not be saved');
  }
});

router.delete('/admin/folders/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await wikiService.deleteFolder(req.params.id);
    await writeAudit(req, 'wiki_folder_deleted', `folder_id=${req.params.id}`);
    res.json({ success: true });
  } catch (err) {
    handleError(res, err, 'Folder could not be deleted');
  }
});

router.get('/admin/articles/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const article = await wikiService.getArticleById(req.params.id);
    if (!article) return res.status(404).json({ error: 'Not found', message: 'Article not found' });
    res.json(article);
  } catch (err) {
    handleError(res, err, 'Article could not be loaded');
  }
});

router.post('/admin/articles', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const id = await wikiService.createArticle({
      folderId: req.body?.folderId || null,
      slug: req.body?.slug,
      titles: req.body?.translations || {}
    });
    await writeAudit(req, 'wiki_article_created', `article_id=${id}`);
    res.status(201).json({ id });
  } catch (err) {
    handleError(res, err, 'Article could not be created');
  }
});

router.put('/admin/articles/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await wikiService.updateArticle(req.params.id, {
      folderId: req.body?.folderId,
      slug: req.body?.slug,
      position: req.body?.position,
      translations: req.body?.translations,
      updatedBy: req.user?.id
    });
    await writeAudit(req, 'wiki_article_updated', `article_id=${req.params.id}`);
    res.json({ success: true });
  } catch (err) {
    handleError(res, err, 'Article could not be saved');
  }
});

router.delete('/admin/articles/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await wikiService.deleteArticle(req.params.id);
    await writeAudit(req, 'wiki_article_deleted', `article_id=${req.params.id}`);
    res.json({ success: true });
  } catch (err) {
    handleError(res, err, 'Article could not be deleted');
  }
});

/**
 * Raw binary upload. Using express.raw here avoids a multipart dependency and
 * lets the editor send a pasted screenshot straight from the clipboard blob.
 */
router.post(
  '/admin/images',
  authMiddleware,
  adminMiddleware,
  express.raw({ type: Object.keys(wikiService.IMAGE_TYPES), limit: wikiService.MAX_IMAGE_BYTES }),
  async (req, res) => {
    try {
      const stored = await wikiService.storeImage({
        buffer: req.body,
        mimeType: req.headers['content-type'],
        originalName: req.headers['x-filename'],
        uploadedBy: req.user?.id
      });
      await writeAudit(req, 'wiki_image_uploaded', `token=${stored.token}`);
      res.status(201).json(stored);
    } catch (err) {
      handleError(res, err, 'Image could not be uploaded');
    }
  }
);

router.get('/admin/images', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    res.json(await wikiService.listImages());
  } catch (err) {
    handleError(res, err, 'Images could not be loaded');
  }
});

router.delete('/admin/images/:token', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const removed = await wikiService.deleteImage(req.params.token);
    if (!removed) return res.status(404).json({ error: 'Not found', message: 'Image not found' });
    await writeAudit(req, 'wiki_image_deleted', `token=${req.params.token}`);
    res.json({ success: true });
  } catch (err) {
    handleError(res, err, 'Image could not be deleted');
  }
});

module.exports = router;
