const router = require('express').Router();

const Artwork = require('../models/Artwork');
const ColoringPage = require('../models/ColoringPage');
const ColoringSet = require('../models/ColoringSet');
const auth = require('../middleware/auth');

/*
 * =========================
 * POMOCNICZE
 * =========================
 */

function buildPalette(cells) {
  return [...new Set(cells.map((cell) => cell.color.toLowerCase()))];
}

function validateCells(cells, totalCells) {
  if (!Array.isArray(cells)) {
    return 'cells musi być tablicą.';
  }

  const usedIndexes = new Set();

  for (const cell of cells) {
    if (!cell || typeof cell !== 'object') {
      return 'Nieprawidłowy element cells.';
    }

    if (!Number.isInteger(cell.index)) {
      return 'Index pola musi być liczbą całkowitą.';
    }

    if (cell.index < 0 || cell.index >= totalCells) {
      return `Index pola ${cell.index} znajduje się poza zakresem 0-${totalCells - 1}.`;
    }

    if (usedIndexes.has(cell.index)) {
      return `Pole ${cell.index} zostało podane więcej niż raz.`;
    }

    usedIndexes.add(cell.index);

    if (
      typeof cell.color !== 'string' ||
      !/^#[0-9a-fA-F]{6}$/.test(cell.color)
    ) {
      return `Nieprawidłowy kolor dla pola ${cell.index}. Użyj formatu #RRGGBB.`;
    }
  }

  return null;
}

/*
 * =========================
 * MOJE PRACE
 * =========================
 *
 * GET /api/artworks/my
 */

router.get('/my', auth, async (req, res) => {
  try {
    const artworks = await Artwork.find({
      userId: req.user.id,
    })
      .populate('setId', 'title')
      .populate('pageId', 'title totalCells')
      .sort({ updatedAt: -1 });

    return res.json(artworks);
  } catch (error) {
    console.error('Get my artworks error:', error);

    return res.status(500).json({
      error: 'Nie udało się pobrać Twoich prac.',
    });
  }
});

/*
 * =========================
 * GALERIA PUBLICZNA
 * =========================
 *
 * GET /api/artworks/gallery
 *
 * Opcjonalnie:
 * ?setId=...
 * ?pageId=...
 */

router.get('/gallery', async (req, res) => {
  try {
    const filter = {
      isPublic: true,
    };

    if (req.query.setId) {
      filter.setId = req.query.setId;
    }

    if (req.query.pageId) {
      filter.pageId = req.query.pageId;
    }

    const artworks = await Artwork.find(filter)
      .populate('userId', 'email')
      .populate('setId', 'title')
      .populate('pageId', 'title totalCells')
      .sort({ publishedAt: -1 });

    return res.json(artworks);
  } catch (error) {
    console.error('Get gallery error:', error);

    return res.status(500).json({
      error: 'Nie udało się pobrać galerii.',
    });
  }
});

/*
 * =========================
 * POBIERANIE JEDNEJ PRACY
 * =========================
 *
 * GET /api/artworks/:id
 *
 * Właściciel może zobaczyć swoją prywatną pracę.
 * Inni użytkownicy tylko publiczną.
 */

router.get('/:id', auth, async (req, res) => {
  try {
    const artwork = await Artwork.findById(req.params.id)
      .populate('userId', 'email')
      .populate('setId', 'title description')
      .populate('pageId', 'title totalCells originalImage');

    if (!artwork) {
      return res.status(404).json({
        error: 'Nie znaleziono pracy.',
      });
    }

    const isOwner =
      artwork.userId._id.toString() === req.user.id.toString();

    if (!artwork.isPublic && !isOwner) {
      return res.status(404).json({
        error: 'Nie znaleziono pracy.',
      });
    }

    return res.json(artwork);
  } catch (error) {
    console.error('Get artwork error:', error);

    return res.status(500).json({
      error: 'Nie udało się pobrać pracy.',
    });
  }
});

/*
 * =========================
 * UTWORZENIE PRACY
 * =========================
 *
 * POST /api/artworks
 */

