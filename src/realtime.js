import sio from 'socket.io'
import IceServerProvider from './ice_server_provider'
import {User} from './model'
import Promise from 'bluebird'
import Namespace from 'socket.io/lib/namespace'
import uuid from 'node-uuid'
import tokenHandler from './token_handler'

import createDebug from 'debug'
const debug = createDebug('dhm:realtime')

Promise.promisifyAll(Namespace.prototype)

const $io = Symbol('io')
const $log = Symbol('log')
const $tokenHandler = Symbol('tokenHandler')
const $userStore = Symbol('userStore')

const $onConnection = Symbol('onConnection')

const AUTH_TIMEOUT = 60 * 1000

function sioError(code) {
  const error = new Error(code)
  error.sio = code
  return error
}

// TODO: make proper singleton
let io

class LessonRegistry {

  lessons = {}
  users = {}

  create ({studentId, teacherHandler}) {
    const teacherId = teacherHandler.userId

    if (this.users[teacherId]) {
      this.users[teacherId].forEach((lesson) => {
        if (lesson.active) throw sioError('alreadyInLesson')
      })
    }

    const lesson = new Lesson({
      teacherHandler: teacherHandler,
      studentId: studentId,
      onClose: () => this.onLessonClose(lesson)
    })

    this.lessons[lesson.id] = lesson
    this.users[teacherId] = this.users[teacherId] || []
    this.users[teacherId].push(lesson)
    this.users[studentId] = this.users[studentId] || []
    this.users[studentId].push(lesson)

    this.sendState(teacherId)
    this.sendState(studentId)

    return lesson
  }

  onLessonClose (lesson) {
    console.log('closing lesson', lesson)

    const {id, teacherId, studentId} = lesson
    delete this.lessons[id]

    this.users[teacherId].splice(this.users[teacherId].indexOf(lesson), 1)
    if (this.users[teacherId].length === 0) delete this.users[teacherId]
    this.users[studentId].splice(this.users[studentId].indexOf(lesson), 1)
    if (this.users[studentId].length === 0) delete this.users[studentId]

    this.sendState(teacherId)
    this.sendState(studentId)
  }

  sendState (userId) {
    const state = {}
    const lessons = this.users[userId] || []
    lessons.forEach(({id, active, studentId, teacherId}) => {
      state[id] = {id, active, studentId, teacherId}
    })

    io.of('/').in(`user-${userId}`).emit('Lesson.onUpdated', state)
  }
}

const lessonRegistry = new LessonRegistry()

class Handler {

  static use (socket) {
    return socket.handler = new Handler(socket)
  }

  constructor (socket) {
    this.socket = socket

    const nop = () => null

    // register dollar sign handlers
    const onevent = socket.onevent
    socket.onevent = async (packet) => {
      const {id, data: [channel, ...args]} = packet
      const cb = id == null ? nop : socket.ack(id)

      const handlerFn = this['$' + channel]
      if (handlerFn) {
        try {
          const result = await handlerFn.apply(this, args)
          cb(result)
        } catch (err) {
          if (err.sio) return cb({error: err.sio})
          cb({error: 'internalServerError'})
          console.error(err.stack)
        }
      } else {
        onevent.call(socket, packet)
      }
    }

    socket.on('disconnect', () => this.handleDisconnect())
  }

  handleDisconnect () {
    this.emitCount()
    this.emitReady()
  }

  async $auth ({token}) {
    try {
      this.userId = this.socket.userId = tokenHandler.verifyRealtimeToken(token)
    } catch (err) {
      debug('auth error: %s -> %s', this.socket.id, err.stack)
      throw sioError('authError')
    }

    this.handleUserConnected()
    // clearTimeout(authTimeout)
    debug('auth success: %s -> userId: %s', this.socket.id, this.userId)
    return {}
  }

  $ready ({ready}) {
    if (ready) this.socket.join('ready')
    else this.socket.leave('ready')
    this.emitCount()
    this.emitReady()
    return {}
  }

  async '$Lesson.create' ({userId}) {
    // TODO: check if teacher
    // TODO: check if student invited

    const lesson = lessonRegistry.create({
      teacherHandler: this,
      studentId: userId
    })

    return {id: lesson.id}
  }

  async '$lesson.join' ({id}) {
    const lesson = lessonRegistry.lessons[id]
    if (!lesson) throw sioError('lessonNotFound')

    return lesson.join(this)
  }

  async '$lesson.relay' ({id, data}) {
    const lesson = lessonRegistry.lessons[id]
    if (!lesson) throw sioError('lessonNotFound')

    return lesson.relay(this, data)
  }

  async '$lesson.leave' ({id}) {
    const lesson = lessonRegistry.lessons[id]
    if (!lesson) throw sioError('lessonNotFound')

    return lesson.leave(this)
  }

  async handleUserConnected () {
    const user = await User.findById(this.userId)
    const {role} = user.profile
    this.socket.join(`user-${this.userId}`)
    this.socket.join('all')
    if (role === 'teacher') {
      this.socket.join('teachers')
    } else if (role === 'student') {
      this.socket.join('students')
    }
    this.emitCount()
    this.emitReady()
    lessonRegistry.sendState(this.userId)
  }

