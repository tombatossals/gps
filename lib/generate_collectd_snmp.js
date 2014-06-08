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

var getSNMPFileName = function() {
    var df = Q.defer();
    confit(options).create(function(err, config) {
        df.resolve(config.get('collectd').snmp);
    });

    return df.promise;
};

function execute(nodes) {
    var deferred = Q.defer();


    getSNMPFileName().then(function(snmpFile) {
        getNodesByName(nodes).then(function(nodes) {
            var stream = fs.createWriteStream(snmpFile);
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
    });

    return deferred.promise;
}

module.exports.execute = execute;

