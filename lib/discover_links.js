'use strict';

var discoverNewLinks = require('./common').discoverNewLinks;

function execute(nodes) {
    return discoverNewLinks();
}

module.exports.execute = execute;
