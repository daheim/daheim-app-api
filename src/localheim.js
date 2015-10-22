import EventEmitter from 'events';
import uuid from 'node-uuid';
import {WhitelistReceiver} from './ozora';
import SerialPool from './serial_pool';
import createDebug from 'debug';

let debug = createDebug('dhm:localheim');

const $id = Symbol('id');
const $state = Symbol('state');
const $members = Symbol('members');
const $registry = Symbol();
const $iceServerProvider = Symbol();

const $close = Symbol();

const $setEncounter = Symbol();
const $memberAccept = Symbol();
const $memberRelay = Symbol();
const $memberReject = Symbol();

const $encounterClosed = Symbol();

const StateNew = 'new';
const StateMatch = 'match';
const StateNegotiate = 'negotiate';
const StateClosed = 'closed';

export class Encounter {

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
			member[$setEncounter](this);
			this[$members][member.userId] = {id, member};
		}

		debug('new encounter %s with members', this[$id], Object.keys(this[$members]));
	}

	get id() { return this[$id]; }
	get members() { return this[$members]; }

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

	async reconnect(member) {
		if (this[$state] === StateClosed) { throw new Error('encounter already closed'); }

		let found = Object.values(this[$members]).some(desc => {
			if (desc.member.userId === member.userId) {
				desc.member = member;
				return true;
			}
		});
		if (!found) { throw new Error('user is not a member of the encounter'); }
		member[$setEncounter](this);

		let people = Object.values(this[$members]).map(({id, member:member2}) => {
			return {
				id,
				self: member2 === member,
				userId: member2.userId
			};
		});

		// resend state
		if (this[$state] === StateMatch) {
			setImmediate(() => member.callback.invoke('match', {members: people}));
		} else if (this[$state] === StateNegotiate) {
			let iceServers = await this[$iceServerProvider].get();
			setImmediate(() => member.callback.invoke('negotiate', {iceServers, members: people}));
			for (let {member:member2} of Object.values(this[$members])) {
				if (member === member2) { return; }
				member2.callback.invoke('renegotiate', {iceServers, partner: this[$members][member.userId].id});
			}
		} else {
			throw new Error(`cannot reconnect in state '${this[$state]}'`);
		}
	}

	[$memberAccept](member) {
		if (this[$state] !== StateMatch) { throw new Error(`cannot accept in state '${this[$state]}'`); }
		let desc = this[$members][member.userId];
		if (desc.ready) { throw new Error('already accepted'); }
		desc.ready = true;

		let everyoneReady = Object.values(this[$members]).every(member => member.ready);
		if (everyoneReady) {
			this[$state] = StateNegotiate;
			setImmediate(async () => {
				let iceServers = await this[$iceServerProvider].get();
				for (let desc of Object.values(this[$members])) {
					desc.member.callback.invoke('negotiate', {iceServers});
				}
			});
		}
	}

	[$memberRelay](member, {message} = {}) {
		if (this[$state] !== StateNegotiate) { throw new Error(`cannot relay in state '${this[$state]}'`); }
		if (!message) { throw new Error('message must be defined'); }

		let desc = this[$members][member.userId];
		let targetMember = Object.values(this[$members]).filter(o => o.id !== desc.id)[0];
		return targetMember.member.callback.invoke('receiveRelay', {message});
	}

	[$memberReject]() {
		if (this[$state] !== StateMatch && this[$state] !== StateNegotiate) { throw new Error(`cannot reject in state '${this[$state]}'`); }
		this[$close]();
	}

	[$close]() {
		if (this[$state] === StateClosed) { return; }
		this[$state] = StateClosed;
		for (let desc of Object.values(this[$members])) {
			desc.member.callback.invoke('closed');
		}
		this[$registry][$encounterClosed](this);
	}
}

SerialPool.decorate(Encounter, 'start', 'reconnect', $memberAccept, $memberRelay, $memberReject, $close);


const $objectId = Symbol();
const $callback = Symbol();
const $encounter = Symbol();

export class EncounterMember extends EventEmitter {

	constructor({registry, callback}) {
		super();
		WhitelistReceiver.mixin(this, ['accept', 'reject', 'sendRelay']);

		if (!callback.ozora.userId) { throw new Error('not authenticated'); }

		this[$registry] = registry;
		this[$callback] = callback;
		this[$objectId] = callback.ozora.register(this);

		this[$callback].on('disconnect', () => this.emit('disconnect'));
	}

	get disconnected() { return this[$callback].disconnected; }

	get userId() { return this[$callback].ozora.userId; }
	get objectId() { return this[$objectId]; }
	get callback() { return this[$callback]; }

	[$setEncounter](encounter) { this[$encounter] = encounter; }

	accept() {
		if (!this[$encounter]) { throw new Error('not yet matched'); }
		return this[$encounter][$memberAccept](this);
	}

	sendRelay(opt) {
		if (!this[$encounter]) { throw new Error('not yet matched'); }
		return this[$encounter][$memberRelay](this, opt);
	}

	reject() {
		return this[$encounter] ? this[$encounter][$memberReject](this) : this[$registry][$memberReject](this);
	}

	close() {
		this[$callback].ozora.unregister(this[$objectId]);
	}
}

export default class EncounterRegistry {

	constructor({iceServerProvider}) {
		this[$iceServerProvider] = iceServerProvider;
		this.userEncounters = {};
		this.encounters = {};
	}

	ready({callback}) {
		let me = new EncounterMember({registry: this, callback});
		if (this.userEncounters[me.userId]) {
			let encounter = this.userEncounters[me.userId];
			debug('reconnecting user %s to encounter %s', me.userId, encounter.id);
			encounter.reconnect(me);
		} else if (!this.partner || this.partner.disconnected) {
			debug('user %s listed', me.userId);
			this.partner = me;
		} else if (this.partner.userId === me.userId) {
			debug('user %s replaced with new connection', me.userId);
			this.partner.callback.invoke('closed').catch(() => {});
			this.partner.close();
			this.partner = me;
		} else {
			let partner = this.partner;
			delete this.partner;

			debug('%s and %s matched', me.userId, partner.userId);
			let encounter = new Encounter({
				iceServerProvider: this[$iceServerProvider],
				registry: this,
				participants: [
					{member: me},
					{member: partner}
				]
			});
			this.userEncounters[me.userId] = encounter;
			this.userEncounters[partner.userId] = encounter;
			this.encounters[encounter.id] = encounter;

			setImmediate(() => encounter.start());
		}

		return {id: me.objectId};
	}

	[$memberReject](member) {
		if (this.userEncounters[member.userId]) { throw new Error('user is already in an encounter'); }
		if (this.partner === member) {
			debug('user %s unlisted', this.partner.userId);
			delete this.partner;
		}
	}

	[$encounterClosed](encounter) {
		debug('encounter %s closed with members', encounter.id, Object.keys(encounter.members));
		for (let {member} of Object.values(encounter.members)) {
			member.close();
			delete this.userEncounters[member.userId];
		}
		delete this.encounters[encounter.id];
	}

}

