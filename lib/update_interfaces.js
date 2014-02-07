#!/usr/bin/env node

var getips_mikrotik = require("./mikrotik").getips,
    getips_openwrt = require("./openwrt").getips,
    logger = require("./log"),
    mongoose = require('mongoose'),
    nconf = require("nconf"),
    Supernodo = require("../models/supernodo"),
    Q = require("q");

var getNumeroSupernodos = function() {
    var deferred = Q.defer();

    Supernodo.count(function(err, count) {
        deferred.resolve(count);
    });

    return deferred.promise;
}

function getSupernodos(supernodosNames) {
    var deferred = Q.defer();

    var query;
    if (supernodosNames) {
        query =  { name: { "$in": supernodosNames } };
    }

    Supernodo.find(query, function(error, supernodos) {
        if (error) {
            deferred.reject();
            return;
        }

        var count = supernodos.length;
        var listaSupernodosPorNombre = [];
        for (var i in supernodos) {
            var s = supernodos[i];
            listaSupernodosPorNombre.push(s.name);
        }

        deferred.resolve(listaSupernodosPorNombre);
    });

    return deferred.promise;
}


function execute(db, supernodos) {
    var promise;

    if (supernodos.length > 0) {
        var deferred = Q.defer();
        promise = deferred.promise;
        deferred.resolve(supernodos.length);
    } else {
        promise = getNumeroSupernodos();
    }

    promise.then(function(count) {

        if (count === 0) {
            mongoose.connection.close();
            return;
        }

        getSupernodos(supernodos).then(function(supernodos) {
            console.log(supernodos);
            mongoose.connection.close();
        });

    }).fail(function(error) {
        console.log(error);
        mongoose.connection.close();
    });

/*

                for (var i in supernodos) {
            var supernodo = supernodos[i];
                    var getips = undefined;
                    if (supernodo.system === "mikrotik") {
                        getips = getips_mikrotik;
                    } else if (supernodo.system === "openwrt") {
                        getips = getips_openwrt;
                    } else {
                        logger.error("Supernode not recognized: " + supernodo.name);
                        end();
                        return;
                    }

                    var password = supernodo.password;
                    var username = supernodo.username;

                    getips(supernodo, username, password, function(supernodo, resul) {
                        if (resul) {
                            supernodo.interfaces = resul;
                            supernodo.save(function(err) {
                                logger.info("Supernode interfaces updated: " + supernodo.name);
                                end(supernodo.name);
                            });
                        } else {
                            end();
                        }
                    });
              }
            });
        }
    });
*/
}

module.exports.execute = execute;
