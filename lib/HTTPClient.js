(function() {
    'use strict';

    const type = require('ee-types');
    const Base = require('./Base');
    const log = require('ee-log');
    const https = require('https');
    const fs = require('fs');
    const url = require('url');
    const path = require('path');
    const request = require('request');


    

    module.exports = class Webserver extends Base {


        constructor(config) {
            super();

            this.storage = new Map();

            this.config = config;
        }






        get(path) {
            return this.request('get', path);
        }







        request(method, path, data) {
            return this.loadCertificates().then(() => {
                return new Promise((resolve, reject) => {
                    const requestURL = url.format({
                          pathname: path
                        , hostname: this.config.host
                        , port: this.config.port
                        , protocol: 'https'
                    });



                    request({
                          url: requestURL
                        , method: method
                        , key: this.storage.get('key')
                        , cert: this.storage.get('cert')
                        , ca: this.storage.get('ca')
                        , body: data ? JSON.stringify(data) : undefined
                    }, (err, response) => {
                        if (err) reject(`The requets on the url '${requestURL}' failed: ${err.message}`);
                        else {
                            log(response.statusCode, response.headers, response.body);
                            if (response.statusCode === 200 || response.statusCode === 201) {
                                if (response.headers['content-type'] && 
                                    /application\/json/gi.test(response.headers['content-type']) && 
                                    response.body && response.body.length) {

                                    try {
                                        response.data = JSON.parse(response.body);
                                    } catch (err) {
                                        this.warn(`Failed to decode JSON response from '${requestURL}': ${err.message}`);
                                        this.log(response.body);
                                    }
                                }

                                resolve(response);
                            }
                            else reject(`Invalid response from '${requestURL}'. Status ${response.statusCode}`);
                        }
                    });
                });
            });
        }








        loadCertificates() {
            return Promise.all(['ca', 'cert', 'key'].map((key) => {
                if (this.storage.has(key)) return Promise.resolve();
                else {
                    return new Promise((resolve, reject) => {
                        const filePath = this.config[key];

                        fs.readFile(filePath, (err, file) => {
                            if (err) reject(`Fialed to load file '${filePath}': ${err.message}`);
                            else {
                                this.storage.set(key, file);
                                resolve();
                            }
                        });
                    });
                }
            }));
        }
    };
})();
