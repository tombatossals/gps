'use strict';

var util = require('util'),
    path = require('path'),
    fs = require('fs'),
    getConnectedUsers = require('./mikrotik').getConnectedUsers,
    getNodesByName = require('./common').getNodesByName,
    INTERVAL = require('./common').INTERVAL,
    updateNode = require('./common').updateNode,
    confit = require('confit'),
    Q = require('q');

var options = {
    basedir: path.join(__dirname, '/../config')
};

var getPingFileName = function() {
    var df = Q.defer();
    confit(options).create(function(err, config) {
        df.resolve(config.get('collectd').ping);
    });

    return df.promise;
};


function execute(nodes) {
    var deferred = Q.defer();

    getPingFileName().then(function(pingFile) {
        getNodesByName(nodes).then(function(nodes) {
            var stream = fs.createWriteStream(pingFile);
            stream.write('LoadPlugin "ping"');
            stream.write('<Plugin "ping">');

            stream.write('  Interval 1.0');
            stream.write('  Timeout 0.9');
            stream.write('  TTL 255');
            stream.write('  SourceAddress "10.228.130.165"');
            stream.write('  Device "ens4"');
            stream.write('  MaxMissed -1');

            nodes.forEach(function(node) {
                stream.write('  Host "' + node.mainip + '"');
            });

            stream.write('</Plugin>');
            stream.end();
            deferred.resolve();

        }).fail(function(error) {
            deferred.reject();
        });
    });

    return deferred.promise;
}

module.exports.execute = execute;

