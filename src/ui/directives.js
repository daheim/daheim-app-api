import ResizeDirective from './window_resize';
import WebRTC from 'webrtc-adapter-test';

let app = window.angular.module('dhm');

app.directive('dhmSizeWatcher', function() {
	return {
		restrict: 'A',
		link: ($scope, $element, attributes) => {
			let watcherFn = () => { return {w: $element.width(), h: $element.height()}; };
			$scope.$watch(watcherFn, function(value) {
				if (!value) { return; }
				$scope[attributes.dhmSizeWatcher] = value;
			}, true);

			let handler = () => $scope.$apply();
			$element.on('resize', handler);
			$scope.$on('$destroy', () => $element.off('resize', handler));
		}
	};
});

app.directive('dhmCenter', function() {
	return {
		restrict: 'A',
		link: ($scope, $element, attributes) => {

			$element.css('position', 'absolute');

			function check() {
				return {
					w: $element.outerWidth(),
					h: $element.outerHeight(),
					pw: $element.parent().width(),
					ph: $element.parent().height()
				};
			}

			$scope.$watch(check, value => {
				if (!value) { return; }
				let left = Math.floor((value.pw - value.w) / 2);
				let top = Math.floor((value.ph - value.h) / 2);

				$element.css('left', '' + left + 'px');
				$element.css('top', '' + top + 'px');
			}, true);

			let handler = () => $scope.$apply();
			$element.on('resize', handler);
			$scope.$on('$destroy', () => $element.off('resize', handler));
			$element.parent().on('resize', handler);
			$scope.$on('$destroy', () => $element.parent().off('resize', handler));
		}
	};
});

app.directive('dhmMaxVideoSize', function() {
	return {
		restrict: 'A',
		link: ($scope, $element, attributes) => {
			$scope.$watch(attributes.dhmMaxVideoSize, value => {
				setSize();
			});

			function setSize() {
				let max = $scope.$eval(attributes.dhmMaxVideoSize);
				if (!max || !max.h || !max.w) { return; }

				let vw = $element[0].videoWidth;
				let vh = $element[0].videoHeight;

				let ratio;
				if (vw !== 0 && vh !== 0) {
					ratio = vh / vw;
				} else {
					ratio = 9 / 16;
				}

				let width = max.w;
				let height = max.w * ratio;
				if (height > max.h) {
					height = max.h;
					width = height / ratio;
				}

				width = Math.floor(width);
				height = Math.floor(height);

				$element.outerWidth(width);
				$element.outerHeight(height);
			}

			$element.on('resize', setSize);
			$scope.$on('$destroy', () => $element.off('resize', setSize));
		}
	};
});

app.directive('windowResize', ResizeDirective);

app.filter('trusted', function($sce) {
	return function(url) {
		return $sce.trustAsResourceUrl(url);
	};
});

app.directive('dhmSrcObject', function($window) {
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
});

app.directive('dhmResize', ($parse) => {
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
});
