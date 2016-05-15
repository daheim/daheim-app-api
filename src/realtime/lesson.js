import uuid from 'node-uuid'

import sioError from './sio_error'

const debug = require('debug')('dhm:realtime:Lesson')

const INACTIVITY_TIMEOUT = 2 * 60 * 1000

export default class Lesson {
  constructor ({teacherId, studentId}) {
    this.id = uuid.v4()

    this.teacherId = teacherId
    this.studentId = studentId
    this.active = false
    this.handlers = {}
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
    if (this.closed) return
    this.closed = true
    this.closeReason = reason

    debug('%s closing lesson because', this.id, reason)

    if (this.inactiveTimeout) {
      clearTimeout(this.inactiveTimeout)
      delete this.inactiveTimeout
    }

    for (let userId of Object.keys(this.handlers)) {
      const {unsubscribe} = this.handlers[userId]
      unsubscribe()
    }
    this.handlers = {}

    this.onUpdate()
  }

  checkState () {
    const num = Object.keys(this.handlers).length
    const connected = this.connected = num === 2

    if (!this.active && num === 0) {
      debug('%s inviter disconnected before accept', this.id)
      this.close('disconnectBeforeAccept')
      return
    }

    if (!this.active && connected) {
      debug('%s became active', this.id)
      this.startTime = Date.now()
      this.active = true
    }

    if (this.active && !connected && !this.inactiveTimeout) {
      debug('%s starting inactive timeout', this.id)
      this.inactiveTimeout = setTimeout(() => this.handleInactiveTimeout(), INACTIVITY_TIMEOUT)
    }

    if (connected && this.inactiveTimeout) {
      debug('%s stopping inactive timeout', this.id)
      clearTimeout(this.inactiveTimeout)
      delete this.inactiveTimeout
    }

    if (this.active) {
      debug('%s sending connection state; connected: %s', this.id, connected)
      for (let userId of Object.keys(this.handlers)) {
        const {handler} = this.handlers[userId]
        handler.emit('lesson.onConnectionChanged', {id: this.id, connected})
      }
    }

    this.onUpdate()
  }

  toJSON () {
    return {
      id: this.id,
      studentId: this.studentId,
      teacherId: this.teacherId,
      connected: this.connected,
      active: this.active,
      startTime: this.startTime,
      closeReason: this.closeReason
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
