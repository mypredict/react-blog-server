const mongoose = require('mongoose')
const Schema = mongoose.Schema
const replySchema = new Schema({
  index: Number,
  replyTotal: {
    type: Number,
    default: 0
  },
  content: {
    type: Array,
    default: []
  }
}, {
  versionKey: false
})
const replyModel = mongoose.model('words', replySchema)
module.exports = replyModel