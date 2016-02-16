import React from 'react';

export class DefaultLayout extends React.Component {

	state = {

	};

	render() {
		return (
			<div>
				{this.props.children}
			</div>
		);
	}

}
