
export class Interop {

	init() {
		let injector = this.injector = angular.element(document.body).injector();
		this.auth = injector.get('auth');
	}

}

export default new Interop;
