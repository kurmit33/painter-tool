const router = require('express').Router();

const ColoringSet = require('../models/ColoringSet');
const auth = require('../middleware/auth');

/*
 * =========================
 * POBIERANIE ZESTAWÓW
 * =========================
 *
 * GET /api/coloring-sets
 *
 * Opcjonalnie:
 * ?search=kot
 */

router.get('/', async (req, res) => {
  try {
    const search = String(req.query.search || '').trim();

    const filter = {};

    if (search) {
      filter.title = {
        $regex: search,
        $options: 'i',
      };
    }

    const sets = await ColoringSet.find(filter)
      .populate('createdBy', 'email')
      .sort({ title: 1 });

    return res.json(sets);
  } catch (error) {
    console.error('Get coloring sets error:', error);

    return res.status(500).json({
      error: 'Nie udało się pobrać zestawów.',
    });
  }
});

/*
 * =========================
 * POBIERANIE JEDNEGO ZESTAWU
 * =========================
 *
 * GET /api/coloring-sets/:id
 */

router.get('/:id', async (req, res) => {
  try {
    const coloringSet = await ColoringSet.findById(req.params.id)
      .populate('createdBy', 'email');

    if (!coloringSet) {
      return res.status(404).json({
        error: 'Nie znaleziono zestawu.',
      });
    }

    return res.json(coloringSet);
  } catch (error) {
    console.error('Get coloring set error:', error);

    return res.status(500).json({
      error: 'Nie udało się pobrać zestawu.',
    });
  }
});

/*
 * =========================
 * DODAWANIE ZESTAWU
 * =========================
 *
 * POST /api/coloring-sets
 *
 * Wymaga zalogowania.
 */

router.post('/', auth, async (req, res) => {
  try {
    const title = String(req.body.title || '').trim();
    const description = String(req.body.description || '').trim();

    if (!title) {
      return res.status(400).json({
        error: 'Tytuł zestawu jest wymagany.',
      });
    }

    const existingSet = await ColoringSet.findOne({
      title: {
        $regex: `^${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
        $options: 'i',
      },
    });

    if (existingSet) {
      return res.status(409).json({
        error: 'Taki zestaw już istnieje.',
        set: existingSet,
      });
    }

    const coloringSet = new ColoringSet({
      title,
      description,
      createdBy: req.user.id,
    });

    await coloringSet.save();

    return res.status(201).json(coloringSet);
  } catch (error) {
    console.error('Create coloring set error:', error);

    return res.status(500).json({
      error: 'Nie udało się utworzyć zestawu.',
    });
  }
});

module.exports = router;