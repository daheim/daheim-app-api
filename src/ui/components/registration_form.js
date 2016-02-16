import React from 'react';
import TextField from 'material-ui/lib/text-field';
import RaisedButton from 'material-ui/lib/raised-button';
import Checkbox from 'material-ui/lib/checkbox';
import CircularProgress from 'material-ui/lib/circular-progress';
import muiTheme from '../theme';
import LinkedStateMixin from 'react-addons-linked-state-mixin';
import reactMixin from 'react-mixin';

export class RegistrationForm extends React.Component {
	static childContextTypes = {
		muiTheme: React.PropTypes.object,
	};

	getChildContext() {
		return {muiTheme};
	}

	state = {
		email: '',
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
			let resultIgnored = await $.ajax({
				method: 'post',
				url: '/api/register',
				contentType: 'application/json',
				data: JSON.stringify({
					email: this.state.email,
					password: this.state.password,
					newsletter: this.state.newsletter,
				}),
				headers: {Authorization: this.props.ng.auth.authHeader()},
			});

			// TODO: process auth token
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
			valid.errorEmail = valid.error = 'Bitte E-Mail Addresse eingeben';
		} else if (this.state.email.indexOf('@') === -1) {
			valid.hasErrors = true;
			valid.errorEmail = valid.error = 'E-Mail Addresse ist nicht gültig';
		}

		this.setState(valid);

		return !valid.hasErrors;
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

		let loading;
		if (this.state.loading) {
			loading = (
				<div style={{position: 'absolute', width: '100%', height: '100%', background: 'rgba(255,255,255,0.7)', zIndex: 100, display: 'flex', alignItems: 'center'}}>
					<CircularProgress style={{margin: '0 auto'}} />
				</div>
			);
		}

		return (
			<form onSubmit={this.handleRegisterClick} style={{position: 'relative'}}>
				{loading}
				<h1>Jetzt kostenlos Mitglied werden!</h1>
				{error}
				<TextField fullWidth={true} floatingLabelText="E-Mail Addresse" errorText={this.state.errorEmail} valueLink={this.linkState('email')} />
				<TextField style={{marginTop: -10}} type="password" fullWidth={true} errorText={this.state.errorPassword} floatingLabelText="Passwort" valueLink={this.linkState('password')} />
				<Checkbox style={{marginTop: 20}} label="Ja, ich möchte zum Newsletter anmelden" checked={this.state.newsletter} onCheck={this.handleNewsletterChange} />
				<Checkbox style={{marginTop: 10}} label="Ja, ich akzeptiere die Allgemeinen Geschäftsbedingungen" checked={this.state.agree} onCheck={this.handleAgreeChange} />
				<RaisedButton disabled={!this.state.agree} type="submit" style={{marginTop: 20}} fullWidth={true} primary={true} label="Jetzt registrieren" />
				<p style={{fontSize: 14, marginTop: 20}}>Klicken Sie hier, um <a href="#">sich anzumelden</a>. <a href="#">Allgemeinen Geschäftsbedingungen</a> und <a href="#">Datenschutzrichtlinien</a></p>
			</form>
		);
	}
}
reactMixin(RegistrationForm.prototype, LinkedStateMixin);
