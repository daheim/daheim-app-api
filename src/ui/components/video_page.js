import React from 'react';

import interop from '../interop';

let app = angular.module('dhm');

app.directive('dhmThird', () => {
	return {
		restrict: 'E',
		templateUrl: '/partials/third.html',
		controller: 'ThirdCtrl',
	};
});

export class VideoPage extends React.Component {

	componentDidMount() {
		angular.element(this.refs.content).append(interop.$compile('<dhm-third />')(interop.$rootScope));
	}

	render() {
		return (
			<div>
				<div ref="content" />
			</div>
		);
	}

}
