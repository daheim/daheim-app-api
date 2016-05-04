import sio from 'socket.io'
import {default as EncounterRegistry, OzoraUserEncounterInterface} from './localheim'
import IceServerProvider from './ice_server_provider'
import {default as Ozora, SioChannel, WhitelistReceiver} from './ozora'
import {User} from './model'
import Promise from 'bluebird'
import Namespace from 'socket.io/lib/namespace'

import createDebug from 'debug'
const debug = createDebug('dhm:realtime')

Promise.promisifyAll(Namespace.prototype)

const $io = Symbol('io')
const $log = Symbol('log')
const $registry = Symbol('registry')
const $tokenHandler = Symbol('tokenHandler')
const $userStore = Symbol('userStore')

const $onConnection = Symbol('onConnection')

const AUTH_TIMEOUT = 60 * 1000

class Realtime {

  constructor({log, tokenHandler, userStore, config}) {
    if (!log) { throw new Error('log must be defined') }
    if (!tokenHandler) { throw new Error('tokenHandler must be defined') }
    if (!userStore) { throw new Error('userStore must be defined') }

    this[$log] = log
    this[$tokenHandler] = this.tokenHandler = tokenHandler
    this[$userStore] = userStore

    let iceServerProvider = new IceServerProvider(config.get('ice'))
    this[$registry] = new EncounterRegistry({iceServerProvider, log})
  }

  listen(server) {
    if (this[$io]) { throw new Error('already started') }

    let io = this[$io] = this.io = sio.listen(server)
    io.on('connection', socket => this[$onConnection](socket))
  }

  [$onConnection](socket) {
    debug('new SIO connection: %s', socket.id)

    let channel = new SioChannel({socket})
    let ozora = new Ozora({channel})
    let zero = new Zero({
      registry: this[$registry],
      tokenHandler: this[$tokenHandler],
      userStore: this[$userStore],
      log: this[$log],
    })
    ozora.register(zero)

    //socket.join('all')

    socket.on('error', (err) => {
      this[$log].error({err: err}, 'client error')
    })

    const authTimeout = setTimeout(() => {
      debug('no auth received in 1 min: %s', socket.id)
      socket.disconnect()
    }, AUTH_TIMEOUT)
    socket.on('auth', async ({token}, cb) => {
      try {
        socket.userId = this.tokenHandler.verifyRealtimeToken(token)
        await this.handleUserConnected(socket)
        cb({ok: true})
        clearTimeout(authTimeout)
        debug('auth success: %s -> userId: %s', socket.id, this.userId)
      } catch (err) {
        cb({ok: false})
        debug('auth error: %s -> %s', socket.id, err.stack)
      }
    })

    socket.on('disconnect', () => {
      debug('SIO disconnected: %s', socket.id)
      this.emitCount()
      this.emitReady()
    })

    socket.on('ready', (data, callback) => {
      if (data.ready) socket.join('ready')
      else socket.leave('ready')
      callback({method: 'ready', data})
      this.emitCount()
      this.emitReady()
    })
  }

  async handleUserConnected (socket) {
    const user = await User.findById(socket.userId)
    const {role} = user.profile
    socket.join(`user-${socket.userId}`)
    socket.join('all')
    if (role === 'teacher') {
      socket.join('teachers')
    } else if (role === 'student') {
      socket.join('students')
    }
    console.log(this.io.of('/').adapter.rooms)
    this.emitCount()
    this.emitReady()
  }

  async emitCount () {
    const ns = this.io.of('/')
    const [t, s, a] = await Promise.map(['teachers', 'students', 'all'], (room) => ns.in(room).clientsAsync())
    ns.emit('online', {
      teachers: t.length,
      students: s.length,
      all: a.length
    })
  }

  async emitReady () {
    const ns = this.io.of('/')
    const r = await ns.in('ready').clientsAsync()
    const users = {}
    r.forEach((id) => users[ns.sockets[id].userId] = true)
    const ready = await User.find({_id: {$in: Object.keys(users)}}).select({profile: 1})
    //ns.in('teachers').emit('readyUsers', ready)
    ns.emit('readyUsers', ready)
  }
}

class Zero extends WhitelistReceiver {

  constructor({registry, tokenHandler, userStore, log}) {
    super(['auth', 'getUserId', 'ready', 'createEncounter'])
    this[$registry] = registry
    this[$tokenHandler] = tokenHandler
    this[$userStore] = userStore
    this[$log] = log
  }

  async auth({accessToken}) {
    try {
      let id = this[$tokenHandler].verifyAccessToken(accessToken)
      let profile = await this[$userStore].getProfile(id)
      this[$log].event('ozora_auth_success', {userId: id})
      this.ozora.user = {id, profile}
      this.ozora.userId = id
    } catch (err) {
      this[$log].event('ozora_auth_error', {err})
      throw err
    }
  }

  createEncounter({callbackId}) {
    let callback = this.ozora.getObject(callbackId)
    let iface = new OzoraUserEncounterInterface({callback, registry: this[$registry]})
    return iface.objectId
  }

}

export default Realtime
