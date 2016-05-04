import {WhitelistReceiver} from '../ozora'
import {default as Registry} from './registry'
import createDebug from 'debug'

let debug = createDebug('dhm:localheim:interface')

const $objectId = Symbol()
const $callback = Symbol()
const $registry = Symbol()
const $closed = Symbol()

export default class OzoraUserEncounterInterface {

  constructor({registry, callback}) {
    WhitelistReceiver.mixin(this, ['start', 'accept', 'sendRelay', 'close'])

    if (!callback.ozora.userId) { throw new Error('not authenticated') }

    this[$registry] = registry
    this[$callback] = callback
    this[$objectId] = callback.ozora.register(this)

    this[$callback].on('disconnect', () => this.close({reason: Registry.ReasonDisconnected}))
  }

  get closed() { return this[$closed] }

  get userId() { return this[$callback].ozora.userId }
  get profile() { return this[$callback].ozora.user.profile }
  get objectId() { return this[$objectId] }
  get callback() { return this[$callback] }

  start() {
    if (this.closed) { throw new Error('object closed') }
    return this[$registry].interfaceStart(this)
  }

  accept() {
    if (this.closed) { throw new Error('object closed') }
    return this[$registry].interfaceAccept(this)
  }

  sendRelay(opt) {
    if (this.closed) { throw new Error('object closed') }
    return this[$registry].interfaceSendRelay(this, opt)
  }

  close({reason}) {
    if (this.closed) { return }
    debug('closing object with reason: %s', reason)
    this[$closed] = true
    this[$registry].interfaceClose(this, {reason})
    this[$callback].ozora.unregister(this[$objectId])
    this[$callback].invoke('onClose', {reason: reason}).catch(x => x)
  }
}
