(function() {
    'use strict';

    const type = require('ee-types');
    const Base = require('./Base');
    const log = require('ee-log');
    const path = require('path');
    const zlib = require('zlib');
    const fs = require('fs');


    

    module.exports = class Webserver extends Base {


        constructor() {
            super();

            this.queue = [];
            this.loaded = false;
            this.loading = false;

            this.storageDir = path.join(this.configDir, 'data');
        }






        getSerial(clientName, serverName) {
            return this.load().then(() => {
                if (this.index.clients[clientName] && 
                    this.index.clients[clientName].serial &&
                    this.index.clients[clientName].serial[serverName]) {

                    Promise.resolve(this.index.clients[clientName].serial[serverName]); 
                }
                else return  Promise.resolve(0); 
            });
        }









        load() {
            if (this.loaded) return Promise.resolve();
            else {
                if (this.loading) {
                    let p = new Promise((resolve, reject) => {
                        if (this.loaded) resolve();
                        else this.queue.push({resolve: resolve, reject: reject});
                    });

                    return p;
                }
                else {
                    this.loading = true;
                    return this.ensureIndex().then(() => this.loadIndex()).then(() => {
                        this.loaded = true;
                        this.loading = false;

                        if (this.queue.length) this.queue.forEach(item => item.resolve());

                        return Promise.resolve();
                    }).catch((msg) => {
                        if (this.queue.length) this.queue.forEach(item => item.reject(msg));

                        this.error(msg).exit(20);
                    });
                }
            }
        }







        loadIndex() {
            return this.loadFile('index.json').then((data) => {
                this.index = data;
                return Promise.resolve();
            }).catch(this.error.bind(this));
        }







        ensureIndex() {
            const filePath = path.join(this.storageDir, 'index.json');


            return new Promise((resolve, reject) => {
                fs.stat(filePath, (err, stats) => {
                    if (err || !stats.isFile()) {
                        this.saveFile('index.json', {
                              version: this.version
                            , clients: {}
                        }).then(resolve).catch(reject);
                    }
                    else {
                        fs.access(filePath, fs.R_OK, (err) => {
                            if (err) reject(`Cannot read from '${filePath}': ${err.message}`);
                            else resolve();
                        });
                    }
                });
            });
        }







        loadFile(fileName) {
            const filePath = path.join(this.storageDir, fileName);


            return new Promise((resolve, reject) => {
                fs.readFile(filePath, (err, buf) => {
                    if (err) reject(`Failed to load data from '${filePath}': ${err.message}`);
                    else {
                        if (/.gz$/.test(fileName)) {
                            zlib.gunzip(buf, (err, data) => {
                                if (err) reject(`Failed to decompress data in '${filePath}': ${err.message}`);
                                else resolve(data.toString());
                            });
                        } else resolve(buf.toString());
                    }
                });
            }).then((dataString) => {
                let data;

                try {
                    data = JSON.parse(dataString);
                } catch (err) {
                    return Promise.reject(`Failed to parse data from '${filePath}': ${err.message}`);
                }

                return Promise.resolve(data);
            });
        }







        saveFile(fileName, data) {
            const filePath = path.join(this.storageDir, fileName);


            return new Promise((resolve, reject) => {
                let dataString;

                try {
                    dataString = JSON.stringify(data, null, 4);
                } catch (err) {
                    reject(`Failed to encode data for '${filePath}': ${err.message}`);
                }

                if (/.gz$/.test(fileName)) {
                    zlib.gzip(dataString, (err, buf) => {
                        if (err) reject(`Failed to compress data for '${filePath}': ${err.message}`);
                        else resolve(buf);
                    });
                } else resolve(new Buffer(dataString));
            }).then((buf) => {
                fs.writeFile(filePath, buf, (err) => {
                    if (err) return Promise.reject(`Failed to save data in '${filePath}': ${err.message}`);
                    else return Promise.resolve();
                });
            });
        }
    };
})();
