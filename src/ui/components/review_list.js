import React from 'react';
import moment from 'moment';
import {Link} from 'react-router';
import {LoadingPanel} from './loading_panel';

import interop from '../interop';

export class ReviewList extends React.Component {

	static propTypes = {
	};

	state = {
		loading: true,
		data: undefined,
	};

	async componentDidMount() {
		let data = await $.ajax({
			method: 'get',
			url: '/api/encounters',
			headers: {Authorization: interop.auth.authHeader()},
		});

		this.setState({loading: false, data});
	}

	msToString(ms) {
		if (typeof ms !== 'number') {
			return '';
		}
		let secs = Math.floor((ms / 1000) % 60);
		let mins = Math.floor(ms / 1000 / 60);
		return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
	}

	render() {
		return (
			<div style={Object.assign({background: 'rgba(255,255,255,0.9)', borderRadius: 10, padding: 20, paddingTop: 12}, this.props.style)}>
				<h1 className="md-headline">Recent Lessons</h1>
				<LoadingPanel loading={this.state.loading}>
					{this.state.data ? (
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
											<td style={{textAlign: 'right'}}>{this.myReview ? 'reviewed' : 'needs review'}</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					) : (
						<p>No data</p>
					)}
				</LoadingPanel>
			</div>
		);
	}
}
