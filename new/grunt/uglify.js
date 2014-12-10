'use strict';


module.exports = {
    options: {
        banner: '/*! batmin.com <%= grunt.template.today("dd-mm-yyyy") %> */\n'
    },
    dist: {
        files: {
            '../static/dist/app.min.js': [ '../static/dist/app.js' ],
            '../static/dist/newcard-app.min.js': [ '../static/dist/newcard-app.js' ]
        }
    }
};
