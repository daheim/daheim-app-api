import React from 'react';
import ReactDOM from 'react-dom';

import interop from '../interop';

export class AngularDirective extends React.Component {

	static propTypes = {
		children: React.PropTypes.element.isRequired,
		style: React.PropTypes.object,
	};

	componentDidMount() {
		let element = angular.element(this.refs.content);
		let scope = element.scope() || interop.$rootScope;
		this.scope = scope.$new();

		this.doAngular();
	}

	componentDidUpdate() {
		this.doAngular();
	}

	componentWillUnmount() {
		this.scope.$destroy();
	}

	doAngular() {
		if (!this.refs.content) { return; }

		let element = angular.element(this.refs.content);

		let div = document.createElement('div');
		ReactDOM.render(React.Children.only(this.props.children), div);

		let compiled = interop.$compile(div.innerHTML)(this.scope);
		element.empty().append(compiled);
	}

	render() {
		return <div style={this.props.style} ref="content" />;
	}
}
