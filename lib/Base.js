(function() {
    'use strict';

    const log = require('ee-log');
    const inquirer = require('inquirer');
    const fs = require('fs');
    const path = require('path');
    const EventEmitter = require('events');


    

    module.exports = class Base extends EventEmitter {





        loadConfig() {
            if (!this.configPath) this.configPath = path.join(this.configDir, this.configName+'.json');

            if (fs.existsSync(this.configPath)) {
                try {
                    this.config = JSON.parse(fs.readFileSync(this.configPath));
                } catch (e) {
                    this.error(`Failed to load the config file ${this.configPath}: ${e.message}`).exit(10);
                }
            }
            else this.config = {};


            if (!this.config.serial) this.config.serial = 1;
            if (!this.config.version) this.config.version = this.version;
        }





        saveConfig() {
            if (!this.configPath) this.configPath = path.join(this.configDir, this.configName+'.json');

            try {
                fs.writeFileSync(this.configPath, JSON.stringify(this.config || {}, null, 4));
            } catch (e) {
                this.error('Failed to save the config file ${this.configPath}: ${e.message}').exit(2);
            }
        }






        getInput(questions) {
            return new Promise((resolve) => {
                inquirer.prompt(questions, (answers) => {
                    resolve(answers);
                });
            });
        }




        info(text) {
            console.log((text+'').white);
            return this;
        }


        debug(text) {
            console.log((text+'').grey);
            return this;
        }


        warn(text) {
            console.log((text+'').yellow);
            return this;
        }


        error(text) {
            console.log((text+'').red);
            return this;
        }


        success(text) {
            console.log((text+'').green);
            return this;
        }


        log(input) {
            log(input);
        }


        exit(code) {
            process.exit(code);
        }
    };




    module.exports.prototype.configDir = '/etc/burp-report/';
    module.exports.prototype.version = '1.0.0';
})();
