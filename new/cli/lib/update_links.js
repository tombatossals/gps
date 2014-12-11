'use strict';

var nodeModel = require('../../app/models/node');
var linkModel = require('../../app/models/link')
var Q = require('q');
var Netmask = require('netmask').Netmask;
var geolib = require('geolib');
var util      = require('util');

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
        if (iface && iface.address && (iface.address.search('172.16') === 0 || iface.address.search('10.') === 0)) {
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
        if (iface && iface.address && (iface.address.search('172.16') === 0 || iface.address.search('10.') === 0)) {
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


function execute(nodes) {
    var deferred = Q.defer();
    if (nodes && nodes.length === 1) {
        var nodeName = nodes[0];
        linkModel.getLinksByNodeName(nodeName).then(function(links) {
            var promises = [];
            links.forEach(function(link) {
                promises.push(updateLink(link));
            });
            Q.allSettled(promises).then(function(results) {
                deferred.resolve(results);
            });
        });
    } else if (nodes && nodes.length === 2) {
        node.getNodesByName(nodes).then(function(nodes) {
            linkModel.getLinkByNodes(nodes).then(function(link) {
                linkModel.updateLink(link).then(function(msg) {
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
        linkModel.updateNewLinks().then(function() {
            linkModel.getLinks().then(function(links) {
                var promises = [];
                links.forEach(function(link) {
                    promises.push(linkModel.updateLink(link));
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
