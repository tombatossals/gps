'use strict';

var Link    = require('../models/link'),
    Node = require('../models/node'),
    User = require('../models/user'),
    ObjectId = require('mongoose').Types.ObjectId,
    util      = require('util'),
    getips_mikrotik = require('./mikrotik').getips,
    getips_openwrt = require('./openwrt').getips,
    Q = require('q');

var INTERVAL = parseInt(process.env.COLLECTD_INTERVAL, 10);

if (!INTERVAL) {
    INTERVAL = 1200;
}

var existeLinkDuplicado = function(duplicates, link) {
    var deferred = Q.defer();
    var i, found;
    var s1 = link.nodes[0].id;
    var s2 = link.nodes[1].id;

    if (duplicates.hasOwnProperty(s1)) {
        found = false;
        for (i in duplicates[s1]) {
            if (duplicates[s1][i] === s2) {
                deferred.reject(util.format('Duplicate link: %s', link.id));
            }
        }
        if (!found) {
            duplicates[s1].push(s2);
        }
    } else {
        duplicates[s1] = [ s2 ];
    }

    if (duplicates.hasOwnProperty(s2)) {
        found = false;
        for (i in duplicates[s2]) {
            if (duplicates[s1][i] === s1) {
                deferred.reject(util.format('Duplicate link: %s', link.id));
            }
            if (!found) {
                duplicates[s2].push(s1);
            }
        }
    } else {
        duplicates[s2] = [ s1 ];
    }

    deferred.resolve(link);

    return deferred.promise;
};

var checkDuplicados = function(links) {

    var deferred = Q.defer();

    var duplicates = {};
    var promises = [];

    for (var i in links) {
        var link = links[i];
        promises.push(existeLinkDuplicado(duplicates, link));
    }

    Q.allSettled(promises).then(function(res) {
        deferred.resolve(links);
    });

    return deferred.promise;
};

var createNewUser = function(profile) {

    var deferred = Q.defer();

    var newUser = new User({ email: profile.email, name: profile.name });
    newUser.save(function(err) {
        if (err) {
            deferred.reject(err);
            return;
        }
        deferred.resolve();
    });

    return deferred.promise;
};

var getUserByEmail = function(email) {
    var deferred = Q.defer();

    User.findOne({ email: email}, function(error, user) {
        if (error || !user) {
            deferred.reject();
            return;
        }
        deferred.resolve(user);
    });

    return deferred.promise;
};

var getLinks = function(query) {
    var deferred = Q.defer();

    Link.find(query, function(error, links) {
        if (error) {
            deferred.reject();
            return;
        }
        if (links.length === 0) {
            deferred.resolve();
            return;
        }
        checkDuplicados(links).then(function(links) {
            deferred.resolve(links);
        });
    });

    return deferred.promise;
};

var getNodesPublicInfo = function(nodes) {
    var nodesPublicInfo = {};
    for (var i in nodes) {
        var node = nodes[i];
        nodesPublicInfo[node.name] = {
            icon: {
                type: 'awesomeMarker',
                icon: 'star',
                markerColor: 'blue',
                labelAnchor: [10, -24]
            },
            label: {
                message: node.name + '<br>' + node.mainip,
                direction: 'auto'
            },
            riseOnHover: true,
            ip: node.mainip,
            omnitik: node.omnitik,
            name: node.name,
            lat: node.latlng.lat,
            lng: node.latlng.lng
        };
    }

    return nodesPublicInfo;
};

var getNodeByIP = function(ip) {
    var deferred = Q.defer();

    Node.find({ 'interfaces.address': new RegExp('^' + ip) }, function(error, node) {
        if (error) {
            deferred.reject(error);
            return;
        }
        deferred.resolve(node[0]);
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
        });
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

var getNodesById = function(nodeIds) {
    var deferred = Q.defer();

    var query = {};
    if (nodeIds && nodeIds.length > 0) {
        query =  { _id: { '$in': nodeIds } };
    }

    Node.find(query, function(error, nodes) {
        if (error) {
            deferred.reject(error);
            return;
        }
        deferred.resolve(nodes);
    });

    return deferred.promise;
};

var getNodesByPartialName = function(q) {
    var deferred = Q.defer();

    var query = {};
    if (q) {
        query = { name: new RegExp('^' + q, 'i') };
    }

    Node.find(query, function(error, nodes) {
        if (error) {
            deferred.reject();
            return;
        }
        deferred.resolve(nodes);
    });

    return deferred.promise;
};

var getNodesByName = function(nodeNames) {
    var deferred = Q.defer();

    var query = {};
    if (nodeNames && nodeNames.length > 0) {
        query =  { name: { '$in': nodeNames } };
    }

    Node.find(query, function(error, nodes) {
        if (error) {
            deferred.reject();
            return;
        }
        deferred.resolve(nodes);
    });

    return deferred.promise;
};

var updateNode = function(node) {
    var deferred = Q.defer(),
        getips;

    if (node.system === 'mikrotik') {
        getips = getips_mikrotik;
    } else if (node.system === 'openwrt') {
        getips = getips_openwrt;
    } else {
        deferred.reject();
        return;
    }

    getips(node).then(function(node) {
        node.save(function() {
            deferred.resolve("Successfully fetched interfaces from " + node.name);
        });
    }).fail(function() {
        deferred.reject("Error fetching interfaces from " + node.name);
    });

    return deferred.promise;
};

module.exports.getNodesByName = getNodesByName;
module.exports.getNodesByPartialName = getNodesByPartialName;
module.exports.getNodesPublicInfo = getNodesPublicInfo;
module.exports.getNodesById = getNodesById;
module.exports.getLinks = getLinks;
module.exports.getLinksByNodeName = getLinksByNodeName;
module.exports.getLinkByIPs = getLinkByIPs;
module.exports.getUserByEmail = getUserByEmail;
module.exports.createNewUser = createNewUser;
module.exports.getLinksById = getLinksById;
module.exports.getLinkByNodes = getLinkByNodes;
module.exports.updateNode = updateNode;
module.exports.INTERVAL = INTERVAL;
