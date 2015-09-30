module.exports = function(grunt) {

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),

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

		concat: {
			options: {
				sourceMap: true
			},
			lib: {
				src: [
					require.resolve('jquery/dist/jquery.js'),
					require.resolve('angular/angular.js'),
					require.resolve('angular-aria/angular-aria.js'),
					require.resolve('angular-animate/angular-animate.js'),
					require.resolve('angular-material/angular-material.js'),
					require.resolve('angular-route/angular-route.js'),
					require.resolve('angular-resource/angular-resource.js'),
					require.resolve('angulartics/src/angulartics.js'),
					require.resolve('angulartics-google-analytics/lib/angulartics-google-analytics.js'),
				],
				dest: 'build/public/js/lib.js'
			}
		},

		uglify: {
			lib: {
				options: {
					sourceMap: true,
					sourceMapIncludeSources: true,
					sourceMapIn: 'build/public/js/lib.js.map'
				},
				files: {
					'build/public/js/lib.min.js': ['build/public/js/lib.js']
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
			},
			client: {
				files: [{
					expand: true,
					cwd: 'client/',
					src: ['**/*.js'],
					dest: 'build/dist/client',
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
			},
			client: {
				files: ['client/**/*.js'],
				tasks: ['babel:client', 'browserify:dist', 'exorcise:dist'],
				options: {
					atBegin: true
				}
			}
		},

		browserify: {
			dist: {
				src: [
					'build/dist/src/exports.js',
					'build/dist/client/second.js'
				],
				dest: 'build/public/js/browserified.js'
			},
			options: {
				browserifyOptions: {
					debug: true
				}
			}
		},

		exorcise: {
			dist: {
				files: {
					'<%= browserify.dist.dest %>.map': ['<%= browserify.dist.dest %>']
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
	grunt.loadNpmTasks('grunt-browserify');
	grunt.loadNpmTasks('grunt-exorcise');

	grunt.registerTask('default', ['babel', 'browserify', 'exorcise', 'copy:static', 'concat', 'uglify', 'cssmin']);
	grunt.registerTask('check', ['jscs', 'jshint', 'babel', 'test']);
	grunt.registerTask('test', ['mochaTest']);
	grunt.registerTask('cover', ['exec:cover']);
};
