'use strict';

var getLinks = require('../../../lib/common').getLinks,
    getNodesByName = require('../../../lib/common').getNodesByName,
    getNodesPublicInfo = require('../../../lib/common').getNodesPublicInfo,
    getLinkByIPs = require('../../../lib/common').getLinkByIPs,
    mikrotikTraceroute = require('../../../lib/mikrotik').traceroute,
    openwrtTraceroute = require('../../../lib/openwrt').traceroute,
    Q = require('q');


module.exports = function (router) {

    router.get('/:n1/:n2', function(req, res) {
        var n1 = req.params.n1;
        var n2 = req.params.n2;
        getNodesByName([ n1, n2 ]).then(function(nodes) {

            var n1 = nodes[0];
            var n2 = nodes[1];

            if (!n1 || !n2) {
                res.send(404);
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
                    res.send(404);
                    return;
                }
                var eips = [],
                    i;
                eips.push([ n1.mainip, path[0] ]);
                for (i = 0; i < path.length-1; i++) {
                    eips.push([path[i], path[i + 1]]);
                }
                var enlaces = [];
                var promises = [];
                for (i in eips) {
                    var ippair = eips[i];
                    promises.push(getLinkByIPs(ippair));
                }
                Q.all(promises).then(function(enlaces) {
                    res.send(enlaces);
                });
            });
        }).fail(function(err) {
            console.log(err);
            res.send(500, err.stack);
        });
    });
};
