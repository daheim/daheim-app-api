import CommandProtocol from '../src/command_protocol';
import WebRTC from 'webrtc-adapter-test';
import io from 'socket.io-client';
import Promise from 'bluebird';

console.log('WebRTC', WebRTC);

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



var angular = window.angular;

function SocketService($rootScope) {
	this.$rootScope = $rootScope;
}

SocketService.prototype.connect = function($scope) {
	if (!$scope) { $scope = $rootScope.$new; }
	return new Socket($scope);
};

function Socket($scope) {
	var prefix = 'socket_';

	this.$scope = $scope;

	var socket = this._socket = io(undefined, {multiplex: false});

	$scope.$on('$destroy', function() {
		socket.close();
	});

	var events = ['connect', 'connect_error', 'connect_timeout', 'disconnect', 'error', 'reconnect', 'reconnect_attempt', 'reconnect_failed', 'reconnect_error', 'reconnecting'];
	events.forEach(function(name) {
		socket.on(name, function() {
			console.log(prefix + name, arguments);
			$scope.$emit(prefix + name, arguments);
		});
	});

	var onevent = socket.onevent;
	socket.onevent = function(msg) {
		onevent.apply(socket, arguments);
		console.log(prefix + msg.data[0], msg.data[1]);
		$scope.$emit(prefix + msg.data[0], msg.data[1]);
	};

	socket.on('reconnecting', function(attempts) {
		$scope.$apply(function() {
			$scope[prefix + 'state'] = 'reconnecting';
		});
	});
	socket.on('reconnect_error', function(err) {
		$scope.$apply(function() {
			$scope[prefix + 'state'] = 'error';
		});
	});
	socket.on('connect', function() {
		$scope.$apply(function() {
			$scope[prefix + 'state'] = 'connected';
		});
	});
	socket.on('error', function(err) {
		$scope.$apply(function() {
			$scope[prefix + 'state'] = 'error';
		});
	});
}

Socket.prototype.emit = function() {
	this._socket.emit.apply(this._socket, arguments);
};


angular.module('dhm')

.filter('trusted', function($sce) {
	return function(url) {
		return $sce.trustAsResourceUrl(url);
	};
})

.directive('dhmSrcObject', function($window) {
	return {
		restrict: 'A',
		link: function(scope, element, attributes, controller, transcludeFn) {
			scope.$watch(attributes.dhmSrcObject, function(value) {
				if (value) {
					WebRTC.attachMediaStream(element[0], value);
				}
			});
		}
	};
})

.service('socketService', SocketService)

.controller('SecondCtrl', function($scope, $window, $log, $interval, config, socketService) {
	var socket = socketService.connect($scope);

	console.log(WebRTC.webrtcDetectedBrowser, WebRTC.webrtcDetectedVersion, WebRTC.webrtcMinimumVersion);

	var cp = new CommandProtocol({client: socket._socket});

	$scope.german = function() {
		navigator.getUserMedia({audio: true, video: true}, function(stream) {
			$log.info('got user media', stream);
			// var options = {};
			// var speechEvents = hark(stream, options);
			// console.log(speechEvents);
			// speechEvents.on('speaking', function() {
			// 	console.log('speaking', arguments);
			// });
			// speechEvents.on('stopped_speaking', function() {
			// 	console.log('stopped_speaking', arguments);
			// });
			// speechEvents.on('volume_change', function(volume) {
			// 	$scope.$apply(function() {
			// 		$scope.volume = volume;
			// 	});
			// 	//console.log('volume_change', arguments);
			// });
			gotStream(stream);

		}, function(err) {
			$log.error('getUserMedia error', err);
		});
	};

	let wc;

	function gotStream(stream) {
		$scope.$apply(function() {
			$scope.localVideoObject = stream;
		});
		wc = new WebrouletteClient(cp, stream, $scope);
		cp.send('enqueue').then(function() {
			console.log('enqueued');
		}).catch(function(err) {
			console.error('err', err);
		});
		return;
	}

	$scope.klose = function() {
		$scope.localVideoObject = undefined;
		pc.close();
		str.stop();
	};

	// $window.navigator.getUserMedia({
	// 	audio: true,
	// 	video: {
	// 		mandatory: {
	// 			maxWidth: 200,
	// 			minWidth: 100,
	// 			maxHeight: 200,
	// 			minHeight: 100
	// 		}
	// 	}
	// }, function(stream) {
	// 	$scope.$apply(function() {
	// 		$scope.vid1 = stream;
	// 	});
	// }, function(err) {
	// 	console.error('bazge', err);
	// });

	// $window.navigator.getUserMedia({
	// 	audio: true,
	// 	video: {
	// 		mandatory: {
	// 			maxWidth: 640,
	// 			maxHeight: 360
	// 		}
	// 	}
	// }, function(stream) {
	// 	$scope.$apply(function() {
	// 		$scope.vid2 = stream;
	// 	});
	// }, function(err) {
	// 	console.error('bazge', err);
	// });

})

;

