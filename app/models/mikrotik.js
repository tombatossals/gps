'use strict';

var apissl = require('../../config/gps').apissl || false;
var api = require('mikronode');
var util = require('util');
var Netmask  = require('netmask').Netmask;
var interval = require('../../config/gps').interval;
var duration = require('../../config/gps').bandwidthTestDuration;
var Q = require('q');

var getTestingIp = function(link, node) {
    var testingIp, ifaceName;

    if (link.nodes[0].id === node.id.toString()) {
        ifaceName = link.nodes[0].iface;
    } else if (link.nodes[1].id === node.id.toString()) {
        ifaceName = link.nodes[1].iface;
    } else {
        return;
    }

    var network = new Netmask(link.network);
    var interfaces = node.interfaces;
    for (var i=0; i<interfaces.length; i++) {
        var iface = interfaces[i];
        var ip = iface.address.split('/')[0];
        if (iface.name === ifaceName && network.contains(ip)) {
            return ip;
        }
    }

    return;
};

var getConnectedUsers = function(node) {
    var username = node.username,
        password = node.password,
        ip = node.mainip;

    var deferred = Q.defer();

    if (node.omnitikip) {
        ip = node.omnitikip;
    }

    var tls = apissl;

    if (node.apissl !== undefined) {
	tls = node.apissl;
    }

    var connection = new api(ip, username, password, { tls: tls });
    connection.on('error', function(err) {
        deferred.reject(util.format('FATAL: Can\'t connect to the API: %s %s %s', ip, username, password));
    });

    connection.connect(function(conn) {
        var chan=conn.openChannel();
        chan.write('/interface/wireless/registration-table/print',function() {
            chan.on('done',function(data) {
                var users = { good: 0, bad: 0 };
                var parsed = api.parseItems(data);
                for (var i in parsed) {
                    var item = parsed[i];
                    var signal = item['signal-strength'].replace(/dBm.*/, '');
                    if (signal <= -80) {
                        users.bad += 1;
                    } else {
                        users.good += 1;
                    }
                }
                deferred.resolve(users);
            });
            chan.close();
            conn.close();
        });
    });
    return deferred.promise.timeout(60000);
};

var getips = function(node) {
    var deferred = Q.defer();

    var ip = node.mainip;
    var tls = apissl;

    if (node.apissl !== undefined) {
	tls = node.apissl;
    }

    var connection = new api(ip, node.username, node.password, { tls: tls || apissl });
    connection.on('error', function(err) {
        deferred.reject(node);
    });

    connection.connect(function(conn) {
        var chan=conn.openChannel();

        chan.write('/ip/address/print',function() {
            chan.on('done',function(data) {
                var parsed = api.parseItems(data);
                var interfaces = [];
                for (var i in parsed) {
                    var item = parsed[i];
                    var iface = { name: item.interface, address: item.address };
                    interfaces.push(iface);
                }
                node.interfaces = interfaces;
                deferred.resolve(node);
            });
        });
    });

    return deferred.promise.timeout(60000);
};

var getNeighborInfo = function(node) {

    var ip = node.mainip;
    var username = node.username;
    var password = node.password;
    var deferred = Q.defer();
    var tls = apissl;

    if (node.apissl !== undefined) {
	tls = node.apissl;
    }

    var connection = new api(ip, username, password, { tls: tls });

    connection.on('error', function(err) {
        deferred.reject('Error on getting routeros version from ' + node.name + ', ' + err);
    });

    connection.connect(function(conn) {
        var chan=conn.openChannel();
        chan.write([ '/routing/ospf/neighbor/print' ], function() {
            chan.on('done', function(data) {
                var parsed = api.parseItems(data);
                deferred.resolve(parsed);
                chan.close();
                connection.close();
            });
        });
    });

    return deferred.promise.timeout(10000);
};

var getOSPFInstanceInfo = function(node) {
    var ip = node.mainip;
    var username = node.username;
    var password = node.password;
    var tls = apissl;

    if (node.apissl !== undefined) {
	tls = node.apissl;
    }

    var deferred = Q.defer(),
        connection = new api(ip, username, password, { tls: tls });

    connection.on('error', function(err) {
        deferred.reject('Error on getting routeros version from ' + node.name + ', ' + err);
    });

    connection.connect(function(conn) {
        var chan=conn.openChannel();
        chan.write([ '/routing/ospf/instance/print', '=status' ], function() {
            chan.on('done', function(data) {
                var parsed = api.parseItems(data);
                deferred.resolve(parsed[0]);
                chan.close();
                connection.close();
            });
        });
    });

    return deferred.promise.timeout(10000);
};

var getResourceInfo = function(node) {
    var ip = node.mainip;
    var username = node.username;
    var password = node.password;
    var tls = apissl;

    if (node.apissl !== undefined) {
	tls = node.apissl;
    }

    var deferred = Q.defer(),
        connection = new api(ip, username, password, { tls: tls });

    connection.on('error', function(err) {
        deferred.reject('Error on getting routeros version from ' + node.name + ', ' + err);
    });

    connection.connect(function(conn) {
        var chan=conn.openChannel();
        chan.write([ '/system/resource/print' ], function() {
            chan.on('done', function(data) {
                var parsed = api.parseItems(data);
                deferred.resolve(parsed[0]);
                chan.close();
                connection.close();
            });
        });
    });

    return deferred.promise.timeout(10000);
};

