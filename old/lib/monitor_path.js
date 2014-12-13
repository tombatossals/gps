'use strict';

var Netmask   = require('netmask').Netmask,
    util      = require('util'),
    getNodesByName = require('./common').getNodesByName,
    getNodesById = require('./common').getNodesById,
    getLinkByIPs = require('../lib/common').getLinkByIPs,
    getLinksById = require('./common').getLinksById,
    mikrotikTraceroute = require('./mikrotik').traceroute,
    openwrtTraceroute = require('./openwrt').traceroute,
    getLinks = require('./common').getLinks,
    bandwidthTestMikrotik = require('./mikrotik').bandwidthTest,
    bandwidthTestOpenwrt = require('./openwrt').bandwidthTest,
    sshConn   = require('ssh2'),
    Q         = require('q'),
    badLinks = [];

function execute(nodeNames) {
    var deferred = Q.defer();

    getNodesByName(nodeNames).then(function(nodes) {

        var n1 = nodes[0];
        var n2 = nodes[1];

        if (!n1 || !n2) {
            deferred.resolve([{
                state: 'rejected',
                reason: util.format('Nodes not found: %s, %s', nodeNames[0], nodeNames[1])
            }]);
            return;
        }

        var traceroute;
        if (n1.system === 'mikrotik') {
            traceroute = mikrotikTraceroute;
        } else {
            traceroute = openwrtTraceroute;
        }

        traceroute(n1.mainip, n1.username, n1.password, n2.mainip).then(function(path) {
            if (path.length === 0) {
                deferred.resolve([{
                    state: 'rejected',
                    reason: util.format('Path not found: %s, %s', n1.name, n2.name)
                }]);
                return;
            }

            var eips = [],
                i;
            eips.push([ n1.mainip, path[0] ]);
            for (i = 0; i < path.length - 1; i++) {
                eips.push([path[i], path[i + 1]]);
            }

            var enlaces = [];
            var promises = [];
            for (i in eips) {
                var ippair = eips[i];
                promises.push(getLinkByIPs(ippair));
            }

            Q.all(promises).then(function(enlaces) {
                var hop = 1;
                for (var i in enlaces) {
                    var enlace = enlaces[i];
                    console.log(util.format('Hop %s: %s to %s', hop, enlace.nodes[0].name, enlace.nodes[1].name));
                    hop++;
                }
                deferred.resolve([{
                    state: 'fullfiled',
                    value: util.format('Sucessfully found path from %s to %s', n1.name, n2.name)
                }]);
            });
        });
    }).fail(function(err) {
        deferred.resolve([{
            state: 'rejected',
            reason: err
        }]);
    });

    return deferred.promise;
}

module.exports.execute = execute;
