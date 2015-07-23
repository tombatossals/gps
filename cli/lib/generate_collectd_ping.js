'use strict';

var node = require('../../app/models/node');
var link = require('../../app/models/link');
var path = require('path');
var fs = require('fs');
var util = require('util');
var Q = require('q');
var ping = require('../../config/gps').collectd.ping;
var ping_device = require('../../config/gps').collectd.ping_device;
var ping_srcaddress = require('../../config/gps').collectd.ping_srcaddress;


function execute(nodes) {
    var deferred = Q.defer();

    node.getNodesByName(nodes).then(function(nodes) {
        var stream = fs.createWriteStream(ping);
        stream.write('LoadPlugin "ping"\n');
        stream.write('<Plugin "ping">\n');
        stream.write('  SourceAddress "' + ping_srcaddress + '"\n');
        stream.write('  Device "' + ping_device + '"\n');

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
