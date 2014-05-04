#!/usr/bin/env node

var util = require("util"),
    db = require('./lib/database'),
    nconf = require('nconf'),
    yargs = require("yargs"),
    howtouse = "Usage: $0 <-l level> [generate [collectd_snmp|collectd_ping|collectd_routeros]|monitor [links|users]|update [interfaces|links]]";

nconf.file(__dirname + '/config/app.json');

db.config(nconf.get('databaseConfig'));

function check_parameters(argv) {
    var sections = {
        generate: [ "collectd_snmp", "collectd_ping", "collectd_routeros" ],
        monitor: [ "links", "users" ],
        update: [ "interfaces", "links", "bandwidth" ]
    };

    var section = argv._[0];
    var action = argv._[1];

    if (!sections[section] || sections[section].indexOf(action) == -1) {
        return false;
    }

    return true;
}

var argv = yargs.usage(howtouse).alias('l', 'level').demand(2).check(check_parameters).argv;
var action = require(util.format("./lib/%s_%s", argv._[0], argv._[1]));
var optional = [];

var logLevel = argv.level,
    logger = require('./lib/logger').initLogger(logLevel);

if (argv._.length > 2) {
    optional = argv._.slice(2, argv._.length);
}

action.execute(logger, optional).then(function(results) {
    for (var i in results) {
        var res = results[i];
        if (res.state === 'rejected') {
            logger.warn(res.reason);
        } else {
            logger.debug(res.value);
        }
    }
}).done(function() {
    db.close();
    setTimeout(function() {
        process.exit(-1);
    }, 3000);
});
