(function(window, undefined) {
	"use strict";

	var angular = window.angular;

	angular.module('dhm', ['ngRoute', 'ngMaterial', 'ngResource', 'angulartics', 'angulartics.google.analytics'])

	.config(function($routeProvider) {
		$routeProvider
			.when('/', {
				templateUrl: 'partials/home.html',
				controller: 'HomeCtrl'
			})
			.when('/characters', {
				templateUrl: 'characters.html',
				controller: 'CharactersCtrl'
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

	.controller('SiteCtrl', function($scope, $timeout, $mdSidenav) {
		var self = this;

		$scope.openMenu = function() {
			$timeout(function() { $mdSidenav('left').open(); });
		};
	})

	.controller('HomeCtrl', function($scope, $window, config) {

		$scope.state = 'Enable camera access';

		var socket = window.io();
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

		var webrtc = new SimpleWebRTC({
			// the id/element dom element that will hold "our" video
			localVideoEl: 'localVideo',
			// the id/element dom element that will hold remote videos
			remoteVideosEl: 'remotesVideos',
			// immediately ask for camera access
			autoRequestMedia: true
		});

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
			socket.disconnect();
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
