'use strict';

var link = require('../../app/models/link');
var node = require('../../app/models/node');
var Netmask  = require('netmask').Netmask;
var ObjectId = require('mongoose').Types.ObjectId;
var util      = require('util');
var Q = require('q');

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

module.exports = {
    getInterval : getInterval,
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
