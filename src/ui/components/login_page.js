import React from 'react';

import {LoginForm} from './login_form';
import {history} from './history';

export class LoginPage extends React.Component {

	static propTypes = {
		location: React.PropTypes.shape({
			query: React.PropTypes.shape({
				username: React.PropTypes.string,
			}).isRequired,
		}).isRequired,
	};

	handleLogin = () => {
		history.push('/');
	};

	render() {
		return (
			<div style={{maxWidth: 400, margin: '0 auto', padding: '16px 10px'}}>
				<div style={{background: 'rgba(255,255,255,0.9)', borderRadius: 10, padding: 20, paddingTop: 12}}>
					<LoginForm onLogin={this.handleLogin} defaultUsername={this.props.location.query.username} />
				</div>
			</div>
		);
	}

}
