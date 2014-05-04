'use strict';

var Netmask   = require('netmask').Netmask,
    mongoose = require('mongoose'),
    getNodesByName = require('./common').getNodesByName,
    getLinks = require('./common').getLinks,
    getLinkByNodes = require('./common').getLinkByNodes,
    getLinksByNodeName = require('./common').getLinksByNodeName,
    nconf = require('nconf'),
    geolib = require('geolib'),
    Link    = require('../models/link'),
    Node = require('../models/node'),
    util      = require('util'),
    Q = require('q');

function updateLink(link) {
    var deferred = Q.defer();

    var s1 = link.nodes[0].id;
    var s2 = link.nodes[1].id;

    var query = { _id: { $in: [ s1, s2 ] } };
    Node.find(query, function(err, nodes) {
        var s1 = nodes[0];
        var s2 = nodes[1];

        if (!s1 || !s2) {
            link.remove(function() {
                deferred.reject(util.format('Removed invalid link: %s-%s %s', link.nodes[0].name, link.nodes[1].name, link._id));
            });
            return;
        }

        if (nodes.length !== 2) {
            deferred.reject(util.format('Node not found: %s-%s %s', s1.name, s2.name, link._id));
            return;
        }

        var found = false;

        for (var i=0; i<s1.interfaces.length; i++) {
            var iface = s1.interfaces[i];
            if (iface.address.search('172.16') === 0) {
                var network = new Netmask(iface.address);
                for (var j=0; j<s2.interfaces.length; j++) {
                    var iface2 = s2.interfaces[j];
                    if (iface2.address.search('172.16') === 0) {
                        var address = iface2.address.split('/')[0];
                        if (network.contains(address)) {
                            found = true;
                            if (link.nodes[0].id === s1._id.toString()) {
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
                            link.network = network.base + '/' + network.bitmask;
                            link.active = true;
                            link.distance = geolib.getDistance({
                                latitude: s1.latlng.lat,
                                longitude: s1.latlng.lng
                            }, {
                                latitude: s2.latlng.lat,
                                longitude: s2.latlng.lng
                            });
                            link.save(function() {
                                deferred.resolve(util.format('Supernode link updated: %s-%s', s1.name, s2.name));
                                return;
                            });
                        }
                    }
                }
            }
        }

        if (!found) {
            link.remove(function() {
                deferred.reject(util.format('Removed link not found: %s-%s %s', s1.name, s2.name, link._id));
                return;
            });
        }
    });

    return deferred.promise;
}

function updateNewLinks() {
    var deferred = Q.defer();

    var query =  { 'nodes.iface': { '$exists': false } };
    Link.find(query, function(error, links) {
        if (error) {
            deferred.reject(error);
            return;
        }
        var promises = [];
        links.forEach(function(link) {
            promises.push(updateLink(link));
        });
        Q.allSettled(promises).then(function(result) {
            deferred.resolve(result);
        });
    });

    return deferred.promise;
}

function execute(db, nodes) {
    var deferred = Q.defer();

    if (nodes && nodes.length === 1) {
        var nodeName = nodes[0];
        getLinksByNodeName(nodeName).then(function(links) {
            var promises = [];
            links.forEach(function(link) {
                promises.push(updateLink(link));
            });
            Q.allSettled(promises).then(function(results) {
                deferred.resolve(results);
            });
        });
    } else if (nodes && nodes.length === 2) {
        getNodesByName(nodes).then(function(nodes) {
            getLinkByNodes(nodes).then(function(link) {
                updateLink(link).then(function(msg) {
                    deferred.resolve([{
                        state: 'fullfiled',
                        value: msg
                    }]);
                });
            }).fail(function(error) {
                deferred.reject(error);
            });
        });
    } else {
        updateNewLinks().then(function() {
            getLinks().then(function(links) {
                var promises = [];
                links.forEach(function(link) {
                    promises.push(updateLink(link));
                });
                Q.allSettled(promises).then(function(results) {
                    deferred.resolve(results);
                });
            });
        });
    }
    return deferred.promise;
}

module.exports.execute = execute;
