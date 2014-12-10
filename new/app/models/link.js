'use strict';

var mongoose = require('mongoose');
var Q = require('q');

var linkModel = function() {
    var linkSchema = new mongoose.Schema({
        distance: {
            type: String
        },
        saturation: {
            type: String
        },
        bandwidth: {
            type: String
        },
        network: {
            type: String
        },
        active: {
            type: Boolean
        },
        subscriptions : [{
            bandwidth: {
                type: Number
            },
            email: {
                type: String
            }
        }],
        nodes: [{
            id: {
                type: String
            },
            name: {
                type: String
            },
            iface: {
                type: String
            },
            ospf: {
                adjacency: String,
                state: String,
                stateChanges: Number
            }
        }],
    });
    return mongoose.model('Link', linkSchema);
};

var Link = new linkModel();

var checkDuplicates = function(links) {
    var found,
        i,
        duplicates = {},
        deferred = Q.defer();

    for (var j in links) {
        var link = links[j];

        var n1 = link.nodes[0].id;
        var n2 = link.nodes[1].id;

        if (!duplicates.hasOwnProperty(n1)) {
            duplicates[n1] = [];
        }

        if (duplicates[n1].indexOf(n2) !== -1) {
            deferred.reject(util.format('Duplicate link: %s', link.id));
        } else {
            duplicates[n1].push(n2);
        }

        if (!duplicates.hasOwnProperty(n2)) {
            duplicates[n2] = [];
        }

        if (duplicates[n2].indexOf(n1) !== -1) {
            deferred.reject(util.format('Duplicate link: %s', link.id));
        } else {
            duplicates[n2].push(n1);
        }
    }

    deferred.resolve();

    return deferred.promise;
};

var getLinks = function(query) {
    var deferred = Q.defer();

    Link.find(query, function(error, links) {
        if (error) {
            deferred.reject('Error searching for links.');
            return;
        }

        checkDuplicates(links).then(function() {
            deferred.resolve(links);
        }).fail(function(err) {
            deferred.reject(err);
        });
    });

    return deferred.promise;
};


var getLinkByIPs = function(ippair) {
    var deferred = Q.defer();

    if (ippair.length !== 2) {
        deferred.reject();
        return;
    }

    getNodeByIP(ippair[0]).then(function(node) {
        var node1 = node;
        getNodeByIP(ippair[1]).then(function(node) {
            var node2 = node;
            getLinkByNodes([node1, node2]).then(function(link) {
                deferred.resolve(link);
            });
        }).fail(function(err) {
            deferred.reject(err);
        });
    }).fail(function(err) {
        deferred.reject(err);
    });

    return deferred.promise;
};

var getLinksById = function(linkIds) {
    var deferred = Q.defer();
    var query = {};

    if (linkIds && linkIds.length > 0) {
        query =  { _id: { '$in': linkIds } };
    }
    Link.find(query, function(error, links) {
        if (error) {
            deferred.reject(error);
            return;
        }
        deferred.resolve(links);
    });

    return deferred.promise;
};

var getLinksByNodeName = function(nodeName) {
    var deferred = Q.defer();
    if (!nodeName) {
        deferred.reject();
        return;
    }

    var query = { 'nodes.name': { '$in': [ nodeName ] } };
    Link.find(query, function(error, links) {
        if (error) {
            deferred.reject();
            return;
        }
        deferred.resolve(links);
    });

    return deferred.promise;
};

var getLinkByNodes = function(nodes) {
    var deferred = Q.defer();
    if (!nodes || nodes.length !== 2) {
        deferred.reject();
        return;
    }

    var query = { 'nodes.id': { '$all': [ nodes[0]._id.toString(), nodes[1]._id.toString() ] } };
    Link.findOne(query, function(error, link) {
        if (error) {
            deferred.reject();
            return;
        }
        deferred.resolve(link);
    });

    return deferred.promise;
};

var addLink = function(nodes) {
    var deferred = Q.defer();

    getLinkByNodes(nodes).then(function(link) {
        if (link) {
            deferred.reject(util.format('The link %s-%s already exists', nodes[0].name, nodes[1].name));
        } else {
            var newLink = new Link({ nodes: [ { name: nodes[0].name, id: nodes[0].id }, { name: nodes[1].name, id: nodes[1].id } ] });
            newLink.save(function() {
                deferred.resolve(newLink);
            });
        }
    });

    return deferred.promise;
};

module.exports = {
    addLink: addLink,
    getLinkByNodes: getLinkByNodes,
    getLinksByNodeName: getLinksByNodeName,
    getLinksById: getLinksById,
    getLinkByIPs: getLinkByIPs,
    getLinks: getLinks
};
