'use strict';

var getLinks = require('../lib/common').getLinks;


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

};
