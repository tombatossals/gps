var api = require('mikronode'),
    logger = require('./log'),
    util = require('util'),
    Q = require("q");

function getConnectedUsers(node) {
    var username = node.username,
        password = node.password,
        ip = node.mainip;

    var deferred = Q.defer();

    if (node.omnitikip) {
        ip = node.omnitikip;
    }

    var connection = new api(ip, username, password, { timeout: 5000 });
    connection.on('error', function(err) {
        logger.error(util.format("FATAL: Can't connect to the API: %s %s %s", ip, username, password));
        deferred.reject();
    });

    connection.connect(function(conn) {
        conn.closeOnDone(true);
        var chan=conn.openChannel();
        chan.write('/interface/wireless/registration-table/print',function() {
            chan.on('done',function(data) {
                var users = { good: 0, bad: 0 };
                var parsed = api.parseItems(data);
                for (var i in parsed) {
                    var item = parsed[i];
                    var signal = item["signal-strength"].replace(/dBm.*/, "");
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
    return deferred.promise.timeout(15000);
}

function getips(node) {
    var deferred = Q.defer();

    var ip = node.mainip;
    var connection = new api(ip, node.username, node.password);
    connection.on('error', function(err) {
        logger.error(util.format("FATAL: Can't connect to the API: %s %s %s", ip, node.username, node.password));
        deferred.reject();
    });

    connection.connect(function(conn) {
        var chan=conn.openChannel();
        chan.write('/ip/address/print',function() {
            chan.on('done',function(data) {
                var parsed = api.parseItems(data);
                var interfaces = [];
                var count = parsed.length;
                parsed.forEach(function(item) {
                    var iface = { name: item.interface, address: item.address };
                    interfaces.push(iface);
                    count--;
                    if (count === 0) {
                        node.interfaces = interfaces;
                        deferred.resolve(node);
                    }
                });
                chan.close();
                conn.close();
            });
        });
    });

    return deferred.promise;
}

function traceroute(ip, username, password, remoteip, callback) {

    var connection = new api(ip, username, password);
    connection.on('error', function(err) {
        console.log("ERROR", err);
        callback();
    });

    connection.connect(function(conn) {
        var chan=conn.openChannel();
        chan.write([ '/tool/traceroute', '=address=' + remoteip ], function() {
            chan.on('done', function(data) {
                var parsed = api.parseItems(data);
                var path = [];
                var count = parsed.length;
                parsed.forEach(function(item) {
                    if (item.address.search("10.") == 0 || item.address.search("172.") == 0) {
                        path.push(item.address);
                    }
                    count--;
                    if (count === 0) {
                        callback(path);
                    }
                });
                chan.close();
                conn.close();
            });
        });
    });
}

module.exports.traceroute = traceroute;
module.exports.getips = getips;
module.exports.getConnectedUsers = getConnectedUsers;
