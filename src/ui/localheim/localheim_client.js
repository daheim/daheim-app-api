import Promise from 'bluebird';
import EventEmitter from 'events';
import {WhitelistReceiver} from '../../ozora';
import WebRTC from 'webrtc-adapter-test';
import IceGatherer from './ice_gatherer';
import uuid from 'node-uuid';
import createDebug from 'debug';

let debug = createDebug('dhm:localheim:client');

const $stream = Symbol();
const $negotiator = Symbol();
const $members = Symbol();
const $partner = Symbol();
const $me = Symbol();
const $closed = Symbol();
const $ozora = Symbol();
const $callbackObjectId = Symbol();
const $interface = Symbol();

const $setMembers = Symbol();

export default class LocalheimClient extends EventEmitter {
	constructor({ozora, stream}) {
		super();
		WhitelistReceiver.mixin(this, ['onMatch', 'onNegotiate', 'onRenegotiate', 'onRelay', 'onClose']);

		this[$ozora] = ozora;
		this[$callbackObjectId] = this[$ozora].register(this);
		this[$stream] = stream;
	}

	get callbackObjectId() { return this[$callbackObjectId]; }
	get members() { return this[$members]; }
	get partner() { return this[$partner]; }
	get me() { return this[$me]; }

	async start(interfaceObjectId) {
		if (this[$interface]) { throw new Error('already started'); }
		this[$interface] = this[$ozora].getObject(interfaceObjectId);
		this[$interface].on('disconnect', () => this.close('disconnected'));

		let startType = await this[$interface].invoke('start');
		debug('started with %s', startType);
		return startType;
	}

	[$setMembers](members) {
		for (let member of members) {
			if (member.self) {
				this[$me] = member;
			} else {
				this[$partner] = member;
			}
		}
	}

	accept() {
		this[$interface].invoke('accept');
	}

	onMatch({members}) {
		if (this[$closed]) { return; }
		this[$setMembers](members);
		this.emit('match');
	}

	onNegotiate({members, iceServers}) {
		if (this[$closed]) { return; }
		if (members) {
			this[$setMembers](members);
		}
		this[$negotiator] = new Negotiator({
			iceServers,
			stream: this[$stream],
			localheim: this,
			participant: this.partner.id,
			session: this.partner.session,
			initiator: this.partner.id > this.me.id
		});
		this[$negotiator].start();
		this.emit('negotiate');
	}

	onRenegotiate({iceServers, partner}) {
		if (this[$closed]) { return; }
		if (this.partner.id !== partner) { throw new Error('partner id mismatch'); }
		if (this[$negotiator]) {
			let oldNegotiator = this[$negotiator];
			delete this[$negotiator];
			oldNegotiator.close();
		}
		this[$negotiator] = new Negotiator({
			iceServers,
			stream: this[$stream],
			localheim: this,
			participant: this.partner.id,
			session: this.partner.session,
			initiator: this.partner.id > this.me.id
		});
		this[$negotiator].start();
		this.emit('negotiate');
	}

	onClose({reason}) {
		if (this[$closed]) { return; }
		delete this[$interface];
		this.close({reason});
	}

	onRelay(opt) {
		if (this[$negotiator]) {
			return this[$negotiator].onRelay(opt);
		} else {
			throw new Error('why are you bothering me?');
		}
	}

	onNegotiatorClose(negotiator) {
		if (negotiator !== this[$negotiator]) { return; }
		delete this[$negotiator];
		// TODO: use reason constant
		this.close({reason: 'cannot_negotiate'});
	}

	onNegotiatorStream(negotiator, stream) {
		if (negotiator !== this[$negotiator]) { return; }
		this.emit('stream', stream);
	}

	close({reason}) {
		if (this[$closed]) { return; }
		this[$closed] = true;
		this.emit('close', reason);
		this.removeAllListeners();
		if (this[$interface]) {
			this[$interface].invoke('close', {reason});
		}
		if (this[$negotiator]) {
			this[$negotiator].close({reason});
		}
		this[$ozora].unregister(this[$callbackObjectId]);
	}
}

const $iceServers = Symbol();
const $localheim = Symbol();
const $participant = Symbol();
const $session = Symbol();
const $initiator = Symbol();
//const $stream = Symbol();
const $pc = Symbol();
const $negotiationId = Symbol();
const $iceGatherer = Symbol();

class Negotiator {

	constructor({iceServers, localheim, participant, session, initiator, stream}) {
		this[$iceServers] = iceServers;
		this[$localheim] = localheim;
		this[$participant] = participant;
		this[$session] = session;
		this[$initiator] = initiator;
		this[$stream] = stream;
	}

