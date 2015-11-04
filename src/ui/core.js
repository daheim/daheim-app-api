import DhmProfileCamera from './dhm_profile_camera';

(function(window, undefined) {
	"use strict";

	var angular = window.angular;

	angular.module('dhm', ['ngRoute', 'ngMaterial', 'ngResource', 'angulartics', 'angulartics.google.analytics', DhmProfileCamera.name])

	.config(function($routeProvider) {
		$routeProvider
			.when('/', {
				templateUrl: 'partials/ready.html',
				controller: 'ReadyCtrl'
			})
			.when('/second', {
				templateUrl: 'partials/second.html',
				controller: 'SecondCtrl'
			})
			.when('/auctions', {
				templateUrl: 'auctions.html',
				controller: 'AuctionsCtrl'
			})
			.when('/realmStatus', {
				templateUrl: 'realmStatus.html',
				controller: 'RealmStatusCtrl'
			})
			.when('/settings', {
				templateUrl: 'settings.html',
				controller: 'SettingsCtrl'
			})
			.otherwise({
				redirectTo: '/'
			});
	})

	.config(function($locationProvider) {
		$locationProvider.hashPrefix('!');
	})

	.controller('SiteCtrl', function($scope, $timeout, $mdSidenav, $mdMedia) {
		var self = this;

		$scope.$media = $mdMedia;
		$scope.openMenu = function() {
			$timeout(function() { $mdSidenav('left').open(); });
		};
	})

	.controller('HomeCtrl', function($scope, $window, config) {

		$scope.state = 'Enable camera access';

		var socket = window.io(undefined, {
			multiplex: false
		});
		socket.on('connect', function() {
			console.log('connect');
		});
		socket.on('error', function(err) {
			console.error('error', err);
			alert('Error: ' + err);
		});
		socket.on('disconnect', function() {
			console.info('disconnect');
		});
		socket.on('reconnect', function(attempts) {
			console.info('reconnect', attempts);
		});
		socket.on('reconnect_attempt', function() {
			console.warn('reconnect_attempt');
		});
		socket.on('reconnecting', function(attempts) {
			console.info('reconnecting', attempts);
		});
		socket.on('reconnect_error', function(err) {
			console.error('reconnect_error', err);
		});
		socket.on('reconnect_failed', function(err) {
			console.error('reconnect_failed');
		});

		var webrtc;

		socket.on('message', function(msg) {
			console.log('message', msg);
		});

		socket.on('partnerFound', function(msg) {
			console.log('partnerFound', msg);
			webrtc.joinRoom(msg.channelId);
			$scope.state = 'Partner found :)';
		});

		$scope.$on("$destroy", function() {
			console.log('destroyed');
			socket.destroy();
			if (webrtc) {
				webrtc.disconnect();
			}
		});

		$scope.sent = true;
		$scope.iamGerman = function() {
			socket.emit('identify', {as: 'german'});
			$scope.sent = true;
			$scope.state = 'Wait for a partner';
		};

		$scope.iamFriend = function() {
			socket.emit('identify', {as: 'friend'});
			$scope.sent = true;
			$scope.state = 'Wait for a partner';
		};

		console.log('socket', socket, 'webrtc', webrtc);
		socket.connect();

		// we have to wait until it's ready
		webrtc.on('readyToCall', function() {
			$scope.$apply(function() {
				$scope.sent = false;
				$scope.state = 'Choose which group to join:';
			});
			console.log('readyToCall');
		});


	})

	;

})(window);
