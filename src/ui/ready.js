import {MediaStreamRequester} from './localheim';

import createDebug from 'debug';
let debug = createDebug('dhm:ready');

let app = window.angular.module('dhm');

class CameraService {

	constructor($rootScope) {
		console.log($rootScope);
	}

	async start() {
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
		console.log('localStream', localStream);
	}

}

class UserService {
}

const $token = Symbol('token');

class AuthService {

	constructor() {
		this[$token] = window.localStorage.token;
	}

	get accessToken() { return this[$token]; }
	set accessToken(token) {
		this[$token] = token;
		window.localStorage.token = token;
	}

	get authHeader() { return () => 'Bearer ' + this.accessToken; }
	get headers() {	return {authorization: this.authHeader}; }
	get auth() { return {headers: this.headers}; }
}

app.factory('User', function($resource, auth) {
	return $resource('/users/:method', null, {
		register: {method: 'post', params: {method: 'register'}},
		saveProfile: {method: 'post', params: {method: 'profile'}, headers: auth.headers},
		getProfile: {params: {method: 'profile'}, headers: auth.headers}
	});
});

app.service('camera', CameraService);
app.service('user', UserService);
app.service('auth', AuthService);




app.controller('ReadyCtrl', ($scope, camera, $location, $mdDialog, user, User, auth, $timeout) => {

	// $scope.msr = new MediaStreamRequester({constraints: {video: true}});
	// $scope.msr.on('stream', () => $scope.$apply());
	// $scope.$on('$destroy', () => {
	// 	if ($scope.msr.current) {
	// 		$scope.msr.current.close();
	// 	}
	// 	$scope.msr.close();
	// });
	// $scope.msr.start();

	$scope.languages = [];
	$scope.topics = [];


	$scope.loading = true;
	User.getProfile(profile => {
		$scope.loading = false;
		debug('profile', profile);
		$scope.languages = profile.languages || [];
		$scope.topics = profile.topics || [];
		$scope.name = profile.name;
		//debug('$scope', $scope);
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

	$scope.takePhoto = () => {
		$scope.cameraSnap = !$scope.cameraSnap;
	};

	$scope.photoActive = () => {
		$scope.cameraActive = !$scope.cameraActive;
	};

	$scope.$watch('imageData', value => {
		debug('image data %s', value);
	});

	$scope.saveProfile = async () => {
		let profile = await User.saveProfile({
			name: $scope.name,
			languages: $scope.languages,
			topics: $scope.topics
		}).$promise;
		debug('profile', profile);
	};

	$scope.register = (e) => {
		console.log('register');

		(async () => {
			let res = await User.register({email: $scope.email}).$promise;
			console.log('register', res);
			if (res.state === 'new') {
				auth.accessToken = res.accessToken;
			}
			let profile = await User.profile().$promise;
			debug('profile', profile);
		})();

	};

	$scope.ready = () => {
		if (!$scope.userId) {
			$mdDialog.show($mdDialog.alert().ok('Alright').title('Well...').content('A name! I need a name!'));
			return;
		}
		user.userId = $scope.userId;
		$location.path('/third');
	};

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

	//camera.start();

	async function getDevices() {
		try {
			let devices = await navigator.mediaDevices.enumerateDevices();
			console.log(devices);
		} catch (ex) {
			console.error('cannot get devices', ex);
		}
	}

	getDevices();

});


