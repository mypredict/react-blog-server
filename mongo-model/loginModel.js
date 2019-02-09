const mongoose = require('mongoose')
const Schema = mongoose.Schema
const userSchema = new Schema({
  id: String,
  name: String,
  email: String,
  headURL: String,
  github: String,
  public_repos: Number,
  leaveWordNum: {
    type: Number,
    default: 0
  }
}, {
  timestamps: {
    createdAt: 'created'
  },
  versionKey: false
})
const LoginModel = mongoose.model('users', userSchema)
module.exports = LoginModel