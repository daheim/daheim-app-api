import createDebug from 'debug';
let debug = createDebug('dhm:core'); // eslint-disable-line no-unused-vars

import DhmProfileCamera from './dhm_profile_camera';

(function(window, undefined) {
	"use strict";

	var angular = window.angular;

	angular.module('dhm', ['ngRoute', 'ngMaterial', 'ngResource', 'angulartics', 'angulartics.google.analytics', DhmProfileCamera.name, 'react'])

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
				templateUrl: 'partials/settings.html',
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
