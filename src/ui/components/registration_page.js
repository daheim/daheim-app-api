import React from 'react';

import {RegistrationForm} from './registration_form';

export class RegistrationPage extends React.Component {

	render() {
		return (
			<div style={{maxWidth: 400, margin: '0 auto', padding: '80px 10px'}}>
				<div style={{background: 'rgba(255,255,255,0.9)', borderRadius: 10, padding: 20}}>
					<RegistrationForm />
				</div>
			</div>
		);
	}

}
