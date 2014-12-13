'use strict';

module.exports = {
    options: {},
    dist: {
        files: {
            './public/dist/app.js': [
                'public/js/app.js',
                'public/js/controllers/map.js',
                'public/js/controllers/node.js',
                'public/js/controllers/link.js'
            ]
        }
    }
};
