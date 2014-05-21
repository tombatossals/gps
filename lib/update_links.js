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

var update = function(link, n1, n2, ifaces) {
    var deferred = Q.defer();

    if (link.nodes[0].id === n1._id.toString()) {
        link.nodes[0].iface = ifaces.n1.name;
        link.nodes[0].name  = n1.name;
        link.nodes[1].iface = ifaces.n2.name;
        link.nodes[1].name  = n2.name;
    } else {
        link.nodes[1].iface = ifaces.n1.name;
        link.nodes[1].name  = n1.name;
        link.nodes[0].iface = ifaces.n2.name;
        link.nodes[0].name  = n2.name;
    }
    link.network = ifaces.network.base + '/' + ifaces.network.bitmask;
    link.active = true;
    link.distance = geolib.getDistance({
        latitude: n1.latlng.lat,
        longitude: n1.latlng.lng
    }, {
        latitude: n2.latlng.lat,
        longitude: n2.latlng.lng
    });
    link.save(function() {
        deferred.resolve(util.format('Supernode link updated: %s-%s', n1.name, n2.name));
        return;
    });

    return deferred.promise;
};

var getInterfaceInNetwork = function(node, network) {
    for (var i in node.interfaces) {
        var iface = node.interfaces[i];
        if (iface.address && iface.address.search('172.16') === 0) {
            var address = iface.address.split('/')[0];
            if (network.contains(address)) {
                return iface;
            }
        }
    }
};

var getInterfacesSameNetwork = function(n1, n2) {
    var ifaces = {};

    for (var i in n1.interfaces) {
        var iface = n1.interfaces[i];
        if (iface.address && iface.address.search('172.16') === 0) {
            var network = new Netmask(iface.address);
            var iface2 = getInterfaceInNetwork(n2, network);

            if (iface2) {
                ifaces.network = network;
                ifaces.n1 = iface;
                ifaces.n2 = iface2;
            }
        }
    }

    return ifaces;
};

var updateLink = function(link) {
    var deferred = Q.defer();

    var n1 = link.nodes[0].name;
    var n2 = link.nodes[1].name;

    var query = { name: { '$in': [ n1, n2 ] } };
    Node.find(query, function(err, nodes) {
        var n1 = nodes[0];
        var n2 = nodes[1];

        if (!n1 || !n2) {
            link.remove(function() {
                deferred.reject(util.format('Removed invalid link: %s-%s %s', link.nodes[0].name, link.nodes[1].name, link._id));
            });
            return;
        }

        if (nodes.length !== 2) {
            deferred.reject(util.format('Node not found: %s-%s %s', n1.name, n2.name, link._id));
            return;
        }

        var found = false;
        var ifaces = getInterfacesSameNetwork(n1, n2);

        if (ifaces.network) {
            update(link, n1, n2, ifaces).then(function() {
                deferred.resolve(util.format('Supernode link updated: %s-%s', n1.name, n2.name));
            });
        } else {
            link.remove(function() {
                deferred.reject(util.format('Removed link not found: %s-%s %s', n1.name, n2.name, link._id));
            });
        }
    });

    return deferred.promise;
};

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

function execute(nodes) {
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
