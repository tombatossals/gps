'use strict';

var Netmask   = require('netmask').Netmask,
    util      = require('util'),
    sshConn   = require('ssh2'),
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

var getIpsFromTracerouteCommand = function(res) {
    var result = [];
    res = res.split('\n');

    for (var l in res) {
        var line = res[l];
        if (line.search(' +inet 10.') !== -1 || line.search(' +inet 172.16.') !== -1) {
            line = line.replace(/ +inet /, '');
            line = line.replace(/brd /, '');
            line = line.replace(/scope global /, '');
            var iface = line.split(/[ ]+/)[2];
            var address = line.split(/[ ]+/)[0];
            result.push({ name: iface, address: address });
        }
    }

    return result;
};

var getips = function(node) {
    var deferred = Q.defer();

    var ip = node.mainip;
    var c = new sshConn();
    c.on('ready', function() {
        c.exec(util.format('/usr/sbin/ip a'), function(err, stream) {
            if (err) {
                deferred.reject(util.format('Error getting IP information from OpenWRT: %s', ip));
            } else {
                var res = [];
                stream.on('data', function(data) {
                    res = res.concat(getIpsFromTracerouteCommand(data.toString().trim()));
                });
                stream.on('exit', function() {
                    node.interfaces = res.slice(0);
                    deferred.resolve(node);
                    c.end();
                });
            }
        });
    });

    c.on('error', function(err) {
        deferred.reject(util.format('Error getting IP information from OpenWRT: %s %s', ip, err));
    });

    c.connect({
        host: ip,
        port: 22,
        username: node.username,
        password: node.password
    });

    return deferred.promise.timeout(60000);
};

var convierteEstructura = function(res) {
    var result = [];
    res = res.split('\n');

    for (var l in res) {
        var line = res[l];
        if (line.search('traceroute') !== 0) {
            line = line.replace(/ [0-9]+ +/, '');
            line = line.split(' ')[0];
            if (line.search('10.') === 0 || line.search('172.') === 0) {
                result.push(line);
            }
        }
    }

    return result;
};

var traceroute = function(ip, username, password, remoteip, callback) {

    var deferred = Q.defer(),
        c = new sshConn();

    c.on('ready', function() {
        c.exec(util.format('/usr/bin/traceroute %s', remoteip), function(err, stream) {
            if (err) {
                deferred.reject(util.format('Error getting IP information from OpenWRT: %s', ip));
            } else {
                var res = [];
                stream.on('data', function(data) {
                    data = data.toString().trim();
                    res = convierteEstructura(data);
                });
                stream.on('exit', function() {
                    deferred.resolve(res);
                    c.end();
                });
            }
        });
    });

    c.on('error', function(err) {
        deferred.reject('Error on traceroute:' + err);
    });

    c.connect({
        host: ip,
        port: 22,
        username: username,
        password: password
    });

    return deferred.promise.timeout(60000);

};

var getOSPFInstanceInfo = function(node) {

    var ip = node.mainip;
    var username = node.username;
    var password = node.password;

    var deferred = Q.defer(),
        c = new sshConn();

    c.on('ready', function() {
        c.exec(util.format('vtysh -c "show ip ospf interface" | grep "Router ID" | cut -f1 -d"," | cut -f5 -d" " | head -1; ps | grep -q /usr/sbin/ospfd && echo "Running" || echo "Down" '), function(err, stream) {
            if (err) {
                deferred.reject(util.format('Error getting OSPF instance information from OpenWRT: %s', ip));
            } else {
                var res = [];
                stream.on('data', function(data) {
                    data = data.toString().trim();
                    res = data.split('\n');
                });

                stream.on('exit', function() {
                    deferred.resolve({
                        'router-id': res[0],
                        'state': res[1]
                    });

                    c.end();
                });
            }
        });
    });

    c.on('error', function(err) {
        deferred.reject('Error getting sysinfo: ' + err);
    });

    c.connect({
        host: ip,
        port: 22,
        username: username,
        password: password
    });

    return deferred.promise.timeout(60000);
};

