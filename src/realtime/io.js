import Server from 'socket.io'

import './promisify'
import authHandler from './auth_handler'
import lessonHandler from './lesson_handler'
import log from '../log'

function attachHandlers (socket, ...handlers) {
  // const onevent = socket.onevent
  socket.onevent = async (packet) => {
    const {id, data} = packet
    const [channel] = data

    let handlerFn
    for (let x = 0; x < handlers.length && !handlerFn; x++) handlerFn = handlers[x]['$' + channel]

    if (!handlerFn) {
      console.warn('unhandled message', packet)
      if (id) socket.ack(id)({error: 'unhandled'})
      return
    }

    const args = [...data]
    args[0] = socket

    let result
    try {
      result = await handlerFn.apply(this, args)
      // console.log('io', data, result)
    } catch (err) {
      // console.log('io', data, err)
      if (err.sio) {
        result = {error: err.sio}
      } else {
        result = {error: 'internalServerError'}
        log.error({err}, 'io error')
      }
    }

    if (id != null) {
      if (result === undefined) log.warn({packet}, 'message needs response but none given')
      socket.ack(id)(result)
    } else {
      if (result !== undefined) log.warn({packet, result}, 'message does not need response, but has one')
    }
  }

  socket.on('disconnect', () => {
    for (let x = 0; x < handlers.length; x++) {
      try {
        if (handlers[x].onDisconnect) handlers[x].onDisconnect(socket)
      } catch (err) {
        log.error({err}, 'onDisconnect handler error')
      }
    }
  })

  for (let handler of handlers) {
    try {
      if (handler.onConnect) handler.onConnect(socket)
    } catch (err) {
      log.error({err}, 'onConnect handler error')
    }
  }
}

const io = new Server()
io.use(authHandler.middleware)
io.on('connection', (socket) => attachHandlers(socket,
  authHandler,
  lessonHandler
))
export default io
