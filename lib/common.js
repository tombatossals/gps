var Link    = require("../models/link"),
    Node = require("../models/node"),
    util      = require("util"),
    getips_mikrotik = require("./mikrotik").getips,
    getips_openwrt = require("./openwrt").getips,
    Q = require("q");

var existeLinkDuplicado = function(duplicates, link) {
    var deferred = Q.defer();

    var s1 = link.nodes[0].id;
    var s2 = link.nodes[1].id;

    if (duplicates.hasOwnProperty(s1)) {
        var found = false;
        for (var i in duplicates[s1]) {
            if (duplicates[s1][i] === s2) {
                logger.error(util.format("Duplicate link: %s", link.id));
            }
        }
        if (!found) {
            duplicates[s1].push(s2);
        }
    } else {
        duplicates[s1] = [ s2 ];
    }

    if (duplicates.hasOwnProperty(s2)) {
        var found = false;
        for (var i in duplicates[s2]) {
            if (duplicates[s1][i] === s1) {
                logger.error(util.format("Duplicate link: %s", link.id));
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
}

var getNodesByName = function(nodeNames) {
    var deferred = Q.defer();

    var query = {};
    if (nodeNames.length > 0) {
        query =  { name: { "$in": nodeNames } };
    }

    Node.find(query, function(error, nodes) {
        if (error) {
            console.log(error);
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

    if (node.system === "mikrotik") {
        getips = getips_mikrotik;
    } else if (node.system === "openwrt") {
        getips = getips_openwrt;
    } else {
        deferred.reject();
        return;
    }

    getips(node).then(function(node) {
        node.save(function(err) {
            if (err) {
                console.log(err);
            }
            //logger.info("Supernode interfaces updated: " + node.name);
            deferred.resolve(node.name);
        });
    }).fail(function() {
        //logger.error("Unable to get ips from " + node.name);
        deferred.reject(node.name);
    });

    return deferred.promise;
}

module.exports.getNodesByName = getNodesByName;
module.exports.getLinks = getLinks;
module.exports.updateNode = updateNode;
