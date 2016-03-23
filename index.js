(function() {
    'use strict';

    require('ee-log');

    let Cli = require('./lib/Cli');
    let Server = require('./lib/Server');
    let Client = require('./lib/Client');

    
    let cli = new Cli();

    if (cli.mode === 'server') new Server(cli);
    else if (cli.mode === 'client') new Client(cli);
    else cli.warn(`Cannot determine in which mode to run, please specifiy the mode in the config file using the 'mode' property and either 'client' or 'server' as value!`).exit(1);

})();
