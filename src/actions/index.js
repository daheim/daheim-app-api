import {Router} from 'express'

import tokenHandler from '../token_handler'
import avatars from '../avatars'

import {User} from '../model'

const app = new Router()

function def (action, cb, opt) {
  app.use((req, res, next) => {
    console.log('yeah')
    next()
  })
  app.post(action, tokenHandler.auth, async (req, res, next) => {
    try {
      const result = await cb(req, res)
      res.send(result)
    } catch (err) {
      next(err)
    }
  })
}

def('/profile/save', async (req) => {
  const {user, body} = req
  const {name, pictureType, pictureData} = body
  // const {pictureType: oldPictureType, avatarData: oldPictureData} = user

  const rollback = []
  const commit = []

  if (name) {
    user.profile.name = name
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

def('/users.loadUser', async (req) => {
  const {id} = req.body

  const user = await User.findById(id)
  if (!user) throw new Error('user not found')

  const raw = {...user.toJSON().profile, id: user.id}
  return {
    users: {
      [raw.id]: raw
    }
  }
})

const deleteFileHook = (path) => async () => {
  // TODO: delete azure file
}

export default app
