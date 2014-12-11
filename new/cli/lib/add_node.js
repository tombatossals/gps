'use strict';

var node = require('../../app/models/node');
var path = require('path');
var fs = require('fs');
var util = require('util');
var Q = require('q');

function execute(nodeFiles) {
    var deferred = Q.defer(),
        promises = [];

    var processNodeFile = function(nodeFile) {
        var df = Q.defer(),
            jsonfile = path.resolve(nodeFile),
            data = JSON.parse(fs.readFileSync(jsonfile, 'utf-8'));

        if (!data.name || !data.system || !data.latlng || !data.latlng.lat || !data.latlng.lng) {
            df.reject(util.format('Bad data on json file %s adding node.', nodeFile));
            return df.promise;
        }

        var name = data.name;
        node.addNode(data).then(function(node) {
            df.resolve(util.format('Node %s added successfully', node.name));
        }).fail(function(result) {
            df.reject(result);
        });

        return df.promise;
    };
    nodeFiles.forEach(function(nodeFile) {
        promises.push(processNodeFile(nodeFile));
    });

    Q.allSettled(promises).then(function(results) {
        deferred.resolve(results);
    });

    return deferred.promise;
}

module.exports.execute = execute;
