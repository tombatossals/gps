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
            stream.write('LoadPlugin "ping"\n');
            stream.write('<Plugin "ping">\n');

            stream.write('  Interval 1.0\n');
            stream.write('  Timeout 0.9\n');
            stream.write('  TTL 255\n');
            stream.write('  SourceAddress "10.228.130.165"\n');
            stream.write('  Device "ens4"\n');
            stream.write('  MaxMissed -1\n');

            nodes.forEach(function(node) {
                stream.write('  Host "' + node.mainip + '"\n');
            });

            stream.write('</Plugin>\n');
            stream.end();
            deferred.resolve();

        }).fail(function(error) {
            deferred.reject();
        });
    });

    return deferred.promise;
}

module.exports.execute = execute;

