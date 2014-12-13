'use strict';

var mongoose  = require('mongoose'),
    Link    = require('../models/link'),
    Node = require('../models/node'),
    getNodesByName = require('./common').getNodesByName,
    getLinks = require('./common').getLinks,
    getRouterboardInfo = require('./mikrotik').getRouterboardInfo,
    getResourceInfo = require('./mikrotik').getResourceInfo,
    getOpenWRTSystemInfo = require('./openwrt').getOpenWRTSystemInfo,
    exec      = require('child_process').exec,
    fs = require('fs'),
    util      = require('util'),
//    sendpush = require('./pushover').sendpush,
    Q = require('q');

var getRoutingInfo = function getRoutingInfo(node) {
    var deferred = Q.defer();

    if (node.system === 'mikrotik') {
        getRouterboardInfo(node.mainip, node.username, node.password).then(function(routerboard) {
            getResourceInfo(node.mainip, node.username, node.password).then(function(resource) {
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
        getOpenWRTSystemInfo(node.mainip, node.username, node.password).then(function(sysinfo) {
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

    getNodesByName(nodes).then(function(nodes) {
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
