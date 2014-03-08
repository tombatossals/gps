#!/usr/bin/env node

var logger    = require("./log"),
    mongoose  = require('mongoose'),
    Enlace    = require("../models/enlace"),
    Supernodo = require("../models/supernodo"),
    getSupernodosByName = require("./common").getSupernodosByName,
    exec      = require('child_process').exec,
    fs = require("fs"),
    util      = require("util"),
//    sendpush = require("./pushover").sendpush,
    Q = require("q");

function get_data_from_command_line(enlace) {
    var deferred = Q.defer();
    var result = { bandwidth: 0, traffic: 0, bandwidth_tx: 0, bandwidth_rx: 0 };
    var iface = enlace.supernodos[0].iface;

    var s1 = enlace.supernodos[0];
    var s2 = enlace.supernodos[1];

    var f = util.format("/var/lib/collectd/%s/links/bandwidth-%s.rrd", s1.name, s2.name);
    if (!fs.existsSync(f)) {
        f = util.format("/var/lib/collectd/%s/links/bandwidth-%s.rrd", s2.name, s1.name);
    }

    var command = util.format('/usr/bin/rrdtool graph xxx -s $(date -d yesterday +%%s) -e $(date +%%s) DEF:val1=%s:rx:AVERAGE PRINT:val1:LAST:%lf DEF:val2=%s:tx:AVERAGE PRINT:val2:LAST:%lf | tail -2', f, f);

    exec(command, function(error, stdout, stderr) {
        var bandwidth = stdout.trim().split("\n");
        if (bandwidth.length == 2 && bandwidth[0] > 0 && bandwidth[1] > 0) {
            result.bandwidth_rx = parseInt(bandwidth[0]/(1024*1024), 10);
            result.bandwidth_tx = parseInt(bandwidth[1]/(1024*1024), 10);
            bandwidth = parseInt(bandwidth[0], 10) + parseInt(bandwidth[1], 10);
            result.bandwidth = parseInt(bandwidth/(2*1024*1024), 10);
        } else {
            result.bandwidth = 0;
            result.bandwidth_rx = 0;
            result.bandwidth_tx = 0;
        }

        var command = util.format('/usr/bin/rrdtool graph xxx -s $(date -d yesterday +%%s) -e $(date +%%s) DEF:val1=/var/lib/collectd/%s/snmp/if_octets-%s.rrd:tx:MAX PRINT:val1:LAST:%lf DEF:val2=/var/lib/collectd/%s/snmp/if_octets-%s.rrd:tx:MAX PRINT:val2:LAST:%lf| tail -2', s1.name, iface, s1.name, iface);
        exec(command, function(error, stdout, stderr) {
            var traffic = stdout.trim().split("\n");
            traffic = parseInt(traffic[0], 10) + parseInt(traffic[1], 10);
            result.traffic = parseInt(traffic*8/(2*1024*1024), 10);

            deferred.resolve(result);
            //sendpush(result, enlace, cb);
        });
    });
    return deferred.promise;
}

function updateBandwidthLink(enlace) {
    var deferred = Q.defer();

    get_data_from_command_line(enlace).then(function(result) {
        var traffic = result.traffic;
        var bandwidth = result.bandwidth;
        var saturation = 3;

        if (bandwidth) {
            var percentage = parseInt(traffic*100/bandwidth, 10);
            if (percentage < 10) {
                saturation = 0;
            } else if (percentage < 25) {
                saturation = 1;
            } else if (percentage < 50) {
                saturation = 2;
            } else {
                saturation = 3;
            }
        }

        enlace.bandwidth = bandwidth;
        enlace.saturation = saturation;
        enlace.save(function(err) {
            if (err) {
                console.log(err);
            }
            logger.debug(util.format("Updated bandwidth %s-%s: saturation %s, bandwidth %s", enlace.supernodos[0].name, enlace.supernodos[1].name, saturation, bandwidth));
            deferred.resolve();
       });
    });
    return deferred.promise;
}

function getEnlaces(query) {
    var deferred = Q.defer();

    Enlace.find(query, function(error, enlaces) {
        if (error) {
            deferred.reject();
            return;
        }
        deferred.resolve(enlaces);
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

            query =  { "active": true, "supernodos.id": { "$all": supernodosIds } };
            getEnlaces(query).then(function(enlaces) {
                var promises = [];
                enlaces.forEach(function(enlace) {
                    promises.push(function() {
                        var deferred = Q.defer();
                        updateBandwidthLink(enlace).then(function() {
                            deferred.resolve(true);
                        });
                        return deferred.promise;
                    }());
                });
                Q.all(promises).then(function() {
                    deferred.resolve();
                });
            }).fail(function() {
                deferred.reject();
            });
        });
    } else {
        var query = { active: true };
        getEnlaces(query).then(function(enlaces) {
            var promises = [];
            enlaces.forEach(function(enlace) {
                promises.push(function() {
                    var deferred = Q.defer();
                    updateBandwidthLink(enlace).then(function() {
                        deferred.resolve(true);
                    });
                    return deferred.promise;
                }());
            });
            Q.all(promises).then(function() {
                deferred.resolve();
            });
        }).fail(function() {
            deferred.reject();
        });
    }

    return deferred.promise;
}

module.exports.execute = execute;
