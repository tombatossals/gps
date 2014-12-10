'use strict';


module.exports = function pagespeed(grunt, options) {
	return {
      options: {
					nokey: true,
					locale: "es_ES",
					threshold: 40
      },
      local: {
					url: 'http://localhost:8000',
					options: {
					  	strategy: "desktop"
					}
      },
      mobile: {
	        options: {
	          	strategy: "mobile"
	        }
      }
    }
};
