//console.log(process.send);
const { fork } = require('child_process');
const readline = require('readline');

let workers = {}

workers.test = fork('index.js');
workers.test.active = false
workers.test.on('message', (packet) => {
    console.log('Message from test Worker', packet);
    if (packet.type === "status" && packet.value === "ready") {
        workers.test.active = true
    }
    if (packet.type === "auth_requested") {
        handleAuth(packet)
    }
    if (packet.type === "action_responce") {
        if (packet.status === "error"){
            handleActionError(packet)
        } else {
            handleActionResponce(packet)
        }

    }
});

workers.test.on('exit', (code,signal) => {
    console.log('test Worker exited',code,signal );
    //process.exit()
});


function handleAuth(packet) {
    console.log(`Authorize token needed for ${packet.identity} open this url in a browser: \n ${packet.url}` );
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
        workers.test.send({ type:"auth_reply", identity:packet.identity, pos:packet.pos, authcode: code });
    });
}

function handleActionError(packet) {
    console.log("Error executing action ", packet);
}

function handleActionResponce(packet) {
    console.log("process action responce ", packet);
}

let email = {
    toName:"Jakes Place",
    toAddr:"info@jakesplaceny.com",
    subject:"node-gmail-utils TEST",
    body:"This is a test email sent by node-gmail-utils ",
    options:{ //(optional) these will override the existing identities options if they are declared
        //dname:"" ,
        //pre_body:"",
        //post_body:"",
        //cc:[]
    }
}

function sendMail( id, email) {
    if (workers.test.active === true) {
        workers.test.send({ type:"action", action:"send", identity:id, data:email });
    } else {
        console.log("worker is not ready yet re-trying in 2 seconds");
        setTimeout(function(){
            sendMail( id, email)
        },2000)
    }
}




setTimeout(function(){
    console.log("sending test email");
    sendMail( "philgiambra@gmail.com", email)
},5000)
