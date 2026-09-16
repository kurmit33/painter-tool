const router = require('express').Router();

const ColoringPage = require('../models/ColoringPage');
const ColoringSet = require('../models/ColoringSet');
const auth = require('../middleware/auth');

/*
 * =========================
 * POBIERANIE STRON ZESTAWU
 * =========================
 *
 * GET /api/coloring-pages?setId=...
 *
 * Dostępne publicznie.
 */

router.get('/', async (req, res) => {
  try {
    const { setId } = req.query;

    if (!setId) {
      return res.status(400).json({
        error: 'Parametr setId jest wymagany.',
      });
    }

    const pages = await ColoringPage.find({ setId })
      .sort({ title: 1 });

    return res.json(pages);
  } catch (error) {
    console.error('Get coloring pages error:', error);

    return res.status(500).json({
      error: 'Nie udało się pobrać stron kolorowanki.',
    });
  }
});

/*
 * =========================
 * POBIERANIE JEDNEJ STRONY
 * =========================
 *
 * GET /api/coloring-pages/:id
 */

router.get('/:id', async (req, res) => {
  try {
    const page = await ColoringPage.findById(req.params.id)
      .populate('setId', 'title description')
      .populate('createdBy', 'email');

    if (!page) {
      return res.status(404).json({
        error: 'Nie znaleziono strony kolorowanki.',
      });
    }

    return res.json(page);
  } catch (error) {
    console.error('Get coloring page error:', error);

    return res.status(500).json({
      error: 'Nie udało się pobrać strony kolorowanki.',
    });
  }
});

/*
 * =========================
 * DODAWANIE STRONY
 * =========================
 *
 * POST /api/coloring-pages
 *
 * Wymaga zalogowania.
 *
 * Przykładowe dane:
 *
 * {
 *   "setId": "...",
 *   "title": "Lis",
 *   "totalCells": 48,
 *   "originalImage": "/uploads/original/lis.png"
 * }
 */

router.post('/', auth, async (req, res) => {
  try {
    const setId = String(req.body.setId || '').trim();
    const title = String(req.body.title || '').trim();
    const totalCells = Number(req.body.totalCells);
    const originalImage = String(
      req.body.originalImage || ''
    ).trim();

    if (!setId) {
      return res.status(400).json({
        error: 'setId jest wymagane.',
      });
    }

    if (!title) {
      return res.status(400).json({
        error: 'Tytuł strony jest wymagany.',
      });
    }

    if (!Number.isInteger(totalCells) || totalCells < 1) {
      return res.status(400).json({
        error: 'totalCells musi być liczbą całkowitą większą od 0.',
      });
    }

    if (!originalImage) {
      return res.status(400).json({
        error: 'originalImage jest wymagane.',
      });
    }

    const coloringSet = await ColoringSet.findById(setId);

    if (!coloringSet) {
      return res.status(404).json({
        error: 'Nie znaleziono zestawu kolorowanek.',
      });
    }

    const existingPage = await ColoringPage.findOne({
      setId,
      title: {
        $regex: `^${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
        $options: 'i',
      },
    });

    if (existingPage) {
      return res.status(409).json({
        error: 'Strona o takim tytule już istnieje w tym zestawie.',
        page: existingPage,
      });
    }

    const coloringPage = new ColoringPage({
      setId,
      title,
      totalCells,
      originalImage,
      createdBy: req.user.id,
    });

    await coloringPage.save();

    return res.status(201).json(coloringPage);
  } catch (error) {
    console.error('Create coloring page error:', error);

    return res.status(500).json({
      error: 'Nie udało się utworzyć strony kolorowanki.',
    });
  }
});

module.exports = router;