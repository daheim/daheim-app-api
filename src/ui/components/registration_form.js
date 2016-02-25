import React from 'react';
import TextField from 'material-ui/lib/text-field';
import RaisedButton from 'material-ui/lib/raised-button';
import Checkbox from 'material-ui/lib/checkbox';
import LinkedStateMixin from 'react-addons-linked-state-mixin';
import reactMixin from 'react-mixin';
import {Link} from 'react-router';
import {LoadingPanel} from './loading_panel';

import interop from '../interop';

export class RegistrationForm extends React.Component {

	static propTypes = {
		defaultUsername: React.PropTypes.string,
		onLogin: React.PropTypes.func,
	};

	state = {
		email: this.props.defaultUsername || '',
		password: '',
		newsletter: false,
		agree: false,
		loading: false,
		error: null,
		errorPassword: null,
		errorEmail: null,
	};

	handleNewsletterChange = e => this.setState({newsletter: e.target.checked});
	handleAgreeChange = e => this.setState({agree: e.target.checked});

	handleRegisterClick = async e => {
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
				url: '/api/register',
				contentType: 'application/json',
				data: JSON.stringify({
					email: this.state.email,
					password: this.state.password,
					newsletter: this.state.newsletter,
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
			if (json && json.error) {
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
		} else if (this.state.password.length < 6) {
			valid.hasErrors = true;
			valid.errorPassword = valid.error = 'Passwort zu kurz (min. 6 Zeichen)';
		}

		if (!this.state.email) {
			valid.hasErrors = true;
			valid.errorEmail = valid.error = 'Bitte E-Mail-Addresse eingeben';
		} else if (this.state.email.indexOf('@') === -1) {
			valid.hasErrors = true;
			valid.errorEmail = valid.error = 'E-Mail-Addresse ist nicht gültig';
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
					Mitglied gefunden. Klicken Sie hier, um <Link to={{pathname: '/auth', query: {username: this.state.email || undefined}}}>sich anzumelden</Link>.
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
				<form onSubmit={this.handleRegisterClick}>
					<h1 style={{fontSize: 22}}>Jetzt kostenlos Mitglied werden!</h1>
					{error}
					<TextField ref="email" fullWidth floatingLabelText="E-Mail-Addresse" errorText={this.state.errorEmail} valueLink={this.linkState('email')} />
					<TextField ref="password" style={{marginTop: -10}} type="password" fullWidth errorText={this.state.errorPassword} floatingLabelText="Passwort" valueLink={this.linkState('password')} />
					<Checkbox style={{marginTop: 20}} label="Ja, ich möchte zum Newsletter anmelden" checked={this.state.newsletter} onCheck={this.handleNewsletterChange} />
					<Checkbox style={{marginTop: 10}} label="Ja, ich akzeptiere die AGB" checked={this.state.agree} onCheck={this.handleAgreeChange} />
					<RaisedButton disabled={!this.state.agree} type="submit" style={{marginTop: 20}} fullWidth secondary label="Jetzt registrieren" />
					<p style={{fontSize: 14, marginTop: 20, lineHeight: '150%'}}>Klicken Sie hier, um <Link to={{pathname: '/auth', query: {username: this.state.email || undefined}}}>sich anzumelden</Link>. <a href="#">Allgemeinen Geschäftsbedingungen</a> und <a href="#">Datenschutzrichtlinien</a></p>
				</form>
			</LoadingPanel>
		);
	}
}
reactMixin(RegistrationForm.prototype, LinkedStateMixin);
