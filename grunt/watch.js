'use strict';

module.exports = function (grunt, options) {
    return {
        source: {
            files: ['app/**/*.js', 'public/js/**/*.js', 'public/css/*.less'],
            tasks: [
                'build',
            ]
        }
    };
};
