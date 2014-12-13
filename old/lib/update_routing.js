'use strict';

var mongoose  = require('mongoose'),
    Link    = require('../models/link'),
    Node = require('../models/node'),
    getNodesByName = require('./common').getNodesByName,
    getLinks = require('./common').getLinks,
    getRoutingTableMikrotik = require('./mikrotik').getRoutingTable,
    getRoutingTableOpenwrt = require('./openwrt').getRoutingTable,
    exec      = require('child_process').exec,
    fs = require('fs'),
    util      = require('util'),
//    sendpush = require('./pushover').sendpush,
    Q = require('q');

var getRoutingInfo = function getRoutingInfo(node) {
    var deferred = Q.defer();

    if (node.system === 'mikrotik') {
        getRoutingTableMikrotik(node.mainip, node.username, node.password).then(function(routing) {
            node.routing = routing;
            node.save(function() {
                deferred.resolve(routing);
            });
        }).fail(function(err) {
            deferred.reject(err);
        });
    } else {
        deferred.resolve();
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
