
// This script is an example of using node-gmail-worker as a sub-process
// execute like { node fork_example.js emailAddress }

const { fork } = require('child_process');


// Every job or auth request packet sent to the worker will require an
// "id" property that is set to a vaild Identtity in it's config.
// for this example we get the Identity to use from the last
// arguement on command line
let args = process.argv
let user_id = args[args.length - 1]
console.log("Gmail user", user_id);


let ngw = {}


// if you want node-gmail-worker to store it's config info in specific location
// you can pass it's location with the -c option when calling fork.
// Note: this can also be accomplished with a "config" request

ngw.proc = fork('index.js');
//ngw.proc = fork('index.js', ["-c","/path/to/anywhere"]);

// route packets from node-gmail-worker to the proper handler
ngw.proc.on('message', (packet) => {
    //console.log('Message from node-gmail-worker', packet);

    if (packet.type === "auth") {
        ngw.handleAuthResponce(packet)
    }

    else if (packet.type === "create") {
        ngw.handleCreateResponce(packet)
    }

    else if (packet.type === "list") {
        ngw.handleListResponce(packet)
    }

    else if (packet.type === "job") {
        ngw.handleJobResponce(packet)
    }

    else if (packet.type === "config") {
        ngw.handleConfigResponce(packet)
    }

    else {
        console.log("Unknown packet type", packet);
    }
});


ngw.proc.on('exit', (code,signal) => {
    console.log('node-gmail-worker process exited',code,signal );
});


//----------------------------HANDLE FUNCTIONS-------------------------------

// however you choose handle  the basics are:
// -- create url and present it to the user
// -- provide a way for them to input the code they get after sign in with google
// -- send the code in another auth request
ngw.handleAuthResponce = function(packet) {
    console.log("auth responce ", packet);
    if (packet.status === "error") {
        // handle auth errors
    } else {
        // handle positive responces
    }

}


ngw.handleCreateResponce = function(packet) {
    console.log("create responce ", packet);
    if (packet.status === "error") {
        // handle create errors
    } else {
        // handle positive responces
    }

}

ngw.handleListResponce = function(packet) {
    console.log("list responce ", packet);
}

ngw.handleJobResponce = function(packet) {
    console.log("job responce ", packet);
    if (packet.status === "error") {
        // handle job errors
    } else {
        // handle positive responces
    }

}

ngw.handleConfigResponce = function(packet) {
    console.log("config responce ", packet);
}

//-----------------------------REQUEST FUNCTIONS--------------------------------

// this is used to obtain a token for an Identity. It requires two calls to complete
// -- a request with oauth_code = null will get you a url from google where the user
//    goes to sign in and get the oauth_code.
// -- a request with an oauth_code (other than null) will trigger an attempt to get a token
ngw.sendAuthInfo = function(ngw_id , oauth_code = null){
    let packet = { type:"auth", id:ngw_id, key:ngw_id }
    process.send(packet)
}

// request a list of the current config's identities and there status
ngw.sendListRequest = function(){
    let packet = { type:"list" }
    process.send(packet)
}

// create a new identity in the current config same cli -n option
ngw.sendCreateRequest = function( new_id ){
    let packet = { type:"create", id:new_id }
    process.send(packet)
}

// set the current config location for ngw to use
ngw.sendConfigRequest = function( config_path ){
    let packet = { type:"config", path:config_path}
    process.send(packet)
}

// request a job. Currently "send" is the only valid job
// the packet that you send to the sub-process will be returned with
// an added "status" property of "done" or "error", but otherwise unaltered.
// So you can add other info (uuid, timestamp, whatever) and it will be
// available in the responve packet at handleJobResponce
ngw.sendJobRequest = function( ngw_id, job_type ,jobData) {
    let packet = { type:"job", job:job_type, id:ngw_id, data:jobData }
    ngw.proc.send(packet);
}


// an example of an email object for this script to send
//*** need to test cc and maybe bcc
ngw.test_email = {
    toName:user_id,
    toAddr:user_id,
    subject:"node-gmail-worker fork_example.js TEST",
    body:"This is a gmail sent by node-gmail-worker running as a child process",
    //(optional) these will override the existing options for an identity if they are declared
    options:{
        //dname:"" ,
        //pre_body:"",
        //post_body:"",
        //cc:[]
    }
}


setTimeout(function(){
    console.log("sending a request");

    //ngw.proc.send( {type:"list"})

    ngw.sendJobRequest( user_id, "send", ngw.test_email )

},2000)


//-------------------------------
