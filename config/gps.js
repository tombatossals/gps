'use strict';

var path = require('path'),
    rootPath = path.normalize(__dirname + '/..'),
    env = process.env.NODE_ENV || 'development';

var getInterval = function() {
    var interval = parseInt(process.env.COLLECTD_INTERVAL, 10);
    if (!interval || isNaN(interval)) {
        interval = 1200;
    }
    return interval;
};

var config = {
    development: {
        interval: getInterval(),
	bandwidthTestDuration: 20,
        collectd: {
            snmp: '/etc/collectd.d/snmp.conf',
            ping: '/etc/collectd.d/ping.conf',
            ping_device: 'ens8'
        },
        influx: {
            host: 'localhost',
            port: 8086,
            username: 'gps',
            password: 'guifi',
            database: 'gps'
        },
    	rrdpath: '/var/lib/collectd',
    	hostname: 'gps',
	apissl: true
    },

    test: {
        interval: getInterval(),
	bandwidthTestDuration: 20,
        collectd: {
            snmp: '/etc/collectd.d/snmp.conf',
            ping: '/etc/collectd.d/ping.conf',
            ping_device: 'ens8'
        },
        influx: {
            host: 'localhost',
            port: 8086,
            username: 'gps',
            password: 'guifi',
            database: 'gps'
        },
    	rrdpath: '/var/lib/collectd',
    	hostname: 'gps',
	apissl: true
    },

    production: {
        interval: getInterval(),
	bandwidthTestDuration: 20,
        collectd: {
            snmp: '/etc/collectd.d/snmp.conf',
            ping: '/etc/collectd.d/ping.conf'
        },
        influx: {
            host: 'localhost',
            port: 8086,
            username: 'gps',
            password: 'guifi',
            database: 'gps'
        },
    	rrdpath: '/var/lib/collectd',
    	hostname: 'gps',
	apissl: true
    }
};

module.exports = config[env];
