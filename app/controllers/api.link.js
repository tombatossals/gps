'use strict';

var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var nodeModel = require('../models/node');
var linkModel = require('../models/link');

module.exports = function (app) {
    app.use('/api/link', router);

    router.get('/', function (req, res) {

        res.format({
            json: function () {
                linkModel.getLinks().then(function(links) {
                    res.json(links);
                }).fail(function(err) {
                    res.send(500, { error: err });
                });
            }
        });
    });

    router.get('/:n1/:n2', function (req, res) {
      var n1 = req.params.n1;
      var n2 = req.params.n2;

      nodeModel.getNodesByName([n1, n2]).then(function(nodes) {
          linkModel.getLinkByNodes(nodes).then(function(link) {
              var publicNodes = nodeModel.getNodesPublicInfo(nodes);
              res.send({
                  link: link,
                  nodes: publicNodes
              });
          });

      });
    });
};
