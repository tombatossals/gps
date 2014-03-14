var logger    = require('./log'),
    mongoose  = require('mongoose'),
    Netmask   = require('netmask').Netmask,
    util      = require("util"),
    getNodesByName = require('./common').getNodesByName,
    getNodesById = require('./common').getNodesById,
    getLinkById = require('./common').getLinkById,
    getLinks = require('./common').getLinks,
    INTERVAL = require('./common').INTERVAL,
    sshConn   = require("ssh2"),
    Q         = require("q");

function getTestingIp(link, node) {
    var deferred = Q.defer();

    if (link.nodes[0].id == node.id.toString()) {
    	var iface_name = link.nodes[0].iface;
    } else if (link.nodes[1].id == node.id.toString()) {
    	var iface_name = link.nodes[1].iface;
    } else {
        logger.error(util.format("Error finding the neighbout IP from %s to %s.", link._id, node.name));
        deferred.reject();
    }

    var network = new Netmask(link.network);
    var interfaces = node.interfaces;
    for (var i=0; i<interfaces.length; i++) {
        var interface = interfaces[i];
        var ip = interface.address.split("/")[0];
        if (interface.name === iface_name && network.contains(ip)) {
            deferred.resolve(ip);
        }
    }

    return deferred.promise;
}

function bandwidthTest(linkId) {
    var deferred = Q.defer();

    getLinkById(linkId).then(function(link) {
        var n1 = link.nodes[0].name;
        var n2 = link.nodes[1].name;
        getNodesByName([ n1, n2 ]).then(function(nodes) {
            var n1 = nodes[0];
            var n2 = nodes[1];

            if (n1.system === "mikrotik" && n2.system === "mikrotik") {
                bandwidthTestMikrotik(link, n1, n2).then(function() {
                    deferred.resolve();
                });
            } else if (n1.system === "openwrt") {
                bandwidthTestOpenwrt(link, n1, n2).then(function() {
                    deferred.resolve();
                });
            } else if (n2.system === "openwrt") {
                bandwidthTestOpenwrt(link, n1, n2).then(function() {
                    deferred.resolve();
                });
            }
        });
    });
    return deferred.promise.timeout(45000);
}

function bandwidthTestOpenwrt(link, n1, n2) {
    var deferred = Q.defer();
    var c = new sshConn();
    var ip = n1.mainip;
    var username = n1.username;
    var password = n1.password;
    var duration = 20;
    var testip = get_testing_ip(link, n2);
    if (testip) {
        c.on("ready", function() {
            c.exec(util.format("/usr/sbin/mikrotik_btest -d both -t %s %s", duration, testip), function(err, stream) {
                logger.debug(util.format("ssh %s /usr/sbin/mikrotik_btest -d both -t %s %s", ip, duration, testip));
                var tx = 0, rx = 0;
                stream.on("data", function(data) {
                    var data = data.toString().trim();
                    var data = data.split("\n");
                    for (l in data) {
                        var line = data[l];
                        if (line.search("Rx:") == 0) {
                            tx = line.split("\t")[1];
                            rx = line.split("\t")[0];
                            tx = tx.replace(/Tx: +/, "");
                            tx = tx.split(" ")[0];
                            rx = rx.replace(/Rx: +/, "");
                            rx = rx.split(" ")[0];
                        }
                    }
                });
                stream.on("exit", function() {
                    tx = parseInt(tx) * 1024 * 1024;
                    rx = parseInt(rx) * 1024 * 1024;
                    if (!isNaN(tx) && !isNaN(rx) && tx > 0 && rx > 0) {
                        console.log(util.format("PUTVAL \"%s/links/bandwidth-%s\" interval=%s N:%s:%s", n1.name, n2.name, INTERVAL, tx, rx));
                        logger.debug(util.format("PUTVAL \"%s/links/bandwidth-%s\" interval=%s N:%s:%s", n1.name, n2.name, INTERVAL, tx, rx));
                    } else {
                        logger.debug(util.format("ERROR \"%s/links/bandwidth-%s\" interval=%s N:%s:%s", n1.name, n2.name, INTERVAL, tx, rx));
                    }
                    deferred.resolve();
                    c.end();
                });
            });
        });

        c.on("error", function(err) {
            logger.error(util.format("Error connecting %s %s", ip, err));
            deferred.reject();
        });

        c.connect({
            host: ip,
            port: 22,
            username: username,
            password: password || "-"
        });
    }
    return deferred.promise;
}