var getRouterboardInfo = function(node) {
    var ip = node.mainip;
    var username = node.username;
    var password = node.password;
    var tls = apissl;

    if (node.apissl !== undefined) {
	tls = node.apissl;
    }

    var deferred = Q.defer(),
        connection = new api(ip, username, password, { tls: tls });

    connection.on('error', function(err) {
        deferred.reject('Error on getting routeros version from ' + node.name + ', ' + err);
    });

    connection.connect(function(conn) {
        var chan=conn.openChannel();
        chan.write([ '/system/routerboard/print' ], function() {
            chan.on('done', function(data) {
                var parsed = api.parseItems(data);
                deferred.resolve(parsed[0]);
                chan.close();
                connection.close();
            });
        });
    });

    return deferred.promise.timeout(10000);
};

var getRoutingTable = function(node, print) {

    var deferred = Q.defer();
    var ip = node.mainip;
    var username = node.username;
    var password = node.password;
    var tls = apissl;

    if (node.apissl !== undefined) {
	tls = node.apissl;
    }

    var connection = new api(ip, username, password, { tls: tls });

    connection.on('error', function(err) {
        deferred.reject('Error on getting routing table from ' + node.name + ', ' + err);
    });

    connection.connect(function(conn) {
        var chan=conn.openChannel();
        chan.write([ '/ip/route/print', '=.proplist=.id,active,dst-address,gateway,distance' ], function() {
            chan.on('done', function(data) {
                var parsed = api.parseItems(data);
                var routing = {
                    total: 0,
                    active: 0,
                    inactive: 0
                };
                for (var i in parsed) {
		    if (print) {
			console.log(util.format("%s - %s - %s - %s - %s", node.name, parsed[i]['dst-address'], parsed[i].active, parsed[i].gateway, parsed[i].distance));
		    }
                    routing.total +=1;
                    if (parsed[i].active === 'true') {
                        routing.active +=1;
                    } else {
                        routing.inactive +=1;
                    }
                }
                deferred.resolve(routing);
            });
        });
    });

    return deferred.promise.timeout(60000);
};

var traceroute = function(node, remoteip) {

    var ip = node.mainip;
    var username = node.username;
    var password = node.password;
    var tls = apissl;

    if (node.apissl !== undefined) {
	tls = node.apissl;
    }

    var deferred = Q.defer(),
        connection = new api(ip, username, password, { tls: tls });

    connection.on('error', function(err) {
        deferred.reject('Error on traceroute:' + err);
    });

    connection.connect(function(conn) {
        var chan=conn.openChannel();
        chan.write([ '/tool/traceroute', '=count=1', '=address=' + remoteip ], function() {
            chan.on('done', function(data) {
                var parsed = api.parseItems(data);
                var path = [];
                for (var i in parsed) {
                    var item = parsed[i];
                    if (item.address.search('10.') === 0 || item.address.search('172.') === 0) {
                        path.push(item.address);
                    }
                }
                deferred.resolve(path);
                chan.close();
                conn.close();
            });
        });
    });

    return deferred.promise.timeout(60000);
};

var runBandWidthTest = function(link, n1, n2, direction, chan, conn) {
    var df = Q.defer();
    var username = n2.username;
    var password = n2.password;
    var proto = 'udp';
    var testip = getTestingIp(link, n2);
    var bandwidth = [];
    var current = {
        transmit: 'tx-current',
        receive: 'rx-current'
    };

    chan.write(['/tool/bandwidth-test', '=address=' + testip, '=user=' + username, '=password=' + password, '=protocol=' + proto, '=direction=' + direction, '=duration=' + duration], function(data) {
      chan.on('data', function(data) {
          var parsed = api.parseItems(data);
          if (parsed[0][current[direction]] > 0) {
              bandwidth.push(parseInt(parsed[0][current[direction]]));
          }
      });

      chan.on('done', function(data) {
          var avg = 0;
          if (bandwidth.length) {
              var sum = bandwidth.reduce(function(a, b) { return a + b });
              avg = sum / bandwidth.length;
          }
          df.resolve(parseInt(avg));
      });
    });

    return df.promise.timeout(60000);
};

var bandwidthTest = function(link, n1, n2) {
    var df = Q.defer();
    var tls = apissl;

    if (n1.apissl !== undefined) {
	tls = n1.apissl;
    }

    var connection = new api(n1.mainip, n1.username, n1.password, { tls: tls, timeout: 60 });
    connection.on('error', function(err) {
        df.reject(util.format('FATAL: Can\'t connect to the API: %s %s', n1.name, n1.mainip));
    });
    connection.connect(function(conn) {
	if (!conn) {
		df.reject();
		return;
	}

        var chan=conn.openChannel();
        runBandWidthTest(link, n1, n2, 'transmit', chan, conn).then(function(tx) {
            runBandWidthTest(link, n1, n2, 'receive', chan, conn).then(function(rx) {
		chan.close();
		conn.close();
                console.log(util.format('PUTVAL "%s/links/bandwidth-%s" interval=%s N:%s:%s', n1.name, n2.name, interval, tx, rx));
                df.resolve({
			n1: n1,
			n2: n2,
			tx: tx,
			rx: rx
		});
            }).fail(function() {
		chan.close();
		conn.close();
		df.reject();
	    });
        }).fail(function() {
		chan.close();
		conn.close();
		df.reject();
	});
    });

    return df.promise;
};

module.exports = {
    bandwidthTest : bandwidthTest,
    traceroute : traceroute,
    getips : getips,
    getConnectedUsers : getConnectedUsers,
    getRoutingTable : getRoutingTable,
    getRouterboardInfo : getRouterboardInfo,
    getResourceInfo : getResourceInfo,
    getOSPFInstanceInfo : getOSPFInstanceInfo,
    getNeighborInfo : getNeighborInfo
};
