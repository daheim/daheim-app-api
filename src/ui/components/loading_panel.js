import React from 'react';
import CircularProgress from 'material-ui/lib/circular-progress';

export class LoadingPanel extends React.Component {

	static defaultProps = {
		loading: false,
	};

	static propTypes = {
		loading: React.PropTypes.bool,
	};

	render() {
		let {style, loading, ...props} = this.props;

		let loadingDiv;
		let loadingStyle = {};
		if (loading) {
			loadingDiv = (
				<div style={{position: 'absolute', width: '100%', height: '100%', zIndex: 100, display: 'flex', alignItems: 'center'}}>
					<CircularProgress style={{margin: '0 auto'}} />
				</div>
			);
			loadingStyle.opacity = 0.2;
		}

		return (
			<div style={Object.assign({position: 'relative', width: '100%'}, style)} {...props}>
				{loadingDiv}
				<div style={loadingStyle}>
					{this.props.children}
				</div>
			</div>
		);
	}
}

