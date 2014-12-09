'use strict';

var Link    = require('../models/link'),
    Node = require('../models/node'),
    Netmask  = require('netmask').Netmask,
    User = require('../models/user'),
    ObjectId = require('mongoose').Types.ObjectId,
    util      = require('util'),
    Q = require('q');

var isNetworkRegistered = function(address, links) {
    for (var i in links) {
        var link = links[i];
        var network = new Netmask(link.network);
        if (network.contains(address)) {
            return true;
            //console.log(address);
        }
    }
    return false;
};

var getUnregisteredNetworks = function(interfaces, links) {
    var unregistered = [];

    for (var i in interfaces) {
        var iface = interfaces[i],
            address = iface.address;

        if (address && address.indexOf('172.16.') === 0) {
            if (!isNetworkRegistered(address, links)) {
                unregistered.push(address);
            }
        }
    }
    return unregistered;
};

var searchNetwork = function(network, mainNode, nodes) {
    for (var i in nodes) {
        var node = nodes[i];
        var net = new Netmask(network);
        if (node.name === mainNode.name) {
            continue;
        }

        for (var j in node.interfaces) {
            var iface = node.interfaces[j];
            if (iface.address && iface.address.indexOf('172.16.') === 0 && net.contains(iface.address)) {
                console.log('Found new link from ' + mainNode.name + ' to ' + node.name + ':' + iface.address);
                break;
            }
        }
    }
};

var discoverNewLinks = function() {
    var df = Q.defer();

    getNodesByName().then(function(nodes) {
        getLinks().then(function(links) {
            for (var i in nodes) {
                var node = nodes[i];
                var networks = getUnregisteredNetworks(node.interfaces, links);
                for (var j in networks) {
                    var net = networks[j];
                    //console.log("Unregistered P2P link: " + node.name, net);
                    searchNetwork(net, node, nodes);
                }
            }
            df.resolve();
        });
    });

    return df.promise;
};

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

var getNodesPublicInfo = function(nodes) {
    var nodesPublicInfo = {};
    for (var i in nodes) {
        var node = nodes[i];
        nodesPublicInfo[node.name] = {
            ip: node.mainip,
            routing: node.routing,
            sysinfo: node.sysinfo,
            connectedUsers: node.connectedUsers,
            omnitik: node.omnitik,
            name: node.name,
            ospf: node.ospf,
            alive: node.alive,
            lat: node.latlng.lat,
            lng: node.latlng.lng
        };
    }

    return nodesPublicInfo;
};

var getNodeByIP = function(ip) {
    var deferred = Q.defer();

    Node.find({ 'interfaces.address': new RegExp('^' + ip + '/') }, function(error, node) {
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

var addNode = function(node) {
    var deferred = Q.defer();

    var nodeName = node.name;
    getNodesByName([nodeName]).then(function(nodes) {
        if (nodes.length > 0) {
            deferred.reject(util.format('The node %s already exists', nodeName));
        } else {
            var newNode = new Node ({ name : node.name, latlng: { lat: node.latlng.lat, lng: node.latlng.lng } });
            newNode.save(function() {
                deferred.resolve(newNode);
            });
        }
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
        getips,
        getips_mikrotik = require('./mikrotik').getips,
        getips_openwrt = require('./openwrt').getips;

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
            deferred.resolve('Successfully fetched interfaces from ' + node.name);
        });
    }).fail(function() {
        deferred.reject('Error fetching interfaces from ' + node.name);
    });

    return deferred.promise;
};

var resetLinkOSPFNodeState = function(link, node) {
    var df = Q.defer();
    var pos = link.nodes[0].name === node.name ? 0:1;
    link.nodes[pos].ospf = {
        adjacency: null,
        state: 'Down',
        stateChanges: null
    };
    link.save(function() {
        df.resolve();
    });
    return df.promise;
};

var reset = function(node) {
    var df = Q.defer();
    getLinksByNodeName(node.name).then(function(links) {
        var promises = [];
        for (var j in links) {
            promises.push(resetLinkOSPFNodeState(links[j], node));
        }
        Q.all(promises).then(df.resolve);
    });
    return df.promise;
};

var resetOSPFState = function(node) {
    var promises = [];

    promises.push(reset(node));

    return Q.all(promises);
};

var getInterval = function() {
    var interval = parseInt(process.env.COLLECTD_INTERVAL, 10);
    if (!interval || isNaN(interval)) {
        interval = 1200;
    }
    return interval;
};

module.exports = {
    getInterval : getInterval,
    getNodesByName : getNodesByName,
    getNodesByPartialName : getNodesByPartialName,
    getNodesPublicInfo : getNodesPublicInfo,
    getNodesById : getNodesById,
    getLinks : getLinks,
    getLinksByNodeName : getLinksByNodeName,
    getLinkByIPs : getLinkByIPs,
    getUserByEmail : getUserByEmail,
    createNewUser : createNewUser,
    getLinksById : getLinksById,
    discoverNewLinks: discoverNewLinks,
    updateNode: updateNode,
    addLink: addLink,
    addNode: addNode,
    getLinkByNodes : getLinkByNodes,
    resetOSPFState: resetOSPFState,
    INTERVAL : getInterval()
};
