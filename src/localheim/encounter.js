import uuid from 'node-uuid';
import {default as Registry} from './registry';
import createDebug from 'debug';

let debug = createDebug('dhm:localheim:encounter');

const $id = Symbol('id');
const $state = Symbol('state');
const $members = Symbol('members');
const $registry = Symbol();
const $iceServerProvider = Symbol();

const $close = Symbol();

const StateNew = 'new';
const StateMatch = 'match';
const StateNegotiate = 'negotiate';
const StateClosed = 'closed';

export default class Encounter {

	constructor({registry, participants, iceServerProvider} = {}) {
		if (!Array.isArray(participants)) { throw new Error(`participants must be defined as an array`); }
		if (participants.length !== 2) { throw new Error(`only 2 participants are supported`); }

		this[$registry] = registry;
		this[$id] = uuid.v4();
		this[$state] = StateNew;
		this[$iceServerProvider] = iceServerProvider;

		this[$members] = {};
		let currentId = 1;
		for (let {member} of participants) {
			let id = currentId++;
			if (this[$members][member.userId]) { throw new Error(`participant ${id} is already a member`); }
			this[$members][member.userId] = {id, member, session: 1};
		}

		debug('new encounter %s with members', this[$id], Object.keys(this[$members]));
	}

	get id() { return this[$id]; }
	get members() { return this[$members]; }

	start() {
		if (this[$state] !== StateNew) { throw new Error(`cannot call start() in state '${this[$state]}'`); }
		this[$state] = StateMatch;

		for (let {id: selfId, member} of Object.values(this[$members])) {
			let people = Object.values(this[$members]).map(({id, member, session}) => {
				return {
					id,
					session,
					self: id === selfId,
					userId: member.userId
				};
			});

			(async () => {
				try {
					await member.callback.invoke('onMatch', {members: people});
				} catch (err) {
					member.close({reason: Registry.ReasonProtocolError, notify: true});
				}
			})();
		}
	}

	async reconnect(me) {
		if (this[$state] !== StateNegotiate) { throw new Error('can only reconnect in negotiate state'); }

		let desc = this[$members][me.userId];
		if (!desc) { throw new Error('user is not a member of the encounter'); }

		debug('kicking out old user of %s', me.userId);
		desc.member.close({reason: Registry.ReasonReplaced});

		desc.member = me;
		desc.session++;

		let members = Object.values(this[$members]).map(({id, member, session}) => {
			return {
				id,
				session,
				self: member === me,
				userId: member.userId
			};
		});

		let iceServers = await this[$iceServerProvider].get();
		setImmediate(() => {
			me.callback.invoke('onNegotiate', {iceServers, members});
		});
		for (let {member} of Object.values(this[$members])) {
			if (member === me) { continue; }
			member.callback.invoke('onRenegotiate', {iceServers, partner: desc.id, session: desc.session});
		}

		return 'renegotiate';
	}

	interfaceAccept(me) {
		if (this[$state] !== StateMatch) { throw new Error(`cannot accept in state '${this[$state]}'`); }
		let desc = this[$members][me.userId];
		if (desc.member !== me) { throw new Error('not enlisted'); }
		if (desc.ready) { throw new Error('already accepted'); }
		desc.ready = true;

		let everyoneReady = Object.values(this[$members]).every(member => member.ready);
		if (everyoneReady) {
			this[$state] = StateNegotiate;
			setImmediate(async () => {
				let iceServers = await this[$iceServerProvider].get();
				for (let desc of Object.values(this[$members])) {
					desc.member.callback.invoke('onNegotiate', {iceServers});
				}
			});
		}
	}

	interfaceSendRelay(me, {message, participant, session} = {}) {
		if (this[$state] !== StateNegotiate) { throw new Error(`cannot relay in state '${this[$state]}'`); }
		if (!message) { throw new Error('message must be defined'); }
		let desc = this[$members][me.userId];
		if (desc.member !== me) { throw new Error('not enlisted'); }

		let targetMember = Object.values(this[$members]).filter(o => o.id !== desc.id)[0];
		if (targetMember.id !== participant) {
			throw new Error('invalid participant');
		}
		if (targetMember.session !== session) {
			throw new Error('invalid session');
		}
		return targetMember.member.callback.invoke('onRelay', {message});
	}

	interfaceClose(me, {reason}) {
		if (this[$state] === StateNegotiate && reason === Registry.ReasonDisconnected) {
			debug('user %s disconnected after negotiation state and may reconnect', me.userId);
			return;
		}
		debug('user %s closed', me.userId);
		this[$close]({reason});
	}

	[$close]({reason}) {
		if (this[$state] === StateClosed) { return; }
		this[$state] = StateClosed;

		if (reason !== Registry.ReasonBye) {
			reason = Registry.ReasonPartnerClosed;
		}

		for (let desc of Object.values(this[$members])) {
			desc.member.close({reason, notify: true});
		}
		this[$registry].encounterClose(this);
	}
}
