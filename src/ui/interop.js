
export class Interop {

	init() {
		let injector = this.injector = angular.element(document.body).injector();
		this.auth = injector.get('auth');
		this.$rootScope = injector.get('$rootScope');
		this.$compile = injector.get('$compile');
	}

}

export default new Interop;
