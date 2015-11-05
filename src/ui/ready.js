import createDebug from 'debug';
let debug = createDebug('dhm:ready');

let app = window.angular.module('dhm');

class UserService {
}

const $token = Symbol('token');

class AuthService {

	constructor() {
		this[$token] = window.localStorage.token;
	}

	get accessToken() { return this[$token]; }
	set accessToken(token) {
		debug('setting token %s %s', typeof token, token);
		this[$token] = token;
		if (token) {
			window.localStorage.token = token;
		} else {
			delete window.localStorage.token;
		}
	}

	get displayName() {
		if (this.profile && this.profile.name) {
			return this.profile.name;
		} else {
			return this.username;
		}
	}

	get authHeader() { return () => 'Bearer ' + this.accessToken; }
	get headers() {	return {authorization: this.authHeader}; }
	get auth() { return {headers: this.headers}; }
}

app.factory('User', function($resource, auth) {
	return $resource('/users/:method', null, {
		register: {method: 'post', params: {method: 'register'}},
		login: {method: 'post', params: {method: 'login'}},
		requestLoginLink: {method: 'post', params: {method: 'loginLink'}},
		saveProfile: {method: 'post', params: {method: 'profile'}, headers: auth.headers},
		getProfile: {params: {method: 'profile'}, headers: auth.headers}
	});
});

app.service('user', UserService);
app.service('auth', AuthService);
app.constant('session', {});

app.factory('$exceptionHandler', function() {
	return function(exception, cause) {
		console.error('exception', exception, cause);
	};
});


app.config($routeProvider => {
	$routeProvider.when('/', {templateUrl: 'partials/home.html', controller: 'HomeCtrl'});
	$routeProvider.when('/login', {templateUrl: 'partials/login.html', controller: 'LoginCtrl'});
	$routeProvider.when('/register/profile', {templateUrl: 'partials/register_profile.html', controller: 'RegisterProfileCtrl'});
	$routeProvider.when('/register/picture', {templateUrl: 'partials/register_picture.html', controller: 'RegisterPictureCtrl'});
	$routeProvider.when('/login/token/:token', {templateUrl: 'partials/login_token.html', controller: 'LoginTokenCtrl'});
	$routeProvider.when('/ready', {templateUrl: 'partials/ready.html', controller: 'ReadyCtrl'});
});

app.run(($rootScope, $mdDialog) => {
	$rootScope.$on('$routeChangeError', (e, current, previous, err) => {
		$mdDialog.show($mdDialog.alert({
			content: err.message,
			ok: 'OK'
		}));
		debug('$routeChangeError', e, current, previous, err);
	});
	// $rootScope.$on('$routeChangeSuccess', (e, current, previous) => {
	// 	debug('$routeChangeSuccess', e, current, previous);
	// });
	// $rootScope.$on('$routeChangeStart', (e, next, current) => {
	// 	debug('$routeChangeStart', e, next, current);
	// });
});

app.run(($rootScope, auth) => {
	$rootScope.auth = auth;
});


app.controller('LoginTokenCtrl', ($scope, $routeParams, $location, User, auth) => {
	$scope.retry = () => {
		if ($scope.running) { return; }
		$scope.running = true;
		delete $scope.error;

		User.login({token: $routeParams.token}).$promise.then(res => {
			auth.acceessToken = res.accessToken;
			$location.path('/ready');
		}).catch(err => {
			debug('err', err);
			$scope.error = err;
		}).finally(() => {
			delete $scope.running;
		});
	};

	$scope.retry();
});


app.controller('LoginCtrl', ($scope, session, $location, User) => {
	if (!session.username) {
		debug('username is not defined in session');
		return $location.path('/');
	}

	$scope.username = session.username;
	$scope.hasPassword = session.hasPassword;

	$scope.sendLink = () => {
		User.requestLoginLink({email: $scope.username}).$promise.then(res => {
			debug('res', res);
		}).catch(err => {
			debug('error', err);
		});
	};
});


app.controller('RegisterProfileCtrl', ($scope, $location, User, $timeout) => {
	$scope.languages = [];
	$scope.topics = [];

	$scope.languageSuggest = input => {
		if (input.length) {
			input = input.charAt(0).toUpperCase() + input.slice(1);
		}
		return ['none', 'beginner', 'intermediate', 'advanced', 'native'].map(level => {
			return {
				language: input,
				level
			};
		});
	};

	$scope.next = () => {
		$location.path('/register/picture');
	};

	$scope.loading = true;
	User.getProfile(profile => {
		$scope.loading = false;

		debug('profile', profile);

		$scope.languages = profile.languages || [];
		$scope.topics = profile.topics || [];
		$scope.name = profile.name;

		function watch(value, oldValue) {
			if (value === oldValue) { return; }
			debug('need save');
			needSave();
		}

		$scope.$watch('languages', watch, true);
		$scope.$watch('name', watch);
		$scope.$watch('topics', watch, true);
	});

	$scope.needToSave = 0;
	$scope.lastSaved = 0;

	let savePending = false;
	let saveTimeout;
	function needSave() {
		$scope.needToSave++;
		if ($scope.saving) {
			savePending = true;
		} else {
			if (saveTimeout) {
				$timeout.cancel(saveTimeout);
			}
			saveTimeout = $timeout(() => {
				$scope.saving = true;
				save().finally(() => {
					$scope.saving = false;
				});
			}, 1000);
		}
	}

	function save() {
		debug('saving');
		delete $scope.error;
		let nowSaving = $scope.needToSave;
		return User.saveProfile({
			name: $scope.name,
			languages: $scope.languages,
			topics: $scope.topics
		}).$promise.then(() => {
			$scope.lastSaved = nowSaving;
			if (savePending) {
				savePending = false;
				return save();
			} else {
				debug('save done');
			}
		}).catch(err => {
			debug('err', err);
			if (err.status < 0) {
				$scope.error = 'Network error';
			} else {
				$scope.error = err.status + ': ' + err.data;
			}
		});
	}
});

app.controller('RegisterPictureCtrl', ($scope, $location) => {

	$scope.skip = () => {
		$location.path('/ready');
	};

	$scope.upload = () => {
		$location.path('/ready');
	};

	$scope.takePhoto = () => {
		$scope.cameraSnap = !$scope.cameraSnap;
	};

	$scope.photoActive = () => {
		$scope.cameraActive = !$scope.cameraActive;
	};

	$scope.$watch('imageData', value => {
		debug('image data %s', value);
	});

});

app.controller('ReadyCtrl', ($scope, $location) => {
	$scope.state = 'ready';

	$scope.$watch('auth.accessToken', value => {
		debug('access token', value);
	});

	$scope.ready = () => {
		// if (!$scope.userId) {
		// 	$mdDialog.show($mdDialog.alert().ok('Alright').title('Well...').content('A name! I need a name!'));
		// 	return;
		// }
		// user.userId = $scope.userId;
		$location.path('/third');
	};

});

app.controller('HomeCtrl', ($scope, $location, user, User, auth, $timeout, session) => {

	if (auth.accessToken) {
		return $location.path('/ready');
	}

	$scope.register = () => {
		if ($scope.working) { return; }
		$scope.working = true;

		let username = $scope.email;
		User.register({email: username}).$promise.then(res => {
			auth.username = $scope.email;
			if (res.state === 'new') {
				auth.accessToken = res.accessToken;
				$location.path('/register/profile');
			} else {
				session.username = username;
				session.hasPassword = res.hasPassword;
				$location.path('/login');
			}
		}).finally(() => {
			$scope.working = false;
		});
	};

});


