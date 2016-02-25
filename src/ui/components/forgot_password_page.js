import React from 'react';
import TextField from 'material-ui/lib/text-field';
import RaisedButton from 'material-ui/lib/raised-button';
import LinkedStateMixin from 'react-addons-linked-state-mixin';
import reactMixin from 'react-mixin';
import {Link} from 'react-router';
import {LoadingPanel} from './loading_panel';

export class ForgotPasswordForm extends React.Component {

	static propTypes = {
		defaultUsername: React.PropTypes.string,
		onLogin: React.PropTypes.func,
	};

	state = {
		email: this.props.defaultUsername || '',
		loading: false,
		error: null,
		errorEmail: null,
	};

	handleLoginClick = async e => {
		e.preventDefault();

		if (!this.validateLogin()) { return; }

		if (this.state.loading) { return; }

		this.setState({loading: true});
		let success = await this.apiLogin();
		this.setState({loading: false});

		this.refs.email.focus();
		if (!success) { return; }

		if (this.props.onLogin) { this.props.onLogin(); }
	};

	async apiLogin() {
		try {
			let resultIgnored = await $.ajax({
				method: 'post',
				url: '/api/forgot',
				contentType: 'application/json',
				data: JSON.stringify({
					email: this.state.email,
				}),
			});
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
			errorEmail: null,
		};


		if (!this.state.email) {
			valid.hasErrors = true;
			valid.errorEmail = valid.error = 'Bitte E-Mail-Addresse eingeben';
		}

		this.setState(valid);

		return !valid.hasErrors;
	}

	componentDidMount() {
		this.refs.email.focus();
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
					<h1 style={{fontSize: 22}}>Passwort vergessen?</h1>
					<h2 style={{fontSize: 14, fontWeight: 400, lineHeight: '150%'}}>Geben Sie Ihre E-Mail-Adresse ein und wir helfen Ihnen, Ihr Passwort zurückzusetzen.</h2>
					{error}
					<TextField ref="email" fullWidth floatingLabelText="E-Mail-Addresse" errorText={this.state.errorEmail} valueLink={this.linkState('email')} />
					<RaisedButton type="submit" style={{marginTop: 20}} fullWidth secondary label="Weiter" />
				</form>
			</LoadingPanel>
		);
	}
}
reactMixin(ForgotPasswordForm.prototype, LinkedStateMixin);

export class EmailSent extends React.Component {

	static propTypes = {
		style: React.PropTypes.object,
	};

	render() {
		return (
			<div style={this.props.style}>E-Mail wurde gesendet.</div>
		);
	}

}

export class ForgotPasswordPage extends React.Component {

	static propTypes = {
		location: React.PropTypes.shape({
			query: React.PropTypes.shape({
				username: React.PropTypes.string,
			}).isRequired,
		}).isRequired,
	};

	state = {
		sent: false,
	};

	handleLogin = () => {
		this.setState({sent: true});
	};

	render() {
		return (
			<div style={{maxWidth: 400, margin: '0 auto', padding: '16px 10px'}}>
				<div style={{background: 'rgba(255,255,255,0.9)', borderRadius: 10, padding: 20, paddingTop: 12}}>
					{!this.state.sent ? (
						<ForgotPasswordForm onLogin={this.handleLogin} defaultUsername={this.props.location.query.username} />
					) : (
						<EmailSent style={{paddingTop: 8}} />
					)}
				</div>
			</div>
		);
	}

}

