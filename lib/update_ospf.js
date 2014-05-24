'use strict';

var mongoose  = require('mongoose'),
    Link    = require('../models/link'),
    Node = require('../models/node'),
    getNodesByName = require('./common').getNodesByName,
    getLinks = require('./common').getLinks,
    getNeighborInfoMikrotik = require('./mikrotik').getNeighborInfo,
    getNeighborInfoOpenWRT = require('./openwrt').getNeighborInfo,
    getOSPFInstanceInfoMikrotik = require('./mikrotik').getOSPFInstanceInfo,
    getOSPFInstanceInfoOpenWRT = require('./openwrt').getOSPFInstanceInfo,
    getLinkByIPs = require('./common').getLinkByIPs,
    exec      = require('child_process').exec,
    fs = require('fs'),
    util      = require('util'),
//    sendpush = require('./pushover').sendpush,
    Q = require('q');

var getOSPFInfo = function getOSPFInfo(node) {
    var deferred = Q.defer(),
        getNeighborInfo,
        getOSPFInstanceInfo;

    if (node.system === 'mikrotik') {
        getNeighborInfo = getNeighborInfoMikrotik;
        getOSPFInstanceInfo = getOSPFInstanceInfoMikrotik;
    } else {
        getNeighborInfo = getNeighborInfoOpenWRT;
        getOSPFInstanceInfo = getOSPFInstanceInfoOpenWRT;
    }

    var getLinkInformation = function(neighbor) {
        var df = Q.defer();

        (function() {
            var n = neighbor;
            getLinkByIPs([node.mainip, neighbor.address]).then(function(link) {
                var nodes = link.nodes;
                var pos = link.nodes[0].name === node.name ? 0:1;
                nodes[pos].ospf = {
                    adjacency: n.adjacency,
                    state: n.state,
                    stateChanges: n['state-changes']
                };
                link.nodes = nodes;
                link.save(function() {
                    df.resolve();
                });
            });
            return df.promise;
        }());
    };

    getNeighborInfo(node.mainip, node.username, node.password).then(function(neighbors) {
        var promises = [];
        for (var i in neighbors) {
            var neighbor = neighbors[i];
            promises.push(getLinkInformation(neighbor));
        }

        Q.all(promises).then(function() {
            getOSPFInstanceInfo(node.mainip, node.username, node.password).then(function(instance) {
                node.ospf = {
                    routerId: instance['router-id'],
                    dijkstras: instance.dijkstras,
                    state: instance.state
                };
                node.save(function() {
                    deferred.resolve('Successfully saved node ospf information on ' + node.name);
                });
            });
        });
    }).fail(function(err) {
        deferred.reject(err);
    });

    return deferred.promise;
};

var execute = function execute(nodes) {
    var deferred = Q.defer();

    getNodesByName(nodes).then(function(nodes) {
        if (nodes.length === 0) {
            deferred.reject("No nodes found.");
            return;
        }

        var first = nodes[0],
            nextnodes = nodes.splice(1),
            results = [];

        var promises = nextnodes.reduce(function(prev, node)  {
            return prev.then(function(partialResult) {
                results.push({
                    state: 'fulfilled',
                    value: partialResult
                });
                return getOSPFInfo(node);
            });
        }, getOSPFInfo(first));

        promises.then(function(partialResult) {
            results.push({
                state: 'fulfilled',
                value: partialResult
            });
            deferred.resolve(results);
        });
    }).fail(function(error) {
        deferred.reject(error);
    });

    return deferred.promise;
};

module.exports.execute = execute;
