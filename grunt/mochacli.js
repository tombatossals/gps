'use strict';


module.exports = {
		src: ['test/**/*.js'],
		options: {
		    timeout: 6000,
		    'check-leaks': true,
		    ui: 'bdd',
		    reporter: 'spec',
            env: {
                NODE_ENV: 'test'
            }
		}
};
