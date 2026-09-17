const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
    {
        reporterId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },

        targetType: {
            type: String,
            enum: [
                'artwork',
                'photo',
                'comment',
                'title',
            ],
            required: true,
        },

        targetId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },

        reason: {
            type: String,
            required: true,
            trim: true,
            maxlength: 1000,
        },

        status: {
            type: String,
            enum: [
                'pending',
                'resolved',
                'rejected',
            ],
            default: 'pending',
        },

        moderatorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

reportSchema.index({
    status: 1,
    createdAt: -1,
});

module.exports = mongoose.model(
    'Report',
    reportSchema
);