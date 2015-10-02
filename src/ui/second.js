import CommandProtocol from '../command_protocol';
import WebRTC from 'webrtc-adapter-test';
import Promise from 'bluebird';
import WebrouletteClient from './webroulette_client';
import SocketService from './socket_service';
import ResizeDirective from './window_resize';

console.log('WebRTC', WebRTC);

var angular = window.angular;

angular.module('dhm')

.directive('windowResize', ResizeDirective)

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

			// let a = element[0];
			// let events = {};
			// for (let p in a) {
			// 	if (p.indexOf('on') === 0) {
			// 		events[p] = true;
			// 	}
			// }
			// //delete events.onprogress;
			// //delete events.ontimeupdate;
			// delete events.onmousemove;
			// Object.keys(events).forEach(name => {
			// 	name = name.substring(2);
			// 	element.on(name, (e) => console.log(name, a.videoWidth, a.currentTime, a.duration));
			// });
		}
	};
})

.directive('dhmResize', ($parse) => {
	return {
		restrict: 'A',
		link: ($scope, $element, $attributes) => {
			let fn = $parse($attributes.dhmResize);
			let handler = () => fn($scope);
			$element.on('resize', handler);
			$scope.$on('$destroy', () => {
				$element.off('resize', handler);
			});
		}
	};
})

.service('socketService', SocketService)

.controller('SecondCtrl', function($scope, $window, $log, $interval, config, socketService, $anchorScroll) {
	var socket = socketService.connect($scope);

	console.log(WebRTC.webrtcDetectedBrowser, WebRTC.webrtcDetectedVersion, WebRTC.webrtcMinimumVersion);

	var cp = new CommandProtocol({client: socket._socket});

	$scope.remoteResized = () => {
		$anchorScroll.yOffset = 64;
		$anchorScroll('lenyeg');
	};

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

