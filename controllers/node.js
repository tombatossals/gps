'use strict';


var getNodesPublicInfoByName = require('../lib/common').getNodesPublicInfoByName;

module.exports = function (app) {

    app.get('/api/node', function (req, res) {

        res.format({
            json: function () {
                getNodesPublicInfoByName().then(function(nodes) {
                    res.json(nodes);
                });
            },
            html: function () {
                res.render('node', model);
            }
        });
    });

};
