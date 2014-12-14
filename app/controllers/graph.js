var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var fs = require('fs');
var exec = require('child_process').exec;


module.exports = function (app) {
  app.use('/graph', router);
};

router.get('/', function (req, res, next) {
    res.render('map');
});

    router.get('/ping/:nodeName', function(req, res) {

        var nodeName = req.params.nodeName;
        var interval = req.query.interval;

        getNodesByName([ nodeName ]).then(function(nodes) {
            var node = nodes[0];

            var a = '/var/lib/collectd/solicom5/ping/ping-' + node.mainip + '.rrd';
            if (!fs.existsSync(a)) {
                res.send(404);
                return;
            }

            var start = -86400;
            var step = 1200;
            if (interval === 'weekly') {
                start = -604800;
                step = 3600*2;
            } else if (interval === 'monthly') {
                start = -18144000;
                step = 3600*24;
            } else if (interval === 'year') {
                start = -31536000;
                step = 3600*24*7;
            }

            var command = '/usr/bin/rrdtool graph - --imgformat=PNG ' +
                          '--start=' + start + ' --end=now ' +
                          '--title="' + nodeName + ' - Ping latency" ' +
                          '--step=' + step + ' --base=1000 --height=140 --width=480 ' +
                          '--alt-autoscale-max --lower-limit="0" ' +
                          '--vertical-label="bits per second" --font TITLE:10: ' +
                          '--font AXIS:7: --font LEGEND:8: --font UNIT:7: ' +
                          'DEF:"A0"="' + a + '":value:AVERAGE AREA:A0#FF000022 LINE2:A0#FF0000:"Ping to host"';

            exec(command, { encoding: 'binary', maxBuffer: 5000*1024 }, function(error, stdout, stderr) {
                res.type('png');
                res.send(new Buffer(stdout, 'binary'));
            });
        });
    });

    router.get('/users/:nodeName', function(req, res) {

        var nodeName = req.params.nodeName;
        var interval = req.query.interval;

        getNodesByName([ nodeName ]).then(function(nodes) {
            var a = '/var/lib/collectd/' + nodeName + '/node/connected_users.rrd';
            if (!fs.existsSync(a)) {
                res.send(404);
                return;
            }

            var start = -86400;
            var step = 1200;
            if (interval === 'weekly') {
                start = -604800;
                step = 3600*2;
            } else if (interval === 'monthly') {
                start = -18144000;
                step = 3600*24;
            } else if (interval === 'year') {
                start = -31536000;
                step = 3600*24*7;
            }

            var command = '/usr/bin/rrdtool graph - --imgformat=PNG ' +
                          '--start=' + start + ' --end=now ' +
                          '--title="' + nodeName + ' - Connected users" ' +
                          '--step=' + step + ' --base=1000 --height=140 --width=480 ' +
                          '--alt-autoscale-max --lower-limit="0" ' +
                          '--vertical-label="bits per second" --font TITLE:10: ' +
                          '--font AXIS:7: --font LEGEND:8: --font UNIT:7: ' +
                          'DEF:a="' + a + '":"good":MAX:step=1200 ' +
                          'DEF:b="' + a + '":"bad":MAX:step=1200 ' +
                          'AREA:b#EA644A:"Connected users (bad signal)": ' +
                          'LINE:b#CC3118 ' +
                          'GPRINT:b:LAST:"Last %.0lf" ' +
                          'GPRINT:b:MAX:"Max %.0lf" ' +
                          'GPRINT:b:MIN:"Min %.0lf\\n" ' +
                          'AREA:a#54EC48:"Connected users (good signal)":STACK  ' +
                          'GPRINT:a:LAST:"Last %.0lf" ' +
                          'GPRINT:a:MAX:"Max %.0lf" ' +
                          'GPRINT:a:MIN:"Min %.0lf\\n"';
            exec(command, { encoding: 'binary', maxBuffer: 5000*1024 }, function(error, stdout, stderr) {
                res.type('png');
                res.send(new Buffer(stdout, 'binary'));
            });
        });
    });

    var getStartAndStep = function(interval) {
        var start = -86400;
        var step = 60;
        if (interval === 'weekly') {
            start = -604800;
            step = 3600*2;
        } else if (interval === 'monthly') {
            start = -18144000;
            step = 3600*24;
        } else if (interval === 'year') {
            start = -31536000;
            step = 3600*24*7;
        }

        return {
            start: start,
            step: step
        };
    };

    var getRRDFiles = function(n1, n2, link) {
        var a = '/var/lib/collectd/' + n1.name + '/links/bandwidth-' + n2.name + '.rrd',
            b,
            iface;

        if (fs.existsSync(a)) {
            if (n1._id.toString() === link.nodes[0].id) {
              iface = link.nodes[0].iface;
            } else {
              iface = link.nodes[1].iface;
            }
            iface = iface.replace(/:[0-9]+\./, '.');
            b = '/var/lib/collectd/' + n1.name + '/snmp/if_octets-' + iface + '.rrd';
        } else {
            a = '/var/lib/collectd/' + n2.name + '/links/bandwidth-' + n1.name + '.rrd';
            if (n2._id.toString() === link.nodes[1].id) {
              iface = link.nodes[1].iface;
            } else {
              iface = link.nodes[0].iface;
            }
            iface = iface.replace(/:[0-9]+/, '');
            b = '/var/lib/collectd/' + n2.name + '/snmp/if_octets-' + iface + '.rrd';
        }

        return {
            a: a,
            b: b
        };
    };

    router.get('/bandwidth/:n1/:n2', function (req, res) {

        var nodeName1 = req.params.n1;
        var nodeName2 = req.params.n2;
        var interval = req.query.interval;

        getNodesByName([nodeName1, nodeName2]).then(function(nodes) {
            if (nodes.length !== 2) {
                throw 'Link nodes not found';
            }

            var n1 = nodes[0],
                n2 = nodes[1];

            getLinkByNodes(nodes).then(function(link) {

                if (!link) {
                    throw 'Link not found';
                }

                var rrdFiles = getRRDFiles(n1, n2, link),
                    a = rrdFiles.a,
                    b = rrdFiles.b;

console.log(a, b);
                a = a.replace(':3.rrd', '.rrd').replace(':4.rrd', '.rrd').replace(':2.rrd', '.rrd');
                b = b.replace(':3.rrd', '.rrd').replace(':4.rrd', '.rrd').replace(':2.rrd', '.rrd');
                if (!fs.existsSync(a) || !fs.existsSync(b)) {
                    res.send(404);
                    return;
                }

                var monitoring = getStartAndStep(interval),
                    start = monitoring.start,
                    step = monitoring.step;

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
