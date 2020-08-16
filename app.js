'use strict';

var express = require('express'),
  config = require('./config/config'),
  glob = require('glob'),
  mongoose = require('mongoose');

mongoose.Promise = require('q').promise;
var promise = mongoose.connect(config.db, { useMongoClient: true });
promise.then(function(db) {
  var models = glob.sync(config.root + '/app/models/*.js');
  models.forEach(function (model) {
    require(model);
  });
  var app = express();

  require('./config/express')(app, config);

  app.listen(config.port);
}).fail(function(err) {
  console.log(err);
});
