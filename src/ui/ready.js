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
	return $resource('/users/:method/:method2', null, {
		register: {method: 'post', params: {method: 'register'}},
		login: {method: 'post', params: {method: 'login'}},
		changePassword: {method: 'post', params: {method: 'password'}, headers: auth.headers},
		requestLoginLink: {method: 'post', params: {method: 'loginLink'}},
		saveProfile: {method: 'post', params: {method: 'profile'}, headers: auth.headers},
		getProfile: {params: {method: 'profile'}, headers: auth.headers},
		saveProfilePicture: {method: 'post', params: {method: 'profile', method2: 'picture'}, headers: auth.headers}
	});
});

app.service('user', UserService);
app.service('auth', AuthService);
app.constant('session', {});

app.factory('$exceptionHandler', function() {
	return function(exception, cause) {
		console.error('exception', exception, cause); // eslint-disable-line no-console
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
			auth.accessToken = res.accessToken;
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


app.controller('LoginCtrl', ($scope, session, $location, User, $mdDialog) => {
	if (!session.username) {
		debug('username is not defined in session');
		return $location.path('/');
	}

	$scope.username = session.username;
	$scope.hasPassword = session.hasPassword;

	$scope.sendLink = () => {
		if ($scope.sending) { return; }
		$scope.sending = true;

		User.requestLoginLink({email: $scope.username}).$promise.then(resIgnored => {
			$mdDialog.show($mdDialog.alert({
				content: 'Message sent. Please check your inbox.',
				ok: 'OK'
			}));
		}).catch(err => {
			$mdDialog.show($mdDialog.alert({
				content: 'Could not send message: ' + (err.data || 'network error'),
				ok: 'OK'
			}));
		}).finally(() => {
			$scope.sending = false;
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

app.controller('RegisterPictureCtrl', ($scope, $location, $mdDialog, User) => {

	$scope.skip = () => {
		$location.path('/ready');
	};

	$scope.upload = () => {
		if ($scope.uploading) { return; }
		$scope.uploading = true;

		User.saveProfilePicture({
			data: $scope.imageData
		}).$promise.then(() => {
			$location.path('/ready');
		}).catch(err => {

			debug('', err);
			$mdDialog.show($mdDialog.alert({
				content: err.status < 0 ? 'network error' : err.data,
				ok: 'OK'
			}));

		}).finally(() => {
			$scope.uploading = false;
		});


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

app.controller('ReadyCtrl', ($scope, $location, auth) => {
	if (!auth.accessToken) {
		debug('no access token, changing page');
		return $location.path('/');
	}


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

import React from 'react';
import TextField from 'material-ui/lib/text-field';
import RaisedButton from 'material-ui/lib/raised-button';
import Checkbox from 'material-ui/lib/checkbox';
import muiTheme from './theme';
import LinkedStateMixin from 'react-addons-linked-state-mixin';
import reactMixin from 'react-mixin';

class RegistrationForm extends React.Component {
	static childContextTypes = {
		muiTheme: React.PropTypes.object,
	};

	getChildContext() {
		return {muiTheme};
	}

	state = {
		email: '',
		password: '',
		newsletter: false,
		agree: false,
	};

	handleNewsletterChange = e => this.setState({newsletter: e.target.checked});
	handleAgreeChange = e => this.setState({agree: e.target.checked});

	handleRegisterClick = async e => {
		e.preventDefault();

		let resultIgnored = await this.props.ng.User.register({
			email: this.state.email,
			password: this.state.password,
			newsletter: this.state.newsletter,
		}).$promise;
	};

	render() {
		return (
			<form onSubmit={this.handleRegisterClick}>
				<TextField fullWidth={true} floatingLabelText="E-Mail Addresse" valueLink={this.linkState('email')} />
				<TextField style={{marginTop: -10}} type="password" fullWidth={true} floatingLabelText="Passwort" valueLink={this.linkState('password')} />
				<Checkbox style={{marginTop: 20}} label="Ja, ich möchte zum Newsletter anmelden" checked={this.state.newsletter} onCheck={this.handleNewsletterChange} />
				<Checkbox style={{marginTop: 10}} label="Ja, ich akzeptiere die Allgemeinen Geschäftsbedingungen" checked={this.state.agree} onCheck={this.handleAgreeChange} />
				<RaisedButton disabled={!this.state.agree} type="submit" style={{marginTop: 20}} fullWidth={true} primary={true} label="Jetzt registrieren" />
				<p style={{fontSize: 14, marginTop: 20}}>Klicken Sie hier um <a href="#">sich anzumelden</a>. <a href="#">Allgemeinen Geschäftsbedingungen</a> und <a href="#">Datenschutz</a></p>
			</form>
		);
	}
}
reactMixin(RegistrationForm.prototype, LinkedStateMixin);

app.value('RegistrationForm', RegistrationForm);

app.controller('HomeCtrl', ($scope, $location, user, User, auth, $timeout, session) => {

	$scope.props = {
		ng: {
			User,
		},
	};

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


