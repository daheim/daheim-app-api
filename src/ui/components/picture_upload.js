import React from 'react';
import Dropzone from 'react-dropzone';
import {LoadingPanel} from './loading_panel';
import {Panel} from './panel';
import profileStore from '../stores/profile_store';
import {dispatch} from '../dispatcher';
import {AngularDirective} from './angular_directive';

import interop from '../interop';

export class Picture extends React.Component {

	state = this.calculateState();

	calculateState() {
		let newState = {
			url: null,
			uploading: profileStore.isUploading(),
		};

		if (profileStore.getTempPicture()) {
			newState.url = profileStore.getTempPicture();
		} else if (profileStore.getProfile()) {
			let id = profileStore.getProfile().id;
			newState.url = `https://${interop.config.storageAccount}.blob.core.windows.net/public/users/${id}/picture.png?${Date.now()}`;
		}

		return newState;
	}

	componentDidMount() {
		this.handleChangeToken = profileStore.addListener(() => this.setState(this.calculateState()));
	}

	componentWillUnmount() {
		this.handleChangeToken.remove();
	}

	render() {
		return (
			<LoadingPanel loading={this.state.uploading}>
				<img src={this.state.url} style={{width: 128, height: 128, borderRadius: '50%'}} />
			</LoadingPanel>
		);
	}

}

export class PictureUpload extends React.Component {

	state = {
		snap: false,
		useCamera: false,
	};

	handleDrop = files => {
		if (files.length !== 1) { return; }
		dispatch({type: 'profile/upload_picture', file: files[0]});
	};

	useCamera = e => {
		e.preventDefault();
		this.setState({useCamera: true});
	};

	cancelCamera = e => {
		e.preventDefault();
		this.setState({useCamera: false});
	};

	cancel = e => {
		e.preventDefault();
	};

	snap = e => {
		e.preventDefault();
		let unregisterWatch = this.refs.asdf.scope.$watch('imageData', value => {
			if (value) {
				unregisterWatch();
				dispatch({type: 'profile/upload_picture_data', data: value});
				this.setState({useCamera: false});
			}
		});
		this.refs.asdf.scope.$apply(() => {
			this.refs.asdf.scope.cameraSnap = !this.refs.asdf.scope.cameraSnap;
		});
	};

	render() {
		return (
			<div>
				{this.state.useCamera ? (
					<div>
						<div>
							<AngularDirective ref="asdf" style={{width: 128, height: 128, marginLeft: 'auto', marginRight: 'auto'}}>
								<dhm-profile-camera picture-width="256" picture-height="256" active="true" snap="cameraSnap" image-data="imageData" />
							</AngularDirective>
						</div>
						<div style={{textAlign: 'center'}}>
							<a href="#" onClick={this.snap}>Upload</a>
						</div>
						<div style={{textAlign: 'center'}}>
							<a href="#" onClick={this.cancelCamera}>Cancel</a>
						</div>
					</div>
				) : (
					<div>
						<Dropzone accept="image/*" disableClick style={{textAlign: 'center'}} activeStyle={{opacity: 0.5}} onDrop={this.handleDrop}>
							<Picture />
						</Dropzone>
						<Dropzone accept="image/*" style={{cursor: 'pointer', padding: 5}} activeStyle={{backgroundColor: '#eee'}} onDrop={this.handleDrop}>
							<a href="#" onClick={this.cancel}>Upload a new photo</a>
						</Dropzone>
						<div style={{textAlign: 'center'}}>
							<a href="#" onClick={this.useCamera}>Use camera</a>
						</div>
					</div>
				)}
			</div>
		);
	}
}

export class PicturePanel extends React.Component {
	render() {
		return (
			<Panel>
				<PictureUpload />
			</Panel>
		);
	}
}

