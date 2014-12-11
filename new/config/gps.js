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
        collectd: {
            snmp: "/etc/collectd.d/snmp.conf",
            ping: "/etc/collectd.d/ping.conf"
        }
    },

    test: {
        interval: getInterval(),
        collectd: {
            snmp: "/etc/collectd.d/snmp.conf",
            ping: "/etc/collectd.d/ping.conf"
        }
    },

    production: {
        interval: getInterval(),
        collectd: {
            snmp: "/etc/collectd.d/snmp.conf",
            ping: "/etc/collectd.d/ping.conf"
        }
    }
};

module.exports = config[env];
