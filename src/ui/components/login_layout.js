import React from 'react';

export class LoginLayout extends React.Component {

	state = {

	};

	render() {
		return (
			<div style={{background: 'black'}}>
				<div>
				<div style={{position: 'absolute', width: '100%', right: 0, top: 0, bottom: 0, backgroundSize: 'cover', backgroundImage: 'url(https://assets.daheimapp.de/media/daheim_hero.jpg),url(https://assets.daheimapp.de/media/daheim_hero@tiny.jpg)'}}></div>
				<div style={{position: 'absolute', background: 'linear-gradient(rgba(0,0,0,0), black)', width: '100%', bottom: 0, height: 50}}></div>
				<div style={{position: 'relative'}}>
					{this.props.children}
				</div>
				</div>
			</div>
		);
	}

}
