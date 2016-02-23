import React from 'react';

import {history} from './history';

export class NotFoundPage extends React.Component {

	render() {
		return (
			<div style={{maxWidth: 400, margin: '0 auto', padding: '16px 10px'}}>
				<div style={{background: 'rgba(255,255,255,0.9)', borderRadius: 10, padding: 20, paddingTop: 12}}>
					<h1 style={{textAlign: 'center'}}>vier null vier</h1>
					<p>Seite nicht gefunden. <a href="#" onClick={e => {e.preventDefault(); history.goBack()}}>Zurück.</a></p>
				</div>
			</div>
		);
	}

}
