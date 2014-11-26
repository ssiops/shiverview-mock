var q = require('q');
var async = require('async');
var chalk = require('chalk');

function Executor (manager, Db) {
  this.manager = manager;
  this.total = [];
  this.tested = [];
  this.failed = [];
  this.util = {};
  if (Db)
    this.util.Db = Db;
  return this;
}

Executor.prototype.It = function (url, method) {
  var Db = this.util.Db;
  return function (should, callback) {
    console.log(chalk.cyan('%s %s') + ' %s', method, url, should);
    callback(Db);
  };
};

Executor.prototype.test = function (url, method, test) {
  var d = q.defer();
  if (typeof test !== 'function')
    d.reject();
  console.log(chalk.underline('Executing test for ' + chalk.cyan('%s %s') + '.'), method, url);
  test(this.It(url, method)).then(function () {
    console.log(chalk.green('Test for %s %s completed.\n'), method, url);
    d.resolve();
  }, function (err) {
    if (err) console.log(err);
    console.log(chalk.red('Test for %s %s failed.\n'), method, url);
    d.reject();
  });
  return d.promise;
};

Executor.prototype.execute = function () {
  var d = q.defer();
  var self = this;
  var date = new Date();
  console.log(chalk.underline('\nExecuting tests for all routes.\n') + '[%s]\n', date);
  async.concatSeries(self.manager.appNames, function (name, callback) {
    var app = self.manager.apps[name];
    if (typeof app.routes === 'undefined')
      return callback();
    async.concatSeries(app.routes, function (route, callback) {
      var url = app.path + route.url;
      if (app.path === '/')
        url = route.url;
      self.total.push(url);
      if (typeof app.tests === 'undefined' || typeof app.tests[route.url] === 'undefined') {
        if (process.env.verbose) console.log(chalk.yellow('Tests for %s not found. Skipping.'), url);
        return callback();
      }
      self.test(url, route.method, app.tests[route.url])
      .then(function (url) {
        self.tested.push(url);
        return callback();
      }, function (url) {
        self.tested.push(url);
        self.failed.push(url);
        return callback(null, url);
      });
    }, function (err, fails) {
      return callback(err, fails);
    });
  }, function (err, fails) {
    if (self.fails.length > 0)
      d.reject(self);
    else
      d.resolve(self);
  });
  return d.promise;
};

module.exports = Executor;
