const mongoose = require('mongoose')
const Schema = mongoose.Schema
const articleSchema = new Schema({
  index: Number,
  title: String,
  label: String,
  describe: String,
  content: String,
  visible: {
    type: Boolean,
    default: true
  },
  browse: {
    type: Number,
    default: 0
  },
  words: {
    type: Number,
    default: 0
  },
  praise: {
    type: Number,
    default: 0
  }
}, {
  versionKey: false,
  timestamps: {
    createdAt: 'created',
    updatedAt: 'updated'
  }
})
const ArticleModel = mongoose.model('articles', articleSchema)
module.exports = ArticleModel