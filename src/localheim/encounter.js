import uuid from 'node-uuid';
import {default as Registry} from './registry';
import createDebug from 'debug';

import {Encounter as EncounterModel} from '../model';

let debug = createDebug('dhm:localheim:encounter');

const $id = Symbol('id');
const $state = Symbol('state');
const $members = Symbol('members');
const $registry = Symbol();
const $iceServerProvider = Symbol();
const $log = Symbol();

const $close = Symbol();

const $startTime = Symbol();

const StateNew = 'new';
const StateMatch = 'match';
const StateNegotiate = 'negotiate';
const StateClosed = 'closed';

export default class Encounter {

	constructor({registry, participants, log, iceServerProvider} = {}) {
		if (!log) { throw new Error('log must be defined'); }
		if (!Array.isArray(participants)) { throw new Error(`participants must be defined as an array`); }
		if (participants.length !== 2) { throw new Error(`only 2 participants are supported`); }

		this[$registry] = registry;
		this[$id] = uuid.v4();
		this[$state] = StateNew;
		this[$log] = log;
		this[$iceServerProvider] = iceServerProvider;

		this[$members] = {};
		let currentId = 1;
		for (let {member} of participants) {
			let id = currentId++;
			if (this[$members][member.userId]) { throw new Error(`participant ${id} is already a member`); }
			this[$members][member.userId] = {id, member};
		}

		debug('new encounter %s with members', this[$id], Object.keys(this[$members]));
	}

	get id() { return this[$id]; }
	get members() { return this[$members]; }

	start() {
		if (this[$state] !== StateNew) { throw new Error(`cannot call start() in state '${this[$state]}'`); }
		this[$state] = StateMatch;

		this[$startTime] = new Date();
		this[$log].event('encounter_started', {encounterId: this.id, userId: Object.keys(this[$members])});

		for (let {id: selfId, member} of Object.values(this[$members])) {
			let people = Object.values(this[$members]).map(({id, member}) => {
				return {
					id,
					self: id === selfId,
					userId: member.userId,
					profile: member.profile,
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

		this[$log].event('encounter_reconnect', {encounterId: this.id, userId: me.userId, encounterTime: new Date() - this[$startTime]});

		debug('kicking out old user of %s', me.userId);
		desc.member.close({reason: Registry.ReasonReplaced});

		desc.member = me;

		let members = Object.values(this[$members]).map(({id, member}) => {
			return {
				id,
				self: member === me,
				userId: member.userId,
				profile: member.profile,
			};
		});

		let iceServers = await this[$iceServerProvider].get();
		setImmediate(async () => {
			try {
				await me.callback.invoke('onNegotiate', {iceServers, members});
			} catch (err) {
				me.close({reason: Registry.ReasonProtocolError, notify: true});
			}
		});
		for (let {member} of Object.values(this[$members])) {
			if (member === me) { continue; }
			(async () => {
				try {
					await member.callback.invoke('onRenegotiate', {iceServers, partner: desc.id});
				} catch (err) {
					member.close({reason: Registry.ReasonProtocolError, notify: true});
				}
			})();
		}

		return 'renegotiate';
	}

	interfaceAccept(me) {
		if (this[$state] !== StateMatch) { throw new Error(`cannot accept in state '${this[$state]}'`); }
		let desc = this[$members][me.userId];
		if (desc.member !== me) { throw new Error('not enlisted'); }
		if (desc.ready) { throw new Error('already accepted'); }
		desc.ready = true;

		this[$log].event('encounter_accept', {encounterId: this.id, userId: me.userId, encounterTime: new Date() - this[$startTime]});

		let everyoneReady = Object.values(this[$members]).every(member => member.ready);
		if (everyoneReady) {
			this[$log].event('encounter_negotiate', {encounterId: this.id, userId: Object.keys(this[$members]), encounterTime: new Date() - this[$startTime]});

			this[$state] = StateNegotiate;
			setImmediate(async () => {
				if (this[$state] !== StateNegotiate) { return; }

				let now = new Date();
				this.acceptTime = now;

				// store encounter in database for review
				let encounterModel = new EncounterModel({
					participants: Object.values(this[$members]).map(member => {
						return {userId: member.member.userId};
					}),
					date: now,
					ping: now,
				});
				await encounterModel.save();
				debug('stored encounter: %s', encounterModel.id);
				this.encounterModelId = encounterModel.id;
				this.encounterModelTimeout = setInterval(() => {
					debug('pinging encounter: %s', this.encounterModelId);
					EncounterModel.update({_id: this.encounterModelId}, {ping: new Date()});
				}, 60 * 1000);

				// ask everyone to start negotiation
				let iceServers = await this[$iceServerProvider].get();
				for (let desc of Object.values(this[$members])) {
					(async () => {
						try {
							await desc.member.callback.invoke('onNegotiate', {iceServers, reviewId: this.encounterModelId});
						} catch (err) {
							desc.member.close({reason: Registry.ReasonProtocolError});
						}
					})();
				}
			});
		}
	}

	interfaceSendRelay(me, {message, participant} = {}) {
		if (this[$state] !== StateNegotiate) { throw new Error(`cannot relay in state '${this[$state]}'`); }
		if (!message) { throw new Error('message must be defined'); }
		let desc = this[$members][me.userId];
		if (desc.member !== me) { throw new Error('not enlisted'); }

		let targetMember = Object.values(this[$members]).filter(o => o.id !== desc.id)[0];
		if (targetMember.id !== participant) {
			throw new Error('invalid participant');
		}
		return targetMember.member.callback.invoke('onRelay', {message});
	}

	interfaceClose(me, {reason}) {
		if (this[$state] === StateNegotiate && reason !== Registry.ReasonBye) {
			debug('user %s disconnected after negotiation state and may reconnect', me.userId);
			return;
		}
		debug('user %s closed', me.userId);
		this[$close]({reason});
	}

	[$close]({reason, meIgnored}) {
		if (this[$state] === StateClosed) { return; }
		let success = this[$state] === StateNegotiate;
		this[$state] = StateClosed;

		if (this.encounterModelTimeout) {
			clearTimeout(this.encounterModelTimeout);
		}

		if (this.encounterModelId) {
			(async () => {
				let length = Date.now() - this.acceptTime;
				await EncounterModel.update({_id: this.encounterModelId}, {
					result: 'end',
					length,
				});
				debug('finishing encounter: %s, length: %s', this.encounterModelId, length);
			})();
		}

		this[$log].event('encounter_result', {
			userId: Object.keys(this[$members]),
			encounterTime: new Date() - this[$startTime],
			result: success ? 'success' : 'rejected',
			reason,
		});

		if (reason !== Registry.ReasonBye) {
			reason = Registry.ReasonPartnerClosed;
		}

		for (let desc of Object.values(this[$members])) {
			desc.member.close({reason, notify: true});
		}
		this[$registry].encounterClose(this);
	}
}
