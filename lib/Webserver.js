(function() {
    'use strict';

    const type = require('ee-types');
    const Base = require('./Base');
    const Storage = require('./Storage');
    const log = require('ee-log');
    const https = require('https');
    const express = require('express');


    

    module.exports = class Webserver extends Base {


        constructor(options) {
            super();

            this.options = options;

            this.storage = new Storage();
            this.app = express();


            this.app.get('/serial/:client', this.getSerial.bind(this));
        }








        getSerial(request, response) {
            const serverName = request.socket.getPeerCertificate().subject.CN;
            const clientName = request.params.id;

            this.storage.getSerial(clientName, serverName).then((serial) => {
                response.json({
                      status: 'ok'
                    , serial: serial
                });
            }).catch((err) => {
                this.warn(`Operation failed: ${err.name}`);
                this.log(err);

                response.status(500).end();
            });
        }








        listen(bind, port) {
            this.debug('initializing webserver ...');

            this.server = https.createServer(this.options);
            this.server.on('request', this.app);

            this.server.listen(port, bind, (err) => {
                if (err) this.error(`Failed to create HTTPS Server on ${bind}:${port}: ${err.message}`).exit(12);
                else this.success(`The HTTPS Server is listening on ${bind}:${port}!`);
            });
        }
    };
})();
