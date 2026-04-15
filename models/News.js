const mongoose = require("mongoose");

const newsSchema = new mongoose.Schema({
  title: String,
  description: String,
  imageUrl: String,
  link: String,
  category: String,
  language: { type: String, enum: ["en", "te"] },
  source: String,
  publishedAt: {
  type: Date,
  default: Date.now
},

 externalId: {
  type: String,
  unique: true,
  sparse: true   
},

  location: {
    type: String,
    default: "general"
  },

  mandal: {
  type: String,
  default: null
},

  isManual: {
    type: Boolean,
    default: false
  },

  videoUrl: {
  type: String,
  default: null
}
});

module.exports = mongoose.model("News", newsSchema);
