module.exports = function(grunt) {

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		uglify: {
			options: {
				banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
			},
			build: {
				src: 'src/<%= pkg.name %>.js',
				dest: 'build/<%= pkg.name %>.min.js'
			}
		},
		mochaTest: {
			test: {
				options: {
					reporter: process.env.TEST_REPORT_JUNIT === '1' ? 'mocha-junit-reporter' : 'spec',
					reporterOptions: {
						mochaFile: './build/test-results.xml'
					},
				},
				src: ['test/unit/*.js'],
			},
		},

		exec: {
			cover: {
				cmd: './node_modules/.bin/istanbul cover grunt --root src --include-all-sources --dir ./build/coverage --print both -- test',
				stdout: false
			}
		},

		clean: {
			all: {
				src: ['build']
			}
		},

		jshint: {
			node: {
				src: ['*.js', 'test/**.js', 'app_data/**.js', 'items/**.js', 'platform_services/**.js', 'realms/**.js'],
				options: {
					jshintrc: true
				}
			}
		},

		jscs: {
			node: {
				src: ['*.js', 'test/**.js', 'app_data/**.js', 'items/**.js', 'platform_services/**.js', 'realms/**.js'],
				options: {
					config: true,
					verbose: true
				}
			}
		},

		concat: {
			options: {
				sourceMap: true
			},
			dist: {
				src: [
					'node_modules/angulartics/src/angulartics.js',
					'node_modules/angulartics-google-analytics/lib/angulartics-google-analytics.js'
				],
				dest: 'build/public/main.js'
			}
		},
	});

	grunt.loadNpmTasks('grunt-mocha-test');
	grunt.loadNpmTasks('grunt-exec');
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks("grunt-jscs");

	grunt.registerTask('default', ['concat']);
	grunt.registerTask('check', ['jscs', 'jshint', 'test']);
	grunt.registerTask('test', ['mochaTest']);
	grunt.registerTask('cover', ['exec:cover']);
};
