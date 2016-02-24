import React from 'react';
import moment from 'moment';
import {Link} from 'react-router';
import {LoadingPanel} from './loading_panel';
import RaisedButton from 'material-ui/lib/raised-button';
import FlatButton from 'material-ui/lib/flat-button';
import TextField from 'material-ui/lib/text-field';
import StarRating from 'react-star-rating'

import interop from '../interop';
import {history} from './history';

export class PersonalRating extends React.Component {

	handleOverallChange = (eIgnored, {rating}) => {
		if (this.props.onChange) {
			this.props.onChange(Object.assign({}, this.props.data, {overall: rating}));
		}
	};

	handleLanguageChange = (eIgnored, {rating}) => {
		if (this.props.onChange) {
			this.props.onChange(Object.assign({}, this.props.data, {language: rating}));
		}
	};

	render() {
		if (this.props.readOnly && !this.props.data) {
			return <p>No review given yet</p>;
		}

		let data = this.props.data || {};

		return (
			<div>
				<div>
					Overall experience:
					<div>
						<StarRating name="overall" totalStars={5} disabled={this.props.readOnly} rating={data.overall} onRatingClick={this.handleOverallChange} />
					</div>
				</div>
				<div>
					Language Proficiency:
					<div>
						<StarRating name="language" disabled={this.props.readOnly} rating={data.language} onRatingClick={this.handleLanguageChange} />
					</div>
				</div>
			</div>
		);
	}
}


export class LessonReview extends React.Component {

	handleOverallChange = (eIgnored, {rating}) => {
		if (this.props.onChange) {
			this.props.onChange(Object.assign({}, this.props.data, {overall: rating}));
		}
	};

	handleWordsChange = e => {
		if (this.props.onChange) {
			this.props.onChange(Object.assign({}, this.props.data, {words: e.target.value}));
		}
	};

	handleGoodChange = e => {
		if (this.props.onChange) {
			this.props.onChange(Object.assign({}, this.props.data, {good: e.target.value}));
		}
	};

	handleBadChange = e => {
		if (this.props.onChange) {
			this.props.onChange(Object.assign({}, this.props.data, {bad: e.target.value}));
		}
	};

	render() {
		if (this.props.readOnly && !this.props.data) {
			return <p>No review given yet</p>;
		}

		let data = this.props.data || {};

		return (
			<div>
				<div>
					Overall experience:
					<div>
						<StarRating name="overall" disabled={this.props.readOnly} rating={data.overall} onRatingClick={this.handleOverallChange} />
					</div>
				</div>
				<div>
					<TextField
						hintText="Welche deutschen Wörter habt ihr besonders häufig verwendet?"
						floatingLabelText="Häufig verwendete Wörter"
						multiLine={true}
						rows={1}
						rowsMax={4}
						fullWidth={true}
						value={data.words}
						onChange={this.handleWordsChange}
					/>
				</div>
				<div>
					<TextField
						hintText="Welche deutschen Wörter habt ihr besonders häufig verwendet?"
						floatingLabelText="Gut gefallen"
						multiLine={true}
						rows={1}
						rowsMax={4}
						fullWidth={true}
						onChange={this.handleGoodChange}
					/>
				</div>
				<div>
					<TextField
						hintText="Was hat dir nicht an dem Gespräch gefallen?"
						floatingLabelText="Nicht gefallen"
						multiLine={true}
						rows={1}
						rowsMax={4}
						fullWidth={true}
						onChange={this.handleBadChange}
					/>
				</div>
			</div>
		);
	}

}


export class ReviewPage extends React.Component {

	static propTypes = {
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
				url: '/api/encounters/' + encodeURIComponent(this.props.params.reviewId),
				headers: {Authorization: interop.auth.authHeader()},
			});
		} catch (err) {
			state.error = err;
		} finally {
			console.log(state);
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
				let json = JSON.parse(error.responseText);
				text = json.message || json.error;
			} catch (errIgnored) {
				// ignored
			}
			return `${error.status}: ${text}`;
		}
	}

	handleRatingChange = data => {
		this.state.data.myRating = data;
		this.forceUpdate();
		console.log(data);
	};

	handleReviewChange = data => {
		this.state.data.myReview = data;
		this.forceUpdate();
		console.log(data);
	};

	handleSave = async e => {
		this.setState({loading: true});
		try {
			this.state.data = await $.ajax({
				method: 'post',
				url: '/api/encounters/' + encodeURIComponent(this.props.params.reviewId),
				contentType: 'application/json',
				data: JSON.stringify({
					myRating: this.state.data.myRating,
					myReview: this.state.data.myReview,
				}),
				headers: {Authorization: interop.auth.authHeader()},
			});
			history.goBack();
		} catch (err) {
			alert(this.errorToText(err));
		} finally {
			this.setState({loading: false});
		}
	}

	render() {
		return (
			<div style={Object.assign({background: 'rgba(255,255,255,0.9)', borderRadius: 10, padding: 20, paddingTop: 12, maxWidth: 1000, margin: '0 auto'}, this.props.style)}>
				<h1 className="md-headline">Review Lesson</h1>
				<LoadingPanel loading={this.state.loading}>
					{this.state.error ? (
						<p style={{textAlign: 'center', color: 'red'}}>{this.errorToText(this.state.error)}</p>
					) : (
						<div style={{display: 'flex', flexWrap: 'wrap'}}>
							<div style={{flex: '1 1 300px', padding: 10}}>
								<h2>Your Review of the Partner</h2>
								<PersonalRating data={this.state.data && this.state.data.myRating} onChange={this.handleRatingChange} />

								<h2>Your Review of the Lesson</h2>
								<LessonReview data={this.state.data && this.state.data.myReview} onChange={this.handleReviewChange} />

								<div style={{display: 'flex', justifyContent: 'flex-end', paddingTop: 10}}>
									<FlatButton style={{flex: '0 1 auto', marginRight: 10}} label="Zurück" onClick={e => history.goBack()} />
									<RaisedButton style={{flex: '0 1 auto', marginLeft: 10}} label="Speichern" secondary={true} onClick={this.handleSave} />
								</div>
							</div>

							<div style={{flex: '1 1 150px', padding: 10}}>
								<h2>Partner's Review of You</h2>
								<PersonalRating readOnly={true} data={this.state.data && this.state.data.partnerRating} />

								<h2>Partner's Review of the Lesson</h2>
								<LessonReview readOnly={true} data={this.state.data && this.state.data.partnerReview} />
							</div>

						</div>
					)}
				</LoadingPanel>
			</div>
		);
	}
}
