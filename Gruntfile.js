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
				cmd: './node_modules/.bin/istanbul cover grunt --root build/dist/src --include-all-sources --dir ./build/coverage --print both -- test',
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

		uglify: {
			lib: {
				options: {
					sourceMap: true,
					sourceMapIncludeSources: true,
				},
				files: {
					'build/public/js/lib.min.js': [
						require.resolve('jquery/dist/jquery.js'),
						require.resolve('angular/angular.js'),
						require.resolve('angular-aria/angular-aria.js'),
						require.resolve('angular-animate/angular-animate.js'),
						require.resolve('angular-material/angular-material.js'),
						require.resolve('angular-route/angular-route.js'),
						require.resolve('angular-resource/angular-resource.js'),
						require.resolve('angulartics/src/angulartics.js'),
						require.resolve('angulartics-google-analytics/lib/angulartics-google-analytics.js'),
						require.resolve('socket.io-client/socket.io.js'),
						require.resolve('simplewebrtc/simplewebrtc.bundle.js'),
					]
				}
			}
		},

		cssmin: {
			lib: {
				options: {
					sourceMap: true
				},
				files: {
					'build/public/style/lib.min.css': [require.resolve('angular-material/angular-material.css')]
				}
			}
		},

		copy: {
			static: {
				expand: true,
				src: 'public/**',
				dest: 'build/'
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
			},
			static: {
				files: ['public/**'],
				tasks: ['copy:static'],
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
	grunt.loadNpmTasks('grunt-jscs');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-cssmin');

	grunt.registerTask('default', ['babel', 'copy:static', 'uglify', 'cssmin']);
	grunt.registerTask('check', ['jscs', 'jshint', 'babel', 'test']);
	grunt.registerTask('test', ['mochaTest']);
	grunt.registerTask('cover', ['exec:cover']);
};
