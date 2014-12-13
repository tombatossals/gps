'use strict';

var node = require('../../app/models/node');
var ping = require('net-ping');
var Q = require('q');

var pingNode = function(node) {
    var df = Q.defer();

    var session = ping.createSession();
    session.pingHost(node.mainip, function(err, target) {
        var alive = true;
        if (err) {
            alive = false;
        }

        console.log(node.name, alive);
        node.alive = alive;
        node.save(function(err) {
            df.resolve('Node alive: ' + alive);
        });
    });

    return df.promise;
};

function execute(nodes) {
    var deferred = Q.defer();

    node.getNodesByName(nodes).then(function(nodes) {
        var first = nodes.pop();

        var result = nodes.reduce(function(prev, item) {
            return pingNode(item);
        }, pingNode(first));

        result.then(function(results) {
            deferred.resolve(results);
        });
    }).fail(function(error) {
        deferred.reject(error);
    });

    return deferred.promise;
}

module.exports.execute = execute;
