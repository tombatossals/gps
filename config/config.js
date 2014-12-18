var path = require('path'),
    rootPath = path.normalize(__dirname + '/..'),
    env = process.env.NODE_ENV || 'development';

var config = {
  development: {
    root: rootPath,
    app: {
      name: 'a'
    },
    port: 3000,
    db: 'mongodb://localhost/gps',
    rrdpath: '/var/lib/collectd/rrd',
    hostname: 'gps.gps.ebrecloud.com'

  },

  test: {
    root: rootPath,
    app: {
      name: 'a'
    },
    port: 3000,
    db: 'mongodb://localhost/gps',
    rrdpath: '/var/lib/collectd/rrd',
    hostname: 'gps.gps.ebrecloud.com'

  },

  production: {
    root: rootPath,
    app: {
      name: 'a'
    },
    port: 3000,
    db: 'mongodb://localhost/gps',
    rrdpath: '/var/lib/collectd/rrd',
    hostname: 'gps.gps.ebrecloud.com'

  }
};

module.exports = config[env];
