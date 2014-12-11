'use strict';

module.exports = function (grunt, options) {
    return {
        jscs: {
            src: [ "app/**/*.js", "public/**/*.js", "app.js" ]
        }
    };
};
