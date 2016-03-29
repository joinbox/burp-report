(function() {
    'use strict';

    const type = require('ee-types');
    const Base = require('./Base');
    const log = require('ee-log');
    const pem = require('pem');


    

    module.exports = class Server extends Base {



        createKeyPair(options) {
            return this.createKey().then((key) => {
                return this.createCSR(key, options).then((csr) => {
                    return this.createCertificate({
                          csr: csr
                        , selfSigned: false
                        , key: options.caKey
                        , cert: options.caCert
                        , serial: options.serial
                    }).then((cert) => {
                        return Promise.resolve({
                              key: key
                            , cert: cert
                        });
                    });
                });
            });
        }





        
        createCA(options) {
            return this.createKey().then((key) => {
                return this.createCSR(key, options).then((csr) => {
                    return this.createCertificate({
                          selfSigned: true
                        , csr: csr
                        , key: key
                    }).then((cert) => {
                        return Promise.resolve({
                              key: key
                            , cert: cert
                        });
                    });
                });
            });
        }





        createCSR(key, options) {
            return new Promise((resolve, reject) => {
                pem.createCSR({
                      clientKey:            key
                    , keyBitsize:           2048
                    , hash:                 'sha256'
                    , country:              options && options.country      ? options.country       : 'CH'
                    , state:                options && options.state        ? options.state         : 'BE'
                    , locality:             options && options.locality     ? options.locality      : 'Bern'
                    , organization:         options && options.organization ? options.organization  : 'burp-reporters'
                    , organizationUnit:     options && options.unit         ? options.unit          : 'IT Services'
                    , commonName:           options && options.cn           ? options.cn            : 'burp-report-not-exactly-clear'
                    , emailAddress:         options && options.email        ? options.email         : 'email@example.com'
                }, (err, csr) => {
                    if (err) reject(err);
                    else resolve(csr.csr);
                });
            });
        }






        createCertificate(options) {
            return new Promise((resolve, reject) => {
                pem.createCertificate({
                      serviceKey: options.key
                    , serviceCertificate: options.cert
                    , selfSigned: options.selfSigned || false
                    , csr: options.csr
                    , days: options.days || 100*365
                    , serial: options.serial
                }, (err, cert) => {
                    if (err) reject(err);
                    else resolve(cert.certificate);
                });
            });
        }






        createKey() {
            return new Promise((resolve, reject) => {
                pem.createPrivateKey(2048, {
                      keyBitsize: 2048
                    , cipher: 'aes256'
                }, (err, key) => {
                    if (err) reject(err);
                    else resolve(key.key);
                });
            });
        }
    };
})();
