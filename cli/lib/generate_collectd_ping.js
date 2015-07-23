'use strict';

var node = require('../../app/models/node');
var link = require('../../app/models/link');
var path = require('path');
var fs = require('fs');
var util = require('util');
var Q = require('q');
var INTEVAL = require('../../config/gps').interval;
var ping = require('../../config/gps').collectd.ping;

function execute(nodes) {
    var deferred = Q.defer();

    node.getNodesByName(nodes).then(function(nodes) {
        var stream = fs.createWriteStream(ping);
        stream.write('LoadPlugin "ping"\n');
        stream.write('<Plugin "ping">\n');

        stream.write('  Interval 1.0\n');
        stream.write('  Timeout 0.9\n');
        stream.write('  TTL 255\n');
        stream.write('  SourceAddress "10.228.130.165"\n');
        stream.write('  Device "ens8"\n');
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

    return deferred.promise;
}

module.exports.execute = execute;
