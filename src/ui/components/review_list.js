import React from 'react';
import moment from 'moment';
import {Link} from 'react-router';
import {LoadingPanel} from './loading_panel';
import {Panel} from './panel';

import interop from '../interop';

export class ReviewList extends React.Component {

	static propTypes = {
		style: React.PropTypes.object,
	};

	state = {
		loading: true,
		data: null,
		error: null,
	};

	async componentDidMount() {
		let state = {
			loading: false,
			data: null,
			error: null,
		};

		try {
			state.data = await $.ajax({
				method: 'get',
				url: '/api/encounters',
				headers: {Authorization: interop.auth.authHeader()},
			});
		} catch (err) {
			state.error = err;
		} finally {
			this.setState(state);
		}
	}

	msToString(ms) {
		if (typeof ms !== 'number') {
			return '';
		}
		let secs = Math.floor((ms / 1000) % 60);
		let mins = Math.floor(ms / 1000 / 60);
		return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
	}

	errorToText(error) {
		if (!error.status) {
			return 'No network';
		} else {
			let text = error.statusText;
			try {
				text = JSON.parse(error.responseText).error;
			} catch (errIgnored) {
				// ignored
			}
			return `${error.status}: ${text}`;
		}
	}

	render() {
		return (
			<Panel style={this.props.style}>
				<h1 className="md-headline">Recent Lessons</h1>
				<LoadingPanel loading={this.state.loading}>
					{this.state.error ? (
						<p style={{textAlign: 'center', color: 'red'}}>{this.errorToText(this.state.error)}</p>
					) : (
						this.state.data && this.state.data.length ? (
							<table style={{width: '100%'}}>
								<thead>
									<tr>
										<th style={{textAlign: 'left'}}>Date</th>
										<th style={{textAlign: 'left'}}>Partner</th>
										<th style={{textAlign: 'left'}}>Length</th>
										<th></th>
									</tr>
								</thead>
								<tbody>
									{this.state.data.map(encounter => {
										return (
											<tr key={encounter.id}>
												<td><Link to={'/reviews/' + encounter.id}>{moment(encounter.date).format('lll')}</Link></td>
												<td>{encounter.partnerName || '[kein Name]'}</td>
												<td>{this.msToString(encounter.length)}</td>
												<td style={{textAlign: 'right'}}>{encounter.myReview ? 'reviewed' : 'needs review'}</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						) : (
							<p style={{textAlign: 'center'}}>Haven't yet had any lessons. <Link to="/video">Start one now.</Link></p>
						)
					)}
				</LoadingPanel>
			</Panel>
		);
	}
}
