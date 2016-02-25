import React from 'react';
import TextField from 'material-ui/lib/text-field';
import RaisedButton from 'material-ui/lib/raised-button';
import LinkedStateMixin from 'react-addons-linked-state-mixin';
import reactMixin from 'react-mixin';
import {Link} from 'react-router';
import {LoadingPanel} from './loading_panel';
import interop from '../interop';
import {history} from './history';

export class ResetPasswordForm extends React.Component {

	static propTypes = {
		token: React.PropTypes.string.isRequired,
	};

	state = {
		password: '',
		password2: '',
		loading: false,
		error: null,
		errorPassword: null,
		errorPassword2: null,
	};

	handleLoginClick = async e => {
		e.preventDefault();

		if (!this.validateLogin()) { return; }

		if (this.state.loading) { return; }

		this.setState({loading: true});
		let success = await this.apiLogin();
		this.setState({loading: false});

		this.refs.password.focus();
		if (!success) { return; }

		if (this.props.onLogin) { this.props.onLogin(); }
	};

	async apiLogin() {
		try {
			let result = await $.ajax({
				method: 'post',
				url: '/api/reset',
				contentType: 'application/json',
				data: JSON.stringify({
					password: this.state.password,
				}),
				headers: {
					Authorization: `Bearer ${this.props.token}`,
				},
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
			errorPassword2: null,
		};

		if (this.state.password !== this.state.password2) {
			valid.hasErrors = true;
			valid.errorPassword2 = valid.error = 'Die eingegebenen Passwörter stimmen nicht überein';
			this.refs.password2.focus();
		}

		if (!this.state.password) {
			valid.hasErrors = true;
			valid.errorPassword = valid.error = 'Bitte Passwort eingeben';
			this.refs.password.focus();
		} else if (this.state.password.length < 6) {
			valid.hasErrors = true;
			valid.errorPassword = valid.error = 'Passwort zu kurz (min. 6 Zeichen)';
			this.refs.password.focus();
		}

		this.setState(valid);

		return !valid.hasErrors;
	}

	componentDidMount() {
		this.refs.password.focus();
	}

	render() {
		let error;
		if (this.state.error === 'user_not_found') {
			error = (
				<div style={{padding: '15px 30px 15px 15px', margin: '20px 0', backgroundColor: 'rgba(204,122,111,0.1)', borderLeft: '5px solid rgba(191,87,73,0.2)'}}>
					Kein Mitglied gefunden. Klicken Sie hier, um <Link to={{pathname: '/auth/register', query: {username: this.state.email || undefined}}}>neu anzumelden</Link>.
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
					<h1 style={{fontSize: 22}}>Passwort zurückzusetzen</h1>
					{error}
					<TextField ref="password" style={{marginTop: -10}} type="password" fullWidth={true} errorText={this.state.errorPassword} floatingLabelText="Passwort" valueLink={this.linkState('password')} />
					<TextField ref="password2" style={{marginTop: -10}} type="password" fullWidth={true} errorText={this.state.errorPassword2} floatingLabelText="Passwort bestätigen" valueLink={this.linkState('password2')} />
					<RaisedButton type="submit" style={{marginTop: 20}} fullWidth={true} secondary={true} label="Password ändern" />
				</form>
			</LoadingPanel>
		);
	}
}
reactMixin(ResetPasswordForm.prototype, LinkedStateMixin);


export class ResetPasswordPage extends React.Component {

	state = {
		sent: false,
	};

	handleLogin = () => {
		history.replace('/');
	};

	render() {
		return (
			<div style={{maxWidth: 400, margin: '0 auto', padding: '16px 10px'}}>
				<div style={{background: 'rgba(255,255,255,0.9)', borderRadius: 10, padding: 20, paddingTop: 12}}>
					<ResetPasswordForm onLogin={this.handleLogin} token={this.props.location.query.token} />
				</div>
			</div>
		);
	}

}

