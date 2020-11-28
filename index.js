#!/usr/bin/env node

// Identities can be created with the -n option or setup manually by adding a subfolder to  {configbase}/identities"
// The folder should be named as the users gmail or gsuite address and contain
// an OAuth 2.0 Client ID file named "credentials.json" (see README.md on how to get this file from google ).
// Also an "options.json" file for this identity (see createIdentity for the default_options).
// The script will look for any existing identities and add them to ID


const fs = require('fs');
const {google} = require('googleapis');


// check if run as a sub-process
let _is_subprocess = true
if (!process.send) { _is_subprocess = false }

// check if run as a module
let _is_module = true
if (require.main === module) { _is_module = false }
//console.log(`module: `, _is_module);

// setup the outputs
let mEmitter


let altconfig = null
let new_identity = null
let authInfo = { needed:false, id:null, key:null }
let _list_ids = false
let _do_job = false
let job_text = null

let args = process.argv
//console.log("command line", args);
// check for cmd line options
args.forEach((item, i) => {
    // use alternate config location (cli and fork only)
    if (item === "-c" || item === "/c") { altconfig = args[i+1]}
    // add new identity
    if (item === "-n" || item === "/n") { new_identity = args[i+1]}
    // authorize an identity
    if (item === "-a" || item === "/a") {
        authInfo.needed = true ;
        authInfo.id = args[i+1];
        if (args[i+2]) {
            console.log("debug setting authInfo.key value");
            authInfo.key = args[i+2];}
        }

    // list identities
    if (item === "-l" || item === "/l") { _list_ids = true }
    // send mail object
    if (item === "-j" || item === "/j") { _do_job = true ; job_text = args[i+1] }
});


// setup config location
let osuser
let configbase

// If the scopes change your token will need to be deleted so it can be regenerated
const GmailScopes = ['https://www.googleapis.com/auth/gmail.send']

let ID = {}


// setup the ID object for cli and fork
if (!_is_module) {
    setConfig()
}



//-----------------------------COMMAND LINE----------------------------------------
function cliOut(packet) {
    console.log(JSON.stringify(packet,null,4));
    process.exit()
}

// check for new identity to add
if (new_identity !== null) {
    createIdentity(new_identity.toLowerCase())
}

// check for auth requests
if (authInfo.needed === true) {
    handleAuthRequest(authInfo)
}

if (_list_ids) {
    cliOut(listIdentities())
}


// execute a job if requested from the command line
if ( _do_job ) {
    // try to parse the json
    let jobJson
    try {
        jobJson = JSON.parse(job_text)
    } catch (e) {
        let output = { type:"job", status:"error", errors:[] }
        output.errors.push("Error parsing json string for job");
        cliOut(output)
        return
    }
    // json is good try to handle the job
    handleJobs(jobJson)
}

//-----------------------------SUB-PROCESS & MODULE---------------------------------------

// setop message handling for sub-process
if ( _is_subprocess ){
    hookToMainProcess()
}

if ( _is_module ){
    initModule()
}

function hookToMainProcess() {
    process.on('message', (packet) => {
        //console.log('Message from parent process', packet);
          if (packet.type === "auth") {
              handleAuthRequest(packet)
          }
          else if (packet.type === "create") {
              createIdentity(packet.id)
          }
          else if (packet.type === "list") {
              packet.list = listIdentities()
              process.send(packet)
          }
          else if (packet.type === "job") {
              handleJobs(packet)
          }
          else if (packet.type === "config") {
              setConfig(packet)
          }
          else if (packet.type === "exit") {
              process.exit()
          }
          else {
              // for unknow packet types send back as error packet
              packet.status = "error"
              packet.errors = ['Invalid packet type']
              process.send(packet)
              //console.log('Unknown type', packet);
          }
      });
}


function initModule() {
    const EventEmitter = require('events');
    class ModEmitter extends EventEmitter {}
    mEmitter = new ModEmitter();

    exports.auth = handleAuthRequest;
    exports.create = createIdentity;
    exports.list = listIdentities;
    exports.job = handleJobs;
    exports.config = setConfig;
    exports.msg = mEmitter;

    console.log("NGW Module has been initiated");

}


