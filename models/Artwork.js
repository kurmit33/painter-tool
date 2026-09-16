const mongoose = require('mongoose');

const artworkSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    setId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ColoringSet',
      required: true,
    },

    pageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ColoringPage',
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    cells: [
      {
        index: {
          type: Number,
          required: true,
          min: 0,
        },

        color: {
          type: String,
          required: true,
          trim: true,
        },
      },
    ],

    palette: {
      type: [String],
      default: [],
    },

    beforeImage: {
      type: String,
      default: '',
    },

    afterImage: {
      type: String,
      default: '',
    },

    isPublic: {
      type: Boolean,
      default: false,
    },

    publishedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Artwork', artworkSchema);