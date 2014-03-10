#!/usr/bin/env node

var logger = require("./log"),
    Netmask   = require('netmask').Netmask,
    mongoose = require('mongoose'),
    getNodesByName = require('./common').getNodesByName,
    getLinks = require('./common').getLinks,
    nconf = require("nconf"),
    Link    = require("../models/link"),
    Node = require("../models/node"),
    util      = require("util"),
    Q = require("q");

function updateLink(link) {
    var deferred = Q.defer();

    var s1 = link.nodes[0].id;
    var s2 = link.nodes[1].id;

    Node.find({ _id: { $in: [ s1, s2 ] } }, function(err, nodes) {

        var s1 = nodes[0];
        var s2 = nodes[1];

        if (!s1 || !s2) {
            link.remove(function() {
                logger.error(util.format("Removed invalid link: %s-%s %s", link.nodes[0].name, links.nodes[1].name, link._id));
                deferred.reject();
            });
            return;
        }

        if (nodes.length !== 2) {
            logger.error(util.format("Node not found: %s-%s %s", s1.name, s2.name, link._id));
            deferred.reject();
        };

        var found = false;

        for (var i=0; i<s1.interfaces.length; i++) {
            var iface = s1.interfaces[i];
            if (iface.address.search("172.16") === 0) {
                var network = new Netmask(iface.address);
                for (var j=0; j<s2.interfaces.length; j++) {
                    var iface2 = s2.interfaces[j];
                    if (iface2.address.search("172.16") === 0) {
                        var address = iface2.address.split("/")[0];
                        if (network.contains(address)) {
                            found = true;
                            if (link.nodes[0].id == s1._id.toString()) {
                                link.nodes[0].iface = iface.name;
                                link.nodes[0].name  = s1.name;
                                link.nodes[1].iface = iface2.name;
                                link.nodes[1].name  = s2.name;
                            } else {
                                link.nodes[1].iface = iface.name;
                                link.nodes[1].name  = s1.name;
                                link.nodes[0].iface = iface2.name;
                                link.nodes[0].name  = s2.name;
                            }
                            link.network = network.base + "/" + network.bitmask;
                            link.active = true;
                            link.save(function(err) {
                                if (err) {
                                    console.log(err, s1.name, s2.name);
                                    logger.error(util.format("Link not updated: %s-%s", s1.name, s2.name));
                                } else {
                                    logger.info(util.format("Supernode link updated: %s-%s", s1.name, s2.name));
                                }
                                deferred.resolve();
                            });
                        }
                    }
                }
            }
        }

        if (!found) {
            link.remove(function() {
                logger.error(util.format("Removed link not found: %s-%s %s", s1.name, s2.name, link._id));
                deferred.reject();
            });
        }
    });

    return deferred.promise;
}

function updateNewLinks() {
    var deferred = Q.defer();

    var query =  { "nodes.iface": { "$exists": false } };
    Link.find(query, function(error, links) {
        if (error) {
            console.log(error);
            deferred.reject();
            return;
        }
        var promises = [];
        links.forEach(function(link) {
            promises.push(function() {
                var deferred = Q.defer();
                updateLink(link).then(function() {
                    deferred.resolve();
                });
                return deferred.promise;
            }());
        });
        Q.all(promises).then(function() {
            deferred.resolve();
        });
    });

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

            var query =  { "nodes.id": { "$all": nodesIds } };
            getLinks(query).then(function(links) {
                links.forEach(function(link) {
                    updateLink(link).then(function() {
                        deferred.resolve(true);
                    });
                });
            }).fail(function() {
                deferred.reject();
            });
        });
    } else {
        updateNewLinks().then(function() {
            getLinks().then(function(links) {
                links.forEach(function(link) {
                    updateLink(link).then(function() {
                        deferred.resolve(true);
                    });
                });
            });
        }).fail(function() {
            deferred.reject();
        });
    }
    return deferred.promise;
}

module.exports.execute = execute;
