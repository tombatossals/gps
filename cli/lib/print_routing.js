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
        mikrotik.getRoutingTable(node, true).then(function(routing) {
            node.routing = routing;
            node.save(function() {
                deferred.resolve();
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
