'use strict';

var logger    = require('./log'),
    mongoose  = require('mongoose'),
    Link    = require('../models/link'),
    Node = require('../models/node'),
    getNodesByName = require('./common').getNodesByName,
    exec      = require('child_process').exec,
    fs = require('fs'),
    util      = require('util'),
//    sendpush = require('./pushover').sendpush,
    Q = require('q');

function get_data_from_command_line(link) {
    var deferred = Q.defer();
    var result = { bandwidth: 0, traffic: 0, bandwidth_tx: 0, bandwidth_rx: 0 };
    var iface = link.nodes[0].iface;

    var s1 = link.nodes[0];
    var s2 = link.nodes[1];

    var f = util.format('/var/lib/collectd/%s/links/bandwidth-%s.rrd', s1.name, s2.name);
    if (!fs.existsSync(f)) {
        f = util.format('/var/lib/collectd/%s/links/bandwidth-%s.rrd', s2.name, s1.name);
    }

    var command = util.format('/usr/bin/rrdtool graph xxx -s $(date -d yesterday +%%s) -e $(date +%%s) DEF:val1=%s:rx:AVERAGE PRINT:val1:LAST:%lf DEF:val2=%s:tx:AVERAGE PRINT:val2:LAST:%lf | tail -2', f, f);

    exec(command, function(error, stdout, stderr) {
        var bandwidth = stdout.trim().split('\n');
        if (bandwidth.length === 2 && bandwidth[0] > 0 && bandwidth[1] > 0) {
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
            var traffic = stdout.trim().split('\n');
            traffic = parseInt(traffic[0], 10) + parseInt(traffic[1], 10);
            result.traffic = parseInt(traffic*8/(2*1024*1024), 10);

            deferred.resolve(result);
            //sendpush(result, link, cb);
        });
    });
    return deferred.promise;
}

function updateBandwidthLink(link) {
    var deferred = Q.defer();

    get_data_from_command_line(link).then(function(result) {
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

        link.bandwidth = bandwidth;
        link.saturation = saturation;
        link.save(function(err) {
            if (err) {
                console.log(err);
            }
            logger.debug(util.format('Updated bandwidth %s-%s: saturation %s, bandwidth %s', link.nodes[0].name, link.nodes[1].name, saturation, bandwidth));
            deferred.resolve();
        });
    });
    return deferred.promise;
}

function getLinks(query) {
    var deferred = Q.defer();

    Link.find(query, function(error, links) {
        if (error) {
            deferred.reject();
            return;
        }
        deferred.resolve(links);
    });

    return deferred.promise;
}

function execute(db, nodes) {
    var deferred = Q.defer();

    if (nodes && nodes.length > 0) {
        getNodesByName(nodes).then(function(nodes) {
            var nodesIds = [];
            for (var i in nodes) {
                var node = nodes[i];
                nodesIds.push(node._id);
            }

            query =  { 'active': true, 'nodes.id': { '$all': nodesIds } };
            getLinks(query).then(function(links) {
                var promises = [];
                links.forEach(function(link) {
                    promises.push(updateBandwidthLink(link));
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
        getLinks(query).then(function(links) {
            var promises = [];
            links.forEach(function(link) {
                promises.push(updateBandwidthLink(link));
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
