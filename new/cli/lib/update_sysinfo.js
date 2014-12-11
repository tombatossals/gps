'use strict';

var nodeModel = require('../../app/models/node');
var mikrotik  = require('../../app/models/mikrotik');
var openwrt   = require('../../app/models/openwrt');
var exec      = require('child_process').exec;
var fs        = require('fs');
var util      = require('util');
var Q         = require('q');

var getRoutingInfo = function getRoutingInfo(node) {
    var deferred = Q.defer();

    if (node.system === 'mikrotik') {
        mikrotik.getRouterboardInfo(node.mainip, node.username, node.password).then(function(routerboard) {
            mikrotik.getResourceInfo(node.mainip, node.username, node.password).then(function(resource) {
                node.sysinfo = {
                    version: resource.version,
                    uptime: resource.uptime,
                    model: resource['board-name'],
                    firmware: routerboard['current-firmware']
                };

                node.save(function() {
                    deferred.resolve('Successfully saved node information on ' + node.name);
                });
            });

        }).fail(function(err) {
            deferred.reject(err);
        });
    } else {
        openwrt.getOpenWRTSystemInfo(node.mainip, node.username, node.password).then(function(sysinfo) {
            node.sysinfo = {
                version: sysinfo.version,
                uptime: sysinfo.uptime,
                model: sysinfo['board-name'],
                firmware: sysinfo['current-firmware']
            };

            node.save(function() {
                deferred.resolve('Successfully saved node information on ' + node.name);
            });
        }).fail(function(err) {
            deferred.reject(err);
        });
    }

    return deferred.promise;
};

var execute = function execute(nodes) {
    var deferred = Q.defer();

    nodeModel.getNodesByName(nodes).then(function(nodes) {
        var promises = [];
        nodes.forEach(function(node) {
            promises.push(getRoutingInfo(node));
        });

        Q.allSettled(promises).then(function(results) {
            deferred.resolve(results);
        });
    }).fail(function(error) {
        deferred.reject(error);
    });

    return deferred.promise;
};

module.exports.execute = execute;
