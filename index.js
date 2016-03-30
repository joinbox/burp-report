(function() {
    'use strict';

    require('ee-log');

    const Cli = require('./lib/Cli');
    const Server = require('./lib/Server');
    const Client = require('./lib/Client');
    const Report = require('./lib/Report');

    
    const cli = new Cli();

    if (cli.mode === 'server') new Server(cli);
    else if (cli.mode === 'client') new Client(cli);
    else if (cli.mode === 'report') new Report(cli);
    else cli.warn(`Cannot determine in which mode to run, please specifiy the mode in the config file using the 'mode' property and either 'client', 'report' or 'server' as value!`).exit(1);

})();
