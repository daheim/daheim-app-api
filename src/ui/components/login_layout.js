import React from 'react';

import {Logo} from './logo';

export class LoginLayout extends React.Component {

	state = {

	};

	render() {
		return (
			<div style={{background: 'black'}}>
				<div>
					<div style={{position: 'absolute', width: '100%', right: 0, top: 0, bottom: 0, backgroundSize: 'cover', backgroundImage: 'url(https://assets.daheimapp.de/media/daheim_hero.jpg),url(https://assets.daheimapp.de/media/daheim_hero@tiny.jpg)'}}></div>
					<div style={{position: 'absolute', background: 'linear-gradient(rgba(0,0,0,0), black)', width: '100%', bottom: 0, height: 50}}></div>
					<div style={{textAlign: 'center', paddingTop: 60}}><Logo /></div>
					<div style={{position: 'relative'}}>
						{this.props.children}
						<div style={{textAlign: 'center', textShadow: '1px 1px 5px black', paddingTop: 6, color: 'rgba(255, 255, 255, 0.8)', fontSize: 12, lineHeight: '22px'}}>
							<span style={{padding: '0 10px'}}><a style={{color: 'rgba(255, 255, 255, 0.8)'}} href="https://daheimapp.de/impressum" target="_blank">Impressum</a></span> |
							<span style={{padding: '0 10px'}}><a style={{color: 'rgba(255, 255, 255, 0.8)'}} href="https://daheimapp.de/terms" target="_blank">AGB</a></span> |
							<span style={{padding: '0 10px'}}><a style={{color: 'rgba(255, 255, 255, 0.8)'}} href="https://daheimapp.de/privacy" target="_blank">Datenschutz</a></span>
						</div>
						<div style={{textAlign: 'center', textShadow: '1px 1px 5px black', color: 'rgba(255, 255, 255, 0.6)', fontSize: 12, lineHeight: '22px'}}>
							Copyright © 2015–2016 Daheim. Alle Rechte vorbehalten.
						</div>
					</div>
				</div>
			</div>
		);
	}

}
