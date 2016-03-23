(function() {
    'use strict';

    const log = require('ee-log');
    const prompt = require('prompt');


    

    module.exports = class Base {



        getInput(schema) {
            return new Promise((resolve, reject) => {
                prompt.start();
                prompt.get({properties: schema}, (err, data) => {
                    if (err) reject(err);
                    else resolve(data);
                });
            });
        }




        info(text) {
            console.log((text+'').white);
            return this;
        }


        debug(text) {
            console.log((text+'').grey);
            return this;
        }


        warn(text) {
            console.log((text+'').yellow);
            return this;
        }


        error(text) {
            console.log((text+'').red);
            return this;
        }


        success(text) {
            console.log((text+'').green);
            return this;
        }


        log(input) {
            log(input);
        }


        exit(code) {
            process.exit(code);
        }
    };




    module.exports.prototype.configDir = '/etc/burp-report/';
})();
