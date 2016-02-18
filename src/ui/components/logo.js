import React from 'react';

export class Logo extends React.Component {

	static propTypes = {
		style: React.PropTypes.object,
	};

	render() {

		return (
			<a style={Object.assign({
				fontFamily: 'Megrim,cursive',
				lineHeight: '65px',
				fontSize: 46,
				color: 'white',
				fontWeight: '400',
				textDecoration: 'none',
				display: 'inline-block',
				opacity: 0.8,
				textShadow: '2px 2px 5px #222',
			}, this.props.style)} href="http://daheimapp.de">
				<span style={{font: 'normal normal normal 46px/1 FontAwesome'}}></span> Daheim
			</a>
		);
	}

}

