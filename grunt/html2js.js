'use strict';


module.exports = {
		options: {
				base: 'public'
		},
		main: {
				src: [ 'public/partials/board.tpl.html', 'public/partials/card.tpl.html' ],
				dest: 'tmp/templates.js'
		}
};