//------------------------------------COMMON FUNCTIONS----------------------------------------------
// set the configuration location
// for cli and fork this will be called on scrip[t startup
// for module usage you will need to call it explicitly after require
//*** maybe add mac in here too
function setConfig(path = "default"){

    if (path !== "default") {
         configbase = path
         if (process.platform === 'win32') { configbase = path.replace(/\\/g, "/") }
    } else {
        if (process.platform === 'win32') {
            osuser = process.env.USERNAME
            // for windows we will convert to forward slashes like linux
            if (altconfig === null) {
                configbase = process.env.APPDATA.replace(/\\/g, "/")
            } else {
                configbase = altconfig.replace(/\\/g, "/")
                //console.log("using alt config");
            }

        }
        else if (process.platform === 'linux') {
            if (altconfig === null) {
                osuser = process.env.USER
                configbase = process.env.HOME + "/" +".config"
            } else {
                configbase = altconfig
                //console.log("using alt config");
            }

        }
    }
    if ( configbase.endsWith("/") ) { configbase += "node-gmail-worker" } else { configbase += "/node-gmail-worker"}
    if ( !fs.existsSync( configbase ) ) {
        //console.log("Creating config folder", configbase);
        fs.mkdirSync( configbase, { recursive: true } )
    }
    //console.log( osuser , configbase);
    parseIdentities()
}



// this will check for each part of an entity and create or re-create it's entry in ID
function registerIdentity(id) {
    ID[id] = {}
    ID[id].token_path = configbase +"/identities/"+id+"/token.json"
    if ( fs.existsSync( configbase +"/identities/"+id+"/credentials.json" ) ) {
        ID[id].creds = JSON.parse( fs.readFileSync(configbase +"/identities/"+id+"/credentials.json",'utf8') )

    }
    if ( fs.existsSync( configbase +"/identities/"+id+"/options.json" ) ) {
        ID[id].options = JSON.parse( fs.readFileSync(configbase +"/identities/"+id+"/options.json",'utf8') )
    }
    if (fs.existsSync(ID[id].token_path)){
        ID[id].token = JSON.parse( fs.readFileSync(ID[id].token_path,'utf8') )
    }


}

// this will check for the idetities folder and register any identities it contains
function parseIdentities(){
    if ( fs.existsSync( configbase +"/identities") ) {
        let idlist =  fs.readdirSync(configbase +"/identities")
        if (idlist.length === 0) { _ids_ok = false }
        for (var i = 0; i < idlist.length; i++) {
            let id = idlist[i]
            registerIdentity(id)
        }
    } else {
        // create the identities folder if missing
        fs.mkdirSync( configbase+"/identities", { recursive: true } )
    }

}

// returns a array of Identities and their status
function listIdentities() {
    let list = []
    for (let id in ID) {
        list.push({})
        let i = list.length - 1
        list[i].id = id
        list[i].creds = "missing"
        if (ID[id].creds) { list[i].creds = "ok" }
        list[i].options = "missing"
        if (ID[id].options) { list[i].options = "ok" }
        list[i].token = "missing"
        if (ID[id].token) { list[i].token = "ok" }

    }
    return list
}



function handleAuthRequest(packet) {
    let id = packet.id;
    if (packet.key == null) { // catch null and undefined
        // no key so get the auth url
        getAuthUrl(packet)
    } else {
        // we have a key get a token
        getAuthToken(packet)
    }
}

// try to use credentials.json to create an authUrl
function getAuthUrl(packet) {
    let id = packet.id;
    packet.errors = []
    try {
        const {client_secret, client_id, redirect_uris} = ID[id].creds.installed;
        const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
        packet.authUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: GmailScopes,
        });
        packet.status = "done"
    } catch (e) {
        packet.errors.push("Error creating oauth client");
        if (ID[id].creds) { packet.errors.push("Invalid credentials.json"); }
        else  { packet.errors.push("missing credentials.json"); }
        packet.status = "error"

        // setup error responce
    } finally {
        // return the url to the caller
        if (_is_subprocess) {
            process.send(packet)
        }
        else if (_is_module) { // may need to be an mEmitter.emit
            mEmitter.emit("auth", packet)
            //return packet
        } else {
            cliOut(packet)
        }
    }



}


// use a key provided by the user to create and save an auth token
function getAuthToken(packet) {
    let id = packet.id
    let key = packet.key
    function sendResponce( _has_error = false){
        if (_has_error) {packet.status = "error"}
        if (_is_subprocess) {
            process.send(packet)
        }
        else if (_is_module) {
            mEmitter.emit("auth", packet)
            //return packet
        } else {
            cliOut(packet)
        }
    }
    let oAuth2Client
    try {
        const {client_secret, client_id, redirect_uris} = ID[id].creds.installed;
        oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    } catch (e) {
        packet.errors.push("Error creating oauth client");
        if (ID[id].creds) { packet.errors.push("Invalid credentials.json"); }
        else  { packet.errors.push("missing credentials.json"); }
        sendResponce(true)
        return
    }

    oAuth2Client.getToken(key, (err, token) => {
        if (err) {
            packet.errors.push(`Error retrieving access token for ${id}`);
            packet.errors.push(err)
            sendResponce(true)
            return
        } else {
            oAuth2Client.setCredentials(token);
            // Store the token to disk for later program executions
            fs.writeFile(ID[id].token_path, JSON.stringify(token), (err) => {
                if (err) {
                    packet.errors.push(`Error writing access token to file for ${id}`);
                    packet.errors.push(err)
                    sendResponce(true)
                    return
                } else {
                    // token is good and saved
                    registerIdentity(id)
                    packet.status = "done"
                    sendResponce()

                }

            });
        }
    });


}





