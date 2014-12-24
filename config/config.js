var path = require('path'),
    rootPath = path.normalize(__dirname + '/..'),
    env = process.env.NODE_ENV || 'development';

var config = {
  development: {
    root: rootPath,
    app: {
      name: 'gps'
    },
    port: 3000,
    db: 'mongodb://localhost/gps'
  },
  test: {
    root: rootPath,
    app: {
      name: 'a'
    },
    port: 3000,
    db: 'mongodb://localhost/gps'
  },
  production: {
    root: rootPath,
    app: {
      name: 'a'
    },
    port: 3000,
    db: 'mongodb://localhost/gps'
  }
};

module.exports = config[env];
