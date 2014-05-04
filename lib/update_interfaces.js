'use strict';

var getNodesByName = require('./common').getNodesByName,
    updateNode = require('./common').updateNode,
    Q = require('q');

function execute(db, nodes) {
    var deferred = Q.defer();

    getNodesByName(nodes).then(function(nodes) {
        var promises = [];
        nodes.forEach(function(node) {
            promises.push(updateNode(node));
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
