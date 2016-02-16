import {Router, Route, IndexRoute} from 'react-router';
import React from 'react';
import {render} from 'react-dom';

import interop from './interop';
import muiTheme from './theme';
import {NotFoundPage, ReadyPage, VideoPage} from './components';
import {RegistrationPage, DefaultLayout, LoginLayout, history} from './components';


let routes = (
	<Router history={history}>
		<Route path="/" component={DefaultLayout}>
			<IndexRoute component={ReadyPage} />
			<Route path="video" component={VideoPage} />
		</Route>
		<Route path="/auth" component={LoginLayout}>
			<IndexRoute component={RegistrationPage} />
			<Route path="register" component={RegistrationPage} />
		</Route>
		<Route path="*" component={NotFoundPage} />
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

