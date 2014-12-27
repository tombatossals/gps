'use strict';

var nodeModel = require('../../app/models/node');
var linkModel = require('../../app/models/link')
var Q = require('q');
var Netmask = require('netmask').Netmask;
var util      = require('util');
var sshConn   = require('ssh2');
var mikrotik  = require('../../app/models/mikrotik');
var openwrt   = require('../../app/models/openwrt');
var badLinks = [];

var bandwidthTest = function(linkId) {
    var deferred = Q.defer();

    linkModel.getLinksById([linkId]).then(function(links) {
        var link = links[0];
        var n1 = link.nodes[0].name;
        var n2 = link.nodes[1].name;
        nodeModel.getNodesByName([ n1, n2 ]).then(function(nodes) {
            var n1 = nodes[0];
            var n2 = nodes[1];
            var bandwidthTest = mikrotik.bandwidthTest;

            if (n2.system === 'openwrt') {
                n1 = nodes[1];
                n2 = nodes[0];
                bandwidth = openwrt.bandwidthTest;
            }

            bandwidthTest(link, n1, n2).then(function(result) {
                deferred.resolve(result);
            }).fail(function(result) {
                badLinks.push(link);
                deferred.reject(result);
            });
        });
    });
    return deferred.promise;
};

var monitorGroupOfLinks = function(group, results) {
    if (!results) {
        results = [];
    }
    var deferred = Q.defer();
    var promises = [];
    group.forEach(function(linkId) {
        promises.push(bandwidthTest(linkId));
    });

    Q.allSettled(promises).then(function(results) {
        deferred.resolve(results);
    });
    return deferred.promise;
};

var startMonitoring = function(links) {
    var deferred = Q.defer(),
        nodesMonitorQueue = [[]],
        linksMonitorQueue = [[]];

    for (var i in links) {
        var link = links[i],
            found = false,
            n1 = link.nodes[0].id,
            n2 = link.nodes[1].id;

        for (var index in nodesMonitorQueue) {
            var iteration = nodesMonitorQueue[index];
            if (iteration.indexOf(n1) === -1 && iteration.indexOf(n2) === -1) {
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

    var globalResults = [];
    var processGroups = linksMonitorQueue.reduce(function(previous, group) {
        return previous.then(function(results) {
            globalResults = globalResults.concat(results);
            return monitorGroupOfLinks(group, results);
        });
    }, Q([]));

    processGroups.then(function(results) {
        globalResults = globalResults.concat(results);
        deferred.resolve(globalResults);
    });

    return deferred.promise;
};

var execute = function(nodes) {
    var deferred = Q.defer();

    if (nodes && nodes.length > 0) {
        nodeModel.getNodesByName(nodes).then(function(nodes) {
            var nodesIds = [];
            for (var i in nodes) {
                var node = nodes[i];
                nodesIds.push(node._id);
            }

            var query =  { active: true, 'nodes.id': { '$all': nodesIds } };
            linkModel.getLinks(query).then(function(links) {
                startMonitoring(links).then(function(result) {
                    startMonitoring(badLinks).then(function(result) {
                        deferred.resolve(result.concat(result));
                    });
                });
            }).fail(function(error) {
                deferred.resolve([{
                    state: 'rejected',
                    reason: error
                }]);
            });
        });
    } else {
        var query = { active: true };
        linkModel.getLinks(query).then(function(links) {
            startMonitoring(links).then(function(result) {
                startMonitoring(badLinks).then(function(result2) {
                    deferred.resolve(result.concat(result2));
                });
            });
        }).fail(function(error) {
            deferred.resolve([{
                state: 'rejected',
                reason: error
            }]);
        });
    }

    return deferred.promise;
};

module.exports.execute = execute;
