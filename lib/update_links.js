#!/usr/bin/env node

var getips_mikrotik = require("./mikrotik").getips,
    getips_openwrt = require("./openwrt").getips,
    logger = require("./log"),
    Netmask   = require('netmask').Netmask,
    mongoose = require('mongoose'),
    nconf = require("nconf"),
    Enlace    = require("../models/enlace"),
    Supernodo = require("../models/supernodo"),
    util      = require("util"),
    Q = require("q");

function existeEnlaceDuplicado(duplicates, enlace) {
    var deferred = Q.defer();

    var s1 = enlace.supernodos[0].id;
    var s2 = enlace.supernodos[1].id;

    if (duplicates.hasOwnProperty(s1)) {
        var found = false;
        for (var i in duplicates[s1]) {
            if (duplicates[s1][i] === s2) {
                logger.error(util.format("Duplicate link: %s", enlace.id));
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
                logger.error(util.format("Duplicate link: %s", enlace.id));
            }
            if (!found) {
                duplicates[s2].push(s1);
            }
        }
    } else {
        duplicates[s2] = [ s1 ];
    }

    deferred.resolve();

    return deferred.promise;
}

function checkDuplicados(enlaces) {

    var deferred = Q.defer();

    var duplicates = {};
    var promises = [];

    enlaces.forEach(function(enlace) {
        promises.push(existeEnlaceDuplicado(duplicates, enlace));
    });

    return Q.all(promises);
}

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
                                    console.log(err);
                                }
                                logger.info(util.format("Supernode link updated: %s-%s", s1.name, s2.name));
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

function getEnlaces() {
    var deferred = Q.defer();

    Enlace.find(function(error, enlaces) {

        if (error) {
            deferred.reject();
            return;
        }

        if (enlaces.length === 0) {
            deferred.resolve();
            return;
        }

        checkDuplicados(enlaces).then(function() {
            enlaces.forEach(function(enlace) {
                updateEnlace(enlace).then(function() {
                    deferred.resolve();
                });
            });
        });
    });

    return deferred.promise;
}

function execute(db, enlaces) {
    var deferred = Q.defer();

    var query = {};
    if (enlaces.length > 0) {
        query =  { name: { "$in": enlaces } };
    }

    getEnlaces().then(function() {
        deferred.resolve(true);
    }).fail(function() {
        deferred.reject();
    });

    return deferred.promise;
}

module.exports.execute = execute;
