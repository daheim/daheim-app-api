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

		jscs: {
			node: {
				src: ['src/**/*.js', 'test/**/*.js', 'public/js/**/*.js'],
				options: {
					config: true,
					verbose: true
				}
			}
		},

		eslint: {
			node: [
				'src',
				'test',
				'public/js'
			]
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
			options: {
				sourceMap: true,
				sourceMapIncludeSources: true
			},
			lib: {
				options: {
					sourceMapIn: '<%=concat.lib.dest%>.map'
				},
				files: [{
					expand: true,
					src: '<%=concat.lib.dest%>',
					ext: '.min.js'
				}]
			},
			ui: {
				options: {
					sourceMapIn: '<%=exorcise.ui.dest%>'
				},
				files: [{
					expand: true,
					src: '<%=browserify.ui.dest%>',
					ext: '.min.js'
				}]
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
			public: {
				expand: true,
				src: 'public/**',
				dest: 'build/'
			}
		},

		babel: {
			options: {
				sourceMap: 'inline'
			},
			src: {
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
			src: {
				files: ['src/**/*.js', 'test/**/*.js'],
				tasks: ['src'],
				options: {
					atBegin: true
				}
			},
			public: {
				files: ['public/**'],
				tasks: ['public'],
				options: {
					atBegin: true
				}
			}
		},

		browserify: {
			options: {
				browserifyOptions: {
					debug: true
				}
			},
			ui: {
				src: ['build/dist/src/ui/index.js'],
				dest: 'build/public/js/ui.js'
			}
		},

		exorcise: {
			src: {
				files: [{
					expand: true,
					cwd: 'build/dist/src/',
					src: ['**/*.js'],
					dest: 'build/dist/src/',
					ext: '.js.map'
				}]
			},
			ui: {
				src: '<%=browserify.ui.dest%>',
				dest: '<%=browserify.ui.dest%>.map'
			}
		},

		ngAnnotate: {
			options: {
        singleQuotes: true,
        sourceMap: true
      },
      ui: {
      	files: {
      		'<%=browserify.ui.dest%>': ['<%=browserify.ui.dest%>']
      	}
      }
		},

		replace: {
			indexDevel: {
				src: ['build/public/index.html'],
				overwrite: true,
				replacements: [{
					from: '<script src="js/lib.min.js"></script>',
					to: '<script src="js/lib.js"></script>'
				}, {
					from: '<script src="js/ui.min.js"></script>',
					to: '<script src="js/ui.js"></script>'
				}]
			}
		}
	});

	grunt.loadNpmTasks('grunt-mocha-test');
	grunt.loadNpmTasks('grunt-exec');
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-babel');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-jscs');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-cssmin');
	grunt.loadNpmTasks('grunt-browserify');
	grunt.loadNpmTasks('grunt-exorcise');
	grunt.loadNpmTasks('grunt-ng-annotate');
	grunt.loadNpmTasks('grunt-text-replace');
	grunt.loadNpmTasks('grunt-eslint');

	var isDevel = process.env.DEVEL === '1';
	var srcTasks = ['babel:src', 'browserify:ui', 'ngAnnotate:ui', 'exorcise:ui', 'exorcise:src'];
	var libTasks = ['concat:lib'];
	var publicTasks = ['copy:public'];
	if (!isDevel) {
		srcTasks.push('uglify:ui');
		libTasks.push('uglify:lib');
	} else {
		publicTasks.push('replace:indexDevel');
	}

	grunt.registerTask('default', ['clean', 'lib', 'public', 'css', 'src']);

	grunt.registerTask('src', srcTasks);
	grunt.registerTask('public', publicTasks);
	grunt.registerTask('lib', libTasks);
	grunt.registerTask('css', ['cssmin:lib']);


	grunt.registerTask('check', ['jscs', 'eslint', 'babel', 'test']);
	grunt.registerTask('test', ['mochaTest']);
	grunt.registerTask('cover', ['exec:cover']);
};
