'use strict';

var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var node = require('../models/node');
var link = require('../models/link');

module.exports = function (app) {
    app.use('/api/link', router);

    router.get('/', function (req, res) {

        res.format({
            json: function () {
                link.getLinks().then(function(links) {
                    res.json(links);
                }).fail(function(err) {
                    res.send(500, { error: err });
                });
            }
        });
    });

    router.get('/:n1/:n2/nodes', function (req, res) {
        var n1 = req.params.n1,
            n2 = req.params.n2;

        node.getNodesByName([n1, n2]).then(function(nodes) {
            res.send(node.getNodesPublicInfo(nodes));
        });
    });
};
