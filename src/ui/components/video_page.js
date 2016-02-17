import React from 'react';

import {AngularDirective} from './angular_directive';

let app = angular.module('dhm');
app.directive('dhmThird', () => {
	return {
		restrict: 'E',
		templateUrl: '/partials/third.html',
		controller: 'ThirdCtrl',
	};
});

export class VideoPage extends React.Component {

	render() {
		return (
			<div>
				<AngularDirective><dhm-third /></AngularDirective>
			</div>
		);
	}

}
