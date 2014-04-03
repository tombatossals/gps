'use strict';

var getNodesByName = require('../lib/common').getNodesByName;
var getNodesPublicInfo = require('../lib/common').getNodesPublicInfo;

module.exports = function (app) {

    app.get('/api/node', function (req, res) {

        res.format({
            json: function () {
                getNodesByName().then(function(nodes) {
                    var nodesPublicInfo = getNodesPublicInfo(nodes);
                    res.json(nodesPublicInfo);
                });
            }
        });
    });

};
