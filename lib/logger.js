'use strict';

var bunyan = require('bunyan');

var initLogger = function(level) {

    if (!level) {
        level = 'error';
    }

    var logger = bunyan.createLogger({
      name: 'gps',
      streams: [
        {
          level: level,
          stream: process.stdout
        },
        {
          level: 'debug',
          path: __dirname + '/../log/debug.log'
        }
      ]
    });

    return logger;
};

module.exports.initLogger = initLogger;
