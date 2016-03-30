(function() {
    'use strict';

    const type = require('ee-types');
    const Base = require('./Base');
    const log = require('ee-log');
    const zlib = require('zlib');
    const path = require('path');
    const fs = require('fs');
    const semver = require('semver');


    

    module.exports = class Server extends Base {


        constructor(cli) {
            super();

            this.cli = cli;

            if (this.cli.params['add-server']) this.initialize();
            else this.warn(`Unknown client command!`).exit(1);
        }










        initialize() {
            if (this.cli.params.config) {
                let config = {};
                const semverVersion = this.version.substr(0, this.version.indexOf('.'))+'.x';


                try {
                    config = JSON.parse(zlib.inflateSync(new Buffer(this.cli.params.config, 'hex')).toString());
                } catch (e) {
                    this.error(`Failed to decode data: ${e.message}`).exit(1);
                }


                if (config.ca && 
                    config.cert && 
                    config.key && 
                    config.host &&
                    config.port &&
                    config.serverName &&
                    config.clientName &&
                    config.serverVersion && semver.satisfies(config.serverVersion, semverVersion)) {

                    const caPath = path.join(this.configDir, `${config.host}-ca.crt`);
                    const keyPath = path.join(this.configDir, `${config.host}-client.pem`);
                    const certPath = path.join(this.configDir, `${config.host}-client.crt`);

                    fs.writeFileSync(caPath, config.ca);
                    fs.writeFileSync(keyPath, config.key);
                    fs.writeFileSync(certPath, config.cert);

                    fs.chmodSync(caPath, '0600');
                    fs.chmodSync(keyPath, '0600');
                    fs.chmodSync(certPath, '0600');

                    fs.writeFileSync(path.join(this.configDir, `${config.host}-config.json`), JSON.stringify({
                          version: this.version
                        , name: config.clientName
                        , serverVersion: config.serverVersion
                        , server: config.serverName
                        , host: config.host
                        , port: config.port
                        , ca: caPath
                        , key: keyPath
                        , cert: certPath
                    }, null, 4));

                }
                else this.error('The data provided is invalid, please regenerate the data and make sure that the server and the client are using the same major version of the burp-report application (${semverVersion})!').exit(1);
            }
            else this.error('Missing data parameter!').exit(1);
        }
    };
})();
