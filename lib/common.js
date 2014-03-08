var Enlace    = require("../models/enlace"),
    Supernodo = require("../models/supernodo"),
    util      = require("util"),
    Q = require("q");

var existeEnlaceDuplicado = function(duplicates, enlace) {
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

    deferred.resolve(enlace);

    return deferred.promise;
};

var checkDuplicados = function(enlaces) {

    var deferred = Q.defer();

    var duplicates = {};
    var promises = [];

    for (var i in enlaces) {
        var enlace = enlaces[i];
        promises.push(existeEnlaceDuplicado(duplicates, enlace));
    }

    Q.allSettled(promises).then(function(res) {
        deferred.resolve(enlaces);
    });

    return deferred.promise;
};

var getEnlaces = function(query) {
    var deferred = Q.defer();

    Enlace.find(query, function(error, enlaces) {
        if (error) {
            deferred.reject();
            return;
        }
        if (enlaces.length === 0) {
            deferred.resolve();
            return;
        }
        checkDuplicados(enlaces).then(function(enlaces) {
            deferred.resolve(enlaces);
        });
    });

    return deferred.promise;
}

var getSupernodosByName = function(supernodo) {
    var deferred = Q.defer();

    Supernodo.find({ name: { "$in": supernodo } }, function(error, supernodos) {
        if (error) {
            console.log(error);
            deferred.reject();
            return;
        }
        deferred.resolve(supernodos);
    });

    return deferred.promise;
};

module.exports.getSupernodosByName = getSupernodosByName;
module.exports.getEnlaces = getEnlaces;
