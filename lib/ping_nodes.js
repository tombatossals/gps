'use strict';

var getNodesByName = require('./common').getNodesByName,
    updateNode = require('./common').updateNode,
    ping = require('node-ping'),
    Q = require('q');

function execute(nodes) {
    var deferred = Q.defer();

    getNodesByName(nodes).then(function(nodes) {
        var promises = [];
        nodes.forEach(function(node) {
            promises.push(ping.sys.promise_probe(node.mainip));
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
