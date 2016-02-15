import React from 'react';
import reactMixin from 'react-mixin';
import LinkedStateMixin from 'react-addons-linked-state-mixin';
import {TextField, RaisedButton, FlatButton} from 'material-ui';
import injectTapEventPlugin from 'react-tap-event-plugin';

injectTapEventPlugin();

export class PasswordChange extends React.Component {
	constructor(props) {
		super(props);
		this.displayName = 'PasswordChange';
	}

	state = {
		oldPassword: '',
		newPassword: '',
		confirmPassword: '',
		confirmError: null,
		hasError: false,
	};

	handleChangeClick = async eIgnored => {
		let newState = {
			confirmError: null,
			hasError: false,
		};

		if (this.state.newPassword !== this.state.confirmPassword) {
			newState.confirmError = `Password doesn't match the confirmation`;
			newState.hasError = true;
		}

		this.setState(newState);
		if (newState.hasError) { return; }

		let resultIgnored = await this.props.ng.User.changePassword({
			oldPassword: this.state.oldPassword,
			newPassword: this.state.newPassword,
		}).$promise;
	};

	render() {
		return (
			<form>
				<div style={{display: 'flex', flexDirection: 'column', maxWidth: 500, margin: '0 auto'}}>
					<TextField fullWidth={true} type="password" floatingLabelText="Old password" valueLink={this.linkState('oldPassword')} />
					<TextField fullWidth={true} type="password" floatingLabelText="New password" valueLink={this.linkState('newPassword')} />
					<TextField fullWidth={true} type="password" floatingLabelText="Confirm new password" errorText={this.state.confirmError} valueLink={this.linkState('confirmPassword')} />
					<div style={{marginTop: 20}}>
						<RaisedButton style={{marginRight: 10}} label="Update password" primary={true} onClick={this.handleChangeClick} />
						<FlatButton label="I forgot my password" />
					</div>
				</div>
			</form>
		);
	}
}
reactMixin(PasswordChange.prototype, LinkedStateMixin);



let app = window.angular.module('dhm');
app.value('PasswordChange', PasswordChange);
app.controller('SettingsCtrl', function($scope, User) {
	$scope.props = {
		ng: {
			User,
		},
	};
});
