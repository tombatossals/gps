'use strict';

var nodeModel = require('../../app/models/node');
var linkModel = require('../../app/models/link');
var mikrotik  = require('../../app/models/mikrotik');
var openwrt   = require('../../app/models/openwrt');
var exec      = require('child_process').exec;
var fs        = require('fs');
var util      = require('util');
var Q         = require('q');

function get_data_from_command_line(link) {
    var deferred = Q.defer();
    var result = { bandwidth: 0, traffic: 0 };
    var iface = link.nodes[0].iface;

    var s1 = link.nodes[0];
    var s2 = link.nodes[1];

    var f = util.format('/var/lib/collectd/%s/links/bandwidth-%s.rrd', s1.name, s2.name);
    if (!fs.existsSync(f)) {
        f = util.format('/var/lib/collectd/%s/links/bandwidth-%s.rrd', s2.name, s1.name);
    } else {
        var f2 = util.format('/var/lib/collectd/%s/links/bandwidth-%s.rrd', s2.name, s1.name);
        if (fs.existsSync(f2)) {
            deferred.reject(util.format('Duplicate RRD file: %s-%s', s1.name, s2.name));
            return deferred.promise;
        }
    }

    var command = util.format('/usr/bin/rrdtool lastupdate %s | tail -1', f);

    exec(command, function(error, stdout, stderr) {
        var bandwidth = stdout.trim().split(' ');
        var lastupdated = new Date().getTime()/1000 - parseInt(bandwidth[0].split(':')[0], 10);
        if (lastupdated < 4*3600 && bandwidth.length === 3 && bandwidth[1] > 0 && bandwidth[2] > 0) {
            if (bandwidth[1] < result.bandwidth[2]) {
                bandwidth = bandwidth[1];
            } else {
                bandwidth = bandwidth[2];
            }
            result.bandwidth = parseInt(bandwidth/(1024*1024), 10);
        } else {
            result.bandwidth = 0;
        }

        var command = util.format('/usr/bin/rrdtool graph xxx -s $(date -d yesterday +%%s) -e $(date +%%s) DEF:val1=/var/lib/collectd/%s/snmp/if_octets-%s.rrd:tx:MAX PRINT:val1:LAST:%lf DEF:val2=/var/lib/collectd/%s/snmp/if_octets-%s.rrd:tx:MAX PRINT:val2:LAST:%lf| tail -2', s1.name, iface, s1.name, iface);
        exec(command, function(error, stdout, stderr) {
            var traffic = stdout.trim().split('\n');
            traffic = parseInt(traffic[0], 10) + parseInt(traffic[1], 10);
            result.traffic = parseInt(traffic*8/(1024*1024), 10);
            if (traffic === '-nan') {
                result.traffic = 0;
            }

            deferred.resolve(result);
            //sendpush(result, link, cb);
        });
    });
    return deferred.promise;
}

function getSaturation(bandwidth, traffic) {
    var saturation = 3;

    if (bandwidth) {
        var percentage = parseInt(traffic*100/bandwidth, 10);
        if (percentage < 10) {
            saturation = 0;
        } else if (percentage < 25) {
            saturation = 1;
        } else if (percentage < 50 || bandwidth > 20) {
            saturation = 2;
        } else {
            saturation = 3;
        }
    }

    return saturation;
}

function updateBandwidthLink(link) {
    var deferred = Q.defer();

    get_data_from_command_line(link).then(function(result) {
        var traffic = result.traffic;
        var bandwidth = result.bandwidth;
        var saturation = getSaturation(bandwidth, traffic);

        link.bandwidth = bandwidth;
        link.saturation = saturation;


        if (link.nodes[0].ospf.state !== 'Full' && link.nodes[1].ospf.state !== 'Full') {
            link.bandwidth = 0;
            link.saturation = 3;
        }

        link.save(function() {
            deferred.resolve(util.format('Updated bandwidth %s-%s: saturation %s, bandwidth %s', link.nodes[0].name, link.nodes[1].name, saturation, bandwidth));
        });
    }).fail(function(result) {
        deferred.reject(result);
    });

    return deferred.promise;
}

function execute(nodes) {
    var deferred = Q.defer();

    if (nodes && nodes.length > 0) {
        nodeModel.getNodesByName(nodes).then(function(nodes) {
            var nodesIds = [];
            for (var i in nodes) {
                var node = nodes[i];
                nodesIds.push(node._id);
            }

            query =  { 'active': true, 'nodes.id': { '$all': nodesIds } };
            linkModel.getLinks(query).then(function(links) {
                var promises = [];
                links.forEach(function(link) {
                    promises.push(updateBandwidthLink(link));
                });
                Q.allSettled(promises).then(function(results) {
                    deferred.resolve(results);
                });
            }).fail(function() {
                deferred.reject();
            });
        });
    } else {
        var query = { active: true };
        linkModel.getLinks(query).then(function(links) {
            var promises = [];
            links.forEach(function(link) {
                promises.push(updateBandwidthLink(link));
            });
            Q.allSettled(promises).then(function(results) {
                deferred.resolve(results);
            });
        }).fail(function() {
            deferred.reject();
        });
    }

    return deferred.promise;
}

module.exports.execute = execute;
