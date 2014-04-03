'use strict';

var getLinksByNodes = require('../lib/common').getLinksByNodes;
var getNodesByName = require('../lib/common').getNodesByName;
var getNodesPublicInfo = require('../lib/common').getNodesPublicInfo;
var fs = require('fs');
var exec = require('child_process').exec;

module.exports = function (app) {

    app.get('/graph/:n1/:n2', function (req, res) {

        var nodeName1 = req.params.n1;
        var nodeName2 = req.params.n2;
        var interval = req.query.interval;

        getNodesByName([nodeName1, nodeName2]).then(function(nodes) {
            if (nodes.length !== 2) {
                throw err;
                return;
            }

            var n1 = nodes[0],
                n2 = nodes[1];

            getLinksByNodes(nodes).then(function(link) {
                if (!link) {
                    throw err;
                }

                var a = "/var/lib/collectd/" + n1.name + "/links/bandwidth-" + n2.name + ".rrd",
                    iface;

                if (fs.existsSync(a)) {
                    if (n1._id.toString() === link.nodes[0].id) {
                      iface = link.nodes[0].iface;
                    } else {
                      iface = link.nodes[1].iface;
                    }
                    iface = iface.replace(/:[0-9]+\./, ".");
                    var b = "/var/lib/collectd/" + n1.name + "/snmp/if_octets-" + iface + ".rrd";
                } else {
                    var a = "/var/lib/collectd/" + n2.name + "/links/bandwidth-" + n1.name + ".rrd";
                    if (n2._id.toString() === link.nodes[1].id) {
                      iface = link.nodes[1].iface;
                    } else {
                      iface = link.nodes[0].iface;
                    }
                    iface = iface.replace(/:[0-9]+/, "");
                    var b = "/var/lib/collectd/" + n2.name + "/snmp/if_octets-" + iface + ".rrd";
                }

                if (!fs.existsSync(a) || !fs.existsSync(b)) {
                    res.send(404);
                    return;
                }

                var start = -86400;
                var step = 60;
                if (interval == "weekly") {
                    start = -604800;
                    step = 3600*2;
                } else if (interval == "monthly") {
                    start = -18144000;
                    step = 3600*24;
                } else if (interval == "year") {
                    start = -31536000;
                    step = 3600*24*7;
                }

                var command = '/usr/bin/rrdtool graph - --imgformat=PNG ' +
                              '--start=' + start + ' --end=now ' +
                              '--title="' + n1.name + '- ' + n2.name + ' - Bandwidth meter" ' +
                              '--step=' + step + ' --base=1000 --height=140 --width=480 ' +
                              '--alt-autoscale-max --lower-limit="0" ' +
                              '--vertical-label="bits per second" --font TITLE:10: ' +
                              '--font AXIS:7: --font LEGEND:8: --font UNIT:7: ' +
                              'DEF:a="' + a + '":"rx":AVERAGE:step=1200 ' +
                              'DEF:b="' + a + '":"tx":AVERAGE:step=1200 ' +
                              'DEF:c="' + b + '":"rx":AVERAGE:step=60 ' +
                              'DEF:d="' + b + '":"tx":AVERAGE:step=60 ' +
                              'CDEF:cdefb=b,-1,* CDEF:cinbits=c,8,* ' +
                              'CDEF:cdeff=d,8,* CDEF:dinbits=cdeff,-1,* ' +
                              'AREA:a#4444FFFF:"Bandwidth TX"  ' +
                              'LINE:a#000000FF GPRINT:a:LAST:"Last%8.2lf %s" ' +
                              'GPRINT:a:AVERAGE:"Avg%8.2lf %s"  ' +
                              'GPRINT:a:MAX:"Max%8.2lf %s" GPRINT:a:MIN:"Min%8.2lf %s\\n"  ' +
                              'AREA:cinbits#FF0000FF:"Traffic   TX" LINE:cinbits#000000FF ' +
                              'GPRINT:cinbits:LAST:"Last%8.2lf %s" GPRINT:cinbits:AVERAGE:"Avg%8.2lf %s"  ' +
                              'GPRINT:cinbits:MAX:"Max%8.2lf %s" GPRINT:cinbits:MIN:"Min%8.2lf %s\\n" ' +
                              'AREA:cdefb#44AAFFFF:"Bandwidth RX" LINE:cdefb#110000FF ' +
                              'GPRINT:b:LAST:"Last%8.2lf %s" GPRINT:b:AVERAGE:"Avg%8.2lf %s"  ' +
                              'GPRINT:b:MAX:"Max%8.2lf %s" GPRINT:b:MIN:"Min%8.2lf %s\\n"  ' +
                              'AREA:dinbits#FF8800FF:"Traffic   RX" LINE:dinbits#000000FF ' +
                              'GPRINT:cdeff:LAST:"Last%8.2lf %s" GPRINT:cdeff:AVERAGE:"Avg%8.2lf %s"  ' +
                              'GPRINT:cdeff:MAX:"Max%8.2lf %s" GPRINT:cdeff:MIN:"Min%8.2lf %s\\n"';

                exec(command, { encoding: 'binary', maxBuffer: 5000*1024 }, function(error, stdout, stderr) {
                    res.type('png');
                    res.send(new Buffer(stdout, 'binary'));
                });
            });
        });
    });
};