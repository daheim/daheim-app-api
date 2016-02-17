import React from 'react';
import ReactDOM from 'react-dom';

import interop from '../interop';

export class AngularDirective extends React.Component {

	componentDidMount() {
		this.doAngular();
	}

	componentDidUpdate() {
		this.doAngular();
	}

	doAngular() {
		if (!this.refs.content) { return; }

		let element = angular.element(this.refs.content);
		let scope = element.scope() || interop.$rootScope;

		let div = document.createElement('div');
		ReactDOM.render(React.Children.only(this.props.children), div);

		let compiled = interop.$compile(div.innerHTML)(scope);
		element.empty().append(compiled);
	}

	render() {
		return <div ref="content" />;
	}
}
