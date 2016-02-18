import React from 'react';
import TextField from 'material-ui/lib/text-field';
import RaisedButton from 'material-ui/lib/raised-button';
import LinkedStateMixin from 'react-addons-linked-state-mixin';
import reactMixin from 'react-mixin';
import {Link} from 'react-router';
import {LoadingPanel} from './loading_panel';

import interop from '../interop';

export class LoginForm extends React.Component {

	static propTypes = {
		defaultUsername: React.PropTypes.string,
	};

	state = {
		email: this.props.defaultUsername || '',
		password: '',
		loading: false,
		error: null,
		errorPassword: null,
		errorEmail: null,
	};

	handleLoginClick = async e => {
		e.preventDefault();

		if (!this.validateLogin()) { return; }

		if (this.state.loading) { return; }

		this.setState({loading: true});
		let success = await this.apiLogin();
		this.setState({loading: false});

		if (!success) { return; }

		if (this.props.onLogin) { this.props.onLogin(); }
	};

	async apiLogin() {
		try {
			let result = await $.ajax({
				method: 'post',
				url: '/api/login',
				contentType: 'application/json',
				data: JSON.stringify({
					email: this.state.email,
					password: this.state.password,
				}),
			});

			interop.auth.accessToken = result.accessToken;

			this.setState({error: null});
			return true;

		} catch (err) {
			let json;
			try {
				json = JSON.parse(err.responseText);
			} catch (errIgnored) {
				// ignore
			}

			let message;
			if (err.status === 0) {
				message = 'Server nicht erreichbar';
			} else if (err.status === 401) {
				message = 'Die eingegebenen Login-Daten sind nicht richtig. Bitte versuchen Sie es erneut.';
			} else if (json && json.error) {
				message = json.error;
			} else {
				message = `${err.status}: ${err.responseText}`;
			}

			this.setState({error: message});
			return false;
		}
	}

	validateLogin() {
		let valid = {
			hasErrors: false,
			errorPassword: null,
			errorEmail: null,
		};

		if (!this.state.password) {
			valid.hasErrors = true;
			valid.errorPassword = valid.error = 'Bitte Passwort eingeben';
		}

		if (!this.state.email) {
			valid.hasErrors = true;
			valid.errorEmail = valid.error = 'Bitte E-Mail-Addresse eingeben';
		}

		this.setState(valid);

		return !valid.hasErrors;
	}

	componentDidMount() {
		(this.state.email ? this.refs.password : this.refs.email).focus();
	}

	render() {
		let error;
		if (this.state.error === 'user_already_exists') {
			error = (
				<div style={{padding: '15px 30px 15px 15px', margin: '20px 0', backgroundColor: 'rgba(204,122,111,0.1)', borderLeft: '5px solid rgba(191,87,73,0.2)'}}>
					Mitglied gefunden. Klicken Sie hier, um <a href="#">sich anzumelden</a>.
				</div>
			);
		} else if (this.state.error) {
			error = (
				<div style={{padding: '15px 30px 15px 15px', margin: '20px 0', backgroundColor: 'rgba(204,122,111,0.1)', borderLeft: '5px solid rgba(191,87,73,0.2)'}}>
					Fehler: {this.state.error}
				</div>
			);
		}

		return (
			<LoadingPanel loading={this.state.loading}>
				<form onSubmit={this.handleLoginClick}>
					{error}
					<TextField ref="email" fullWidth={true} floatingLabelText="E-Mail-Addresse" errorText={this.state.errorEmail} valueLink={this.linkState('email')} />
					<TextField ref="password" style={{marginTop: -10}} type="password" fullWidth={true} errorText={this.state.errorPassword} floatingLabelText="Passwort" valueLink={this.linkState('password')} />
					<RaisedButton type="submit" style={{marginTop: 20}} fullWidth={true} secondary={true} label="Einloggen" />
					<div style={{fontSize: 14, textAlign: 'center', paddingTop: 20}}>
						<Link to={`/auth/forgot?username=${encodeURIComponent(this.state.email)}`}>Password vergessen?</Link> oder <Link to={`/auth/register?username=${encodeURIComponent(this.state.email)}`}>Neu anmelden</Link>
					</div>
				</form>
			</LoadingPanel>
		);
	}
}
reactMixin(LoginForm.prototype, LinkedStateMixin);
