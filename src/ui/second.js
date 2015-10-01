import CommandProtocol from '../command_protocol';
import WebRTC from 'webrtc-adapter-test';
import Promise from 'bluebird';
import WebrouletteClient from './webroulette_client';
import SocketService from './socket_service';

console.log('WebRTC', WebRTC);

var angular = window.angular;

angular.module('dhm')

.filter('trusted', function($sce) {
	return function(url) {
		return $sce.trustAsResourceUrl(url);
	};
})

.directive('dhmSrcObject', function($window) {
	return {
		restrict: 'A',
		link: function(scope, element, attributes, controller, transcludeFn) {
			scope.$watch(attributes.dhmSrcObject, function(value) {
				if (value) {
					WebRTC.attachMediaStream(element[0], value);
				}
			});
		}
	};
})

.service('socketService', SocketService)

.controller('SecondCtrl', function($scope, $window, $log, $interval, config, socketService) {
	var socket = socketService.connect($scope);

	console.log(WebRTC.webrtcDetectedBrowser, WebRTC.webrtcDetectedVersion, WebRTC.webrtcMinimumVersion);

	var cp = new CommandProtocol({client: socket._socket});

	$scope.german = function() {
		WebRTC.getUserMedia({audio: true, video: true}, function(stream) {
			$log.info('got user media', stream);
			// var options = {};
			// var speechEvents = hark(stream, options);
			// console.log(speechEvents);
			// speechEvents.on('speaking', function() {
			// 	console.log('speaking', arguments);
			// });
			// speechEvents.on('stopped_speaking', function() {
			// 	console.log('stopped_speaking', arguments);
			// });
			// speechEvents.on('volume_change', function(volume) {
			// 	$scope.$apply(function() {
			// 		$scope.volume = volume;
			// 	});
			// 	//console.log('volume_change', arguments);
			// });
			gotStream(stream);

		}, function(err) {
			$log.error('getUserMedia error', err);
		});
	};

	let wc;

	function gotStream(stream) {
		$scope.$apply(function() {
			$scope.localVideoObject = stream;
		});
		wc = new WebrouletteClient(cp, stream, $scope);
		cp.send('enqueue').then(function() {
			console.log('enqueued');
		}).catch(function(err) {
			console.error('err', err);
		});
		return;
	}

	$scope.klose = function() {
		$scope.localVideoObject = undefined;
		// pc.close();
		// str.stop();
	};

	$scope.stats = () => {
		wc.peerConnection.getStats(null).then(res => {
			console.log(res);
		}).catch(err => {
			console.error(err);
		});
	};

	// $window.navigator.getUserMedia({
	// 	audio: true,
	// 	video: {
	// 		mandatory: {
	// 			maxWidth: 200,
	// 			minWidth: 100,
	// 			maxHeight: 200,
	// 			minHeight: 100
	// 		}
	// 	}
	// }, function(stream) {
	// 	$scope.$apply(function() {
	// 		$scope.vid1 = stream;
	// 	});
	// }, function(err) {
	// 	console.error('bazge', err);
	// });

	// $window.navigator.getUserMedia({
	// 	audio: true,
	// 	video: {
	// 		mandatory: {
	// 			maxWidth: 640,
	// 			maxHeight: 360
	// 		}
	// 	}
	// }, function(stream) {
	// 	$scope.$apply(function() {
	// 		$scope.vid2 = stream;
	// 	});
	// }, function(err) {
	// 	console.error('bazge', err);
	// });

})

;

