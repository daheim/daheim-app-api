import React from 'react';

import FlatButton from 'material-ui/lib/flat-button';
import interop from '../interop';
import {history} from './history';
import {Logo} from './logo';

export class DefaultLayout extends React.Component {

	state = {

	};

	handleSignOutClick = eIgnored => {
		interop.auth.accessToken = undefined;
		history.push('/auth/register');
	};

	componentWillMount() {
		if (!interop.auth.accessToken) {
			history.push('/auth/register');
		}
	}

	componentWillUpdate() {
		if (!interop.auth.accessToken) {
			history.push('/auth/register');
		}
	}

	render() {
		return (
			<div style={{flex: '1 1 auto', background: 'black', backgroundSize: 'cover', backgroundImage: 'url(https://assets.daheimapp.de/media/daheim_hero.jpg),url(https://assets.daheimapp.de/media/daheim_hero@tiny.jpg)'}}>
				<div style={{margin: '0 auto', padding: 10, paddingTop: 20, maxWidth: 1000}}>
					<Logo style={{float: 'left'}} />
					<div style={{float: 'right', lineHeight: '65px'}}>
						<FlatButton style={{color: 'white', fontWeight: 700, opacity: 0.8}} label="Sign Out" onClick={this.handleSignOutClick} />
					</div>
				</div>
				<div style={{clear: 'both'}}>
					{this.props.children}
				</div>
			</div>
		);
	}

}
