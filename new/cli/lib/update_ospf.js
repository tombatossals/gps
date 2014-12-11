'use strict';

var nodeModel = require('../../app/models/node');
var linkModel = require('../../app/models/link');
var mikrotik  = require('../../app/models/mikrotik');
var openwrt   = require('../../app/models/openwrt');
var exec      = require('child_process').exec;
var fs        = require('fs');
var util      = require('util');
var Q         = require('q');

var getLinkInformation = function(neighbor, node) {
    var df = Q.defer();

    linkModel.getLinkByIPs([node.mainip, neighbor.address]).then(function(link) {
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

var getOSPFInfo = function getOSPFInfo(node) {
    var deferred = Q.defer(),
        getNeighborInfo,
        getOSPFInstanceInfo;

    if (node.system === 'mikrotik') {
        getNeighborInfo = mikrotik.getNeighborInfo;
        getOSPFInstanceInfo = mikrotik.getOSPFInstanceInfo;
    } else {
        getNeighborInfo = openwrt.getNeighborInfo;
        getOSPFInstanceInfo = openwrt.getOSPFInstanceInfo;
    }

    getNeighborInfo(node.mainip, node.username, node.password).then(function(neighbors) {
        var promises = [];
        var first = neighbors.shift();

        neighbors.reduce(function(prev, neighbor) {
            return prev.then(getLinkInformation(neighbor, node));
        }, getLinkInformation(first, node));

        Q.all(promises).then(function() {
            getOSPFInstanceInfo(node.mainip, node.username, node.password).then(function(instance) {
                node.ospf = {
                    routerId: instance['router-id'],
                    dijkstras: instance.dijkstras,
                    state: instance.state
                };
                node.save(function(err) {
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

    nodeModel.getNodesByName(nodes).then(function(nodes) {
        if (nodes.length === 0) {
            deferred.reject('No nodes found.');
            return;
        }

        var first = nodes.shift(),
            results = [];

        var promises = nodes.reduce(function(prev, node)  {
            console.log(node.name);
            return prev.then(function(partialResult) {
                results.push({
                    state: 'fulfilled',
                    value: partialResult
                });
                return prev.then(getOSPFInfo(node));
            });
        }, getOSPFInfo(first));

        promises.then(function(result) {
            deferred.resolve(result);
        });
    });

    return deferred.promise.timeout(300000);
};

module.exports.execute = execute;
