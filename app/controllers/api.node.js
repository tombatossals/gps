'use strict';

var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var node = require('../models/node');
var link = require('../models/link');

module.exports = function (app) {
    app.use('/api/node', router);

    router.get('/', function (req, res) {
        res.format({
            json: function () {
                node.getNodesByName().then(function(nodes) {
                    var nodesPublicInfo = node.getNodesPublicInfo(nodes);
                    res.json(nodesPublicInfo);
                });
            }
        });
    });

    router.get('/:nodeName', function (req, res) {
        var nodeName = req.params.nodeName;
        node.getNodesByName([nodeName]).then(function(nodes) {
            var nodesPublicInfo = node.getNodesPublicInfo(nodes);
            res.json(nodesPublicInfo[nodeName]);
        });
    });

    router.get('/:nodeName/links', function(req, res) {
        var nodeName = req.params.nodeName;
        link.getLinksByNodeName([nodeName]).then(function(links) {
            res.send(links);
        });
    });

    router.get('/:nodeName/neighbors', function(req, res) {
        var nodeName = req.params.nodeName;
        link.getLinksByNodeName(nodeName).then(function(links) {
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
        node.getNodesByPartialName(q).then(function(nodes) {
            var names = [];
            for (var i in nodes) {
                names.push({ id: nodes[i].name, text: nodes[i].name });
            }
            return res.json(names);
        });
    });

};
