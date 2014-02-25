#!/usr/bin/env node

var getips_mikrotik = require("./mikrotik").getips,
    getips_openwrt = require("./openwrt").getips,
    logger = require("./log"),
    mongoose = require('mongoose'),
    nconf = require("nconf"),
    Supernodo = require("../models/supernodo"),
    Q = require("q");

function getSupernodos(supernodosNames) {
    var deferred = Q.defer();

    var query = {};
    if (supernodosNames.length > 0) {
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

        deferred.resolve(supernodos);
    });

    return deferred.promise;
}

var getListaNombresSupernodos = function(supernodos) {
    var count = supernodos.length;
    var listaSupernodosPorNombre = [];
    for (var i in supernodos) {
        var s = supernodos[i];
        listaSupernodosPorNombre.push(s.name);
    }
    return listaSupernodosPorNombre;
}

var actualizaSupernodo = function(supernodo) {
    var deferred = Q.defer(),
        getips;

    if (supernodo.system === "mikrotik") {
        getips = getips_mikrotik;
    } else if (supernodo.system === "openwrt") {
        getips = getips_openwrt;
    } else {
        deferred.reject();
        return;
    }

    getips(supernodo).then(function(supernodo) {
        supernodo.save(function(err) {
            if (err) {
                console.log(err);
            }

            //logger.info("Supernode interfaces updated: " + supernodo.name);
            deferred.resolve(supernodo.name);
        });
    }).fail(function() {
        //logger.error("Unable to get ips from " + supernodo.name);
        deferred.reject(supernodo.name);
    });

    return deferred.promise;
}

function execute(db, supernodos) {
    var deferred = Q.defer();
    getSupernodos(supernodos).then(function(supernodos) {
        var listaNombresSupernodos = getListaNombresSupernodos(supernodos);
        var promiseList = [];
        supernodos.forEach(function(supernodo) {
            promiseList.push(actualizaSupernodo(supernodo));
        });

        var done = Q.all(promiseList).spread(function() {
            deferred.resolve(true);
        });
    }).fail(function(error) {
        deferred.reject().done();
    });

    return deferred.promise;
}

module.exports.execute = execute;
