import LocalheimClient from './localheim/localheim_client';
import NavigationGuard from './navigation_guard';
import {default as Ozora, SioChannel} from '../ozora';
import io from 'socket.io-client';
import screenfull from 'screenfull';
import createDebug from 'debug';
let debug = createDebug('dhm:third');


let app = window.angular.module('dhm');

app.config(function($routeProvider) {
	$routeProvider
		.when('/third', {
			templateUrl: 'partials/third.html',
			controller: 'ThirdCtrl'
		});
});

app.config(function($mdThemingProvider) {
	$mdThemingProvider
		.theme('video')
		.dark()
		.backgroundPalette('grey', {
			default: '900'
		});
});

const $zero = Symbol();

app.controller('ThirdCtrl', function($scope, $window, $log, $timeout, $interval, config, $anchorScroll, $mdDialog, $location, user) {

	if (!user.userId) {
		$location.path('/');
		return;
	}

	//let socket = socketService.connect($scope);
	let matched = false;
	//let ozora;
	//let zero;

	let localheimClient;


	let socket = io(undefined, {multiplex: false});
	socket.on('connect', async () => {

		let channel = new SioChannel({socket});
		let ozora = new Ozora({channel, zero: {}});
		let zero = this[$zero] = ozora.getObject(0);
		await zero.invoke('auth', {userId: user.userId});

		let stream = $scope.localStream = await navigator.mediaDevices.getUserMedia({
			audio: true,
			video: true
		});

		let local = new LocalheimClient({ozora, stream});
		local.on('match', () => showMatchDialog(local));
		local.on('negotiate', () => {
			$scope.$apply(() => $scope.state = 'video');
		});
		local.on('stream', stream => $scope.$apply(() => $scope.remoteStream = stream));

		try {
			let id = await zero.invoke('createEncounter', {callbackId: local.callbackObjectId});
			await local.start(id);
			localheimClient = local;
		} catch (err) {
			debug('cannot start', err);
			local.close();
		}

	});


	// let zeroProvider = new ZeroProvider({socket, userId: user.userId});
	// let localheimClient = new LocalheimClient({zeroProvider});

	// localheimClient.on('match', () => showMatchDialog(localheimClient));
	// localheimClient.on('stream', stream => $scope.$apply(() => $scope.remoteStream = stream));
	// localheimClient.on('negotiate', () => {
	// 	$scope.$apply(() => $scope.state = 'video');
	// });

	$scope.languages = [{
		language: 'Hungarian',
		level: 'native'
	}, {
		language: 'English',
		level: 'high'
	}, {
		language: 'German',
		level: 'sucks'
	}];

	//$scope.topics = ['cars', 'food', 'hiking', 'children', 'cars1', 'food1', 'hiking1', 'children1', 'cars2', 'food2', 'hiking2', 'children2', 'cars4', 'food4', 'hiking4', 'children4'];
	$scope.topics = ['cars', 'food'];

	let mouseMoveTimer;
	$scope.mouseMove = () => {
		if (mouseMoveTimer) {
			$timeout.cancel(mouseMoveTimer);
		}
		mouseMoveTimer = $timeout(() => $scope.showControls = false, 3000);
		$scope.showControls = true;
	};

	new NavigationGuard({
		$scope,
		$mdDialog,
		callback: () => {
			if (matched) {
				return 'You are in a video session.';
			}
		}
	});

	$scope.state = 'queued';

	$scope.signIn = async () => {
		$scope.userId = $scope.userId || '' + Math.random();
		await this.zero.invoke('auth', {userId: $scope.userId});
	};

	$scope.klose = () => {
		if (localheimClient) {
			localheimClient.close({reason: 'bye'});
		}
		$location.path('/');
	};

	$scope.toggleFullscreen = () => {
		screenfull.toggle();
	};

	$scope.$on('$destroy', () => screenfull.exit());

	function showMatchDialog(localheimClient) {

		matched = true;
		$scope.state = 'match';

		let partner = localheimClient.partner;
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
			//$mdDialog.cancel();
			// TODO: handle
		});

		$scope.accept = () => {
			localheimClient.accept();
			$scope.accepted = true;
		};
		$scope.reject = () => {
			localheimClient.close();
			//$mdDialog.cancel();
		};

	}

});
