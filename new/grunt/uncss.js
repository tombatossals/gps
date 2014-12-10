'use strict';


module.exports = {
		dist: {
	      options: {
	          csspath: '.build/css'
	      },
	      files: {
	          '.build/css/app.min.css': [ 'public/templates/*.dust', 'public/partials/*.html' ]
	      }
	  }
};