  async emitCount () {
    const [t, s, a] = await Promise.map(['teachers', 'students', 'all'], (room) => this.socket.nsp.in(room).clientsAsync())
    this.socket.nsp.emit('online', {
      teachers: t.length,
      students: s.length,
      all: a.length
    })
  }

  async emitReady () {
    const ns = this.socket.nsp
    const r = await ns.in('ready').clientsAsync()
    const users = {}
    r.forEach((id) => {
      const {userId} = ns.sockets[id].handler
      if (userId) users[userId] = true
    })
    const ready = await User.find({_id: {$in: Object.keys(users)}}).select({profile: 1})
    //ns.in('teachers').emit('readyUsers', ready)
    ns.emit('readyUsers', ready)
  }
}

class Realtime {

  constructor({log, tokenHandler, userStore, config}) {
    if (!log) { throw new Error('log must be defined') }
    if (!tokenHandler) { throw new Error('tokenHandler must be defined') }
    if (!userStore) { throw new Error('userStore must be defined') }

    this[$log] = log
    this[$tokenHandler] = this.tokenHandler = tokenHandler
    this[$userStore] = userStore
    this.lessons = {}

    let iceServerProvider = new IceServerProvider(config.get('ice'))
  }

  listen(server) {
    if (this[$io]) { throw new Error('already started') }

    io = this[$io] = this.io = sio.listen(server)
    io.on('connection', socket => this[$onConnection](socket))
  }

  [$onConnection](socket) {
    debug('new SIO connection: %s', socket.id)
    Handler.use(socket)

    socket.on('error', (err) => {
      this[$log].error({err: err}, 'client error')
    })
  }
}

class Lesson {
  constructor({teacherHandler, studentId, onClose}) {
    this.id = uuid.v4()

    this.teacherId = teacherHandler.userId
    this.studentId = studentId
    this.onClose = onClose
    this.active = false
    this.handlers = {}

    this.join(teacherHandler)
  }

  subscribeToDisconnect (handler) {
    const fn = () => this.handleDisconnect(handler)
    handler.socket.once('disconnect', fn)
    return () => handler.socket.removeListener('disconnect', fn)
  }

  handleDisconnect (handler) {
    const {userId} = handler
    const def = this.handlers[userId]

    if (!def || def.handler !== handler) return

    debug('%s user disconnected %s', this.id, userId)

    def.unsubscribe()
    delete this.handlers[userId]
    this.checkState()
  }

  join (handler) {
    const {userId} = handler
    if (userId !== this.teacherId && userId !== this.studentId) throw sioError('notParticipating')

    debug('%s user joining %s', this.id, userId)

    const oldHandler = this.handlers[userId]
    if (oldHandler) {
      oldHandler.handler.socket.emit('lesson.onRemoved', {id: this.id})
      oldHandler.unsubscribe()
    }

    this.handlers[userId] = {
      handler: handler,
      unsubscribe: this.subscribeToDisconnect(handler)
    }

    this.checkState()

    return {}
  }

  leave (handler) {
    const {userId} = handler
    const def = this.handlers[userId]
    if (!def || def.handler !== handler) throw sioError('notParticipating')

    debug('%s user leaving %s', this.id, userId)
    this.close('userLeft')
  }

  handleInactiveTimeout () {
    debug('%s inactive timeout fired', this.id)
    this.close('inactiveTimeout')
  }

  close (reason) {
    debug('%s closing lesson because', this.id, reason)

    for (let userId of Object.keys(this.handlers)) {
      const {handler, unsubscribe} = this.handlers[userId]
      handler.socket.emit('lesson.onClose', {id: this.id})
      unsubscribe()
    }
    this.handlers = {}

    this.onClose('inactiveTimeout')
  }

  checkState () {
    const num = Object.keys(this.handlers).length

    if (!this.active && num === 2) {
      this.startTime = new Date()
      this.active = true
      debug('%s became active', this.id)
    }

    if (!this.active && num === 0) {
      this.onClose('disconnectBeforeAccept')
      debug('%s inviter disconnected before accept', this.id)
    }

    if (this.active && num < 2 && !this.inactiveTimeout) {
      this.inactiveTimeout = setTimeout(() => this.handleInactiveTimeout(), 20 * 1000)
      debug('%s starting inactive timeout', this.id)
    }

    if (num === 2 && this.inactiveTimeout) {
      clearTimeout(this.inactiveTimeout)
      delete this.inactiveTimeout
      debug('%s stopping inactive timeout', this.id)
    }

    if (this.active) {
      const connected = num === 2
      debug('%s sending connection state; connected: %s', this.id, connected)
      for (let userId of Object.keys(this.handlers)) {
        const {handler} = this.handlers[userId]
        handler.socket.emit('lesson.onConnectionChanged', {id: this.id, connected})
      }
    }
  }

  async relay (handler, data) {
    const {userId} = handler
    const def = this.handlers[userId]

    if (!def || def.handler !== handler) throw sioError('notAllowed')

    const [targetId] = Object.keys(this.handlers).filter((id) => id !== userId)
    if (!targetId) throw sioError('notConnected')

    return new Promise((resolve) => {
      this.handlers[targetId].handler.socket.emit('lesson.relay', {id: this.id, from: userId, data}, resolve)
    })
  }
}

export default Realtime
