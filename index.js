const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');


// check if we are a sub-process
// this allows to setup for working as a sub-process
// or as a main process directly on the command line
let _is_subprocess = true
if (!process.send) { _is_subprocess = false }

// check for cmd line options and setup the config location
let altconfig = null
let new_identity = null
let args = process.argv
//console.log("cmd-args", args);
args.forEach((item, i) => {
    // use alternate config location
    if (item === "-c" || item === "/c") { altconfig = args[i+1]}
    // add new identity
    if (item === "-a" || item === "/a") { new_identity = args[i+1]}
});

let osuser
let configbase

//console.log(process.platform);
//*** maybe add mac in here too
if (process.platform === 'win32') {
    osuser = process.env.USERNAME
    // for windows we will convert to forward slashes like linux
    if (altconfig === null) {
        configbase = process.env.APPDATA.replace(/\\/g, "/")
    } else {
        configbase = altconfig.replace(/\\/g, "/")
        console.log("using alt config");
    }

}
else if (process.platform === 'linux') {
    if (altconfig === null) {
        osuser = process.env.USER
        configbase = process.env.HOME + "/" +".config"
    } else {
        configbase = altconfig
        console.log("using alt config");
    }

}

if ( configbase.endsWith("/") ) { configbase += "node-gmail-utils" } else { configbase += "/node-gmail-utils"}
console.log( osuser , configbase);


// setup config and identities
let LocalConfig = { /*this may not be needed*/}
function saveLocalConfig() {
    fs.writeFileSync(configbase + "/config.json", JSON.stringify(LocalConfig,null,4) )
}


if ( !fs.existsSync( configbase ) ) {
    console.log("Creating config folder", configbase);
    fs.mkdirSync( configbase, { recursive: true } )
    saveLocalConfig()
} else {
    if (fs.existsSync(configbase + "/config.json")) {
        console.log('Loading config.json.');
        LocalConfig = JSON.parse( fs.readFileSync(configbase + "/config.json",'utf8') )
    } else {
        saveLocalConfig()
    }

}




// Identities are setup manually by adding a subfolder to  {configbase}/identities"
// the folder should be named as the users gmail or gsuite address
// inside this folder should be a OAuth 2.0 Client ID credentials.json (see README.md on how to get this file from google )
// and an options.json file for this identity
// we will look for any existing identities and add them to ID
// if no identities exist or any are missing credentials or options we will notify the user and exit
let IdList = []
let ID = {}
let _ids_ok = true
let _tokens_ok = false

