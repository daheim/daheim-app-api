(function(window, undefined) {
	"use strict";

var angular = window.angular;

angular.module('dhm', ['ngRoute', 'ngMaterial', 'ngResource', 'angularMoment', 'angulartics', 'angulartics.google.analytics'])

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
	}
})

.controller('HomeCtrl', function($scope) {

})

;

})(window);
