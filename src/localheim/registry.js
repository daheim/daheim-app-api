import {default as Encounter} from './encounter';
import createDebug from 'debug';

let debug = createDebug('dhm:localheim:registry');

const $iceServerProvider = Symbol();
const $partner = Symbol();

export default class Registry {

	constructor({iceServerProvider}) {
		this[$iceServerProvider] = iceServerProvider;
		this.userEncounters = {};
		this.encounters = {};
	}

	interfaceStart(me) {
		// reconnect
		if (this.userEncounters[me.userId]) {
			let encounter = this.userEncounters[me.userId];
			debug('reconnecting user %s to encounter %s', me.userId, encounter.id);
			return encounter.reconnect(me);
		}

		if (!this[$partner] || this[$partner].closed) {
			debug('user %s listed', me.userId);
			this[$partner] = me;
			return 'queued';
		}

		if (this[$partner].userId === me.userId) {
			debug('user %s replaced with new connection', me.userId);
			this[$partner].close({reason: Registry.ReasonReplaced, notify: true});
			this[$partner] = me;
			return 'queued';
		}


		let partner = this[$partner];
		delete this[$partner];

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
		return 'queued';
	}

	interfaceClose(me, {reason}) {
		if (this.userEncounters[me.userId]) {
			debug('onInterfaceClosed: user %s is already in an encounter', me.userId);
			return this.userEncounters[me.userId].interfaceClose(me, {reason});
		}
		if (this[$partner] === me) {
			debug('onInterfaceClosed: user %s unlisted', me.userId);
			delete this.partner;
		}
	}

	interfaceAccept(me) {
		if (!this.userEncounters[me.userId]) { throw new Error('there is nothing to accept'); }
		return this.userEncounters[me.userId].interfaceAccept(me);
	}

	interfaceSendRelay(me, opt) {
		if (!this.userEncounters[me.userId]) { throw new Error('there is nothing to relay'); }
		return this.userEncounters[me.userId].interfaceSendRelay(me, opt);
	}

	encounterClose(encounter) {
		debug('encounter %s closed with members', encounter.id, Object.keys(encounter.members));
		for (let {member} of Object.values(encounter.members)) {
			delete this.userEncounters[member.userId];
		}
		delete this.encounters[encounter.id];
	}

}

Registry.ReasonReplaced = 'replaced';
Registry.ReasonDisconnected = 'disconnected';
Registry.ReasonProtocolError = 'protocol_error';
Registry.ReasonPartnerClosed = 'partner_closed';
Registry.ReasonBye = 'bye';
