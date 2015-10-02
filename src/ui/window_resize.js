
function ResizeDirective($window) {
	'ngInject';

	return {
		restrict: 'A',
		link: ($scope, $element) => {
			//'ngInject';

			let w = angular.element($window);
			$scope.getWindowDimensions = () => {
				return {
					'h': w.height(),
					'w': w.width()
				};
			};

			$scope.$watch($scope.getWindowDimensions, function(newValue, oldValue) {
				$scope.windowHeight = newValue.h;
				$scope.windowWidth = newValue.w;
			}, true);

			let handler = () => {
				$scope.$apply();
			};
			w.on('resize', handler);
			$scope.$on('$destroy', () => {
				w.off('resize', handler);
			});
		}
	};
}

export default ResizeDirective;
