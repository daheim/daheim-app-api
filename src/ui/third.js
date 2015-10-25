import LocalheimClient from './localheim/localheim_client';
import screenfull from 'screenfull';
import createDebug from 'debug';

import {default as Ozora, WhitelistReceiver} from '../ozora';

let debug = createDebug('dhm:third');

class NavigationGuard {

	constructor({$scope, callback, $mdDialog}) {
		$scope.$on('$locationChangeStart', async (ev, newUrl, oldUrl) => {
			if (this._allowed) { return; }
			let question = callback(newUrl);
			if (typeof question !== 'string') { return; }
			ev.preventDefault();

			try {
				await $mdDialog.show($mdDialog.confirm()
					.title('Confirm Navigation')
					.content(question + '<br/><br/>' + 'Are you sure you want to leave this page?')
					.ok('Leave this Page')
					.cancel('Stay on this Page'));
				this._allowed = true;
				window.location.href = newUrl;
			} catch (ex) {
				// nothing
			}
		});

		window.onbeforeunload = event => {
			let question = callback();
			if (typeof question !== 'string') { return; }

			if (typeof event == 'undefined') {
				event = window.event;
			}
			if (event) {
				event.returnValue = question;
			}
			return question;
		};

		$scope.$on('$destroy', () => window.onbeforeunload = undefined);
	}
}




let app = window.angular.module('dhm');

app.config(function($routeProvider) {
	$routeProvider
		.when('/third', {
			templateUrl: 'partials/third.html',
			controller: 'ThirdCtrl'
		});
});

const $stream = Symbol();
const $initiator = Symbol();
const $conn = Symbol();




const $pc = Symbol();
const $client = Symbol();
const $iceGatherer = Symbol();
const $localDescriptionPromise = Symbol();
const $haveToSignal = Symbol();
const $connected = Symbol();
const $disconnected = Symbol();
const $localheimClient = Symbol();

const $startSignaling = Symbol();
const $localDescription = Symbol();

app.config(function($mdThemingProvider) {
	$mdThemingProvider.theme('video').dark();
});

app.directive('dhmSizeWatcher', function() {
	return {
		restrict: 'A',
		link: ($scope, $element, attributes) => {
			let watcherFn = () => { return {w: $element.width(), h: $element.height()}; };
			$scope.$watch(watcherFn, function(value) {
				debug('dhmSizeWatcher watch', value, attributes.dhmSizeWatcher, $element);
				if (!value) { return; }
				$scope[attributes.dhmSizeWatcher] = value;
			}, true);

			let handler = () => $scope.$apply();
			$element.on('resize', handler);
			$scope.$on('$destroy', () => $element.off('resize', handler));
		}
	};
});

app.directive('dhmCenter', function() {
	return {
		restrict: 'A',
		link: ($scope, $element, attributes) => {

			function check() {
				return {
					w: $element.outerWidth(),
					h: $element.outerHeight(),
					pw: $element.parent().width(),
					ph: $element.parent().height()
				};
			}

			$scope.$watch(check, value => {
				debug('dhmCenter watch', value);
				if (!value) { return; }
				let left = Math.floor((value.pw - value.w) / 2);
				let top = Math.floor((value.ph - value.h) / 2);

				$element.css('left', '' + left + 'px');
				$element.css('top', '' + top + 'px');
			}, true);

			let handler = () => $scope.$apply();
			$element.on('resize', handler);
			$scope.$on('$destroy', () => $element.off('resize', handler));
			$element.parent().on('resize', handler);
			$scope.$on('$destroy', () => $element.parent().off('resize', handler));
		}
	};
});

app.directive('dhmMaxVideoSize', function() {
	return {
		restrict: 'A',
		link: ($scope, $element, attributes) => {
			$scope.$watch(attributes.dhmMaxVideoSize, value => {
				debug('dhmMaxVideoSize watch', value);
				setSize();
			});

			function setSize() {
				let max = $scope.$eval(attributes.dhmMaxVideoSize);
				if (!max || !max.h || !max.w) { return; }

				let vw = $element[0].videoWidth;
				let vh = $element[0].videoHeight;

				let ratio;
				if (vw !== 0 && vh !== 0) {
					ratio = vh / vw;
				} else {
					ratio = 9 / 16;
				}

				let width = max.w;
				let height = max.w * ratio;
				if (height > max.h) {
					height = max.h;
					width = height / ratio;
				}

				width = Math.floor(width);
				height = Math.floor(height);

				$element.outerWidth(width);
				$element.outerHeight(height);
			}

			$element.on('resize', setSize);
			$scope.$on('$destroy', () => $element.off('resize', setSize));
		}
	};
});

