'use strict';

var gulp = require('gulp');
var prettify = require('gulp-jsbeautifier');
var babel = require('gulp-babel');
var webpack = require('webpack-stream');
var named = require('vinyl-named');
var changed = require('gulp-changed');
var esformatter = require('gulp-esformatter');
var del = require('del');
var electron = require('electron-connect').server.create({
  path: './dist'
});
var packager = require('electron-packager');

var sources = ['**/*.js', '**/*.css', '**/*.html', '!**/node_modules/**', '!**/build/**', '!release/**'];
var app_root = 'dist';

gulp.task('prettify', ['prettify:sources', 'prettify:jsx']);

gulp.task('prettify:sources', ['sync-meta'], function() {
  return gulp.src(sources)
    .pipe(prettify({
      html: {
        indentSize: 2
      },
      css: {
        indentSize: 2
      },
      js: {
        indentSize: 2,
        braceStyle: "end-expand"
      }
    }))
    .pipe(gulp.dest('.'));
});

gulp.task('prettify:jsx', function() {
  return gulp.src('src/browser/**/*.jsx')
    .pipe(esformatter({
      indent: {
        value: '  '
      },
      plugins: ['esformatter-jsx']
    }))
    .pipe(gulp.dest(app_root));
});

gulp.task('build', ['sync-meta', 'webpack', 'copy'], function() {
  return gulp.src('src/package.json')
    .pipe(gulp.dest('dist'));
});

gulp.task('webpack', ['webpack:main', 'webpack:browser']);

gulp.task('webpack:browser', function() {
  return gulp.src('src/browser/**/*.jsx')
    .pipe(named())
    .pipe(webpack({
      module: {
        loaders: [{
          test: /\.json$/,
          loader: 'json'
        }, {
          test: /\.jsx$/,
          loader: 'babel',
          query: {
            presets: ['react']
          }
        }]
      },
      output: {
        filename: '[name].js'
      },
      node: {
        __filename: false,
        __dirname: false
      },
      target: 'electron'
    }))
    .pipe(gulp.dest('dist/browser/'));
});

gulp.task('webpack:main', function() {
  return gulp.src('src/main.js')
    .pipe(webpack({
      module: {
        loaders: [{
          test: /\.json$/,
          loader: 'json'
        }]
      },
      output: {
        filename: '[name].js'
      },
      node: {
        __filename: false,
        __dirname: false
      },
      target: 'electron'
    }))
    .pipe(gulp.dest('dist/'));
});

gulp.task('copy', ['copy:resources', 'copy:html/css', 'copy:webview:js', 'copy:modules']);

gulp.task('copy:resources', function() {
  return gulp.src('src/resources/**')
    .pipe(gulp.dest('dist/resources'));
});

gulp.task('copy:html/css', function() {
  return gulp.src(['src/browser/**/*.html', 'src/browser/**/*.css'])
    .pipe(gulp.dest('dist/browser'));
});

gulp.task('copy:webview:js', function() {
  return gulp.src(['src/browser/webview/**/*.js'])
    .pipe(gulp.dest('dist/browser/webview'))
});

gulp.task('copy:modules', function() {
  return gulp.src(['src/node_modules/bootstrap/dist/**'])
    .pipe(gulp.dest('dist/browser/modules/bootstrap'))
});

gulp.task('serve', ['build'], function() {
  var options = ['--livereload'];
  electron.start(options);
  gulp.watch(['src/**', '!src/browser/**', '!src/node_modules/**'], function() {
    electron.restart(options);
  });
  gulp.watch('src/browser/**/*.jsx', ['build:jsx']);
  gulp.watch(['src/browser/**', '!src/browser/**/*.jsx'], electron.reload);
  gulp.watch('gulpfile.js', process.exit);
});

function makePackage(platform, arch, callback) {
  var packageJson = require('./src/package.json');
  packager({
    dir: './' + app_root,
    name: packageJson.name,
    platform: platform,
    arch: arch,
    version: require('./package.json').devDependencies['electron-prebuilt'],
    out: './release',
    prune: true,
    overwrite: true,
    "app-version": packageJson.version,
    icon: 'resources/electron-mattermost',
    "version-string": {
      CompanyName: packageJson.author,
      LegalCopyright: 'Copyright (c) 2015 ' + packageJson.author,
      FileDescription: packageJson.name,
      OriginalFilename: packageJson.name + '.exe',
      ProductVersion: packageJson.version,
      ProductName: packageJson.name,
      InternalName: packageJson.name
    }
  }, function(err, appPath) {
    if (err) {
      callback(err);
    }
    else {
      callback();
    }
  });
};

gulp.task('package', ['build'], function(cb) {
  makePackage(process.platform, 'all', cb);
});

gulp.task('package:all', ['build'], function(cb) {
  makePackage('all', 'all', cb);
});

gulp.task('package:windows', ['build'], function(cb) {
  makePackage('win32', 'all', cb);
});

gulp.task('package:osx', ['build'], function(cb) {
  makePackage('darwin', 'all', cb);
});

gulp.task('package:linux', ['build'], function(cb) {
  makePackage('linux', 'all', cb);
});

gulp.task('sync-meta', function() {
  var appPackageJson = require('./src/package.json');
  var packageJson = require('./package.json');
  appPackageJson.name = packageJson.name;
  appPackageJson.version = packageJson.version;
  appPackageJson.description = packageJson.description;
  appPackageJson.author = packageJson.author;
  appPackageJson.license = packageJson.license;
  var fs = require('fs');
  fs.writeFileSync('./src/package.json', JSON.stringify(appPackageJson, null, '  ') + '\n');
});