var getNeighborInfo = function(node) {

    var ip = node.mainip;
    var username = node.username;
    var password = node.password;
    var deferred = Q.defer(),
        c = new sshConn();

    c.on('ready', function() {
        c.exec(util.format('vtysh -c "show ip ospf neighbor" | tail +3 | sed -e s/"  *"/" "/g | cut -f3-5 -d" "'), function(err, stream) {
            if (err) {
                deferred.reject(util.format('Error getting IP information from OpenWRT: %s', ip));
            } else {
                var res = [];
                stream.on('data', function(data) {
                    data = data.toString().trim();
                    res = data.split('\n');
                });

                stream.on('exit', function() {
                    var neighbors = [];
                    for (var i in res) {
                        var line = res[i];
                        neighbors.push({
                            address: line.split(' ')[2],
                            adjacency: line.split(' ')[1],
                            state: line.split(' ')[0]
                        });
                    }
                    deferred.resolve(neighbors);

                    c.end();
                });
            }
        });
    });

    c.on('error', function(err) {
        deferred.reject('Error getting sysinfo: ' + err);
    });

    c.connect({
        host: ip,
        port: 22,
        username: username,
        password: password
    });

    return deferred.promise.timeout(60000);
};

var getOpenWRTSystemInfo = function(ip, username, password) {

    var deferred = Q.defer(),
        c = new sshConn();

    c.on('ready', function() {
        c.exec(util.format('uname -a; cat /etc/banner | grep -E \', r[0-9]\' | sed -e s/\'^ *\'// | sed -e s/\'-.*$\'// | sed -e s/\' *$\'//; uptime; cat /proc/cpuinfo  | grep machine | cut -f2 -d\':\' | sed -e s/\'^ \'//'), function(err, stream) {
            if (err) {
                deferred.reject(util.format('Error getting IP information from OpenWRT: %s', ip));
            } else {
                var res = [];
                stream.on('data', function(data) {
                    data = data.toString().trim();
                    res = data.split('\n');
                });

                stream.on('exit', function() {
                    deferred.resolve({
                        version: res[0],
                        uptime: res[2].split(',')[0].split(' up ')[1],
                        'board-name': res[3],
                        'current-firmware': res[1]
                    });

                    c.end();
                });
            }
        });
    });

    c.on('error', function(err) {
        deferred.reject('Error getting sysinfo: ' + err);
    });

    c.connect({
        host: ip,
        port: 22,
        username: username,
        password: password
    });

    return deferred.promise.timeout(60000);
};

var bandwidthTest = function(link, n1, n2) {
    var deferred = Q.defer();
    var c = new sshConn();
    var ip = n1.mainip;
    var username = n1.username;
    var password = n1.password;
    var duration = 20;
    var testip = getTestingIp(link, n2);

    if (!testip) {
        deferred.resolve('Not found link ip from ' + n1.name + ' ' + n2.name);
        return deferred.promise;
    }

    c.on('ready', function() {
        c.exec(util.format('/usr/sbin/mikrotik_btest -d both -t %s %s', duration, testip), function(err, stream) {
            var tx = 0, rx = 0;
            stream.on('data', function(data) {
                data = data.toString().trim();
                data = data.split('\n');
                for (var l in data) {
                    var line = data[l];
                    var ntx, nrx;
                    if (line.search('Rx:') === 0) {
                        ntx = line.split('\t')[1];
                        nrx = line.split('\t')[0];
                        ntx = ntx.replace(/Tx: +/, '');
                        ntx = ntx.split(' ')[0];
                        nrx = nrx.replace(/Rx: +/, '');
                        nrx = nrx.split(' ')[0];
                        if (!isNaN(ntx) && ntx > tx) {
                            tx = ntx;
                        }
                        if (!isNaN(nrx) && nrx > rx) {
                            rx = nrx;
                        }
                    }
                }
            });
            stream.on('exit', function() {
                tx = parseInt(tx, 10) * 1024 * 1024;
                rx = parseInt(rx, 10) * 1024 * 1024;
                if (!isNaN(tx) && !isNaN(rx) && tx > 0 && rx > 0) {
                    console.log(util.format('PUTVAL "%s/links/bandwidth-%s" interval=%s N:%s:%s', n1.name, n2.name, INTERVAL, tx, rx));
                    deferred.resolve({
			n1: n1,
			n2: n2,
			tx: tx,
			rx: rx
		    });
                } else {
                    deferred.reject(util.format('ERROR "%s/links/bandwidth-%s" interval=%s N:%s:%s', n1.name, n2.name, INTERVAL, tx, rx));
                }
                c.end();
            });
        });
    });

    c.on('error', function(err) {
        deferred.reject(util.format('ERROR: ' + n1.name + '-' + n2.name + ' connecting %s %s', ip, err));
    });

    c.connect({
        host: ip,
        port: 22,
        username: username,
        password: password || '-'
    });

    return deferred.promise.timeout(60000);
};

module.exports = {
    bandwidthTest: bandwidthTest,
    traceroute: traceroute,
    getOpenWRTSystemInfo: getOpenWRTSystemInfo,
    getips: getips,
    getOSPFInstanceInfo : getOSPFInstanceInfo,
    getNeighborInfo : getNeighborInfo
};
