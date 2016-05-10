import io from './io'
import sioError from './sio_error'

class OnlineRegistry {

  students = {}
  teachers = {}
  ready = {}

  onUserOnline (socket) {
    socket.join('authenticated')
    socket.join(`user-${socket.userId}`)

    const {role} = socket.user.profile
    let list
    if (role === 'teacher') {
      socket.join('teachers')
      list = this.teachers[socket.userId] = this.teachers[socket.userId] || {}
    } else if (role === 'student') {
      socket.join('students')
      list = this.students[socket.userId] = this.students[socket.userId] || {}
    }
    if (list) list[socket.id] = socket

    this.emitOnline()
    this.emitReady()
  }

  onSocketDisconnect (socket) {
    const {students, teachers, ready} = this

    if (students[socket.userId]) {
      delete students[socket.userId][socket.id]
      if (Object.keys(students[socket.userId]).length === 0) delete students[socket.userId]
    }
    if (teachers[socket.userId]) {
      delete teachers[socket.userId][socket.id]
      if (Object.keys(teachers[socket.userId]).length === 0) delete teachers[socket.userId]
    }
    if (ready[socket.userId]) {
      delete ready[socket.userId][socket.id]
      if (Object.keys(ready[socket.userId]).length === 0) delete ready[socket.userId]
    }

    this.emitOnline()
    this.emitReady()
  }

  onUserReady (socket) {
    if (!socket.user) throw sioError('unauthorized')

    const {role} = socket.user.profile
    if (role !== 'student') throw sioError('onlyStudents')
    const list = this.ready[socket.userId] = this.ready[socket.userId] || {}
    list[socket.id] = socket

    this.emitReady()
  }

  onUserNotReady (socket) {
    if (!socket.user) throw sioError('unauthorized')

    const {ready} = this
    if (ready[socket.userId]) {
      delete ready[socket.userId][socket.id]
      if (Object.keys(ready[socket.userId]).length === 0) delete ready[socket.userId]
    }
    this.emitReady()
  }

  emitOnline (socket) {
    const online = {
      teachers: Object.keys(this.teachers).length,
      students: Object.keys(this.students).length
    }
    io.of('/').in('authenticated').emit('online', online)
  }

  emitReady (socket) {
    const users = Object.keys(this.ready).map((userId) => {
      const {user: {id, profile}} = Object.values(this.ready[userId])[0]
      return {id, profile}
    })
    io.of('/').in('teachers').emit('readyUsers', users)
  }

}

export default new OnlineRegistry()
