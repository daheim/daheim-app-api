export default class NavigationGuard {

	constructor({$scope, callback, $mdDialog}) {
		$scope.$on('$locationChangeStart', async (ev, newUrl, oldUrlIgnored) => {
			if (this._allowed) { return; }
			let question = callback(newUrl);
			if (typeof question !== 'string') { return; }
			ev.preventDefault();

			try {
				await $mdDialog.show($mdDialog.confirm()
					.title('Confirm Navigation')
					.content(question + '<br/><br/>' + 'Are you sure you want to leave this page?')
					.ok('Leave this Page')
					.cancel('Stay on this Page'));
				this._allowed = true;
				window.location.href = newUrl;
			} catch (ex) {
				// nothing
			}
		});

		window.onbeforeunload = event => {
			let question = callback();
			if (typeof question !== 'string') { return; }

			if (typeof event == 'undefined') {
				event = window.event;
			}
			if (event) {
				event.returnValue = question;
			}
			return question;
		};

		$scope.$on('$destroy', () => window.onbeforeunload = undefined);
	}
}
