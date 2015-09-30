import WebRTC from 'webrtc-adapter-test';
import Promise from 'bluebird';

class IceSender {
	constructor(cp) {
		this._cp = cp;
		this._okToSend = false;
		this._ices = [];
		this._final = false;
	}

	addCandidate(candidate) {
		if (!candidate) {
			this._final = true;
		} else {
			this._ices.push(candidate);
		}
		this.trySend();
	};

	okToSend() {
		this._okToSend = true;
		this.trySend();
	};

	trySend(timeoutExpired) {
		if (!this._ices.length) { return; }
		if (!this._okToSend) { return; }
		if (!this._final && !timeoutExpired) {
			if (!this._timeout) {
				this._timeout = setTimeout(function() {
					this.trySend(true);
				}.bind(this), 500);
			}
			return;
		}
		clearTimeout(this._timeout);
		delete this._timeout;
		var ices = this._ices;
		this._ices = [];
		this._cp.send('sendIceCandidates', {iceCandidates: ices, last: this._final}).then(function() {
			console.log('candidates sent', ices.length);
		}).catch(function(err) {
			console.error('candidates rejected', ices.length, err);
		});
	}
}



const $cp = Symbol();
const $state = Symbol();
const New = 'new';
const $onStartCommunication = Symbol();
const $createPeerConnection = Symbol();
const $stream = Symbol();
const $pc = Symbol();
const $scope = Symbol();
const $onIceCandidate = Symbol();
const $onAddStream = Symbol();
const $iceSender = Symbol();
const $onGotOffer = Symbol();
const $onGotAnswer = Symbol();
const $onGotIceCandidates = Symbol();

class WebrouletteClient {
	constructor(cp, stream, scope) {
		this[$cp] = cp;
		this[$state] = New;
		this[$stream] = stream;
		this[$scope] = scope;

		cp.register('startCommunication', (opt) => this[$onStartCommunication](opt));
		cp.register('gotOffer', (opt) => this[$onGotOffer](opt));
		cp.register('gotAnswer', (opt) => this[$onGotAnswer](opt));
		cp.register('gotIceCandidates', (opt) => this[$onGotIceCandidates](opt));

		this[$createPeerConnection]();
	}

	[$onGotOffer](opt) {
		let pc = this[$pc];
		return pc.setRemoteDescription(new RTCSessionDescription({sdp: opt.offer, type: 'offer'})).then(() => {
			// promise chain broken
			pc.createAnswer().then((desc) => {
				return pc.setLocalDescription(desc).then(() => {
					return this[$cp].send('sendAnswer', {answer: desc.sdp});
				});
			}).catch(function(err) {
				console.error('error', err);
				// TODO: send error report
			});
		});
	}

	[$onGotAnswer](opt) {
		return this[$pc].setRemoteDescription(new RTCSessionDescription({sdp: opt.answer, type: 'answer'})).catch((err) => {
			console.error('setRemoteDescription error', {err, opt});
			throw new Error(err);
		}).then(() => true);
	}

	[$onGotIceCandidates](opt) {
		let pc = this[$pc];
		return Promise.map(opt.iceCandidates, (candidate) => {
			return pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(function(err) {
				console.error('addIceCandidate error', {err, candidate});
				throw new Error(err);
			});
		}).then(() => true);
	}

	[$createPeerConnection]() {
		if (this[$pc]) {
			this[$pc].close();
		}

		this[$iceSender] = new IceSender(this[$cp]);
		let pc = this[$pc] = new WebRTC.RTCPeerConnection({
			iceServers: [{url: 'stun:stun.l.google.com:19302'}]
		});
		pc.onicecandidate = (e) => this[$onIceCandidate](e);
		pc.onaddstream = (e) => this[$onAddStream](e);
		pc.addStream(this[$stream]);

		this[$scope].$apply(() => {
			this[$scope].iceConnectionState = pc.iceConnectionState;
			this[$scope].iceGatheringState = pc.iceGatheringState;
			this[$scope].signalingState = pc.signalingState;
		});

		pc.oniceconnectionstatechange = (e) => {
			this[$scope].$apply(() => {
				this[$scope].iceConnectionState = e.target.iceConnectionState;
			});
		};
		pc.onsignalingstatechange = (e) => {
			this[$scope].$apply(() => {
				this[$scope].signalingState = e.target.signalingState;
			});
		};
	}

	[$onIceCandidate](e) {
		this[$scope].$apply(() => {
			this[$scope].iceGatheringState = e.target.iceGatheringState;
		});
		this[$iceSender].addCandidate(e.candidate);
	}

	[$onAddStream](e) {
		console.log('remote stream', e.stream);
		this[$scope].$apply(() => {
			this[$scope].remoteVideoObject = e.stream;
		});
	}

	[$onStartCommunication](opt) {
		console.log('onStartCommunication', opt);

		if (!opt.initiator) {
			this[$createPeerConnection]();
			this[$iceSender].okToSend();
			return;
		}

		let pc = this[$pc];
		console.log('using pc', pc);
		// async chain broken
		pc.createOffer().then((desc) => {
			console.log('offer', desc);
			return pc.setLocalDescription(desc).then(() => {
				console.log('local desc set');
				this[$cp].send('sendOffer', {offer: desc.sdp}).then(() => {
					console.log('offer sent');
				});
				this[$iceSender].okToSend();
			});
		});
	}
}

export default WebrouletteClient;
