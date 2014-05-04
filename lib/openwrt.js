'use strict';

var Netmask   = require('netmask').Netmask,
    util      = require('util'),
    sshConn   = require('ssh2'),
    Q = require('q');

function getIpsFromTracerouteCommand(res) {
    var result = [];
    res = res.split('\n');

    for (var l in res) {
        var line = res[l];
        if (line.search(' +inet 10.') !== -1 || line.search(' +inet 172.16.') !== -1) {
            line = line.replace(/ +inet /, '');
            line = line.replace(/brd /, '');
            line = line.replace(/scope global /, '');
            var iface = line.split(' ')[2];
            var address = line.split(' ')[0];
            result.push({ name: iface, address: address });
        }
    }

    return result;
}

function getips(node, logger) {
    var deferred = Q.defer();

    var ip = node.mainip;
    var c = new sshConn();
    c.on('ready', function() {
        c.exec(util.format('/usr/sbin/ip a'), function(err, stream) {
            if (err) {
                logger.debug(util.format('Error getting IP information from OpenWRT: %s', ip));
            } else {
                var res = '';
                stream.on('data', function(data) {
                    res = data.toString().trim();
                    res = getIpsFromTracerouteCommand(res);
                });
                stream.on('exit', function() {
                    node.interfaces = res;
                    deferred.resolve(node);
                    c.end();
                });
            }
        });
    });

    c.on('error', function(err) {
        logger.debug(util.format('Error getting IP information from OpenWRT: %s %s', ip, err));
        deferred.reject();
    });

    c.connect({
        host: ip,
        port: 22,
        username: node.username,
        password: node.password
    });

    return deferred.promise;
}

function convierteEstructura(res) {
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
}

function traceroute(ip, username, password, remoteip, callback) {
    var c = new sshConn();
    c.on('ready', function() {
        c.exec(util.format('/usr/bin/traceroute %s', remoteip), function(err, stream) {
            if (err) {
                logger.debug(util.format('Error getting IP information from OpenWRT: %s', ip));
            } else {
                var res = [];
                stream.on('data', function(data) {
                    data = data.toString().trim();
                    res = convierteEstructura(data);
                });
                stream.on('exit', function() {
                    callback(res);
                    c.end();
                });
            }
        });
    });

    c.on('error', function(err) {
        logger.debug(util.format('Error getting IP information from OpenWRT: %s %s', ip, err));
    });

    c.connect({
        host: ip,
        port: 22,
        username: username,
        password: password
    });
}

module.exports.traceroute = traceroute;
module.exports.getips = getips;

