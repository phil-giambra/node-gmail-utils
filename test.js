//console.log(process.send);
const { fork } = require('child_process');

if (process.send) {
    console.log("found send");
} else {
    console.log("no send");
}

let workers = {}

workers.test = fork('subtest.js');

workers.test.on('message', (msg) => {
  console.log('Message from test Worker', msg);
});

workers.test.on('exit', (code,signal) => {
  console.log('test Worker exited',code,signal );
  //process.exit()
});
