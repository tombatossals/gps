'use strict';

var api = require('mikronode'),
    util = require('util'),
    Q = require('q');

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
    return deferred.promise;
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

    return deferred.promise;
}

var traceroute = function(ip, username, password, remoteip) {

    var deferred = Q.defer(),
        connection = new api(ip, username, password);

    connection.on('error', function(err) {
        deferred.reject("Error on traceroute:" + err);
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

    return deferred.promise;
}

module.exports.traceroute = traceroute;
module.exports.getips = getips;
module.exports.getConnectedUsers = getConnectedUsers;
