'use strict';

var bunyan = require('bunyan'),
    fs = require('fs');

var initLogger = function(level) {

    if (!level) {
        level = 'error';
    }

    var logdir;

    if (fs.existsSync(__dirname + '/../log')) {
        var dir = fs.statSync(__dirname + '/../log');
        if (dir.isDirectory()) {
            logdir = __dirname + '/../log';
        }
    }

    if (!logdir) {
	console.log('Log directory doesn\'t exists:' + __dirname + '/../log/debug.log');
	process.exit(-1);
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
