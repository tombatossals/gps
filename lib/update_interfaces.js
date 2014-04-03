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

        Q.all(promises).then(function() {
            deferred.resolve(true);
        });
    }).fail(function(error) {
        deferred.reject().done();
    });

    return deferred.promise;
}

module.exports.execute = execute;
