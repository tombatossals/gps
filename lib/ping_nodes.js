'use strict';

var getNodesByName = require('./common').getNodesByName,
    updateNode = require('./common').updateNode,
    ping = require('net-ping'),
    Q = require('q');

var pingNode = function(node) {
    var df = Q.defer();
    console.log(node.name, node.mainip);

    var session = ping.createSession();
    session.pingHost(node.mainip, function(err, target) {
        if (err) {
            console.log(node.name + ' down: ' + err.toString());
            df.reject();
        } else {
            console.log(node.name + ' up.');
            df.resolve();
        }
    });

    return df.promise;
};

function execute(nodes) {
    var deferred = Q.defer();

    getNodesByName(nodes).then(function(nodes) {
        var promises = nodes.filter(function(node) {
            return pingNode(node);
        });

        Q.allSettled(promises).then(function(results) {
            deferred.resolve(results);
        });
    }).fail(function(error) {
        deferred.reject(error);
    });

    return deferred.promise;
}

module.exports.execute = execute;
