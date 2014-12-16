#!/usr/bin/env node

var util = require("util");
var dburl = require('../config/config').db;
var mongoose = require('mongoose');
var yargs = require("yargs");
var path = require('path');
var howtouse = "Usage: $0 <-l level> [ping [nodes]|discover [links]|generate [collectd_snmp|collectd_ping]|monitor [links|users|path]|update [interfaces|links|bandwidth|routing|sysinfo|ospf]|add [node|link] <file.json>]";

var options = {
    basedir: path.join(__dirname, 'config')
};

var check_parameters = function(argv) {
    var sections = {
        generate: [ "collectd_snmp", "collectd_ping", "collectd_routeros" ],
        monitor: [ "links", "users", "path" ],
        discover: [ "links" ],
        update: [ "interfaces", "links", "bandwidth", "routing", "sysinfo", "ospf" ],
        add: [ "node", "link" ],
        ping: [ "nodes" ]
    };

    var section = argv._[0];
    var action = argv._[1];

    if (!sections[section] || sections[section].indexOf(action) == -1) {
        return false;
    }

    if (section === "add" && argv._.length !== 3) {
        return false;
    }

    return true;
};

var argv = yargs.usage(howtouse).alias('l', 'level').demand(2).check(check_parameters).argv;
var action = require(util.format("./lib/%s_%s", argv._[0], argv._[1]));
var optional = [];

var logLevel = argv.level,
    logger = require('../app/models/logger').initLogger(logLevel);

if (argv._.length > 2) {
    optional = argv._.slice(2, argv._.length);
}

setTimeout(function() {
    process.exit();
}, 1800000);

mongoose.connect(dburl);
action.execute(optional).then(function(results) {
    for (var i in results) {
        var res = results[i];
        if (res.state === 'rejected') {
            console.log(res.reason);
            logger.warn(res.reason);
        } else {
            logger.debug(res.value);
        }
    }
}).fail(function(err) {
    console.log(err);
}).done(function() {
    mongoose.disconnect();
    setTimeout(function() {
        process.exit(-1);
    }, 3000);
});
