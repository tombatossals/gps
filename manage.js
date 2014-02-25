#!/usr/bin/env node

var util = require("util"),
    db = require('./lib/database'),
    nconf = require('nconf'),
    optimist = require("optimist"),
    howtouse = "Usage: $0 [generate [collectd_snmp|collectd_ping|collectd_routeros]|monitor [links|users]|update [interfaces|links]]";

nconf.file('config/app.json');

db.config(nconf.get('databaseConfig'));

function check_parameters(argv) {
    var sections = {
        generate: [ "collectd_snmp", "collectd_ping", "collectd_routeros" ],
        monitor: [ "links" ],
        update: [ "interfaces", "links", "bandwidth" ]
    };

    var section = argv._[0];
    var action = argv._[1];

    if (!sections[section] || sections[section].indexOf(action) == -1) {
        return false;
    }

    return true;
}

var argv = optimist.usage(howtouse).demand(2).check(check_parameters).argv;
var action = require(util.format("./lib/%s_%s", argv._[0], argv._[1]));
var optional = [];

if (argv._.length > 2) {
    optional = argv._.slice(2, argv._.length);
}

action.execute(db, optional).then(function() {
    db.close();
});
