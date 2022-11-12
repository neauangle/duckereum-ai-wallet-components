import TelegramBot from 'node-telegram-bot-api';
import fs from 'fs';
import crypto from 'crypto';
import ethers from 'ethers';
import net from 'net';

//This lets us start the server from any folder and still use relative urls in here
import process from 'process';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
process.chdir(__dirname);
//------------------------------


const VERIFICATION_CODE_LENGTH = 6;

const acceptedCommands = [
    {
        regex: /^\/start$/,
        usage: `/start`,
        description: `Starts the bot.`,
        handler: async (bot, message, matchResult) => {
            bot.sendMessage(message.chat.id, `Why hello there 💜 I'm ready to interact! Please use /help to see a list of commands.`);
        }
    },
    {
        regex: /^\/help$/,
        usage: `/help`,
        description: `Shows a list of available commands.`,
        handler: async (bot, message, matchResult) => {
            let helpText = '';
            for (const acceptedCommand of acceptedCommands){
                if (helpText) helpText += '\n\n';
                helpText += acceptedCommand.usage + '\n' +  acceptedCommand.description;
            }
            bot.sendMessage(message.chat.id, helpText);
        }
    },
    {
        regex: /^\/request_verification_token$/i,
        usage: `/request_verification_token`,
        description: `Requests a verification code to use in associating a telegram account with an ethereum wallet.`,
        handler: async (bot, message, matchResult) => {
            let verificationCode = '';
            for (let i = 0; i < VERIFICATION_CODE_LENGTH; ++i){
                verificationCode += crypto.randomInt(0, 10)
            }
            verificationCodeToUser[verificationCode] = message.from;

            bot.sendMessage(message.chat.id, `Here is your verification code: ${verificationCode}.`);       
        }
    }
];


const verificationCodeToUser = {};
const userIdToInfo = {};

const configs = JSON.parse(fs.readFileSync('./user-config.json'));

await run(configs);


export async function run(configs){
    const bot = new TelegramBot(configs.telegramAccessToken, {polling: true});
    
    const commands = [];
    for (const acceptedCommand of acceptedCommands){
        commands.push({command: acceptedCommand.usage.split(' ')[0].slice(1), description: acceptedCommand.description});
    }
    await bot.setMyCommands(commands);
    console.log("Bot started!");

    bot.on('message', async (message) => {
        for (const acceptedCommand of acceptedCommands){
            const matchResult = message.text.match(acceptedCommand.regex);
            if (matchResult){
                acceptedCommand.handler(bot, message, matchResult);
                return;
            }
        }
        bot.sendMessage(message.chat.id, "Invalid command or arguments (try the /help command).");
    });


    const walletVerificationsServer = net.createServer(async socket => { //on connection:
        const remoteAddressString = `${socket.remoteAddress}:${socket.remotePort}`;
        socket.on('error', error => {
            console.log('Connection error:', remoteAddressString, error.message);
        });
        socket.on('data', async jsonString => {
            const json = JSON.parse(jsonString);
            const websocketId = json.websocketId;
            const data = JSON.parse(json.dataString);
            const signedBy = ethers.utils.verifyMessage(data.verificationCode, data.verificationCodeSigned);
            if (isHexEqual(signedBy, data.account)){
                if (verificationCodeToUser[data.verificationCode]){
                    const info = {
                        user: verificationCodeToUser[data.verificationCode],
                        walletAddress: signedBy
                    }
                    userIdToInfo[verificationCodeToUser[data.verificationCode].id] = info;
                    bot.sendMessage(verificationCodeToUser[data.verificationCode].id, `You wallet has been verified as: ${signedBy}`);
                    socket.write(JSON.stringify({
                        websocketId,
                        dataString: JSON.stringify({
                            username: info.user.username,
                            walletAddress: info.walletAddress
                        })
                    }));
                } else {
                    socket.write(JSON.stringify({
                        websocketId,
                        dataString: JSON.stringify({
                            error: `No pending verification matching ${data.verificationCode}. Please get a new one from the telegram bot!` 
                        })
                    }));
                }
            } else {
                socket.write(JSON.stringify({
                    websocketId,
                    dataString: JSON.stringify({
                        error: "Authentication of wallet address failed..."
                    })
                }));
            }
        });
    });
    walletVerificationsServer.listen(configs.walletVerificationsPort, () => {
        console.log(`Listening for wallet verifications on localhost port ${configs.walletVerificationsPort}.\n`);
    });

}


function isHexEqual(hexA, hexB){
    return ethers.utils.hexValue(hexA) === ethers.utils.hexValue(hexB);
}