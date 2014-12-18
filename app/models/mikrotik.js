'use strict';

var api = require('mikronode'),
    util = require('util'),
    sshConn  = require('ssh2'),
    Netmask  = require('netmask').Netmask,
    INTERVAL = require('../../config/gps').interval,
    Q = require('q');

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

    var connection = new api(ip, username, password);
    connection.on('error', function(err) {
        deferred.reject(util.format('FATAL: Can\'t connect to the API: %s %s %s', ip, username, password));
    });

    connection.connect(function(conn) {
        conn.closeOnDone(true);
        var chan=conn.openChannel();
        chan.closeOnDone(true);
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
    var connection = new api(ip, node.username, node.password);

    connection.on('error', function(err) {
        deferred.reject(node);
    });

    connection.connect(function(conn) {
        conn.closeOnDone(true);
        var chan=conn.openChannel();
        chan.closeOnDone(true);

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

var getNeighborInfo = function(ip, username, password) {

    var deferred = Q.defer(),
        connection = new api(ip, username, password);

    connection.on('error', function(err) {
        deferred.reject('Error on getting routeros version:' + err);
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

var getOSPFInstanceInfo = function(ip, username, password) {

    var deferred = Q.defer(),
        connection = new api(ip, username, password);

    connection.on('error', function(err) {
        deferred.reject('Error on getting routeros version:' + err);
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

var getResourceInfo = function(ip, username, password) {

    var deferred = Q.defer(),
        connection = new api(ip, username, password);

    connection.on('error', function(err) {
        deferred.reject('Error on getting routeros version:' + err);
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

var getRouterboardInfo = function(ip, username, password) {

    var deferred = Q.defer(),
        connection = new api(ip, username, password);

    connection.on('error', function(err) {
        deferred.reject('Error on getting routeros version:' + err);
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

var getRoutingTable = function(ip, username, password) {

    var deferred = Q.defer(),
        connection = new api(ip, username, password);

    connection.on('error', function(err) {
        deferred.reject('Error on getting routing table:' + err);
    });

    connection.connect(function(conn) {
        var chan=conn.openChannel();
        chan.write([ '/ip/route/print' ], function() {
            chan.on('done', function(data) {
                var parsed = api.parseItems(data);
                var routing = {
                    total: 0,
                    active: 0,
                    inactive: 0
                };
                for (var i in parsed) {
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

var traceroute = function(ip, username, password, remoteip) {

    var deferred = Q.defer(),
        connection = new api(ip, username, password);

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

var bandwidthTest = function(link, n1, n2) {
    var deferred = Q.defer();

    var c = new sshConn();
    var ip = n1.mainip;
    var sshPort = n1.sshPort || 22;
    var username = n1.username;
    var password = n1.password;
    var username2 = n2.username;
    var password2 = n2.password;
    var interval = 5;
    var duration = 19;
    //var duration = 5;
    var proto = 'udp';
    var testip = getTestingIp(link, n2);

    if (!testip) {
        deferred.reject('Not found IP from ' + n1.name + ' ' + n2.name);
        return deferred.promise;
    }

    c.on('ready', function() {
        c.exec(util.format(':global ip; :global username; :global password; :global interval; :global duration; :global proto; :set ip %s; :set username %s; :set password %s; :set interval %s; :set duration %s; :set proto %s; /system script run bandwidth', testip, username2, password2, interval, duration, proto), function(err, stream) {
            if (err) {
                deferred.reject(util.format('Error on bandwidth from %s to %s.', ip, testip));
            } else {
                stream.on('data', function(data) {
                    data = data.toString().trim();
                    if (data.search('tx:') !== -1) {
                        var tx = 0, rx = 0;
                        tx = data.split(' ')[0].replace('tx:', '');
                        rx = data.split(' ')[1].replace('rx:', '');
                        if (!isNaN(tx) && !isNaN(rx) && tx > 0 && rx > 0) {
                            console.log(util.format('PUTVAL "%s/links/bandwidth-%s" interval=%s N:%s:%s', n1.name, n2.name, INTERVAL, tx, rx));
                            deferred.resolve(util.format('PUTVAL %s/links/bandwidth-%s" interval=%s N:%s:%s', n1.name, n2.name, INTERVAL, tx, rx));
                        } else {
                            deferred.reject(util.format('ERROR "%s/links/bandwidth-%s" interval=%s N:%s:%s', n1.name, n2.name, INTERVAL, tx, rx));
                        }
                    }
                });

                stream.on('exit', function() {
                    c.end();
                });
            }
        });
    });

    c.on('error', function(err) {
        deferred.reject(util.format('ERROR: ' + n1.name + '-' + n2.name + ' Error connecting %s %s', ip, err));
    });

    c.connect({
        host: ip,
        port: sshPort,
        username: username,
        password: password || '-'
    });

    return deferred.promise.timeout(60000);
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
