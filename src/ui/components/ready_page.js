import React from 'react';

import {history} from './history';

export class ReadyPage extends React.Component {

	handleReadyClick = e => {
		e.preventDefault();
		history.push('/video');
	};

	render() {
		return (
			<div>
				I am <a href="#" onClick={this.handleReadyClick}>ready</a>!
			</div>
		);
	}

}
