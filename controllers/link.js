'use strict';

var getLinks = require('../lib/common').getLinks,
    getNodesByName = require('../lib/common').getNodesByName,
    getNodesPublicInfo = require('../lib/common').getNodesPublicInfo;


module.exports = function (app) {

    app.get('/api/link', function (req, res) {

        res.format({
            json: function () {
                getLinks().then(function(links) {
                    res.json(links);
                });
            }
        });
    });

    app.get('/api/link/:n1/:n2/nodes', function (req, res) {
        var n1 = req.params.n1,
            n2 = req.params.n2;

        getNodesByName([n1, n2]).then(function(nodes) {
            res.send(getNodesPublicInfo(nodes));
        });
    });
};