	start() {
		if (this[$pc]) { throw new Error('already started'); }

		this[$iceGatherer] = new IceGatherer();
		this[$iceGatherer].on('send', async ({iceCandidates, iceComplete}) => {
			debug('sending ice complete=%s', iceComplete, iceCandidates);
			try {
				await this[$localheim][$interface].invoke('sendRelay', {
					participant: this[$participant],
					session: this[$session],
					message: {
						type: 'ice',
						negotiationId: this[$negotiationId],
						candidates: iceCandidates,
						complete: iceComplete
					}
				});
			} catch (err) {
				this.close();
			}
		});

		this[$pc] = new WebRTC.RTCPeerConnection({iceServers: this[$iceServers]});
		this[$pc].onicecandidate = e => this[$iceGatherer].add(e.candidate);
		this[$pc].onaddstream = e => {
			this[$localheim].onNegotiatorStream(this, e.stream);
		};
		this[$pc].oniceconnectionstatechange = e => {
			let state = e.target.iceConnectionState;
			debug('ICE %s', state);
			return;
			// if (state === 'failed' || state === 'closed' || state === 'disconnected') {
			// 	debug('ICE %s', state);
			// 	if (state !== 'closed') {
			// 		this[$pc].close();
			// 	}
			// 	if (!this[$disconnected]) {
			// 		this[$disconnected] = true;
			// 		this.emit('close');
			// 	}
			// } else if (state === 'connected' || state === 'completed') {
			// 	debug('ICE connected');
			// 	if (!this[$connected]) {
			// 		this[$connected] = true;
			// 		this.emit('connected');
			// 	}
			// } else if (state === 'checking') {
			// 	// nothing
			// } else {
			// 	debug('unknown ICE state: %s', state);
			// }
		};

		this[$pc].addStream(this[$stream]);
		debug('RtcConnection created');

		if (this[$initiator]) {
			this[$negotiationId] = uuid.v4();
			debug('creating offer');
			(async () => {
				try {
					let desc = await this[$pc].createOffer();
					await this[$pc].setLocalDescription(desc);
					await this[$localheim][$interface].invoke('sendRelay', {
						participant: this[$participant],
						session: this[$session],
						message: {
							type: 'offer',
							negotiationId: this[$negotiationId],
							sdp: desc.sdp
						}
					});
					this[$iceGatherer].ready();
				} catch (err) {
					debug('offer error', err);
					this.close();
				}
			})();
		}
	}

	async onRelay({message}) {
		if (this[$closed]) { throw new Error('negotiator closed'); }

		if (message.type === 'offer') {
			if (this[$initiator]) { throw new Error('got offer as an initiator'); }
			if (this[$negotiationId]) { throw new Error('already got offer'); }

			debug('received offer, creating answer');
			this[$negotiationId] = message.negotiationId;
			let desc = new RTCSessionDescription({sdp: message.sdp, type: 'offer'});
			await this[$pc].setRemoteDescription(desc);
			this[$iceGatherer].ready();

			(async () => {
				try {
					let desc = await this[$pc].createAnswer();
					await this[$pc].setLocalDescription(desc);
					await this[$localheim][$interface].invoke('sendRelay', {
						participant: this[$participant],
						session: this[$session],
						message: {
							type: 'answer',
							negotiationId: this[$negotiationId],
							sdp: desc.sdp
						}
					});
				} catch (err) {
					debug('answer error', err);
					this.close();
				}
			})();

		} else if (message.type === 'answer') {
			if (!this[$initiator]) { throw new Error('got answer as an initiator'); }
			if (!this[$negotiationId]) { throw new Error('got answer before offer'); }
			if (this[$negotiationId] !== message.negotiationId) { throw new Error('invalid negotiation id'); }

			debug('received answer');
			let desc = new RTCSessionDescription({sdp: message.sdp, type: 'answer'});
			await this[$pc].setRemoteDescription(desc);
		} else if (message.type === 'ice') {
			debug('received ICE candidates complete=%s', message.complete, message.candidates);
			await Promise.map(message.candidates, candidate => this[$pc].addIceCandidate(new RTCIceCandidate(candidate)));
		} else {
			throw new Error('unknown message type');
		}
	}

	close() {
		if (this[$closed]) { return; }
		this[$closed] = true;

		if (this[$pc] && this[$pc].signalingState !== 'closed') {
			debug('closing RTCPeerConnection');
			this[$pc].close();
		}
		this[$localheim].onNegotiatorClose(this);
		delete this[$localheim];
	}

}
