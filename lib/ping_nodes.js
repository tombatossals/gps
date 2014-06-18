'use strict';

var getNodesByName = require('./common').getNodesByName,
    updateNode = require('./common').updateNode,
    ping = require('net-ping'),
    Q = require('q');

var pingNode = function(node) {
    var df = Q.defer();

    var session = ping.createSession();
    session.pingHost(node.mainip, function(err, target) {
        var alive = true;
        if (err) {
            alive = false;
        }

        node.alive = alive;
        node.save(function(err) {
            df.resolve("Node alive: " + alive);
        });
    });

    return df.promise;
};

function execute(nodes) {
    var deferred = Q.defer();

    getNodesByName(nodes).then(function(nodes) {
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
