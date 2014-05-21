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
        console.log('LoadPlugin snmp');
        console.log('<Plugin snmp>');
        console.log('  <Data "std_traffic">');
        console.log('    Type "if_octets"');
        console.log('    Table true');
        console.log('    Instance "IF-MIB::ifDescr"');
        console.log('    Values "IF-MIB::ifInOctets" "IF-MIB::ifOutOctets"');
        console.log('  </Data>');

        nodes.forEach(function(node) {
            console.log('  <Host "' + node.name + '">');
            console.log('      Address "' + node.mainip + '"');
            console.log('      Version 2');
            console.log('      Interval 60');
            console.log('      Community "public"');
            console.log('      Collect "std_traffic"');
            console.log('  </Host>');
        });

        console.log('</Plugin>');
        deferred.resolve();

    }).fail(function(error) {
        deferred.reject();
    });

    return deferred.promise;
}

module.exports.execute = execute;

