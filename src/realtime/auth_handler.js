import tokenHandler from '../token_handler'
import sioError from './sio_error'
import {User} from '../model'
import onlineRegistry from './online_registry'
import lessonRegistry from './lesson_registry'

const debug = require('debug')('dhm:realtime:AuthHandler')

class AuthHandler {

  async '$auth' (socket, {token}) {
    if (socket.authRunning) throw sioError('busy')
    socket.authRunning = true

    try {
      let userId
      try {
        userId = tokenHandler.verifyRealtimeToken(token)
      } catch (err) {
        throw sioError('authError')
      }

      const user = await User.findById(userId)
      if (!user) throw sioError('authError')

      socket.userId = user.id
      socket.user = user

      onlineRegistry.onUserOnline(socket)
      lessonRegistry.sendState(socket.userId)
      debug('auth success: %s -> userId: %s', socket.id, socket.userId)
      return {}
    } catch (err) {
      debug('auth error: %s -> %s', socket.id, err.stack)
      throw err
    } finally {
      delete socket.authRunning
    }
  }

  async '$ready' (socket, {ready}) {
    if (ready) onlineRegistry.onUserReady(socket)
    else onlineRegistry.onUserNotReady(socket)
    return {}
  }

  onDisconnect (socket) {
    onlineRegistry.onSocketDisconnect(socket)
  }

}

export default new AuthHandler()
