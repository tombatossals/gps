'use strict';


module.exports = {
     options : {
         livereload: 7777
     },
     source: {
         files: [ 'public/js/**/*.js', 'controllers/js/**/*.js', 'public/partials/*.html' ],
         tasks: [ 'build' ]
     }
};