function emailValid(id){
    var mailformat = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if( id.match(mailformat) ){
        return true;
    } else {
        return false;
    }
}

// create the folder and options.json for a new identity
// This is a syncronus operation so as a module it will directly
// return the output instead of emitting an event
function createIdentity(id) {
    id = id.toLowerCase()
    let output = {type:"create", status:"done" , id:id, path:"", errors:[], results:[] }
    if (ID[id]){
        output.status = "error"
        output.errors.push(`Create identity failed: Already exists ${id}  `)
        //console.log();
        //return false
    }
    else if ( !emailValid(id)  ){
        output.status = "error"
        output.errors.push(`Create identity failed: Invalid email address ${id}  `)
    }
    else { //*** maybe need to catch write error here as well( or at least test for them)
        output.path =  configbase+"/identities/"+id
        let default_options = { dname:id , pre_body:"", post_body:"", cc:[] }
        try {
            fs.mkdirSync( output.path , { } )
            fs.writeFileSync(output.path + "/options.json", JSON.stringify(default_options,null,4) )
        } catch (e) {
            output.status = "error"
            output.errors.push(`Create identity failed: unable to create ${output.path}  `)

        }
    }
    if (output.status === "done") {
        output.results.push(`Identity created for ${id}`)
        output.results.push(`You must place Google OAuth 2.0 client ID credentials at the following location`)
        output.results.push(`${configbase}/identities/${id}/credentials.json`)
        registerIdentity(id)
    }

    if (_is_subprocess) {
        process.send(output)
    }
    else if (_is_module) {
        return output
    } else {
        cliOut(output)
    }
}


function handleJobs(packet) {
    //console.log("Processing job ", packet);
    let id = packet.id
    packet.errors = []
    if (!ID[id]) {
        console.log( );
        if (_is_subprocess) {
            packet.errors.push("Invalid id: job canceled")
            packet.status = "error"
            process.send(packet)
        }
        return
    }
    if (packet.job === "send") {
        authorize(id, packet , sendMail)
    }
}


// try to create oauth client to use for job
function authorize(id, packet, callback) {
    let oAuth2Client
    try {
        const {client_secret, client_id, redirect_uris} = ID[id].creds.installed;
        oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    } catch (e) {

    }

    oAuth2Client.setCredentials(ID[id].token);

    // need to test and implemnt check if access token expired.
    // maybe compare to current tokens and update if needed
    oauth2Client.on('tokens', (tokens) => {
        console.log("oauth tokens event ", tokens);
        /*if (tokens.refresh_token) {
            // store the refresh_token in my database!
            console.log(tokens.refresh_token);
        }
        console.log(tokens.access_token);*/
    });

    callback(id, packet, oAuth2Client);

}


async function sendMail(id, packet, auth) {
    // You can use UTF-8 encoding for the subject using the method below.
    // You can also just use a plain string if you don't need anything fancy.
    let data = packet.data
    const gmail = google.gmail({version: 'v1', auth:auth});
    const subject = data.subject;
    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
    // replace any missing options from default options
    if (!data.options) { data.options = {}  }
    for (let opt in ID[id].options) {
        if (!data.options[opt]) { data.options[opt] = ID[id].options[opt]  }
    }
    const messageParts = [
        `From: ${data.options.dname} <${id}>`,
        `To: ${data.toName} <${data.toAddr}>`,
        'Content-Type: text/html; charset=utf-8',
        'MIME-Version: 1.0',
        `Subject: ${utf8Subject}`,
        '',
        `${data.options.pre_body}`,
        `${data.body}`,
        `${data.options.post_body}`,
    ];
    const message = messageParts.join('\n');

    // The body needs to be base64url encoded.
    const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

    const res = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
            raw: encodedMessage,
        },
    });
    //console.log("got responce from gmail",res); //res.data
    packet.status = "done"
    packet.results = res
    if (_is_subprocess === true) {
        process.send(packet)
    }
    else if (_is_module) {
        mEmitter.emit("job", packet)
    } else {
        cliOut(packet)
    }

}
