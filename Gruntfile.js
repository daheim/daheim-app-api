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
				src: ['build/dist/test/unit/**/*.js'],
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
				src: ['src/**/*.js', 'test/**/*.js'],
				options: {
					jshintrc: true
				}
			}
		},

		jscs: {
			node: {
				src: ['src/**/*.js', 'test/**/*.js', 'public/js/**/*.js'],
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
					'node_modules/angulartics-google-analytics/lib/angulartics-google-analytics.js',
					'node_modules/simplewebrtc/simplewebrtc.bundle.js'
				],
				dest: 'build/public/js/main.js'
			}
		},

		babel: {
			options: {
				sourceMap: true
			},
			dist: {
				files: [{
					expand: true,
					cwd: 'src/',
					src: ['**/*.js'],
					dest: 'build/dist/src',
					ext: '.js'
				}, {
					expand: true,
					cwd: 'test/',
					src: ['**/*.js'],
					dest: 'build/dist/test',
					ext: '.js'
				}]
			}
		},

		watch: {
			source: {
				files: ['src/**/*.js', 'test/**/*.js'],
				tasks: ['babel'],
				options: {
					atBegin: true
				}
			}
		}
	});

	grunt.loadNpmTasks('grunt-mocha-test');
	grunt.loadNpmTasks('grunt-exec');
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-babel');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks("grunt-jscs");

	grunt.registerTask('default', ['babel', 'concat']);
	grunt.registerTask('check', ['jscs', 'jshint', 'babel', 'test']);
	grunt.registerTask('test', ['mochaTest']);
	grunt.registerTask('cover', ['exec:cover']);
};
