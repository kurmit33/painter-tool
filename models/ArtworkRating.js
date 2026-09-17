const mongoose = require('mongoose');

const artworkRatingSchema = new mongoose.Schema(
    {
        artworkId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Artwork',
            required: true,
        },

        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },

        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },
    },
    {
        timestamps: true,
    }
);

artworkRatingSchema.index(
    {
        artworkId: 1,
        userId: 1,
    },
    {
        unique: true,
    }
);

module.exports = mongoose.model(
    'ArtworkRating',
    artworkRatingSchema
);