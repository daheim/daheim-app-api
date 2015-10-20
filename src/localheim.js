import Promise from 'bluebird';
import EventEmitter from 'events';
import uuid from 'node-uuid';
import createDebug from 'debug';

let debug = createDebug('dhm:localheim');

const $id = Symbol('id');
const $state = Symbol('state');
const $members = Symbol('members');

const $onSocketMessage = Symbol('onSocketMessage');
const $onAccept = Symbol('onAccept');
const $onRelay = Symbol('onRelay');
const $onSocketDisconnected = Symbol('onSocketDisconnected');

const StateNew = 'new';
const StateMatch = 'match';
const StateNegotiate = 'negotiate';
class Encounter {

	constructor({participants} = {}) {
		if (!Array.isArray(participants)) { throw new Error(`participants must be defined as an array`); }
		if (participants.length !== 2) { throw new Error(`only 2 participants are supported`); }

		this[$id] = uuid.v4();
		this[$state] = StateNew;

		this[$members] = {};
		let currentId = 1;
		for (let {member} of participants) {
			let id = currentId++;
			if (this[$members][member.userId]) { throw new Error(`participant ${id} is already a member`); }
			this[$members][member.userId] = {id, member};

			member.on('accept', () => this[$onAccept](member.userId));
			member.on('sendRelay', (opt, resultHolder) => this[$onRelay](member.userId, opt, resultHolder));
		}
	}

	start() {
		if (this[$state] !== StateNew) { throw new Error(`cannot call start() in state '${this[$state]}'`); }
		this[$state] = StateMatch;

		for (let {id: selfId, member} of Object.values(this[$members])) {
			let people = Object.values(this[$members]).map(({id, member}) => {
				return {
					id,
					self: id === selfId,
					userId: member.userId
				};
			});

			member.callback.invoke('match', {members: people});
		}
	}

	getPartnerFor(id) {
		let partner = Object.values(this[$members]).filter(o => o.id !== id)[0];
		return { id: partner.id };
	}

	/**
	 * @param {object} opt
	 * @param {boolean} renegotiate true if the clients have to restart the negotiation process
	 */
	replaceSocket({id, socket, renegotiate}) {
		let member = this[$members][id];
		if (!member) { throw new Error(`cannot replace socket: member ${id} not found`); }
		member.socket = socket;
		for (let other of Object.values(this[$members]).filter(o => o.id !== id)) {
			other.cp.send('reconnected', {renegotiate});
		}
	}

	get id() { return this[$id]; }

	[$onAccept](userId) {
		let member = this[$members][userId];
		if (member.ready) { throw new Error('already accepted'); }
		member.ready = true;
		let ready = Object.values(this[$members]).every(member => member.ready);
		if (ready) {
			this[$state] = StateNegotiate;
			setImmediate(() => {
				for (let member of Object.values(this[$members])) {
					member.member.callback.invoke('negotiate');
				}
			});
		}
	}

	[$onRelay](userId, {message} = {}, resultHolder) {
		if (this[$state] !== StateNegotiate) { throw new Error('not yet ready'); }
		let member = this[$members][userId];
		let targetMember = Object.values(this[$members]).filter(o => o.id !== member.id)[0];
		resultHolder.result = targetMember.member.callback.invoke('receiveRelay', {message});
	}

	[$onSocketDisconnected](id) {
		for (let other of Object.values(this[$members]).filter(o => o.id !== id)) {
			other.cp.send('disconnected');
		}
	}

}

export default Encounter;
