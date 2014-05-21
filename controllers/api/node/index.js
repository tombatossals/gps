'use strict';

var getNodesByName = require('../../../lib/common').getNodesByName;
var getLinksByNodeName = require('../../../lib/common').getLinksByNodeName;
var getNodesByPartialName = require('../../../lib/common').getNodesByPartialName;
var getNodesPublicInfo = require('../../../lib/common').getNodesPublicInfo;

module.exports = function (router) {

    router.get('/', function (req, res) {
        res.format({
            json: function () {
                getNodesByName().then(function(nodes) {
                    var nodesPublicInfo = getNodesPublicInfo(nodes);
                    res.json(nodesPublicInfo);
                });
            }
        });
    });

    router.get('/:nodeName/neighbors', function(req, res) {
        var nodeName = req.params.nodeName;
        getLinksByNodeName(nodeName).then(function(links) {
            var neighbors = [];
            for (var i in links) {
                var link = links[i];
                neighbors.push(link.nodes[0].name === nodeName ? link.nodes[1].name : link.nodes[0].name);
            }
            res.send(neighbors);
        });
    });

    router.get('/search', function(req, res) {
        var q = req.query.q;
        getNodesByPartialName(q).then(function(nodes) {
            var names = [];
            for (var i in nodes) {
                names.push({ id: nodes[i].name, text: nodes[i].name });
            }
            return res.json(names);
        });
    });

};
