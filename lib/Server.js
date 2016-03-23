(function() {
    'use strict';

    const type = require('ee-types');
    const Base = require('./Base');
    const pem = require('pem');
    const log = require('ee-log');
    const path = require('path');
    const fs = require('fs');
    const prompt = require('prompt');
    const Crypto = require('./Crypto');


    

    module.exports = class Server extends Base {


        constructor(cli) {
            super();


            this.cli = cli;


            switch (cli.command) {
                case 'initialize':
                    this.initialize();
                    break;

                default:
                    this.warn(`Unknown server command '${cli.command}'!`);
            }
        }






        initialize() {
            let crypto = new Crypto();


            Promise.resolve().then(() => {

                // check if we should replace existing items
                if (fs.existsSync(path.join(this.configDir, 'ca.pem'))) {
                    return this.getInput({
                          description: `Found an existing CA. Overwrite? [yN]`
                        , pattern: /y|n|yes|no/i
                        , message: `Please enter 'y' or 'n' or nothing`
                        , required: true
                    }).then((data) => {
                        log(data);
                    });
                }
                else return Promise.resolve();
            }).then(() => {
                crypto.createCA({
                      country       : this.cli.params.country       || 'CH'
                    , state         : this.cli.params.state         || 'BE'
                    , locality      : this.cli.params.locality      || 'Bern'
                    , organization  : this.cli.params.organization  || 'burp-reporters'
                    , unit          : this.cli.params.unit          || 'IT Services'
                    , commonName    : 'burp-report-server'
                    , emailAddress  : this.cli.params.email         || 'email@example.com'
                }).then((ca) => {
                    log(ca);
                }).catch(this.error.bind(this));
            });
            

            
        }





    };
})();
