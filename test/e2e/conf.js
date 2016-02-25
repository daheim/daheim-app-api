exports.config = {
	seleniumAddress: 'http://localhost:4444/wd/hub',
	specs: ['first.js'],
	capabilities: {
		browserName: 'chrome',
		chromeOptions: {
			args: [
				'use-fake-ui-for-media-stream',
				'disable-web-security',
			],
		},
	},
};
