'use strict';

var node = require('../../app/models/node');
var link = require('../../app/models/link');
var path = require('path');
var fs = require('fs');
var util = require('util');
var Q = require('q');
var INTEVAL = require('../../config/gps').interval;
var snmp = require('../../config/gps').collectd.snmp;

function execute(nodes) {
    var deferred = Q.defer();


    node.getNodesByName(nodes).then(function(nodes) {
        var stream = fs.createWriteStream(snmp);
        stream.write('LoadPlugin snmp\n');
        stream.write('<Plugin snmp>\n');
        stream.write('  <Data "std_traffic">\n');
        stream.write('    Type "if_octets"\n');
        stream.write('    Table true\n');
        stream.write('    Instance "IF-MIB::ifDescr"\n');
        stream.write('    Values "IF-MIB::ifInOctets" "IF-MIB::ifOutOctets"\n');
        stream.write('  </Data>\n');

        nodes.forEach(function(node) {
            stream.write('  <Host "' + node.name + '">\n');
            stream.write('      Address "' + node.mainip + '"\n');
            stream.write('      Version 2\n');
            stream.write('      Interval 60\n');
            stream.write('      Community "public"\n');
            stream.write('      Collect "std_traffic"\n');
            stream.write('  </Host>\n');
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
