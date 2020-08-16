'use strict';

var apissl = require('../../config/gps').apissl || false;
var RosApi = require('node-routeros').RouterOSAPI;
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

    var connection = new RosApi({
	    host: ip,
	    user: username,
	    password: password
    });

    connection.getConnectPromise().then(function(conn) {
    	conn.getCommandPromise('/interface/wireless/registration-table/print').then(function resolved(parsed) {
	    var users = { good: 0, bad: 0 };
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
        }).catch(function(err) {
	    deferred.reject(err);
	})
    }).catch(function(err) {
	    deferred.reject(err);
    });
    return deferred.promise.timeout(10000);
};

var getips = function(node) {
    var deferred = Q.defer();

    var username = node.username,
        password = node.password,
        ip = node.mainip;

    var tls = apissl;

    if (node.apissl !== undefined) {
	tls = node.apissl;
    }

    var connection = new RosApi({
	    host: ip,
	    user: username,
	    password: password
    });

    var connection = Mikronode.getConnection(ip, username, password, { 
	    tls: tls, 
	    rejectUnauthorized : false,
	    closeOnDone : true
    });
    connection.getConnectPromise().then(function(conn) {
    	conn.getCommandPromise('/ip/address/print').then(function resolved(parsed) {
            var interfaces = [];
            for (var i in parsed) {
                var item = parsed[i];
                var iface = { name: item.interface, address: item.address };
                interfaces.push(iface);
            }
            node.interfaces = interfaces;
            deferred.resolve(node);
        });
    }).catch(function(err) {
	console.log(node.name, err);
	deferred.reject(err);
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

    var connection = new RosApi({
	    host: ip,
	    user: username,
	    password: password
    });

    var connection = Mikronode.getConnection(ip, username, password, { 
	    tls: tls, 
	    rejectUnauthorized : false,
	    closeOnDone : true
    });
    connection.getConnectPromise().then(function(conn) {
    	conn.getCommandPromise('/routing/ospf/neighbor/print').then(function resolved(parsed) {
            deferred.resolve(parsed);
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

    var deferred = Q.defer();

    var connection = new RosApi({
	    host: ip,
	    user: username,
	    password: password
    });

    var connection = Mikronode.getConnection(ip, username, password, { 
	    tls: tls, 
	    rejectUnauthorized : false,
	    closeOnDone : true
    });
    connection.getConnectPromise().then(function(conn) {
    	conn.getCommandPromise('/routing/ospf/instance/print', '=status').then(function resolved(parsed) {
            deferred.resolve(parsed[0]);
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

    var deferred = Q.defer();

    var connection = new RosApi({
	    host: ip,
	    user: username,
	    password: password
    });

    var connection = Mikronode.getConnection(ip, username, password, { 
	    tls: tls, 
	    rejectUnauthorized : false,
	    closeOnDone : true
    });
    connection.getConnectPromise().then(function(conn) {
    	conn.getCommandPromise('/system/resource/print').then(function resolved(parsed) {
            deferred.resolve(parsed[0]);
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

    var deferred = Q.defer();

    var connection = new RosApi({
	    host: ip,
	    user: username,
	    password: password
    });

    var connection = Mikronode.getConnection(ip, username, password, { 
	    tls: tls, 
	    rejectUnauthorized : false,
	    closeOnDone : true
    });
    connection.getConnectPromise().then(function(conn) {
    	conn.getCommandPromise('/system/routerboard/print').then(function resolved(parsed) {
            deferred.resolve(parsed[0]);
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

    var connection = new RosApi({
	    host: ip,
	    user: username,
	    password: password
    });

    var connection = Mikronode.getConnection(ip, username, password, { 
	    tls: tls, 
	    rejectUnauthorized : false,
	    closeOnDone : true
    });
    connection.getConnectPromise().then(function(conn) {
    	conn.getCommandPromise('/ip/route/print', '=.proplist=.id,active,dst-address,gateway,distance').then(function resolved(parsed) {
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

    return deferred.promise.timeout(10000);
};

var traceroute = function(node, remoteip) {
    var ip = node.mainip;
    var username = node.username;
    var password = node.password;
    var tls = apissl;

    if (node.apissl !== undefined) {
	tls = node.apissl;
    }

    var deferred = Q.defer();

    var connection = new RosApi({
	    host: ip,
	    user: username,
	    password: password
    });

    var connection = Mikronode.getConnection(ip, username, password, { 
	    tls: tls, 
	    rejectUnauthorized : false,
	    closeOnDone : true
    });
    connection.getConnectPromise().then(function(conn) {
    	conn.getCommandPromise('/tool/traceroute', ['=count=1', '=address=' + remoteip ]).then(function resolved(parsed) {
            var path = [];
            for (var i in parsed) {
                var item = parsed[i];
                if (item.address.search('10.') === 0 || item.address.search('172.') === 0) {
                    path.push(item.address);
                }
            }
            deferred.resolve(path);
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
          var parsed = Mikronode.parseItems(data);
          if (parsed && parsed[0] && parsed[0][current[direction]] > 0) {
              bandwidth.push(parseInt(parsed[0][current[direction]]));
          }
      });

      chan.on('done', function(data) {
          var avg = 0;
          if (bandwidth.length) {
              var sum = bandwidth.reduce(function(a, b) { return a + b });
              avg = sum / bandwidth.length;
          }
	  chan.removeAllListeners('data');
	  chan.removeAllListeners('done');
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

    var connection = new RosApi({
	    host: ip,
	    user: username,
	    password: password
    });

    var connection = Mikronode.getConnection(n1.mainip, n1.username, n1.password, { 
	    tls: tls, 
	    rejectUnauthorized : false,
	    closeOnDone: true
    });

    connection.getConnectPromise().then(function(conn) {
        var chan=conn.openChannel();
        runBandWidthTest(link, n1, n2, 'transmit', chan, conn).then(function(tx) {
            runBandWidthTest(link, n1, n2, 'receive', chan, conn).then(function(rx) {
                console.log(util.format('PUTVAL "%s/links/bandwidth-%s" interval=%s N:%s:%s', n1.name, n2.name, interval, tx, rx));
                df.resolve({
		    n1: n1,
		    n2: n2,
		    tx: tx,
		    rx: rx
		});
            }).catch(function(err) {
		df.reject(err);
	    });
        }).catch(function(err) {
	   df.reject(err);
	});
    }).catch(function(err) {
       df.reject(err);
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
