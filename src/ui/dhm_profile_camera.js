import {MediaStreamRequester} from './localheim';

let app = angular.module('dhm.profileCamera', []);
export default app;

app.directive('dhmProfileCamera', () => {
	return {
		restrict: 'E',
		template: `
			<div class="dhm-profile-camera">
				<div ng-hide="snapped || msr.current.stream" class="dhm-icon-wrapper" layout="column" layout-align="center center"><md-icon class="dhm-icon">camera_enhance</md-icon></div>
				<video ng-hide="snapped || !msr.current.stream" class="dhm-video" dhm-src-object="msr.current.stream" muted autoplay></video>
				<canvas ng-show="snapped" class="dhm-canvas" width="{{pictureWidth}}" height="{{pictureHeight}}"></canvas>
			</div>
		`,
		scope: {
			active: '&',
			snap: '&',
			imageData: '=',
			pictureWidth: '@',
			pictureHeight: '@'
		},
		link: ($scope, element) => {

			let video = element.find('video.dhm-video')[0];
			let canvas = element.find('canvas.dhm-canvas')[0];

			let active;
			let snap;

			$scope.$watch($scope.active, value => {
				active = value;
				activate();
			});
			$scope.$watch($scope.snap, value => {
				snap = value;
				activate();
			});
			$scope.$on('$destroy', destroyMsr);

			function activate() {
				if (!active) {
					delete $scope.snapped;
					delete $scope.imageData;
					destroyMsr();
					return;
				}

				if (!snap) {
					delete $scope.snapped;
					delete $scope.imageData;
					if (!$scope.msr) {
						$scope.msr = new MediaStreamRequester({constraints: {video: true}});
						$scope.msr.on('stream', () => $scope.$apply());
						$scope.msr.start();
					}
					return;
				}

				let ratio = canvas.width / canvas.height;
				let width = video.videoWidth;
				let height = Math.floor(width / ratio);
				if (height > video.videoHeight) {
					height = video.videoHeight;
					width = Math.floor(height * ratio);
				}
				let x = (video.videoWidth - width) / 2;
				let y = (video.videoHeight - height) / 2;

				let context = canvas.getContext('2d');
				context.save();
				context.scale(-1, 1);
				context.drawImage(video, x, y, width, height, -canvas.width, 0, canvas.width, canvas.height);
				context.restore();

				$scope.imageData = canvas.toDataURL('image/png');
				$scope.snapped = true;

				destroyMsr();
			}


			function destroyMsr() {
				if ($scope.msr) {
					$scope.msr.close();
					if ($scope.msr.current) {
						$scope.msr.current.close();
					}
					delete $scope.msr;
				}
			}
		}
	};
});
