'use strict';

var node = require('../../app/models/node');
var link = require('../../app/models/link');
var path = require('path');
var fs = require('fs');
var util = require('util');
var Q = require('q');

function execute(linkFiles) {
    var deferred = Q.defer(),
        promises = [];

    var processLinkFile = function(linkFile) {
        var df = Q.defer(),
            jsonfile = path.resolve(linkFile),
            data = JSON.parse(fs.readFileSync(jsonfile, 'utf-8'));

        if (!data.nodes || data.nodes.length !== 2 || !data.nodes[0].name || !data.nodes[1].name) {
            df.reject(util.format('Bad data on json file %s adding link.', linkFile));
            return df.promise;
        }

        var n1 = data.nodes[0].name,
            n2 = data.nodes[1].name;

        node.getNodesByName([n1, n2]).then(function(nodes) {
            if (nodes.length !== 2) {
                df.reject(util.format('Bad data on json file %s adding link.', linkFile));
                return;
            }

            link.addLink(nodes).then(function(link) {
                df.resolve(util.format('Link %s-%s added successfully', link.nodes[0].name, link.nodes[1].name));
            }).fail(function(result) {
                df.reject(result);
            });
        });

        return df.promise;
    };

    linkFiles.forEach(function(linkFile) {
        promises.push(processLinkFile(linkFile));
    });

    Q.allSettled(promises).then(function(results) {
        deferred.resolve(results);
    });

    return deferred.promise;
}

module.exports.execute = execute;
