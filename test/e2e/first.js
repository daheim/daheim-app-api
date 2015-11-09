import app from '../../src/app';

describe('angularjs homepage todo list', () => {
	let server;

	beforeEach(() => {
		server = app.start();
	});

	afterEach(() => {
		server.close();
	});

	it('should add a todo', () => {
		browser.get('http://localhost:3000/#!/second');
		let browser2 = browser.forkNewDriverInstance(true);

		browser.element(by.buttonText("German")).click();
		browser2.element(by.buttonText("German")).click();

		browser.driver.wait(() => {
			return browser.element(by.buttonText("German")).evaluate('callState').then(callState => callState === 'connected');
		}, 10000);
	});
});
