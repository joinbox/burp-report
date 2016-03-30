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
    


let demoLog = `
-list begin-
2016-03-30 10:00:04: burp[599] Client version: 1.3.48
2016-03-30 10:00:04: burp[599] Begin phase1 (file system scan)
2016-03-30 10:00:12: burp[599] End phase1 (file system scan)
2016-03-30 10:00:12: burp[599] Begin phase2 (receive file data)
2016-03-30 10:00:12: burp[599] End phase2 (receive file data)
2016-03-30 10:00:12: burp[599] Begin phase3 (merge manifests)
2016-03-30 10:00:13: burp[599] End phase3 (merge manifests)
2016-03-30 10:00:13: burp[599] Backup ending - disconnect from client.
2016-03-30 10:00:13: burp[599] Begin phase4 (shuffle files)
2016-03-30 10:00:13: burp[599] Duplicating current backup.
2016-03-30 10:00:16: burp[599] first keep value: 24, backup: 306 (306-2=304)
2016-03-30 10:00:16: burp[599] do not need to hardlink archive (304%24=16)
2016-03-30 10:00:16: burp[599]  not doing hardlinked archive
2016-03-30 10:00:16: burp[599]  will generate reverse deltas
2016-03-30 10:00:16: burp[599] Doing the atomic data jiggle...
--------------------------------------------------------------------------------
Start time: 2016-03-30 10:00:03
  End time: 2016-03-30 10:00:32
Time taken: 00:29
                         New   Changed Unchanged   Deleted     Total |  Scanned
                   ------------------------------------------------------------
            Files:         0         1     61892         0     61893 |    61893
      Directories:         2         0     14745         0     14747 |    14747
       Soft links:         0         0       960         0       960 |      960
       Hard links:         0         0        11         0        11 |       11
      Grand total:         2         1     77608         0     77611 |    77611
                   ------------------------------------------------------------

             Warnings:             0

      Bytes estimated:    2729231366 (2.54 GB)
      Bytes in backup:    2729231366 (2.54 GB)
       Bytes received:             9
           Bytes sent:             0
--------------------------------------------------------------------------------
2016-03-30 10:00:32: burp[599] Backup completed.
2016-03-30 10:00:32: burp[599] End phase4 (shuffle files)
-list end-
`;




    module.exports = class Server extends Base {


        constructor() {
            super();
        }







        report(clientName, serial) {
            return this.parseReport(demoOutput, serial).then((backupList) => {
                return Promise.all(backupList.map((backupInfo) => {
                    return this.getLog(clientName, backupInfo.serial).then((data) => {
                        return this.parseLog(data);
                    }).then((info) => {
                        info.serial = backupInfo.serial;
                        info.deletable = backupInfo.deletable;
                        info.date = backupInfo.date;

                        return Promise.resolve(info);
                    });
                }));
            });


            return new Promise((resolve, reject) => {
                cp.exec(`burp-c /etc/burp/burp-server.conf -a S -C ${clientName}`, (err, stdout, stderr) => {
                    if (err) reject(err);
                    else this.parseReport(stdout.toString(), serial).then(resolve).catch(reject);
                });
            });
        }








        parseReport(report, serial) {
            let backups = report.split('\n').filter(v => /\d{7}\s\d{4}-\d{2}-\d{2}/gi.test(v)).map((line) => {
                let data = /(\d{7})\s(\d{4})-(\d{2})-(\d{2})\s(\d{2}):(\d{2}):(\d{2})\s?\(?([deltabe]*)\)?/gi.exec(line);

                return {
                      serial    : parseInt(data[1], 10)
                    , deletable : !!data[8].length
                    , date      : new Date(parseInt(data[2], 10), parseInt(data[3], 10)-1, parseInt(data[4], 10), parseInt(data[5], 10), parseInt(data[6], 10), parseInt(data[7], 10))
                };
            }).filter(item => item.serial > serial);

            return Promise.resolve(backups);
        }









        parseLog(logString) {
            let info = {};

            const startDate = /Start time: (\d{4})-(\d{2})-(\d{2})\s(\d{2}):(\d{2}):(\d{2})\s*$/mgi.exec(logString);
            const endDate = /End time: (\d{4})-(\d{2})-(\d{2})\s(\d{2}):(\d{2}):(\d{2})\s*$/mgi.exec(logString);

            if (startDate) info.startDate = new Date(parseInt(startDate[1], 10), parseInt(startDate[2], 10)-1, parseInt(startDate[3], 10), parseInt(startDate[4], 10), parseInt(startDate[5], 10), parseInt(startDate[6], 10));
            if (endDate) info.endDate = new Date(parseInt(endDate[1], 10), parseInt(endDate[2], 10)-1, parseInt(endDate[3], 10), parseInt(endDate[4], 10), parseInt(endDate[5], 10), parseInt(endDate[6], 10));

            info.duration = (/Time taken: (.+)$/mgi.exec(logString) || ['', ''])[1];

            info.bytes = {
                  estimated: parseInt((/Bytes estimated: (.+)\(?.*$/mgi.exec(logString) || ['', ''])[1], 10)
                , inBackup: parseInt((/Bytes in backup: (.+)\(?.*$/mgi.exec(logString) || ['', ''])[1], 10)
                , received: parseInt((/Bytes received: (.+)\(?.*$/mgi.exec(logString) || ['', ''])[1], 10)
                , sent: parseInt((/Bytes sent: (.+)\(?.*$/mgi.exec(logString) || ['', ''])[1], 10)
            };



            const files = /Files:\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/mgi.exec(logString);
            const dirs = /Directories:\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/mgi.exec(logString);
            const softLinks = /Soft links:\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/mgi.exec(logString);
            const hardLinks = /Hard links:\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/mgi.exec(logString);
            const total = /Grand total:\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/mgi.exec(logString);

            info.files = {
                  new: parseInt(files[1], 10)
                , changed: parseInt(files[2], 10)
                , unchanged: parseInt(files[3], 10)
                , deleted: parseInt(files[4], 10)
                , total: parseInt(files[5], 10)
            };

            info.directories = {
                  new: parseInt(dirs[1], 10)
                , changed: parseInt(dirs[2], 10)
                , unchanged: parseInt(dirs[3], 10)
                , deleted: parseInt(dirs[4], 10)
                , total: parseInt(dirs[5], 10)
            };

            info.softLinks = {
                  new: parseInt(softLinks[1], 10)
                , changed: parseInt(softLinks[2], 10)
                , unchanged: parseInt(softLinks[3], 10)
                , deleted: parseInt(softLinks[4], 10)
                , total: parseInt(softLinks[5], 10)
            };

            info.hardLinks = {
                  new: parseInt(hardLinks[1], 10)
                , changed: parseInt(hardLinks[2], 10)
                , unchanged: parseInt(hardLinks[3], 10)
                , deleted: parseInt(hardLinks[4], 10)
                , total: parseInt(hardLinks[5], 10)
            };

            info.total = {
                  new: parseInt(total[1], 10)
                , changed: parseInt(total[2], 10)
                , unchanged: parseInt(total[3], 10)
                , deleted: parseInt(total[4], 10)
                , total: parseInt(total[5], 10)
            };


            return Promise.resolve(info);
        }






        getLog(clientName, serial) {
            return Promise.resolve(demoLog);
            return new Promise((resolve, reject) => {
                cp.exec(`burp-c /etc/burp/burp-server.conf -a S -C ${clientName} -b ${serial} -z log.gz`, (err, stdout, stderr) => {
                    if (err) reject(err);
                    else this.parseReport(stdout.toString(), serial).then(resolve).catch(reject);
                });
            });
        }
    };
})();
