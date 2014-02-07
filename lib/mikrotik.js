var api = require('mikronode'),
    logger = require('./log'),
    util = require('util');

function getConnectedUsers(ip, username, password, callback) {

    var connection = new api(ip, username, password);
    connection.on('error', function(err) {
        logger.error(util.format("FATAL: Can't connect to the API: %s %s %s", ip, username, password));
        callback();
    });

    connection.connect(function(conn) {
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
                callback(users);
                chan.close();
                conn.close();
            });
        });
    });
}

function getips(supernodo, username, password, callback) {

    var ip = supernodo.mainip;
    var connection = new api(ip, username, password);
    connection.on('error', function(err) {
        logger.error(err, ip);
        logger.error(util.format("FATAL: Can't connect to the API: %s %s %s", ip, username, password));
        callback();
        //process.exit(0);
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
                        callback(supernodo, interfaces);
                    }
                });
                chan.close();
                conn.close();
            });
        });
    });
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
