import {EventEmitter} from 'events';

export class Interop extends EventEmitter {

	init() {
		let injector = this.injector = angular.element(document.body).injector();
		this.auth = injector.get('auth');
		this.config = injector.get('config');
		this.$rootScope = injector.get('$rootScope');
		this.$compile = injector.get('$compile');
		this.emit('ready');
	}

}

export default new Interop;
