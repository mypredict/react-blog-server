const Router = require('koa-router')
const router = new Router()
const fetch = require('node-fetch');

const LoginModel = require('./mongo-model/loginModel')
const ArticleModel = require('./mongo-model/articleModel')
const replyModel = require('./mongo-model/replyModel')

// 处理登录
router.get('/login', async (ctx) => {
  const { code, state } = ctx.query
  let userData = null
  if (code) {
    await fetch(`https://github.com/login/oauth/access_token?code=${code}&client_id=a9a11fbab7c3d5fe46e9&client_secret=694a8a99bcc413711f2463615d4326a0f7bee526`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
      .then(response => response.text())
      .then(async data => {
        const token = data.match(/access_token=(.*?)&/i)
        if (token) {
          await fetch(`https://api.github.com/user?access_token=${token[1]}`, {
            method: 'GET'
          })
            .then(response => response.json())
            .then(async message => {
              userData = await retrieveAuthor(message)
            })
        }
      })
  }
  console.log(userData)
  if (userData.id) {
    ctx.cookies.set(
      'id',
      userData.id,
      {
        domain: 'localhost',
        // domain: 'gljblog.com',
        maxAge: 60 * 60 * 1000,
        httpOnly: false
      }
    )
  }
  ctx.body = state
})
// 检索个人信息
function retrieveAuthor (message) {
  const { id, name, email, avatar_url, html_url, public_repos } = message
  const authorMessage = new LoginModel({
    id,
    name,
    email,
    public_repos,
    headURL: avatar_url,
    github: html_url
  })
  return getAuthor(id, authorMessage)
}
function getAuthor (id, authorMessage) {
  return new Promise((resolve, reject) => {
    LoginModel.findOne({ id }, (err, data) => {
      if (err) {
        reject('serverError')
      }
      if (data) {
        resolve(data)
      } else {
        authorMessage || resolve(saveAuthor(authorMessage, id))
      }
    })
  })
}

// 存储个人信息
function saveAuthor (authorMessage, id) {
  return new Promise((resolve, reject) => {
    authorMessage.save((err) => {
      if (err) {
        reject('serverError')
      }
      resolve(id)
    })
  })
}

// 获取文章
router.get('/getArticle', async (ctx) => {
  const { _id, count = 10, content = false } = ctx.query
  const queryId = _id ? { '_id': { '$lt': _id }, 'visible': true } : { 'visible': true }
  ctx.body = await getSectionArticle(queryId, count, content)
})
// 获取区间文章
function getSectionArticle (queryId, count, content) {
  return new Promise((resolve, reject) => {
    ArticleModel.find(queryId, {content}).limit(count).sort({ '_id': -1 }).exec((err, data) => {
      if (err) {
        reject('serverError')
      }
      resolve(data)
    })
  })
}

// 获取一条文章所有内容(更新文章)
router.get('/getUpdateArticle', async (ctx) => {
  const { _id } = ctx.query
  ctx.body = await getArticle(_id)
})
// 获取一条文章
function getArticle (_id) {
  return new Promise((resolve, reject) => {
    ArticleModel.findOne({_id}, (err, data) => {
      if (err) {
        reject('serverErr')
      }
      resolve(data)
    })
  })
}

// 获取一条文章所有内容(浏览文章)
router.get('/article/:index', async (ctx) => {
  const { index } = ctx.params;
  if (index >= 0) {
    ctx.body = await getIndexArticle(index)
  } else {
    ctx.body = '404'
  }
})
// 根据 index 过去一条文章
function getIndexArticle (index) {
  return new Promise((resolve, reject) => {
    ArticleModel.findOne({index}, (err, data) => {
      const { browse = null } = data
      if (err) {
        reject('serverErr')
      }
      if (browse >= 0) {
        updateBrowse(index, browse + 1)
      }
      resolve(data)
    })
  })
}
// 统计文章点赞量
router.get('/praise', async (ctx) => {
  const { index } = ctx.query
  const article = await getIndexArticle(index)
  ctx.body = await updatePraise(index, article.praise + 1)
})
function updatePraise (index, praise) {
  return new Promise ((resolve, reject) => {
    ArticleModel.updateOne({ index }, { $set: { praise } }, { multi: false }, (err) => {
      if (err) {
        reject(err)
      }
      resolve('praiseSuccess')
    })
  })
}
// 统计文章浏览数
function updateBrowse (index, browse) {
  ArticleModel.updateOne({ index }, { $set: { browse } }, { multi: false }, (err) => {
    if (err) {
      console.log('serverError')
      return
    }
    // console.log('updateSuccess')
  })
}

// 获取文章总数
router.get('/countArticle', async (ctx) => {
  ctx.body = await getCount()
})
function getCount () {
  return new Promise((resolve, reject) => {
    ArticleModel.countDocuments({}, (err, count) => {
      if (err) {
        reject('serverErr')
      }
      resolve(count)
    })
  })
}

// 发表文章
router.post('/pubArticle', async (ctx) => {
  const { title, label, describe, content } = ctx.request.body
  const index = await getCount()
  const articleContent = new ArticleModel({index, title, label, describe, content})
  ctx.body = await retrieveArticle(articleContent, title, index)
})
// 检索文章
function retrieveArticle (articleContent, title, index) {
  return new Promise((resolve, reject) => {
    ArticleModel.findOne({ title }, (err, data) => {
      if (err) {
        reject('serverError')
      }
      if (data) {
        resolve('isRepeat')
      } else {
        resolve(createArticle(articleContent, index))
      }
    })
  })
}
// 创建文章
function createArticle (articleContent, index) {
  return new Promise((resolve, reject) => {
    articleContent.save((err) => {
      if (err) {
        reject('insertError')
      }
      articleReply(index)
      resolve('insertSuccess')
    })
  })
}

// 更新文章
router.post('/updateArticle', async (ctx) => {
  const { _id, title, label, describe, content } = ctx.request.body
  ctx.body = await new Promise((resolve, reject) => {
    ArticleModel.updateOne({ _id }, { $set: { title, label, describe, content } }, { multi: false }, (err) => {
      if (err) {
        reject('serverError')
      }
      resolve('updateSuccess')
    })
  })
})

// 删除(恢复)文章
router.get('/deleteRestoreArticle', async (ctx) => {
  const { _id, visible = false } = ctx.query
  let deleteState = 'defectId'
  if (_id) {
    deleteState = await new Promise((resolve, reject) => {
      ArticleModel.updateOne({ _id }, { $set: { visible } }, { multi: false }, (err) => {
        if (err) {
          reject('serverError')
        }
        resolve('deleteRestoreSuccess')
      })
    })
  }
  ctx.body = deleteState
})

// 创建文章回复文档
function articleReply (index) {
  new replyModel({ index }).save((err) => {
    if (err) {
      console.log(err)
    }
  })
}
// articleReply(-1)
// 访问文章所有回复
router.get('/reply', async (ctx) => {
  const { index } = ctx.query
  const replyData = await queryReply(index)
  ctx.body = replyData || {}
})
// 更新文章回复
router.post('/updateReply', async (ctx) => {
  const { index } = ctx.query
  const { id, time, replyContent } = ctx.request.body
  const { replyTotal, content } = await queryReply(index)
  const { name } = await getAuthor(id)
  content.unshift({
    name,
    time,
    replyContent,
    visible: true,
    index: content.length
  })
  const updateArticleReply = await updateArticleReply(index, replyTotal + 1)
  if (updateArticleReply === 'updateSuccess') {
    ctx.body = await updateReply(index, replyTotal + 1, content)
  }
  ctx.body = 'serverError'
})
// 更新文章回复量
function updateArticleReply (index, replyTotal) {
  return new Promise((resolve, reject) => {
    ArticleModel.updateOne({ index }, { $set: { replyTotal } }, { multi: false }, (err) => {
      if (err) {
        reject('serverError')
      }
      resolve('updateSuccess')
    })
  })
}
// 查看文章回复
function queryReply (index) {
  return new Promise((resolve, reject) => {
    replyModel.findOne({ index }, (err, data) => {
      if (err) {
        reject(err)
      }
      resolve(data)
    })
  })
}
// 更新文章回复(包括操作数据库删除回复)
function updateReply (index, replyTotal, content) {
  return new Promise((resolve, reject) => {
    replyModel.updateOne({ index }, { $set: { replyTotal, content } }, { multi: false }, (err) => {
      if (err) {
        reject(err)
      }
      resolve('replySuccess')
    })
  })
}
// 删除回复
// router.get('/deleteReply', async (ctx) => {
//   const { _id, index } = ctx.query

// })

// 处理留言是否看过

// 处理日志

module.exports = router