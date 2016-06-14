import io from './io'
import Lesson from './lesson'
import sioError from './sio_error'
import onlineRegistry from './online_registry'

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

    const lesson = new Lesson({teacherId, studentId})
    lesson.onUpdate = () => this.handleLessonUpdate(lesson)

    this.lessons[lesson.id] = lesson
    this.users[teacherId] = this.users[teacherId] || []
    this.users[teacherId].push(lesson)
    this.users[studentId] = this.users[studentId] || []
    this.users[studentId].push(lesson)

    lesson.join(teacherHandler)

    onlineRegistry.onLessonsChanged()

    return lesson
  }

  handleLessonUpdate (lesson) {
    const {teacherId, studentId, closed} = lesson

    this.sendState(teacherId)
    this.sendState(studentId)

    if (closed) this.handleLessonClose(lesson)
  }

  handleLessonClose (lesson) {
    const {id, teacherId, studentId} = lesson
    delete this.lessons[id]

    if (this.users[teacherId]) {
      const index = this.users[teacherId].indexOf(lesson)
      if (index >= 0) this.users[teacherId].splice(index, 1)
      if (this.users[teacherId].length === 0) delete this.users[teacherId]
    }
    if (this.users[studentId]) {
      const index = this.users[studentId].indexOf(lesson)
      if (index >= 0) this.users[studentId].splice(index, 1)
      if (this.users[studentId].length === 0) delete this.users[studentId]
    }

    onlineRegistry.onLessonsChanged()
  }

  sendState (userId) {
    const state = {
      lessons: {},
      closedLessons: {}
    }

    const lessons = this.users[userId] || []
    lessons.forEach((lesson) => {
      const {id, closed} = lesson
      if (closed) {
        state.lessons[id] = null
        state.closedLessons[id] = lesson.toJSON()
      } else {
        state.lessons[id] = lesson.toJSON()
      }
    })

    io.of('/').in(`user-${userId}`).emit('Lesson.onUpdated', state)
  }
}

export default new LessonRegistry()

