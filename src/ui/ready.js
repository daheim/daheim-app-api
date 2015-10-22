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

	constructor() {

	}

}

app.service('camera', CameraService);
app.service('user', UserService);

app.controller('ReadyCtrl', ($scope, camera, $location, $mdDialog, user) => {

	$scope.full = true;

	var fullscreenElement = document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement;
	var fullscreenEnabled = document.fullscreenEnabled || document.mozFullScreenEnabled || document.webkitFullscreenEnabled;
	if (fullscreenEnabled) {
		if (document.exitFullscreen) {
			document.exitFullscreen();
		} else if (document.mozCancelFullScreen) {
			document.mozCancelFullScreen();
		} else if (document.webkitExitFullscreen) {
			document.webkitExitFullscreen();
		}
	}

	$scope.ready = () => {
		if (!$scope.userId) {
			$mdDialog.show($mdDialog.alert().ok('Alright').title('Well...').content('A name! I need a name!'));
			return;
		}
		user.userId = $scope.userId;
		if ($scope.full) {
			try {
				let element = window.document.body;
				if (element.requestFullscreen) {
					element.requestFullscreen();
				} else if (element.mozRequestFullScreen) {
					element.mozRequestFullScreen();
				} else if (element.webkitRequestFullscreen) {
					element.webkitRequestFullscreen();
				} else if (element.msRequestFullscreen) {
					element.msRequestFullscreen();
				}
			} catch (ex) {
				console.error('fullscreen', ex);
			}
		}
		$location.path('/third');
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


