'use strict';

var Q = require('q');
var util      = require('util');
var nodeModel = require('../../app/models/node');
var linkModel = require('../../app/models/link')
var mikrotik  = require('../../app/models/mikrotik');
var INTERVAL = require('../../config/gps').interval;

function monitorOmnitikUsers(node) {
    var deferred = Q.defer();
    mikrotik.getConnectedUsers(node).then(function(users) {
        if (users && users.hasOwnProperty('good')) {
            if (users && users.good && users.bad && !isNaN(users.good + users.bad)) {
                node.connectedUsers = users.good + users.bad;
            }
            node.save(function() {
                console.log(util.format('PUTVAL "%s/node/connected_users" interval=%s N:%s:%s', node.name, INTERVAL, users.good, users.bad));
                deferred.resolve(util.format('PUTVAL "%s/node/connected_users" interval=%s N:%s:%s', node.name, INTERVAL, users.good, users.bad));
            });
        } else {
            deferred.resolve(util.format('Can\'t read wireless connected users on %s', node.name));
        }
    }).fail(function(error) {
        deferred.reject(util.format('Can\'t read wireless connected users on %s', node.name));
    });

    return deferred.promise;
}

function execute(nodes) {
    var deferred = Q.defer();
    nodeModel.getNodesByName(nodes).then(function(nodes) {
        var promises = [];
        nodes.forEach(function(node) {
            if (node.omnitik === true) {
                promises.push(monitorOmnitikUsers(node));
            }
        });

        Q.allSettled(promises).then(function(results) {
            deferred.resolve(results);
        });
    }).fail(function(error) {
        deferred.reject().done();
    });

    return deferred.promise;
}

module.exports.execute = execute;
