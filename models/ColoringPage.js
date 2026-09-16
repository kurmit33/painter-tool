const mongoose = require('mongoose');

const coloringPageSchema = new mongoose.Schema(
  {
    setId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ColoringSet',
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    totalCells: {
      type: Number,
      required: true,
      min: 1,
    },

    originalImage: {
      type: String,
      default: '',
      required: false,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('ColoringPage', coloringPageSchema);