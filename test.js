// This script is an example of using node-gmail-worker as a sub-process
// execute like {node test.js emailAddress}
const { fork } = require('child_process');
const readline = require('readline');

let args = process.argv
//console.log("cmd-args", args);
let user_id = args[args.length - 1]
console.log(user_id);

let gmail = {}
gmail.active = false
gmail.proc = fork('index.js');

gmail.proc.on('message', (packet) => {
    console.log('Message from gmail Worker', packet);
    if (packet.type === "status" && packet.value === "ready") {
        gmail.active = true
        // the sub-process is ready. Send a test email
        gmail.sendMail( user_id, gmail.test_email )
    }
    else if (packet.type === "status" && packet.value === "error") {
         gmail.active = false
         gmail.handleStatusErrors()
     }
    else if (packet.type === "auth_requested") { gmail.handleAuth(packet) }
    else if (packet.type === "job_responce") {
        if (packet.status === "error"){
            gmail.handleJobError(packet)
        } else {
            gmail.handleJobResponce(packet)
        }

    }
    else {
        console.log("Unknown packet type", packet);
    }
});

gmail.proc.on('exit', (code,signal) => {
    console.log('gmail Worker exited',code,signal );
    //process.exit()
});


// This is handled pretty much the same way as on the command line with the readline module
// however you choose to do this the basics are:
// present the url to the user and provide a way for them to input the code they get from there
gmail.handleAuth = function(packet) {
    console.log(`Authorize token needed for ${packet.identity} open this url in a browser: \n ${packet.url}` );
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
        gmail.proc.send({ type:"auth_reply", identity:packet.identity, pos:packet.pos, code: code });
    });
}

gmail.handleJobError = function(packet) {
    console.log("Error executing job ", packet);
}

gmail.handleJobResponce = function(packet) {
    console.log("process job responce ", packet);

}
gmail.handleStatusErrors = function(packet) {
    console.log("process status error  ", packet);

}

// use this to send an email
// the packet that is sent to the sub-process will be returned with "type" changed to "job_responce"
// and a "status" property of "done" or "error", but otherwise unaltered.
// So you can add other info (uuid, timestamp, whatever) and it will be available in handleJobResponce & handleJobError
gmail.sendMail = function( id, email) {
    if (gmail.active === true) {
        let packet = { type:"job", job:"send", identity:id, data:email }
        gmail.proc.send(packet);
    } else {
        // handle trying to send before sub-process is ready
        // in this case retry every 2 seconds
        setTimeout(function(){ gmail.sendMail( id, email) },2000)
    }
}

// an example of an email object for this script to send
//*** need to test cc and maybe bcc
gmail.test_email = {
    toName:user_id,
    toAddr:user_id,
    subject:"node-gmail-worker TEST",
    body:"This is a gmail sent by node-gmail-worker ",
    //(optional) these will override the existing options for an identity if they are declared
    options:{
        //dname:"" ,
        //pre_body:"",
        //post_body:"",
        //cc:[]
    }
}
