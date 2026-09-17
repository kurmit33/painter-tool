const mongoose = require('mongoose');

const artworkCommentSchema = new mongoose.Schema(
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

        text: {
            type: String,
            required: true,
            trim: true,
            maxlength: 1000,
        },
    },
    {
        timestamps: true,
    }
);

artworkCommentSchema.index({
    artworkId: 1,
    createdAt: -1,
});

module.exports = mongoose.model(
    'ArtworkComment',
    artworkCommentSchema
);