app.controller('ThirdCtrl', function($scope, $window, $log, $interval, config, socketService, $anchorScroll, $mdDialog, $location, user) {

	if (!user.userId) {
		$location.path('/');
		return;
	}

	let socket = socketService.connect($scope);
	let userId;
	let localheim;
	let localheimClient;
	let matched = false;

	let rg = new NavigationGuard({
		$scope,
		$mdDialog,
		callback: () => {
			if (matched) {
				return 'You are in a video session.';
			}
		}
	});

	let channel = {
		send: function(data) {
			socket._socket.emit('ozora', data);
		}
	};
	socket._socket.on('ozora', msg => channel.onMessage(msg));

	let ozora = new Ozora({
		zero: {},
		channel
	});
	let zero = ozora.getObject(0);

	async function ready() {
		await zero.invoke('auth', {userId: user.userId});
		let localStream = await navigator.mediaDevices.getUserMedia({
			audio: true,
			video: true
			// video: {
			// 	width: {
			// 		min: 300,
			// 		max: 1920
			// 	},
			// 	height: {
			// 		min: 200,
			// 		max: 1080
			// 	}
			// },
			// optional: {
			// 	googEchoCancellation:true,
			// 	googAutoGainControl:true,
			// 	googNoiseSuppression:true,
			// 	googHighpassFilter:true,
			// 	googAudioMirroring:false,
			// 	googNoiseSuppression2:true,
			// 	googEchoCancellation2:true,
			// 	googAutoGainControl2:true,
			// 	googDucking:false
			// }
		});

		$scope.$apply(() => $scope.localStream = localStream);
		localheimClient = new LocalheimClient({zero, stream: $scope.localStream});
		localheimClient.on('match', () => showMatchDialog(localheimClient));
		localheimClient.on('stream', stream => $scope.$apply(() => $scope.remoteStream = stream));

		await localheimClient.ready();
	}

	ready();

	$scope.signIn = async () => {
		$scope.userId = $scope.userId || '' + Math.random();
		await zero.invoke('auth', {userId: $scope.userId});
	};

	$scope.ready = async () => {
		let localStream = await navigator.mediaDevices.getUserMedia({
			audio: true,
			video: true
			// video: {
			// 	width: {
			// 		min: 300,
			// 		max: 1920
			// 	},
			// 	height: {
			// 		min: 200,
			// 		max: 1080
			// 	}
			// },
			// optional: {
			// 	googEchoCancellation:true,
			// 	googAutoGainControl:true,
			// 	googNoiseSuppression:true,
			// 	googHighpassFilter:true,
			// 	googAudioMirroring:false,
			// 	googNoiseSuppression2:true,
			// 	googEchoCancellation2:true,
			// 	googAutoGainControl2:true,
			// 	googDucking:false
			// }
		});
		$scope.$apply(() => $scope.localStream = localStream);
		let localheimClient = this[$localheimClient] = new LocalheimClient({zero, stream: $scope.localStream});
		localheimClient.on('match', () => showMatchDialog(localheimClient));
		localheimClient.on('stream', stream => $scope.$apply(() => $scope.remoteStream = stream));

		await localheimClient.ready();
	};

	$scope.klose = () => {
		if (localheimClient) {
			localheimClient.reject();
		}
		$location.path('/');
	};

	$scope.toggleFullscreen = () => {
		screenfull.toggle();
	};

	$scope.$on('$destroy', () => screenfull.exit());

	function showMatchDialog(localheimClient) {

		matched = true;

		$mdDialog.show({
			parent: angular.element('#fs'),
			template: matchDialogTemplate,
			controller: function($scope, $mdDialog, $interval) {
				debug('members', localheimClient.members, localheimClient);

				$scope.full = window.localStorage.fullscreen;
				if ($scope.full === undefined) {
					$scope.full = true;
				} else {
					$scope.full = new Boolean($scope.full);
				}
				$scope.fullEnabled = screenfull.enabled;

				let partner = localheimClient.members.filter(({self}) => !self)[0];
				$scope.partnerUserId = partner.userId;

				let create = new Date().getTime();
				let iv = $interval(() => {
					let now = new Date().getTime();
					$scope.countdown = Math.max(0, 60000 - (now - create));
				}, 50);
				$scope.countdown = 60000;
				$scope.$on('$destroy', () => {
					$interval.cancel(iv);
				});

				function onNegotiate() { $scope.$apply(() => $scope.negotiated = true); }
				localheimClient.on('negotiate', onNegotiate);
				$scope.$on('$destroy', () => {
					localheimClient.removeListener('negotiate', onNegotiate);
				});

				localheimClient.on('closed', () => {
					$mdDialog.cancel();
				});

				$scope.accept = () => {
					if (screenfull.enabled) {
						window.localStorage.fullscreen = $scope.full;
						debug('full', $scope.full);
						if ($scope.full) {
							screenfull.request();
						}
					}
					localheimClient.accept();
					$scope.accepted = true;
				};
				$scope.$watch('negotiated && accepted', (value) => {
					if (value) {
						$mdDialog.hide();
					}
				});
				$scope.reject = () => {
					localheimClient.reject();
					$mdDialog.cancel();
				};
			}
		});
	}

	const matchDialogTemplate = `
		<md-dialog aria-label="Match" style="background-color: #cccccc" md-theme="default">
			<md-dialog-content layout="column" layout-align="start start">
				<div layout="column" layout-align="center center" flex="grow">
					<img ng-src="http://images.sodahead.com/polls/0/0/2/7/3/2/3/2/7/1716433898_ugly_person_03_answer_2_xlarge.jpeg" style="width: 70px; height: 70px; border-radius: 50%;" />
					<p><b>{{partnerUserId}}</b></p>
				</div>
				<p>Languages: English, Jamaican</p>
				<div>Areas of interest</div>
				<ul>
					<li>Cats</li>
					<li>Dogs</li>
					<li>Rain</li>
				</ul>
				<md-checkbox ng-model="full" ng-if="fullEnabled">fullscreen</md-checkbox>
			</md-dialog-content>
			<div class="md-actions" style="background-color: #aaaaaa" md-theme="video">
				<span>{{countdown / 1000 | number:0}}<span>
				<md-button ng-disabled="accepted" ng-click="reject()">Reject</md-button>
				<md-button ng-disabled="accepted" ng-click="accept()" class="md-primary">Accept</md-button>
			</div>
		</md-dialog>
	`;

});
