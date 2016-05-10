import uuid from 'node-uuid'

import sioError from './sio_error'

const debug = require('debug')('dhm:realtime:Lesson')

const INACTIVITY_TIMEOUT = 2 * 60 * 1000

export default class Lesson {
  constructor ({teacherHandler, studentId, onClose}) {
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
    handler.once('disconnect', fn)
    return () => handler.removeListener('disconnect', fn)
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
      oldHandler.handler.emit('lesson.onRemoved', {id: this.id})
      oldHandler.unsubscribe()
    }

    this.handlers[userId] = {
      handler,
      unsubscribe: this.subscribeToDisconnect(handler)
    }

    this.checkState()

    return {}
  }

  leave (handler) {
    const {userId} = handler
    if (userId !== this.teacherId && userId !== this.studentId) throw sioError('notParticipating')

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
      handler.emit('lesson.onClose', {id: this.id})
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
      this.inactiveTimeout = setTimeout(() => this.handleInactiveTimeout(), INACTIVITY_TIMEOUT)
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
        handler.emit('lesson.onConnectionChanged', {id: this.id, connected})
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
      this.handlers[targetId].handler.emit('lesson.relay', {id: this.id, from: userId, data}, resolve)
    })
  }
}
