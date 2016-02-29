import React from 'react';

import RaisedButton from 'material-ui/lib/raised-button';

import {history} from './history';
import {AngularDirective} from './angular_directive';
import {ReviewList} from './review_list';
import {PicturePanel} from './picture_upload';

import registerPictureTemplate from '../../../public/partials/register_picture.html';
import registerProfileTemplate from '../../../public/partials/register_profile.html';

let app = angular.module('dhm');
app.directive('dhmInteropRegisterPicture', () => {
	return {
		restrict: 'E',
		template: registerPictureTemplate,
		controller: 'RegisterPictureCtrl',
	};
});
app.directive('dhmInteropRegisterProfile', () => {
	return {
		restrict: 'E',
		template: registerProfileTemplate,
		controller: 'RegisterProfileCtrl',
	};
});

export class ReadyPage extends React.Component {

	handleReadyClick = e => {
		e.preventDefault();
		history.push('/video');
	};

	render() {
		return (
			<div>
				<div style={{textAlign: 'center'}}>
					<div style={{display: 'inline-block', margin: '20px auto'}}>
						<RaisedButton primary label="Start a Lesson" onClick={this.handleReadyClick}/>
					</div>
				</div>
				<div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'center', maxWidth: 1000, width: '100%', margin: '0 auto'}}>
					<ReviewList style={{flex: '0 1 600px'}} />
				</div>
				<div style={{display: 'flex', flexWrap: 'wrap', maxWidth: 1000, width: '100%', margin: '0 auto'}}>
					<AngularDirective style={{flex: '1 1 600px'}}><dhm-interop-register-profile /></AngularDirective>
					<AngularDirective style={{flex: '1 1 auto'}}><dhm-interop-register-picture /></AngularDirective>
				</div>
				<div style={{display: 'flex', maxWidth: 1000, width: '100%', margin: '0 auto', justifyContent: 'center'}}>
					<PicturePanel style={{flex: '0 1 600px'}} />
				</div>
			</div>
		);
	}

}
