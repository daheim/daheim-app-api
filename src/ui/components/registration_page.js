import React from 'react';

import {RegistrationForm} from './registration_form';
import {history} from './history';

export class RegistrationPage extends React.Component {

	handleLogin = () => {
		history.push('/');
	};

	render() {
		return (
			<div style={{maxWidth: 400, margin: '0 auto', padding: '80px 10px'}}>
				<div style={{background: 'rgba(255,255,255,0.9)', borderRadius: 10, padding: 20}}>
					<RegistrationForm onLogin={this.handleLogin} />
				</div>
			</div>
		);
	}

}
