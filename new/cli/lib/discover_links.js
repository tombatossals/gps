'use strict';

var network = require('../../app/models/network');

function execute(nodes) {
    return network.discoverNewLinks();
}

module.exports.execute = execute;
