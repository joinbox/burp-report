(function() {
    'use strict';

    const type = require('ee-types');
    const Base = require('./Base');
    const log = require('ee-log');
    const Burp = require('./Burp');
    const HTTPClient = require('./HTTPClient');
    const fs = require('fs');
    const path = require('path');
    const semver = require('semver');


    

    module.exports = class Server extends Base {


        constructor(cli) {
            super();

            this.cli = cli;


            this.httpClients = new Map();
            this.configs = new Map();


            if (this.cli.params.servers) this.reportAll(this.cli.params.servers);
            else this.warn(`Unknown report command!`).exit(1);
        }








        reportAll(serversString) {
            if (type.string(serversString) && serversString.length) {
                const servers = serversString.split(',').map(v => v.trim());

                // the clients name must have been provided
                if (type.string(this.cli.params.client) && this.cli.params.client.length) {
                    return Promise.all(servers.map((serverName) => {
                        return this.report(serverName, this.cli.params.client);
                    })).catch(this.log.bind(this));
                }
                else this.error(`Please provide the client name using the burp success param '--client %c'`);
            }
            else this.error(`Please provide the server names you wish to report to by using the '--servers server1,server2,..' flag!`);
        }



        






        report(serverName, clientName) {
            return this.getClient(serverName).then((httpClient) => {
                return httpClient.get(`/serial/${clientName}`);
            }).then((response) => {
                if (response.data && type.number(response.data.serial)) {
                    this.debug(`Got the serial ${response.data.serial} for the server ${serverName} and client ${clientName} ...`);

                    return this.getBURPReport(serverName, clientName, response.data.serial).then((reports) => {
                        return this.getClient(serverName).then((httpClient) => {
                            this.debug(`Sending ${reports.length} reports for the clienbt ${clientName} to the server ${serverName} ...`);

                            return httpClient.post(`/backup/${clientName}`, reports);
                        });
                    });
                }
                else return Promise.reject(`Failed to get the serial for the server ${serverName} and client ${clientName}!`);
            });
        }










        getBURPReport(serverName, clientName, serial) {
            return new Burp().report(clientName, serial);
        }












        getClient(serverName) {
            if (this.httpClients.has(serverName)) return Promise.resolve(this.httpClients.get(serverName));
            else {
                return this.getConfig().then((config) => {
                    this.httpClients.set(serverName, new HTTPClient(config));

                    return this.getClient(serverName);
                });               
            }
        }











        getConfig(serverName) {
            if (this.configs.has(serverName)) return Promise.resolve(this.configs.get(serverName));
            else {
                return new Promise((resolve, reject) => {
                    fs.readdir(this.configDir, (err, files) => {
                        if (err) reject(`Failed to list client config files: ${err.message}`);
                        else {
                            let config;

                            Promise.all(files.filter(f => /-config.json$/gi.test(f)).map((fileName) => {
                                return new Promise((subResolve, subReject) => {
                                    const filePath = path.join(this.configDir, fileName);

                                    fs.readFile(filePath, (err, data) => {
                                        if (err) subReject(`Failed to read config file '${filePath}': ${err.message}`);
                                        else {
                                            let localConfig;

                                            try {
                                                localConfig = JSON.parse(data);
                                            } catch (err) {
                                                return subReject(`Failed to parse config file '${filePath}': ${err.message}`);
                                            }

                                            if (localConfig.serverName === serverName) config = localConfig;
                                            subResolve();
                                        }
                                    });
                                });
                            })).then(() => {
                                if (config) {
                                    const semverVersion = this.version.substr(0, this.version.indexOf('.'))+'.x';

                                    if (semver.satisfies(config.version, semverVersion)) {
                                        this.configs.set(serverName, config);
                                        resolve(config);
                                    }
                                    else reject(`The configuration for the server '${serverName}' is of an incombatible version (${config.version} vs. ${semverVersion})!`);                                    
                                }
                                else reject(`Failed to load config for the server '${serverName}'!`);
                            });
                        }
                    });
                });
            }
        }
    };
})();
