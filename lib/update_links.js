#!/usr/bin/env node

var getips_mikrotik = require("./mikrotik").getips,
    getips_openwrt = require("./openwrt").getips,
    logger = require("./log"),
    Netmask   = require('netmask').Netmask,
    mongoose = require('mongoose'),
    getSupernodosByName = require('./common').getSupernodosByName,
    getEnlaces = require('./common').getEnlaces,
    nconf = require("nconf"),
    Enlace    = require("../models/enlace"),
    Supernodo = require("../models/supernodo"),
    util      = require("util"),
    Q = require("q");

function updateEnlace(enlace) {
    var deferred = Q.defer();

    var s1 = enlace.supernodos[0].id;
    var s2 = enlace.supernodos[1].id;

    Supernodo.find({ _id: { $in: [ s1, s2 ] } }, function(err, supernodos) {

        var s1 = supernodos[0];
        var s2 = supernodos[1];

        if (!s1 || !s2) {
            enlace.remove(function() {
                logger.error(util.format("Removed invalid link: %s-%s %s", enlace.supernodos[0].name, enlaces.supernodos[1].name, enlace._id));
                deferred.reject();
            });
            return;
        }

        if (supernodos.length !== 2) {
            logger.error(util.format("Supernodo not found: %s-%s %s", s1.name, s2.name, enlace._id));
            deferred.reject();
        };

        var found = false;

        for (var i=0; i<s1.interfaces.length; i++) {
            var iface = s1.interfaces[i];
            if (iface.address.search("172.16") === 0) {
                var network = new Netmask(iface.address);
                for (var j=0; j<s2.interfaces.length; j++) {
                    var iface2 = s2.interfaces[j];
                    if (iface2.address.search("172.16") === 0) {
                        var address = iface2.address.split("/")[0];
                        if (network.contains(address)) {
                            found = true;
                            if (enlace.supernodos[0].id == s1._id.toString()) {
                                enlace.supernodos[0].iface = iface.name;
                                enlace.supernodos[0].name  = s1.name;
                                enlace.supernodos[1].iface = iface2.name;
                                enlace.supernodos[1].name  = s2.name;
                            } else {
                                enlace.supernodos[1].iface = iface.name;
                                enlace.supernodos[1].name  = s1.name;
                                enlace.supernodos[0].iface = iface2.name;
                                enlace.supernodos[0].name  = s2.name;
                            }
                            enlace.network = network.base + "/" + network.bitmask;
                            enlace.active = true;
                            enlace.save(function(err) {
                                if (err) {
                                    console.log(err, s1.name, s2.name);
                                    logger.error(util.format("Link not updated: %s-%s", s1.name, s2.name));
                                } else {
                                    logger.info(util.format("Supernode link updated: %s-%s", s1.name, s2.name));
                                }
                                deferred.resolve();
                            });
                        }
                    }
                }
            }
        }

        if (!found) {
            enlace.remove(function() {
                logger.error(util.format("Removed link not found: %s-%s %s", s1.name, s2.name, enlace._id));
                deferred.reject();
            });
        }
    });

    return deferred.promise;
}

function updateNewEnlaces() {
    var deferred = Q.defer();

    var query =  { "supernodos.iface": { "$exists": false } };
    Enlace.find(query, function(error, enlaces) {
        if (error) {
            console.log(error);
            deferred.reject();
            return;
        }
        var promises = [];
        enlaces.forEach(function(enlace) {
            promises.push(function() {
                var deferred = Q.defer();
                updateEnlace(enlace).then(function() {
                    deferred.resolve();
                });
                return deferred.promise;
            }());
        });
        Q.all(promises).then(function() {
            deferred.resolve();
        });
    });

    return deferred.promise;
}

function execute(db, supernodos) {
    var deferred = Q.defer();

    if (supernodos && supernodos.length > 0) {
        getSupernodosByName(supernodos).then(function(supernodos) {
            var supernodosIds = [];
            for (var i in supernodos) {
                var supernodo = supernodos[i];
                supernodosIds.push(supernodo._id)
            }

            var query =  { "supernodos.id": { "$all": supernodosIds } };
            getEnlaces(query).then(function(enlaces) {
                enlaces.forEach(function(enlace) {
                    updateEnlace(enlace).then(function() {
                        deferred.resolve(true);
                    });
                });
            }).fail(function() {
                deferred.reject();
            });
        });
    } else {
        updateNewEnlaces().then(function() {
            getEnlaces().then(function(enlaces) {
                enlaces.forEach(function(enlace) {
                    updateEnlace(enlace).then(function() {
                        deferred.resolve(true);
                    });
                });
            });
        }).fail(function() {
            deferred.reject();
        });
    }
    return deferred.promise;
}

module.exports.execute = execute;