if ( fs.existsSync( configbase +"/identities") ) {
    let filelist =  fs.readdirSync(configbase +"/identities")
    if (filelist.length === 0) { _ids_ok = false }
    for (var i = 0; i < filelist.length; i++) {
        let id = filelist[i]
        ID[id] = {}
        IdList.push(id)
        if ( fs.existsSync( configbase +"/identities/"+filelist[i]+"/credentials.json" ) ) {
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

// check for new identity to add
//*** should validate email here
if (new_identity !== null) {
    //console.log(ID);
    if ( createIdentity(new_identity) ) { _ids_ok = false }
}

if ( _ids_ok === false ) {
    console.log("Exiting due to invalid or missing google credentials");
    if ( _is_subprocess === true ) {
        process.send({type:"error", reason:"bad_credentials", msg:"Exiting due to invalid or missing google credentials" })
    }
    process.exit()
}


if ( _is_subprocess ){
    process.on('message', (packet) => {
        console.log('Message from parent process', packet);
          if (packet.type === "auth_reply") {
              handleAuthReply(packet)
          }
          if (packet.type === "action") {
              if ( _tokens_ok === true) {
                  handleActions(packet)
              } else {
                  //*** this needs to be handled in test.js
                  packet.type = "action_responce"
                  packet.status = "error"
                  process.send(packet)
              }

          }
          else if (packet.type === "exit") {
              process.exit()
          }
          else {
              console.log('Unknown type', packet);
          }
      });

}


// If modifying these scopes, after a token has been generated you will
// need to delete the token so it can be regenerated
const SCOPES = [
    'https://mail.google.com/',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.compose',
    'https://www.googleapis.com/auth/gmail.send'
]

// start check for existance of token for each identity
if (IdList.length > 0){ testForToken(0) }

function testForToken(pos) {
    if (pos > IdList.length - 1 ) {
        // all done checking tokens ready for normal operations
        console.log("Token check complete, ready for actions");
        _tokens_ok = true
        if (_is_subprocess) { process.send({type:"status", value:"ready"}) }
        // testing
        //authorize("philgiambra@gmail.com", sendMail)
        return
    }
    let id = IdList[pos]
    if (fs.existsSync(ID[id].token_path)){
        ID[id].token = JSON.parse( fs.readFileSync(ID[id].token_path,'utf8') )
        testForToken(pos+1)

    } else {
        //missing token request one
        console.log("missing token requesting one");
        getNewToken(id,pos)
    }
}

function getNewToken(id,pos) {
    // first create an oauth client
    const {client_secret, client_id, redirect_uris} = ID[id].creds.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    ID[id].oauth = oAuth2Client
    if ( _is_subprocess === false ) {
        console.log(`Authorize token needed for ${id} open this url in a browser: \n ${authUrl}` );
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        rl.question('Enter the code from that page here: ', (code) => {
            rl.close();
            handleAuthReply({type:"auth_reply", identity:id, pos:pos, code: code })
        });

    } else {
        // send request for auth code to main process
        process.send({type:"auth_requested", identity:id, pos:pos, url: authUrl })
    }

}

function handleAuthReply(packet) {
    let id = packet.identity
    let pos = packet.pos
    let oAuth2Client = ID[id].oauth

    oAuth2Client.getToken(packet.code, (err, token) => {
        if (err) return console.error(`Error retrieving access token for ${id}`, err);
        oAuth2Client.setCredentials(token);
        // Store the token to disk for later program executions
        fs.writeFile(ID[id].token_path, JSON.stringify(token), (err) => {
            if (err) return console.error(err);
            console.log(`Token stored for ${id} at ${ID[id].token_path} `);
            // ok now check the token again
            testForToken(pos)
        });

    });


}

function authorize(id, data, callback) {
    const {client_secret, client_id, redirect_uris} = ID[id].creds.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    oAuth2Client.setCredentials(ID[id].token);
    callback(id, data, oAuth2Client);

}



/*
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
        process.send({type:"auth_requested", identity:id, url: authUrl })
        return callback(oAuth2Client, id, false);

    }

    oAuth2Client.getToken(url_code, (err, token) => {
        if (err) return console.error(`Error retrieving access token for ${id}`, err);
        oAuth2Client.setCredentials(token);
        // Store the token to disk for later program executions
        fs.writeFile(ID[id].token_path, JSON.stringify(token), (err) => {
            if (err) return console.error(err);
            console.log(`Token stored for ${id} at ${ID[id].token_path} `);
        });
        callback(oAuth2Client, id, true);
    });

}
*/




// create the folder and options.json for a new identity
function createIdentity(id) {
    if (ID[id]){
        console.log(`Create identity failed. Identity ${id} already exists `);
        return false
    }
    let path =  configbase+"/identities/"+id
    let default_options = { dname:id , pre_body:"", post_body:"", cc:[] }
    fs.mkdirSync( path , { } )
    fs.writeFileSync(path + "/options.json", JSON.stringify(default_options,null,4) )
    console.log(`Identity created for ${id}`);
    return true
}


function handleActions(packet) {
    console.log("Processing Action ", packet);
    let id = packet.identity
    if (!ID[id]) {
        return "invalid ID"
    }
    if (packet.action === "send") {
        authorize("philgiambra@gmail.com", packet.data , sendMail)
    }
}


async function sendMail(id, data, auth) {
    // You can use UTF-8 encoding for the subject using the method below.
    // You can also just use a plain string if you don't need anything fancy.
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
    console.log("got responce from gmail",res.data);
    //return res.data;
}
