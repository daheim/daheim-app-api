import React from 'react';

export class Panel extends React.Component {

	static propTypes = {
		style: React.PropTypes.object,
		children: React.PropTypes.node,
	};

	render() {
		return (
			<div style={Object.assign({background: 'rgba(255,255,255,0.9)', borderRadius: 10, padding: 20, paddingTop: 12, margin: 10}, this.props.style)}>
				{this.props.children}
			</div>
		);
	}

}
