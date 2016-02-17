import React from 'react';

import {AngularDirective} from './angular_directive';
import thirdTemplate from '../../../public/partials/third.html';

let app = angular.module('dhm');
app.directive('dhmThird', () => {
	return {
		restrict: 'E',
		template: thirdTemplate,
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
