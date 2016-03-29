(function() {
    'use strict';

    const type = require('ee-types');
    const Base = require('./Base');
    const log = require('ee-log');




    

    module.exports = class Client extends Base {


        constructor() {
            super();

            this.parse();
            this.initialize();
        }






        /** 
         * checks what to do
         */
        initialize() {
            if (this.params.server) {
                this.mode = 'server';

            }
            else if (this.params.client) {
                this.mode = 'client';

            }
            else if (this.params.report) {
                this.mode = 'report';

            }
            else this.warn(`Expected 'server', 'client' or 'report' as parameter 0!`).exit(1);
        }








        /**
         * configures the cli
         */
        parse() {
            let args = [];

            process.argv.slice(2).join(' ').replace(/(\s--|\s-)/gi, '$1@').split(/\s--|\s-/gi).forEach((arg) => {
                if (arg[0] !== '@') args.push(...arg.split(/\s/).map(v => ({name: v, value: true})));
                else {
                    if (/\s|=/gi.test(arg)) {
                        // kv pairs
                        let parts = arg.split(/\s|=/gi);
                        args.push({name: parts[0].slice(1), value: parts.slice(1).join(' ')});
                    }
                    else args.push({name: arg.slice(1), value: true});
                }
            });

            this.params = {};

            args.forEach(item => this.params[item.name] = item.value);
        }
    };
})();
