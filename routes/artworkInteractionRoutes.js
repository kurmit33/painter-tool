const router = require('express').Router();

const Artwork = require('../models/Artwork');
const ArtworkRating = require('../models/ArtworkRating');
const ArtworkComment = require('../models/ArtworkComment');
const auth = require('../middleware/auth');

async function getPublicArtwork(id) {
    return Artwork.findOne({
        _id: id,
        isPublic: true,
    });
}

/*
 * GET /api/artwork-interactions/:artworkId
 */

router.get('/:artworkId', async (req, res) => {
    try {
        const artwork = await getPublicArtwork(
            req.params.artworkId
        );

        if (!artwork) {
            return res.status(404).json({
                error: 'Nie znaleziono publicznej pracy.',
            });
        }

        const ratings = await ArtworkRating.find({
            artworkId: artwork._id,
        });

        const ratingCount = ratings.length;

        const ratingAverage =
            ratingCount > 0
                ? ratings.reduce(
                    (sum, item) =>
                        sum + item.rating,
                    0
                ) / ratingCount
                : 0;

        const comments =
            await ArtworkComment.find({
                artworkId: artwork._id,
            })
                .populate('userId', 'email')
                .sort({ createdAt: -1 });

        return res.json({
            ratingAverage: Number(
                ratingAverage.toFixed(1)
            ),
            ratingCount,
            comments,
        });
    } catch (error) {
        console.error(
            'Get artwork interactions error:',
            error
        );

        return res.status(500).json({
            error:
                'Nie udało się pobrać ocen i komentarzy.',
        });
    }
});

/*
 * POST /api/artwork-interactions/:artworkId/rating
 */

router.post(
    '/:artworkId/rating',
    auth,
    async (req, res) => {
        try {
            const artwork =
                await getPublicArtwork(
                    req.params.artworkId
                );

            if (!artwork) {
                return res.status(404).json({
                    error:
                        'Nie znaleziono publicznej pracy.',
                });
            }

            if (
                artwork.userId.toString() ===
                req.user.id.toString()
            ) {
                return res.status(400).json({
                    error:
                        'Nie możesz oceniać własnej pracy.',
                });
            }

            const rating = Number(
                req.body.rating
            );

            if (
                !Number.isInteger(rating) ||
                rating < 1 ||
                rating > 5
            ) {
                return res.status(400).json({
                    error:
                        'Ocena musi być liczbą od 1 do 5.',
                });
            }

            const result =
                await ArtworkRating.findOneAndUpdate(
                    {
                        artworkId: artwork._id,
                        userId: req.user.id,
                    },
                    {
                        rating,
                    },
                    {
                        new: true,
                        upsert: true,
                        setDefaultsOnInsert: true,
                    }
                );

            return res.json(result);
        } catch (error) {
            console.error(
                'Rate artwork error:',
                error
            );

            return res.status(500).json({
                error:
                    'Nie udało się zapisać oceny.',
            });
        }
    }
);

/*
 * POST /api/artwork-interactions/:artworkId/comments
 */

router.post(
    '/:artworkId/comments',
    auth,
    async (req, res) => {
        try {
            const artwork =
                await getPublicArtwork(
                    req.params.artworkId
                );

            if (!artwork) {
                return res.status(404).json({
                    error:
                        'Nie znaleziono publicznej pracy.',
                });
            }

            const text = String(
                req.body.text || ''
            ).trim();

            if (!text) {
                return res.status(400).json({
                    error:
                        'Komentarz nie może być pusty.',
                });
            }

            if (text.length > 1000) {
                return res.status(400).json({
                    error:
                        'Komentarz może mieć maksymalnie 1000 znaków.',
                });
            }

            const comment =
                await ArtworkComment.create({
                    artworkId: artwork._id,
                    userId: req.user.id,
                    text,
                });

            await comment.populate(
                'userId',
                'email'
            );

            return res.status(201).json(comment);
        } catch (error) {
            console.error(
                'Create comment error:',
                error
            );

            return res.status(500).json({
                error:
                    'Nie udało się dodać komentarza.',
            });
        }
    }
);

/*
 * DELETE /api/artwork-interactions/comments/:commentId
 */

router.delete(
    '/comments/:commentId',
    auth,
    async (req, res) => {
        try {
            const comment =
                await ArtworkComment.findById(
                    req.params.commentId
                );

            if (!comment) {
                return res.status(404).json({
                    error:
                        'Nie znaleziono komentarza.',
                });
            }

            if (
                comment.userId.toString() !==
                req.user.id.toString()
            ) {
                return res.status(403).json({
                    error:
                        'Możesz usunąć tylko swój komentarz.',
                });
            }

            await comment.deleteOne();

            return res.json({
                message:
                    'Komentarz został usunięty.',
            });
        } catch (error) {
            console.error(
                'Delete comment error:',
                error
            );

            return res.status(500).json({
                error:
                    'Nie udało się usunąć komentarza.',
            });
        }
    }
);

router.delete(
    '/:artworkId/rating',
    auth,
    async (req, res) => {
        try {
            const artwork = await getPublicArtwork(
                req.params.artworkId
            );

            if (!artwork) {
                return res.status(404).json({
                    error: 'Nie znaleziono publicznej pracy.',
                });
            }

            await ArtworkRating.deleteOne({
                artworkId: artwork._id,
                userId: req.user.id,
            });

            return res.json({
                message: 'Ocena została usunięta.',
            });
        } catch (error) {
            console.error(
                'Delete artwork rating error:',
                error
            );

            return res.status(500).json({
                error: 'Nie udało się usunąć oceny.',
            });
        }
    }
);

module.exports = router;