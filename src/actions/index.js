import {Router} from 'express'
import Promise from 'bluebird'

import tokenHandler from '../token_handler'
import avatars from '../avatars'

import {User, Review} from '../model'

const app = new Router()

function def (action, cb, opt) {
  app.post(action, tokenHandler.auth, async (req, res, next) => {
    try {
      const result = await cb(req, res)
      res.send(result)
    } catch (err) {
      next(err)
    }
  })
}

def('/profile.saveProfile', async (req) => {
  const {user, body} = req
  const {name, topics, languages, inGermanySince, germanLevel, introduction, pictureType, pictureData} = body

  const rollback = []
  const commit = []

  if (name != null) user.profile.name = name
  if (inGermanySince != null) user.profile.inGermanySince = inGermanySince
  if (germanLevel != null) user.profile.germanLevel = germanLevel
  if (introduction != null) user.profile.introduction = introduction

  if (languages) {
    for (let x = 0; x < user.profile.languages2.length; x++) {
      const language = user.profile.languages2[x]
      if (languages[language] !== undefined && !languages[language]) {
        user.profile.languages2.splice(x, 1)
        x--
      }
    }

    for (let x in languages) {
      if (languages[x]) user.profile.languages2.push(x)
    }
  }

  if (topics) {
    for (let x = 0; x < user.profile.topics2.length; x++) {
      const topic = user.profile.topics2[x]
      if (topics[topic] !== undefined && !topics[topic]) {
        user.profile.topics2.splice(x, 1)
        x--
      }
    }

    for (let x in topics) {
      if (topics[x]) user.profile.topics2.push(x)
    }
  }

  if (pictureType) {
    // delete old file in commit hook
    if (user.pictureType === 'file') {
      commit.push(deleteFileHook(user.profile.pictureData))
    }

    if (pictureType === 'gravatar') {
      user.profile.pictureType = 'gravatar'
      user.profile.pictureData = undefined
    } else if (pictureType === 'avatar') {
      if (!avatars[pictureData]) throw new Error('invalid avatar')
      user.profile.pictureType = 'avatar'
      user.profile.pictureData = pictureData
    } else if (pictureType === 'data') {
      // TODO: upload picture
      user.profile.pictureType = 'data'
      user.profile.pictureData = pictureData
      // user.pictureData
      // rollback.push(deleteFileHook(user.profile.pictureData))
    } else {
      throw new Error('invalid picture type')
    }
  }

  try {
    await user.save()
  } catch (err) {
    rollback.map((hook) => hook())
  }

  commit.map((hook) => hook())
  return {user}
})

async function loadUser(id, asUserId) {
  const user = await User.findById(id)
  if (!user) throw new Error('user not found')

  const [receivedReviews, myReview] = await Promise.all([
    Review.find({to: id}),
    Review.findOne({to: id, from: asUserId})
  ])

  const raw = {
    ...user.toJSON().profile,
    id: user.id,
    myReview,
    receivedReviews
  }

  return {
    users: {
      [raw.id]: raw
    }
  }
}

def('/users.loadUser', async (req) => {
  const {id} = req.body

  return loadUser(id, req.user.id)
})


def('/review.sendReview', async (req) => {
  const {user, body} = req

  const {to, rating, text} = body
  const date = new Date()
  // TODO: compare from and to case insensitive
  // TODO: load user
  // TODO: check if had lesson

  const myReview = await Review.update({from: user.id, to}, {$set: {date, rating, text}}, {runValidators: true, upsert: true})

  return loadUser(to, req.user.id)
})

const deleteFileHook = (path) => async () => {
  // TODO: delete azure file
}

export default app
