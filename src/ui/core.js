import createDebug from 'debug';
let debug = createDebug('dhm:core');

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

	.run(($rootScope, config) => {
		$rootScope.config = config;
	})

	.controller('SiteCtrl', function($scope, $timeout, $mdSidenav, $mdMedia, auth, $location) {
		var self = this;

		$scope.$media = $mdMedia;
		$scope.openMenu = function() {
			$timeout(function() { $mdSidenav('left').open(); });
		};

		$scope.logout = () => {
			auth.accessToken = undefined;
			$location.path('/');
		};
	})

	;

})(window);