router.post('/', auth, async (req, res) => {
  try {
    const setId = String(req.body.setId || '').trim();
    const pageId = String(req.body.pageId || '').trim();
    const title = String(req.body.title || '').trim();

    const cells = Array.isArray(req.body.cells)
      ? req.body.cells
      : [];

    const beforeImage = String(
      req.body.beforeImage || ''
    ).trim();

    const afterImage = String(
      req.body.afterImage || ''
    ).trim();

    if (!setId) {
      return res.status(400).json({
        error: 'setId jest wymagane.',
      });
    }

    if (!pageId) {
      return res.status(400).json({
        error: 'pageId jest wymagane.',
      });
    }

    if (!title) {
      return res.status(400).json({
        error: 'Tytuł pracy jest wymagany.',
      });
    }

    const coloringSet = await ColoringSet.findById(setId);

    if (!coloringSet) {
      return res.status(404).json({
        error: 'Nie znaleziono zestawu.',
      });
    }

    const coloringPage = await ColoringPage.findById(pageId);

    if (!coloringPage) {
      return res.status(404).json({
        error: 'Nie znaleziono strony kolorowanki.',
      });
    }

    if (coloringPage.setId.toString() !== setId) {
      return res.status(400).json({
        error: 'Strona nie należy do wybranego zestawu.',
      });
    }

    const cellsError = validateCells(
      cells,
      coloringPage.totalCells
    );

    if (cellsError) {
      return res.status(400).json({
        error: cellsError,
      });
    }

    const palette = buildPalette(cells);

    const artwork = new Artwork({
      userId: req.user.id,
      setId,
      pageId,
      title,
      cells,
      palette,
      beforeImage,
      afterImage,
      isPublic: false,
      publishedAt: null,
    });

    await artwork.save();

    return res.status(201).json(artwork);
  } catch (error) {
    console.error('Create artwork error:', error);

    return res.status(500).json({
      error: 'Nie udało się utworzyć pracy.',
    });
  }
});

/*
 * =========================
 * EDYCJA PRACY
 * =========================
 *
 * PUT /api/artworks/:id
 */

router.put('/:id', auth, async (req, res) => {
  try {
    const artwork = await Artwork.findById(req.params.id);

    if (!artwork) {
      return res.status(404).json({
        error: 'Nie znaleziono pracy.',
      });
    }

    if (artwork.userId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        error: 'Nie masz uprawnień do edycji tej pracy.',
      });
    }

    const coloringPage = await ColoringPage.findById(
      artwork.pageId
    );

    if (!coloringPage) {
      return res.status(404).json({
        error: 'Nie znaleziono strony kolorowanki.',
      });
    }

    if (req.body.title !== undefined) {
      const title = String(req.body.title).trim();

      if (!title) {
        return res.status(400).json({
          error: 'Tytuł pracy nie może być pusty.',
        });
      }

      artwork.title = title;
    }

    if (req.body.cells !== undefined) {
      const cells = req.body.cells;

      const cellsError = validateCells(
        cells,
        coloringPage.totalCells
      );

      if (cellsError) {
        return res.status(400).json({
          error: cellsError,
        });
      }

      artwork.cells = cells;
      artwork.palette = buildPalette(cells);
    }

    if (req.body.beforeImage !== undefined) {
      artwork.beforeImage = String(
        req.body.beforeImage || ''
      ).trim();
    }

    if (req.body.afterImage !== undefined) {
      artwork.afterImage = String(
        req.body.afterImage || ''
      ).trim();
    }

    await artwork.save();

    return res.json(artwork);
  } catch (error) {
    console.error('Update artwork error:', error);

    return res.status(500).json({
      error: 'Nie udało się zaktualizować pracy.',
    });
  }
});

/*
 * =========================
 * PUBLIKACJA / UKRYCIE
 * =========================
 *
 * PATCH /api/artworks/:id/public
 *
 * {
 *   "isPublic": true
 * }
 */

router.patch('/:id/public', auth, async (req, res) => {
  try {
    const artwork = await Artwork.findById(req.params.id);

    if (!artwork) {
      return res.status(404).json({
        error: 'Nie znaleziono pracy.',
      });
    }

    if (artwork.userId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        error: 'Nie masz uprawnień do tej pracy.',
      });
    }

    const isPublic = req.body.isPublic;

    if (typeof isPublic !== 'boolean') {
      return res.status(400).json({
        error: 'isPublic musi być wartością true lub false.',
      });
    }

    artwork.isPublic = isPublic;
    artwork.publishedAt = isPublic ? new Date() : null;

    await artwork.save();

    return res.json(artwork);
  } catch (error) {
    console.error('Publish artwork error:', error);

    return res.status(500).json({
      error: 'Nie udało się zmienić widoczności pracy.',
    });
  }
});

/*
 * =========================
 * USUNIĘCIE PRACY
 * =========================
 *
 * DELETE /api/artworks/:id
 */

router.delete('/:id', auth, async (req, res) => {
  try {
    const artwork = await Artwork.findById(req.params.id);

    if (!artwork) {
      return res.status(404).json({
        error: 'Nie znaleziono pracy.',
      });
    }

    if (artwork.userId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        error: 'Nie masz uprawnień do usunięcia tej pracy.',
      });
    }

    await artwork.deleteOne();

    return res.json({
      message: 'Praca została usunięta.',
    });
  } catch (error) {
    console.error('Delete artwork error:', error);

    return res.status(500).json({
      error: 'Nie udało się usunąć pracy.',
    });
  }
});

module.exports = router;