function bandwidthTestMikrotik(link, n1, n2) {
    var deferred = Q.defer();

    var c = new sshConn();
    var ip = n1.mainip;
    var username = n1.username;
    var password = n1.password;
    var username2 = n2.username;
    var password2 = n2.password;
    var interval = 5;
    //var duration = 19;
    var duration = 5;
    var proto = 'udp';
    getTestingIp(link, n2).then(function(testip) {
        c.on("ready", function() {
            c.exec(util.format(":global ip; :global username; :global password; :global interval; :global duration; :global proto; :set ip %s; :set username %s; :set password %s; :set interval %s; :set duration %s; :set proto %s; /system script run bandwidth", testip, username2, password2, interval, duration, proto), function(err, stream) {
                logger.debug(util.format(":global ip; :global username; :global password; :global interval; :global duration; :global proto; :set ip %s; :set username %s; :set password %s; :set interval %s; :set duration %s; :set proto %s; /system script run bandwidth", testip, username2, password2, interval, duration, proto));
                if (err) {
                    logger.debug(util.format("Error on bandwidth from %s to %s.", ip, testip));
                    deferred.reject();
                } else {
                    stream.on("data", function(data) {
                        var data = data.toString().trim();
                        if (data.search("tx:") != -1) {
                            var tx = 0, rx = 0;
                            tx = data.split(" ")[0].replace("tx:", "");
                            rx = data.split(" ")[1].replace("rx:", "");
                            if (!isNaN(tx) && !isNaN(rx) && tx > 0 && rx > 0) {
                                console.log(util.format("PUTVAL \"%s/links/bandwidth-%s\" interval=%s N:%s:%s", n1.name, n2.name, INTERVAL, tx, rx));
                                logger.debug(util.format("PUTVAL \"%s/links/bandwidth-%s\" interval=%s N:%s:%s", n1.name, n2.name, INTERVAL, tx, rx));
                            } else {
                                logger.debug(util.format("ERROR \"%s/links/bandwidth-%s\" interval=%s N:%s:%s", n1.name, n2.name, INTERVAL, tx, rx));
                            }
                        }
                    });
                    stream.on("exit", function() {
                        c.end();
                        deferred.resolve();
                    });
                }
            });
        });

        c.on("error", function(err) {
            logger.error(util.format("Error connecting %s %s", ip, err));
            deferred.reject()
        });

        c.connect({
            host: ip,
            port: 22,
            username: username,
            password: password || "-"
        });
    });

    return deferred.promise;
}

function monitorLink(linkId) {
    var deferred = Q.defer();

    bandwidthTest(linkId).then(function() {
        deferred.resolve();
    }).fail(function() {
        console.log("Failed timeout: " + linkId);
        deferred.resolve();
    });
    return deferred.promise;
}

function startMonitoring(links) {
    var deferred = Q.defer(),
        nodesMonitorQueue = [[]];
        linksMonitorQueue = [[]];

    for (var i in links) {
        var link = links[i],
            found = false,
            n1 = link.nodes[0].id,
            n2 = link.nodes[1].id;

        for (var index in nodesMonitorQueue) {
            var iteration = nodesMonitorQueue[index];
            if (iteration.indexOf(n1) == -1 && iteration.indexOf(n2) == -1) {
                iteration.push(n1);
                iteration.push(n2);
                linksMonitorQueue[index].push(link.id);
                found = true;
                break;
            }
        }

        if (!found) {
            nodesMonitorQueue.push([ n1, n2 ]);
            linksMonitorQueue.push([ link.id ]);
        }
    }

    function monitorGroupOfLinks(group) {
        var deferred = Q.defer();

        var morePromises = [];
        for (var j in group) {
            morePromises.push(function() {
                var link = group[j];
                return monitorLink(link);
            }());
        }
        Q.allSettled(morePromises).then(function(status) {
            console.log("status: " + status);
            deferred.resolve();
        });
        deferred.promise;
    }

    linksMonitorQueue.reduce(function(next, group) {
        return next.then(function() {
            monitorGroupOfLinks(group);
        });
    }, Q());

    return deferred.promise;
}

function execute(db, nodes) {
    var deferred = Q.defer();

    if (nodes && nodes.length > 0) {
        getNodesByName(nodes).then(function(nodes) {
            var nodesIds = [];
            for (var i in nodes) {
                var node = nodes[i];
                nodesIds.push(node._id)
            }

            var query =  { active: true, "nodes.id": { "$all": nodesIds } };
            getLinks(query).then(function(links) {
                startMonitoring(links).then(function() {
                    deferred.resolve(true);
                });
            }).fail(function() {
                deferred.reject();
            });
        });
    } else {
        var query = { active: true };
        getLinks(query).then(function(links) {
            startMonitoring(links).then(function() {
                deferred.resolve(true);
            });
        });
    }
    return deferred.promise;
}

module.exports.execute = execute;
