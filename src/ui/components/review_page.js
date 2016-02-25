import React from 'react';
import {LoadingPanel} from './loading_panel';
import RaisedButton from 'material-ui/lib/raised-button';
import FlatButton from 'material-ui/lib/flat-button';
import TextField from 'material-ui/lib/text-field';
import StarRating from 'react-star-rating';
import RadioButton from 'material-ui/lib/radio-button';
import RadioButtonGroup from 'material-ui/lib/radio-button-group';

import interop from '../interop';
import {history} from './history';

export class ProficiencyRating extends React.Component {

	static defaultProps = {
		values: {
			1: 'Einige Wörter',
			2: 'Einige Sätze',
			3: 'Fähig, ein fließendes Gespräch über einfach Themen zu führen',
			4: 'Fähig, ein Gespräch über komplexe Themen zu führen',
			5: 'Deutsch-Profi',
		},
	};

	handleChange = e => {
		if (this.props.onChange) { this.props.onChange(e); }
	};

	render() {
		if (this.props.readOnly) {
			return <div style={this.props.itemStyle}>{this.props.values[this.props.value] || 'N/A'}</div>;
		}

		return (
			<RadioButtonGroup style={this.props.style} name="shipSpeed" valueSelected={this.props.value} onChange={this.handleChange}>
				{Object.keys(this.props.values).map(key =>
					<RadioButton key={key} style={this.props.itemStyle} value={key} label={this.props.values[key]} />
				)}
			</RadioButtonGroup>
		);
	}
}

export class PersonalRating extends React.Component {

	handleOverallChange = (eIgnored, {rating}) => {
		if (this.props.onChange) {
			this.props.onChange(Object.assign({}, this.props.data, {overall: rating}));
		}
	};

	handleLanguageChange = e => {
		if (this.props.onChange) {
			this.props.onChange(Object.assign({}, this.props.data, {language: parseInt(e.target.value)}));
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
				<div style={{paddingTop: 10}}>
					Language Proficiency:
					<div>
						<ProficiencyRating itemStyle={{paddingTop: 6}}  readOnly={this.props.readOnly} value={String(data.language)} onChange={this.handleLanguageChange} />
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
	};

	handleReviewChange = data => {
		this.state.data.myReview = data;
		this.forceUpdate();
	};

	handleSave = async eIgnored => {
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
	};

	render() {
		return (
			<div style={Object.assign({background: 'rgba(255,255,255,0.9)', borderRadius: 10, padding: 20, paddingTop: 12, maxWidth: 1000, margin: '0 auto'}, this.props.style)}>
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
									<FlatButton style={{flex: '0 1 auto', marginRight: 10}} label="Zurück" onClick={eIgnored => history.goBack()} />
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
