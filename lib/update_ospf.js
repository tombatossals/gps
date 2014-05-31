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
    resetOSPFState = require('./common').resetOSPFState,
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

        getLinkByIPs([node.mainip, neighbor.address]).then(function(link) {
            var nodes = link.nodes;
            var pos = link.nodes[0].name === node.name ? 0:1;
            nodes[pos].ospf = {
                adjacency: neighbor.adjacency,
                state: neighbor.state,
                stateChanges: neighbor['state-changes']
            };
            link.nodes = nodes;
            link.save(function() {
                df.resolve();
            });
        }).fail(function(err) {
            df.reject(err);
        });
        return df.promise;
    };

    getNeighborInfo(node.mainip, node.username, node.password).then(function(neighbors) {
        var promises = [];
        var first = neighbors.shift();

        neighbors.reduce(function(prev, neighbor) {
            return prev.then(getLinkInformation(neighbor));
        }, getLinkInformation(first));

        Q.all(promises).then(function() {
            getOSPFInstanceInfo(node.mainip, node.username, node.password).then(function(instance) {
                node.ospf = {
                    routerId: instance['router-id'],
                    dijkstras: instance.dijkstras,
                    state: instance.state
                };
console.log("done", node.name);
                node.save(function() {
                    deferred.resolve('Successfully saved node ospf information on ' + node.name);
                });
            }).fail(function(err) {
                deferred.reject(err);
            });
        }).fail(function(err) {
            deferred.reject(err);
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
            deferred.reject('No nodes found.');
            return;
        }

        var first = nodes.shift(),
            results = [];

        var promises = nodes.reduce(function(prev, node)  {
            return prev.then(function(partialResult) {
console.log(node.name);
                results.push({
                    state: 'fulfilled',
                    value: partialResult
                });
                return prev.then(getOSPFInfo(node));
            });
        }, getOSPFInfo(first));

    });

    return deferred.promise.timeout(300000);
};

module.exports.execute = execute;
