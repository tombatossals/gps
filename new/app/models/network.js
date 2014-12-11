var node = require('../../app/models/node');
var link = require('../../app/models/link');
var Netmask = require('netmask').Netmask;
var util = require('util');
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

var discoverNewLinks = function() {
    var df = Q.defer();

    node.getNodesByName().then(function(nodes) {
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

module.exports = {
    discoverNewLinks: discoverNewLinks,
    searchNetwork: searchNetwork,
    getUnregisteredNetworks: getUnregisteredNetworks,
    isNetworkRegistered: isNetworkRegistered
};
