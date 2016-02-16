import {Router, Route, IndexRoute, hashHistory} from 'react-router';
import React from 'react';
import {render} from 'react-dom';

import interop from './interop';
import muiTheme from './theme';
import {RegistrationPage, DefaultLayout, LoginLayout} from './components';


let routes = (
	<Router history={hashHistory}>
		<Route path="/auth" component={LoginLayout}>
			<IndexRoute component={RegistrationPage} />
			<Route path="register" component={RegistrationPage} />
		</Route>
		<Route path="*" component={DefaultLayout} />
	</Router>
);

class Routes extends React.Component {

	static childContextTypes = {
		muiTheme: React.PropTypes.object,
	};

	getChildContext() {
		return {
			muiTheme,
		};
	}

	render() {
		return routes;
	}
}



$(function() {
	interop.init();
	render(<Routes />, document.getElementById('container'));
});

