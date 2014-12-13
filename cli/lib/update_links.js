'use strict';

var nodeModel = require('../../app/models/node');
var linkModel = require('../../app/models/link')
var Q = require('q');
var Netmask = require('netmask').Netmask;
var geolib = require('geolib');
var util      = require('util');


function execute(nodes) {
    var deferred = Q.defer();
    if (nodes && nodes.length === 1) {
        var nodeName = nodes[0];
        linkModel.getLinksByNodeName(nodeName).then(function(links) {
            var promises = [];
            links.forEach(function(link) {
                promises.push(updateLink(link));
            });
            Q.allSettled(promises).then(function(results) {
                deferred.resolve(results);
            });
        });
    } else if (nodes && nodes.length === 2) {
        nodeModel.getNodesByName(nodes).then(function(nodes) {
            linkModel.getLinkByNodes(nodes).then(function(link) {
                linkModel.updateLink(link).then(function(msg) {
                    deferred.resolve([{
                        state: 'fullfiled',
                        value: msg
                    }]);
                });
            }).fail(function(error) {
                deferred.reject(error);
            });
        });
    } else {
        linkModel.updateNewLinks().then(function() {
            linkModel.getLinks().then(function(links) {
                var promises = [];
                links.forEach(function(link) {
                    promises.push(linkModel.updateLink(link));
                });
                Q.allSettled(promises).then(function(results) {
                    deferred.resolve(results);
                });
            });
        });
    }

    return deferred.promise;
}

module.exports.execute = execute;
