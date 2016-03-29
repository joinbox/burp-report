(function() {
    'use strict';

    const type = require('ee-types');
    const Base = require('./Base');
    const pem = require('pem');
    const log = require('ee-log');
    const zlib = require('zlib');
    const path = require('path');
    const fs = require('fs');
    const Crypto = require('./Crypto');


    

    module.exports = class Server extends Base {


        constructor(cli) {
            super();


            this.cli = cli;


            if (this.cli.params.initialize) this.initializeCA();
            else if (this.cli.params['add-client'] !== undefined) this.addClient();
            else this.warn(`Unknown server command '${cli.command}'!`).exit(1);
        }








        addClient() {
            const commonName = this.cli.params['add-client'];

            if (!type.string(commonName) || commonName.length < 1) this.error(`Please specify the client name 'burp-report server --add-client <clientName>'`).exit(5);


            const crypto = new Crypto();


            this.info('Please enter data used for creating the client certificate and key');

            return this.collectInfo().then((data) => {
                const caKeyPath = path.join(this.configDir, 'ca.pem');
                const caCertPath = path.join(this.configDir, 'ca.crt');

                // check for the ca key && certificate
                if (fs.existsSync(caKeyPath) && fs.existsSync(caCertPath)) {
                    const caKey = fs.readFileSync(caKeyPath);
                    const caCert = fs.readFileSync(caCertPath);


                    return crypto.createKeyPair({
                          country       : data.country      || this.config.country
                        , state         : data.state        || this.config.state
                        , locality      : data.locality     || this.config.locality
                        , organization  : data.organization || this.config.organization
                        , unit          : data.unit         || this.config.unit
                        , email         : data.email        || this.config.email
                        , cn            : commonName
                        , caKey         : caKey
                        , caCert        : caCert
                        , serial        : this.config.serial++
                    }).then((cert) => {

                        const dataBuffer = new Buffer(JSON.stringify({ca: caCert.toString(), cert: cert.cert.toString(), key: cert.key.toString()}));

                        // compress
                        const dataString = zlib.deflateSync(dataBuffer).toString('base64');
                        
                        this.success('The client certificate was created. You can enable a client by executing the following command on it:');
                        this.info(`burp-report client initialize --data ${dataString}`);

                        this.saveConfig();

                        return Promise.resolve();
                    });
                }
                else this.error(`Failed to load the ca files '${caKeyPath}' and '${caCertPath}'. Please make sure they exist or initialize the server with the 'burp-report server initialize' command!`).exit(3);
            }).catch(this.error.bind(this));
        }










        initializeCA() {
            const crypto = new Crypto();


            return Promise.resolve().then(() => {

                // check if we should replace existing items
                if (fs.existsSync(path.join(this.configDir, 'ca.pem'))) {
                    return this.getInput({
                          type: 'confirm'
                        , message: `Found an existing CA. Overwrite?`
                        , default: false
                        , name: 'overwriteCA'
                    }).then((data) => {
                        if (data.overwriteCA === true) return this.collectCAInfo();
                        else return Promise.reject('Not overwriting the existing ca. Exiting!');
                    });
                }
                else return this.collectCAInfo();
            }).then(() => {

                // create the ca
                return crypto.createCA({
                      country       : this.config.country       || 'CH'
                    , state         : this.config.state         || 'BE'
                    , locality      : this.config.locality      || 'Bern'
                    , organization  : this.config.organization  || 'burp-reporters'
                    , unit          : this.config.unit          || 'IT Services'
                    , email         : this.config.email         || 'email@example.com'
                    , cn            : 'burp-report-ca'
                }).then((ca) => {
                    const keyPath = path.join(this.configDir, 'ca.pem');
                    const crtPath = path.join(this.configDir, 'ca.crt');

                    fs.writeFileSync(keyPath, ca.key);
                    this.debug(`stored ca key in '${keyPath}'`);
                    fs.writeFileSync(crtPath, ca.cert);
                    this.debug(`stored ca certificate in '${crtPath}'`);

                    return Promise.resolve(ca);
                });
            }).then((ca) => {

                // create the server certificates
                return crypto.createKeyPair({
                      country       : this.config.country       || 'CH'
                    , state         : this.config.state         || 'BE'
                    , locality      : this.config.locality      || 'Bern'
                    , organization  : this.config.organization  || 'burp-reporters'
                    , unit          : this.config.unit          || 'IT Services'
                    , email         : this.config.email         || 'email@example.com'
                    , cn            : 'burp-report-server'
                    , caKey         : ca.key
                    , caCert        : ca.cert
                    , serial        : this.config.serial++
                }).then((cert) => {
                    const keyPath = path.join(this.configDir, 'server.pem');
                    const crtPath = path.join(this.configDir, 'server.crt');

                    fs.writeFileSync(keyPath, cert.key);
                    this.debug(`stored server key in '${keyPath}'`);
                    fs.writeFileSync(crtPath, cert.cert);
                    this.debug(`stored server certificate in '${crtPath}'`);

                    this.saveConfig();

                    return Promise.resolve(cert);
                });

            }).catch(this.error.bind(this));
        }






        collectCAInfo() {
            this.info('Please enter data used for creating the ca and server certificates:');
            return this.collectInfo((data) => {
                Object.keys(data).forEach((key) => {
                    this.config[key] = data[key];
                });

                this.saveConfig();

                return Promise.resolve();
            });
        }






        collectInfo() {
            return this.getInput([{
                  type: 'input'
                , message: `Two Letter Country Code`
                , default: this.config.country || 'CH'
                , name: 'country'
            }, {
                  type: 'input'
                , message: `Two Letter State Code`
                , default: this.config.state || 'BE'
                , name: 'state'
            }, {
                  type: 'input'
                , message: `City`
                , default: this.config.locality || 'Bern'
                , name: 'locality'
            }, {
                  type: 'input'
                , message: `Organization Name`
                , default: this.config.organization || 'MyCompany'
                , name: 'organization'
            }, {
                  type: 'input'
                , message: `Organizational Unit`
                , default: this.config.unit || 'IT Services'
                , name: 'unit'
            }, {
                  type: 'input'
                , message: `Email`
                , default: this.config.email || 'me@example.com'
                , name: 'email'
            }]);
        }


    };
})();
