'use strict';

var util = require('util'),
    getConnectedUsers = require('./mikrotik').getConnectedUsers,
    getNodesByName = require('./common').getNodesByName,
    INTERVAL = require('./common').INTERVAL,
    updateNode = require('./common').updateNode,
    Q = require('q');

function execute(nodes) {
    var deferred = Q.defer();

    getNodesByName(nodes).then(function(nodes) {
        console.log('LoadPlugin "ping"');
        console.log('<Plugin "ping">');

        console.log('  Interval 1.0');
        console.log('  Timeout 0.9');
        console.log('  TTL 255');
        console.log('  SourceAddress "10.228.130.165"');
        console.log('  Device "ens4"');
        console.log('  MaxMissed -1');

        nodes.forEach(function(node) {
            console.log('  Host "' + node.mainip + '"');
        });

        console.log('</Plugin>');
        deferred.resolve();

    }).fail(function(error) {
        deferred.reject();
    });

    return deferred.promise;
}

module.exports.execute = execute;

