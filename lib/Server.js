(function() {
    'use strict';

    const type = require('ee-types');
    const Base = require('./Base');
    const log = require('ee-log');
    const https = require('https');
    const dns = require('dns');
    const zlib = require('zlib');
    const path = require('path');
    const fs = require('fs');
    const Crypto = require('./Crypto');
    const Webserver = require('./Webserver');


    

    module.exports = class Server extends Base {


        constructor(cli) {
            super();

            this.cli = cli;

            this.configName = 'server';
            this.loadConfig();


            if (this.cli.params.listen) this.startServer();
            else if (this.cli.params.initialize) this.initializeCA();
            else if (this.cli.params['add-client'] !== undefined) this.addClient();
            else if (this.cli.params.update && this.cli.params.host) this.updateHost(this.cli.params.host);
            else this.warn(`Unknown server command!`).exit(1);
        }








        startServer() {
            this.debug('loading ca files ...');

            this.loadCA().then((ca) => {

                this.debug('loading server certicifacte files ...');
                return this.loadKeyPair('server').then((server) => {

                    this.webserver = new Webserver({
                          key               : server.key
                        , cert              : server.cert
                        , ca                : ca.cert
                        , requestCert       : true
                        , rejectUnauthorized: true
                    });

                    this.webserver.listen(this.config.bind, this.config.port);
                });
            });
        }










        updateHost(host) {
            this.config.host = host;

            return this.loadCA().then((ca) => {
                 return this.createServerCertificates(ca);
            }).catch(this.error.bind(this));
        }











        addClient() {
            const commonName = this.cli.params['add-client'];

            if (!type.string(commonName) || commonName.length < 1) this.error(`Please specify the client name 'burp-report server --add-client <clientName>'`).exit(5);

            const crypto = new Crypto();

            this.info('Please enter data used for creating the client certificate and key');

            return this.collectInfo().then((data) => {

                return this.loadCA().then((ca) => {
                    return crypto.createKeyPair({
                          country       : data.country      || this.config.country
                        , state         : data.state        || this.config.state
                        , locality      : data.locality     || this.config.locality
                        , organization  : data.organization || this.config.organization
                        , unit          : data.unit         || this.config.unit
                        , email         : data.email        || this.config.email
                        , cn            : commonName
                        , caKey         : ca.key
                        , caCert        : ca.cert
                        , serial        : this.config.serial++
                    }).then((cert) => {

                        const dataBuffer = new Buffer(JSON.stringify({
                              ca: ca.cert.toString()
                            , cert: cert.cert.toString()
                            , key: cert.key.toString()
                            , host: this.config.host
                            , port: this.config.port
                            , serverName: this.config.serverName
                            , clientName: commonName
                            , serverVersion: this.version
                        }));

                        // compress
                        const dataString = zlib.deflateSync(dataBuffer).toString('hex');
                        
                        this.success('The client configuration was created. You can enable a client by executing the following command on the client:');
                        this.info(`burp-report client add-server --config ${dataString}`);

                        this.saveConfig();

                        return Promise.resolve();
                    });
                });
            }).catch(this.error.bind(this));
        }









        loadCA() {
            return this.loadKeyPair('ca').catch((e) => {
                return Promise.reject(`${e.message} You may initialize the server with the 'burp-report server initialize' command in order to create those files!`);
            });
        }








        loadKeyPair(name) {
            const keyPath = path.join(this.configDir, name+'.pem');
            const certPath = path.join(this.configDir, name+'.crt');

            // check for the ca key && certificate
            if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
                const key = fs.readFileSync(keyPath);
                const cert = fs.readFileSync(certPath);


                return Promise.resolve({
                      key: key
                    , cert: cert
                });
            }
            else return Promise.reject(`Failed to load the files '${keyPath}' and '${certPath}'. Please make sure they exist!`);
        }









        initializeCA() {
            const crypto = new Crypto();

            return this.collectBasicSettings().then(() => {


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
                    , cn            : `${this.config.organization}-ca`
                }).then((ca) => {
                    const keyPath = path.join(this.configDir, 'ca.pem');
                    const crtPath = path.join(this.configDir, 'ca.crt');

                    fs.writeFileSync(keyPath, ca.key);
                    fs.chmodSync(keyPath, '0600');
                    this.debug(`stored ca key in '${keyPath}'`);

                    fs.writeFileSync(crtPath, ca.cert);
                    fs.chmodSync(crtPath, '0600');
                    this.debug(`stored ca certificate in '${crtPath}'`);


                    this.config.ca = {
                          key: keyPath
                        , cert: crtPath
                    };


                    return Promise.resolve(ca);
                });
            }).then((ca) => {

                // create the server certificates
                return this.createServerCertificates(ca);
            }).catch(this.error.bind(this));
        }









        createServerCertificates(ca) {
            const crypto = new Crypto();


            return crypto.createKeyPair({
                  country       : this.config.country       || 'CH'
                , state         : this.config.state         || 'BE'
                , locality      : this.config.locality      || 'Bern'
                , organization  : this.config.organization  || 'burp-reporters'
                , unit          : this.config.unit          || 'IT Services'
                , email         : this.config.email         || 'email@example.com'
                , cn            : this.config.host
                , caKey         : ca.key
                , caCert        : ca.cert
                , serial        : this.config.serial++
            }).then((cert) => {
                const keyPath = path.join(this.configDir, 'server.pem');
                const crtPath = path.join(this.configDir, 'server.crt');

                fs.writeFileSync(keyPath, cert.key);
                fs.chmodSync(keyPath, '0600');
                this.debug(`stored server key in '${keyPath}'`);

                fs.writeFileSync(crtPath, cert.cert);
                fs.chmodSync(crtPath, '0600');
                this.debug(`stored server certificate in '${crtPath}'`);

                this.config.server = {
                      key: keyPath
                    , cert: crtPath
                };


                this.saveConfig();

                return Promise.resolve(cert);
            });
        }










        collectBasicSettings() {
            return Promise.resolve().then(() => {

                // maybe we have to configure the server first
                if (!this.config.host) {
                    this.warn(`This is the first time the server is started. Please make sure the data you enter is correct. You may later edit the data in the ${this.configPath} config file.`);

                    return this.getInput([{
                          type: 'input'
                        , message: `Please enter the fully qualified domain name of the server. It is later used to configure the clients and must be a valid and configured DNS name:`
                        , default: 'my-report-server.127.0.0.1.xip.io'
                        , name: 'host'
                    }, {
                          type: 'input'
                        , message: `Please enter the port the server should listen on:`
                        , default: '8773'
                        , name: 'port'
                    }, {
                          type: 'input'
                        , message: `Please enter the address the server should listen on:`
                        , default: '0.0.0.0'
                        , name: 'bind'
                    }]).then((data) => {

                        return new Promise((resolve, reject) => {
                            dns.lookup(data.host, (err, address) => {
                                if (err) reject(err);
                                else resolve(address);
                            });
                        }).then((address) => {
                            this.success(`The host ${data.host} resolved to the address ${address}. OK!`);

                            Object.keys(data).forEach((key) => {
                                this.config[key] = data[key];
                            });

                            this.config.serverName = this.config.host.slice(0, this.config.host.indexOf('.'));

                            this.saveConfig();

                            return Promise.resolve();
                        }).catch(() => {
                            return this.getInput([{
                                  type: 'confirm'
                                , message: `The DNS name ${data.host} could not be resolved, continue?`
                                , default: false
                                , name: 'continue'
                            }]).then((input) => {
                                if (input.continue) return Promise.resolve();
                                else return Promise.reject('DNS name resolution fialed. Exiting!');
                            });
                        });
                    });
                }
                else return Promise.resolve();
            });
        }







        collectCAInfo() {
            this.info('Please enter data used for creating the ca and server certificates:');
            return this.collectInfo().then((data) => {
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
