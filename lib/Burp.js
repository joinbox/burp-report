(function() {
    'use strict';

    const type = require('ee-types');
    const Base = require('./Base');
    const log = require('ee-log');
    const path = require('path');
    const fs = require('fs');
    const cp = require('child_process');


const demoOutput = `
 burp status                                                2016-03-30 11:36:03

   Client: node.s.soa.one
   Status: idle
   Backup list: 0000307 2016-03-30 11:00:04
                0000306 2016-03-30 10:00:04
                0000305 2016-03-30 09:00:04
                0000304 2016-03-30 08:00:04
                0000303 2016-03-30 07:00:03
                0000302 2016-03-30 06:00:04
                0000301 2016-03-30 05:00:03
                0000300 2016-03-30 04:00:03
                0000299 2016-03-30 03:00:03
                0000298 2016-03-30 02:00:03
                0000297 2016-03-30 01:00:04
                0000296 2016-03-30 00:00:03
                0000295 2016-03-29 23:00:03
                0000294 2016-03-29 22:00:03
                0000293 2016-03-29 21:00:03
                0000292 2016-03-29 20:00:03
                0000291 2016-03-29 19:00:03
                0000290 2016-03-29 18:00:03 (deletable)
                0000289 2016-03-29 17:00:02
                0000288 2016-03-29 16:00:03
                0000287 2016-03-29 15:00:03
                0000286 2016-03-29 14:00:02
                0000285 2016-03-29 13:00:03
                0000284 2016-03-29 12:00:02 (deletable)
                0000265 2016-03-28 17:00:00 (deletable)
                0000241 2016-03-27 16:59:58 (deletable)
                0000217 2016-03-26 15:59:56 (deletable)
                0000193 2016-03-25 15:59:55 (deletable)
                0000169 2016-03-24 15:59:53 (deletable)
                0000145 2016-03-23 15:59:51 (deletable)
                0000121 2016-03-22 15:59:49 (deletable)
                0000097 2016-03-21 15:59:47 (deletable)
                0000073 2016-03-20 15:59:46 (deletable)
                0000049 2016-03-19 15:59:44 (deletable)
                0000025 2016-03-18 15:59:42 (deletable)
                0000001 2016-03-17 15:59:39 (deletable)
`;
    

    module.exports = class Server extends Base {


        constructor() {
            super();
        }





        report(clientName) {
            return this.parseReport(demoOutput);
            return new Promise((resolve, reject) => {
                cp.exec(`burp-c /etc/burp/burp-server.conf -a S -C ${clientName}`, (err, stdout, stderr) => {
                    if (err) reject(err);
                    else {
                        this.parseReport(demoOutput);
                    }
                });
            });
        }




        parseReport(report) {
            let backups = report.split('\n').filter(v => /\d{7}\s\d{4}-\d{2}-\d{2}/gi.test(v)).map((line) => {
                let data = /(\d{7})\s(\d{4})-(\d{2})-(\d{2})\s(\d{2}):(\d{2}):(\d{2})\s?\(?([deltabe]*)\)?/gi.exec(line);

                return {
                      serial    : parseInt(data[1], 10)
                    , year      : parseInt(data[2], 10)
                    , month     : parseInt(data[3], 10)
                    , day       : parseInt(data[4], 10)
                    , hour      : parseInt(data[5], 10)
                    , minute    : parseInt(data[6], 10)
                    , second    : parseInt(data[7], 10)
                    , dletebale : !!data[8].length
                };
            });


            log(backups);
        }
    };
})();
