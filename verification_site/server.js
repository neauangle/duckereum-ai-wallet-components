import express from 'express';
import http from 'http';
import https from 'https';
import { WebSocketServer } from 'ws'
import nunjucks from 'nunjucks';
import net from 'net';
import fs from 'fs';


//This lets us start the server from any folder and still use relative urls in here
import process from 'process';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
process.chdir(__dirname);
//------------------------------

const configs = JSON.parse(fs.readFileSync('./user-config.json'));

let sslCertificate;
try {
    sslCertificate = {
        key: fs.readFileSync('server.key'), 
        cert: fs.readFileSync('server.cert')
    }
} catch (error){
    console.log("No ssl certificate found. A http server only will be started.");
}


const app = express();
const env = nunjucks.configure(['views', 'views/verify'], {
    autoescape: true,
    express: app
});
app.set('view engine', 'njk');
app.use(express.static("static"));
app.get('/', async function(req, res) {
    res.render('verify/verify', {});
});


let walletVerificationsClient;
function onWalletVerificationsClientError(){
    if (walletVerificationsClient){
        walletVerificationsClient.destroy();
        walletVerificationsClient = null;
    }
    walletVerificationsClient = net.createConnection({ port: configs.walletVerificationsPort}, () => {
        console.log(`Connected to telegram bot on port ${configs.walletVerificationsPort}`);
    });
    walletVerificationsClient.on('error', async () => {
        await awaitMs(3000);
        onWalletVerificationsClientError();
    });
    walletVerificationsClient.on('data', (jsonString) => {
        const json = JSON.parse(jsonString);
        if (json.websocketId && webSocketConnections[json.websocketId]){
            webSocketConnections[json.websocketId].ws.send(json.dataString);
        }
    });
}
onWalletVerificationsClientError();

const webSocketConnections = {};
const getNewWebsocketId = (() => {
    let counter = 0;
    return () => (counter++).toString();
})();
async function initiateWebsocketConnection(ws){
    const websocketId = getNewWebsocketId();
    webSocketConnections[websocketId] = {websocketId, ws};
    ws.on('message', async buffer => {
        if (walletVerificationsClient){
            const jsonString = Buffer.from(buffer).toString('utf-8');
            walletVerificationsClient.write(JSON.stringify({dataString: jsonString, websocketId}));
        }
    }); 
}

const servers = {'http': http.createServer({}, app)};
if (sslCertificate){
    servers['https'] = https.createServer(sslCertificate, app);
}

for (const protocol of Object.keys(servers)){
    const server = servers[protocol];
    const webSocketServer = new WebSocketServer({server, path: "/websockets"});
    webSocketServer.on('connection', initiateWebsocketConnection);
    const port = protocol === 'http' ? 80 : 443;
    server.listen(port, () => {
        console.log(`${protocol.toUpperCase()} server listening on port ${port}. Go to ${protocol}://localhost:${port}/ to see it!\n`);
    });

}




async function awaitMs(ms) {
    return new Promise(function (resolve, reject) {
        setTimeout(resolve, ms)
    })
}