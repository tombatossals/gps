'use strict';

var util      = require('util'),
    getConnectedUsers = require('./mikrotik').getConnectedUsers,
    getNodesByName = require('./common').getNodesByName,
    INTERVAL = require('./common').INTERVAL,
    updateNode = require('./common').updateNode,
    Q = require('q');


function monitorOmnitikUsers(node) {
    var deferred = Q.defer();
    getConnectedUsers(node).then(function(users) {
        if (users && users.hasOwnProperty('good')) {
            console.log(util.format('PUTVAL "%s/node/connected_users" interval=%s N:%s:%s', node.name, INTERVAL, users.good, users.bad));
            deferred.resolve(util.format('PUTVAL "%s/node/connected_users" interval=%s N:%s:%s', node.name, INTERVAL, users.good, users.bad));
        } else {
            deferred.resolve(util.format('Can\'t read wireless connected users on %s', node.name));
        }
    }).fail(function(error) {
        deferred.reject(util.format('Can\'t read wireless connected users on %s', node.name));
    });

    return deferred.promise;
}

function execute(db, nodes) {
    var deferred = Q.defer();
    getNodesByName(nodes).then(function(nodes) {
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
