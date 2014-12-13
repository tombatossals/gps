'use strict';

var nodeModel = require('../../app/models/node');
var Q = require('q');

function execute(nodes) {
    var deferred = Q.defer();

    nodeModel.getNodesByName(nodes).then(function(nodes) {
        var promises = [];
        nodes.forEach(function(node) {
            promises.push(nodeModel.updateNode(node));
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
