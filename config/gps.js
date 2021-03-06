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
            ping_device: 'ens8',
            ping_srcaddress: '10.228.130.165'
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
        apissl: true,
        tokenSecret: 'HardDayNight'
    },

    test: {
        interval: getInterval(),
        bandwidthTestDuration: 20,
        collectd: {
            snmp: '/etc/collectd.d/snmp.conf',
            ping: '/etc/collectd.d/ping.conf',
            ping_device: 'ens8',
            ping_srcaddress: '10.228.130.165'
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
        apissl: true,
        tokenSecret: 'HardDayNight'
    },

    production: {
        interval: getInterval(),
        bandwidthTestDuration: 20,
        collectd: {
            snmp: '/etc/collectd.d/snmp.conf',
            ping: '/etc/collectd.d/ping.conf',
            ping_device: 'ens8',
            ping_srcaddress: '10.228.130.165'
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
        apissl: true,
        tokenSecret: 'HardDayNight'
    }
};

module.exports = config[env];
