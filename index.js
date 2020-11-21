const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');

//*** maybe want to check if we are a sub-process here
// this would allow to setup for working as a sub-process
// or as a main process directly the command line
let _is_subprocess = true
if (!process.send) {
    _is_subprocess = false
}


// check for cmd line options and setup the config location
let altconfig = null

// when _exit_when_done (-e) is true the script to run one action and exit once its complete
// this behavior may be achived in the caling scripts code as well
let _exit_when_done = false
let args = process.argv
console.log("cmd-args", args);
args.forEach((item, i) => {
    if (item === "-c") { altconfig = args[i+1]}
    if (item === "-e") { _exit_when_done = true}
});

let osuser
let configbase
if (altconfig === null) {}
//console.log(process.platform);
if (process.platform === 'win32') {
    osuser = process.env.USERNAME
    // for windows we will convert to forward slashes like linux
    if (altconfig === null) {
        configbase = process.env.APPDATA.replace(/\\/g, "/")
        configbase += "/node-gmail-utils"
    } else {
        configbase = altconfig.replace(/\\/g, "/")
    }

}
else if (process.platform === 'linux') {
    if (altconfig === null) {
        osuser = process.env.USER
        configbase = process.env.HOME + "/" +".config"+ "/" + "node-gmail-utils""
    } else {
        configbase = altconfig
    }

}

console.log( osuser , configbase);

// setup config and identities
let ID = {}
let LocalConfig = { /*this may not be needed*/}

function saveLocalConfig(restart = null) {
    fs.writeFileSync(configbase + "/config.json", JSON.stringify(LocalConfig,null,4) ) //
}


if ( !fs.existsSync( configbase ) ) {
    console.log("CREATE: user data folder", configbase);
    fs.mkdirSync( configbase, { recursive: true } )

    saveLocalConfig()
} else {
    if (fs.existsSync(configbase + "/config.json")) {
        console.log('LOAD: config.json.');
        LocalConfig = JSON.parse( fs.readFileSync(configbase + "/config.json",'utf8') )
    } else {
        saveLocalConfig()
    }

}


// identities are setup manually by adding a subfolder to  {configbase}/identities"
// the folder should be named as the users gmail or gsuite address
// inside this folder should be a OAuth 2.0 Client ID credentials.json (see README.md on how to get this file from google )
// and an options.json file for this identity
// we will look for any existing identities and add them to ID
// if no identities exist or any are missing credentials or options we will notify the user and exit

let _ids_ok = true

if ( fs.existsSync( configbase +"/identities") ) {
    let filelist =  fs.readdirSync(configbase +"/identities")
    for (var i = 0; i < filelist.length; i++) {
        let id = filelist[i]
        if ( fs.existsSync( configbase +"/identities/"+filelist[i]+"/credentials.json" ) ) {
            ID[id] = {}

            ID[id].creds = JSON.parse( fs.readFileSync(configbase +"/identities/"+filelist[i]+"/credentials.json",'utf8') )
            ID[id].token_path = configbase +"/identities/"+filelist[i]+"/token.json"

        } else {
            console.log(`Error loading client secret file: ${configbase}/identities/${filelist[i]}/credentials.json`);
            console.log(`You must place Google API credentials at the above location`);
            _ids_ok = false
        }
        if ( fs.existsSync( configbase +"/identities/"+filelist[i]+"/options.json" ) ) {
            if ( ID[id] ){
                ID[id].options = JSON.parse( fs.readFileSync(configbase +"/identities/"+filelist[i]+"/options.json",'utf8') )
            }

        } else {
            console.log(`Error loading options.json file: ${configbase}/identities/${filelist[i]}/options.json`);
            console.log(`You must create the file options.json at the above location`);
            _ids_ok = false
        }

    }
} else {
    fs.mkdirSync( configbase+"/identities", { recursive: true } )
    _ids_ok = false
}

if ( _ids_ok === false ) {
    console.log("Exiting due to invalid or missing google credentials");
    process.exit()
}


/*
// Load client secrets from a local file.
if (fs.existsSync(configbase + "/credentials.json")) {
    CREDS = JSON.parse( fs.readFileSync(configbase + "/credentials.json",'utf8') )
} else {
    // flesh this out add a link to google developer console
    console.log(`Error loading client secret file: ${configbase}/credentials.json`);
    console.log(`You must place Google API credentials at the above location`);
    process.exit()
}
*/

// If modifying these scopes, after a token has been generated you will
// need to delete the token so it can be regenerated
const SCOPES = [
    'https://mail.google.com/',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.compose',
    'https://www.googleapis.com/auth/gmail.send'
]

//const TOKEN_PATH = configbase + "/token.json";

// we may want to try to authorize() each identity at startup
// to make sure we have token for them all
for (let id in ID) {
    authorize(id, testForToken )
}

function testForToken(oAuth2Client, id) {

}


function authorize(id, callback) {
    const {client_secret, client_id, redirect_uris} = ID[id].creds.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

        // Check if we have previously stored a token.
        fs.readFile(ID[id].token_path, (err, token) => {
            if (err) return getNewToken(id, oAuth2Client, callback);
            oAuth2Client.setCredentials(JSON.parse(token));
            callback(oAuth2Client);
        });
}

let _waiting_for_auth = false

function getNewToken(id, oAuth2Client, callback) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    let url_code
    if ( _is_subprocess === false ) {
        console.log(`Authorize token needed for ${id} open this url in a browser: \n ${authUrl}` );
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        rl.question('Enter the code from that page here: ', (code) => {
            rl.close();
            url_code = code
        });
    } else {
        // send request for auth code to main process
        // but how do we respond

        process.send({type:"auth_requested", identity:id, url: authUrl })
        _waiting_for_auth = true
    }

    oAuth2Client.getToken(url_code, (err, token) => {
        if (err) return console.error(`Error retrieving access token for ${id}`, err);
        oAuth2Client.setCredentials(token);
        // Store the token to disk for later program executions
        fs.writeFile(ID[id].token_path, JSON.stringify(token), (err) => {
            if (err) return console.error(err);
            console.log(`Token stored for ${id} at ${ID[id].token_path} `);
        });
        callback(oAuth2Client);
    });

}
