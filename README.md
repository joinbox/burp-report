# burp-report

The burp-report application creates daily pdf reports for one or more burp servers.


[![npm](https://img.shields.io/npm/dm/burp-report.svg?style=flat-square)](https://www.npmjs.com/package/burp-report)
[![Travis](https://img.shields.io/travis/eventEmitter/burp-report.svg?style=flat-square)](https://travis-ci.org/eventEmitter/burp-report)
[![node](https://img.shields.io/node/v/burp-report.svg?style=flat-square)](https://nodejs.org/)


# Configuration

## 1. Setting up the Server

To initialize the server invoke the initialize command. The command asks you some basic
questions and creates a server.json config file. Additionally the ca and server certificates 
and keys are created. If any of the files exist they will not be touched (overwrite files using
the --force flag).

If asked for the fqdn you may either enter the dns name you have configured for the server or
a dynamically created xip.io address like my-report.127.0.0.1.xip.io. The fqdn is important as 
the left most part is used as server name (which is used by the clients).

    burp-report server intialize




## 2. Adding a client on the server

In order to set up a client you have first to set up the server. There can only be one client per machine and server.
If you run this command twice on the same server using the same client name all certificates will be replaced and
must be redeployed to the client machine using the command described in 3.

Each client has a unique name by which it is identified. When adding a client a new ssl key and certificate is
created. The key including some additional configuration data is printed to stdout. The key will never stored
on the filesystem.


    burp-report server --add-client myClientName





## 3. Setting up a client

On each client system one or more servers can be set up. The simplest way to set up the client is to use
the initialize command. That command expects the output of the `client add` command from the server as its input.
This command also asks for some information concerning the burp server if not already configured before (host, port).


    burp-report client initialize --data A7655BDFF23[...]33BBCFE556


After the client is initialized the burp server should be configured to call the burp-report when a backup 
has finished (success_notify_script). You have to pass the names of the servers you want to write the reports to. 
The name of the server is the leftmost part of the servers fqdn (my-report for my-report.127.0.0.1.xip.io or 
backup for backup.joinbox.com).

    
    burp-report report --servers backup,standby 




## 4. removing clients

If you wish to remove a client that you cannot access and thus disable on the client side you can add its name to the 
blacklist in the server.json config file. The applciation makes use of blacklists because authorizing a client is
done by valdiating its certificates (client certificate authentication) which is always secure.






## Files

All files are created by the burp-report application. See the commands above.

config direrctory: `/etc/burp-report/`

**Relevant Server Files**
````
filename                            description
---------------------------------------------------------
server.json                         server configuration
ca.pem                              certificate authority key
ca.crt                              certificate authority certificate
server-{fqdn}.pem                   server key
server-{fqdn}.crt                   server certificate
````

**Relevant Client Files**
````
filename                            description
---------------------------------------------------------
burp.json                           config for acceesing the local burp server
server-{server-fqdn}.json           config for a specific server
server-{server-fqdn}.crt            server certificate for a specific server (one per server)
client-{server-fqdn}.pem            client key for accessing a specific server (one per server)
````







#### server.json

    {
          "version"     : "1.0"
        , "port"        : 4387
        , "bind"        : "0.0.0.0"
        , "host"        : "backup.joinbox.com"
        , "ca": {
              "key"     : "ca.pem"
            , "cert"    : "ca.crt"
        }
        , "server": {
              "key"     : "server.pem"
            , "cert"    : "server.crt"
        }
        , "blacklist"   : ["client-that-does-not-pay-the-bills"]
    }





#### burp.json

    {
          "version"     : "1.0"
        , "host"        : "127.0.0.1"
        , "port"        : 4455
        , "client"      : "restoreClientName"
        , "burpVersion" : "1.x"
    }





#### server-{server-fqdn}.json

    {
          "version"     : "1.0"
        , "host"        : "backup.joinbox.com"
        , "port"        : 6872
        , "key"         : "client-{server-fqdn}.pem"
        , "cert"        : "client-{server-fqdn}.crt"
        , "ca"          : "ca-{server-fqdn}.crt"
    }