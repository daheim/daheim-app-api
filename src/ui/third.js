import NavigationGuard from './navigation_guard';
import io from 'socket.io-client';
import screenfull from 'screenfull';
import {OzoraProvider, LocalheimManager} from './localheim';

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

app.controller('ThirdCtrl', function($scope, $window, $log, $timeout, $interval, config, $anchorScroll, $mdDialog, $location, user, auth) {

	if (!auth.accessToken) {
		$location.path('/');
		return;
	}

	$scope.$location = $location;

	let socket = io(undefined, {multiplex: false});
	let ozoraProvider = new OzoraProvider({socket, accessToken: auth.accessToken});
	ozoraProvider.on('authError', err => {
		if (err.message === 'disconnected') { return; }
		debug('auth error', err);
		$location.path('/');
	});
	ozoraProvider.start();

	let localheimManager;

	$scope.$on('$destroy', () => {
		$timeout(() => {
			localheimManager.close();
			ozoraProvider.close();
			socket.close();
		});
	});


	$scope.start = () => {
		if (localheimManager) {
			localheimManager.close();
		}
		localheimManager = new LocalheimManager({
			ozoraProvider,
			constraints: {audio: true, video: true}
		});
		localheimManager.on('localStream', () => $timeout(() => $scope.$apply()));
		localheimManager.on('remoteStream', () => $timeout(() => $scope.$apply()));
		localheimManager.on('stateUpdate', () => {
			debug('localheim state: %s', localheimManager.state);
			$timeout(() => $scope.$apply());
		});
		localheimManager.start();
		$scope.localheimManager = localheimManager;
	};

	$scope.start();

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
			if (localheimManager.state === 'connected' || localheimManager.state === 'negotiating') {
				return 'You are in a video session.';
			}
		}
	});

	$scope.klose = () => {
		$timeout(() => localheimManager.close({reason: 'bye'}));
	};

	$scope.toggleFullscreen = () => {
		screenfull.toggle();
	};

	$scope.$on('$destroy', () => screenfull.exit());


	$scope.accept = () => {
		$timeout(() => localheimManager.accept());
		$scope.accepted = true;
	};
	$scope.reject = () => {
		$timeout(() => localheimManager.close());
	};

	function startCountdownIgnored(timeIgnored) {
		let create = new Date().getTime();
		let iv = $interval(() => {
			let now = new Date().getTime();
			$scope.countdown = Math.max(0, 60000 - (now - create));
		}, 50);
		$scope.countdown = 60000;
		$scope.$on('$destroy', () => {
			$interval.cancel(iv);
		});
	}
});
