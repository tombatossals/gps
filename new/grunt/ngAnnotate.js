'use strict';

module.exports = {
    options: {},
    dist: {
        files: {
            '../static/dist/app.js': [
                '../static/components/ngInfiniteScroll/build/ng-infinite-scroll.min.js',
                '../static/components/angular-disqus/angular-disqus.min.js',
                '../static/components/satellizer/satellizer.js',
                '../static/components/angular-markdown-directive/markdown.js',
                '../static/components/angulartics/dist/angulartics.min.js',
                '../static/components/angulartics/dist/angulartics-ga.min.js',
                '../static/components/ngprogress/build/ngProgress.min.js',
                '../static/components/showdown/compressed/showdown.js',
                '../static/components/angular-markdown-directive/markdown.js',
                'public/js/app.js',
    		    'public/js/controllers/*.js',
    		    'public/js/directives/*.js',
    		    'public/js/services/*.js',
                'public/js/filters/*.js',
                'tmp/templates.js'
            ],
            '../static/dist/newcard-app.js': [
                'public/js/newcard-app.js',
                '../static/components/satellizer/satellizer.js',
            ],
            '../static/js/routes/board.js': [ 'public/js/routes/board.js' ],
            '../static/js/routes/info.js': [ 'public/js/routes/info.js' ],
            '../static/js/routes/error.js': [ 'public/js/routes/error.js' ],
            '../static/js/routes/card.js': [ 'public/js/routes/card.js' ]
        }
    }
};
