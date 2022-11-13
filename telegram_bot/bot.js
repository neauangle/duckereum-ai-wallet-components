import TelegramBot from 'node-telegram-bot-api';
import fs from 'fs';
import crypto from 'crypto';
import botiq from 'botiq';
import net from 'net';


//This lets us start the server from any folder and still use relative urls in here
import process, { config } from 'process';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
process.chdir(__dirname);
//------------------------------

const configs = JSON.parse(fs.readFileSync('./user-config.json'));

const ethereumEndpoint = await botiq.ethers.createJsonRpcEndpoint({
    accessURL: configs.ethereumEndpoint.accessURL,
    rateLimitPerSecond: configs.ethereumEndpoint.rateLimitPerSecond,
    omitNativeTokenTrackerInit: true
});

const verificationCodeToUser = {};
const userIdToInfo = {};

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
            for (let i = 0; i < config.verificationCodeLength; ++i){
                verificationCode += crypto.randomInt(0, 10)
            }
            verificationCodeToUser[verificationCode] = message.from;

            bot.sendMessage(message.chat.id, `Here is your verification code: ${verificationCode}.`);       
        }
    },
    {
        regex: /^\/request_free$/i,
        usage: `/request_free`,
        description: `Requests an AI-generated image using the free tier (requires at least ${config.freeTierMinimumBalance} duckereum in wallet).`,
        handler: async (bot, message, matchResult) => {
            const userInfo = userIdToInfo[message.from.id];
            if (!userInfo){
                bot.sendMessage(message.chat.id, `Error: There is no wallet address associated with your telegram yet!`);   
                return;
            }
            //todo: throttling - depends on what exactly you want the logic to be.

            try {
                const duckereumBalance = await ethereumEndpoint.getBalance({
                    walletAddress: userInfo.walletAddress, 
                    tokenAddress: config.freeTierTokenAddress,
                });
                if (!duckereumBalance.rational.greaterOrEquals(config.freeTierMinimumBalance)){
                    bot.sendMessage(message.chat.id, `Error: Use of the free tier requires at least ${config.freeTierMinimumBalance} duckereum in your wallet.\nBalance of wallet ${userInfo.walletAddress.slice(0, 8)}: ${duckereumBalance.string}.`);
                    return;
                } 
            } catch (error){
                console.log(error);
                bot.sendMessage(message.chat.id, 'Error: Failed checking duckereum balance. Plase try again later 🙏.');
                return;
            }

            bot.sendMessage(message.chat.id, 'Here is your image: 🐤');
        }
    },
    {
        regex: /^\/request_pro$/i,
        usage: `/request_pro`,
        description: `Requests an AI-generated image using the pro tier.`,
        handler: async (bot, message, matchResult) => {
            const userInfo = userIdToInfo[message.from.id];
            if (!userInfo){
                bot.sendMessage(message.chat.id, `Error: There is no wallet address associated with your telegram yet!`);   
                return;
            }

            try {
                const nftBalance = await ethereumEndpoint.getBalance({
                    walletAddress: userInfo.walletAddress, 
                    tokenAddress: config.proTierNftAddress,
                    isNft: true
                });
                if (!nftBalance.rational.greater(0)){
                    bot.sendMessage(message.chat.id, `Error: No pro-tier NFT found in wallet ${userInfo.walletAddress.slice(0, 8)}.`);
                    return;
                } 
            } catch (error){
                console.log(error);
                bot.sendMessage(message.chat.id, 'Error: Failed checking pro-tier NFT balance. Plase try again later 🙏.');
                return;
            }

            bot.sendMessage(message.chat.id, 'Here is your image: 🐤');
        }
    }
];




await run(configs);


export async function run(configs){
    
    console.log("Starting bot...")
    const bot = new TelegramBot(configs.telegramAccessToken, {polling: true});
    const commands = [];
    for (const acceptedCommand of acceptedCommands){
        commands.push({command: acceptedCommand.usage.split(' ')[0].slice(1), description: acceptedCommand.description});
    }
    await bot.setMyCommands(commands);
    bot.me = await bot.getMe();
    console.log(`@${bot.me.username} is live!`);
    

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
            
            if (!verificationCodeToUser[data.verificationCode]){
                socket.write(JSON.stringify({
                    websocketId,
                    dataString: JSON.stringify({
                        error: `No pending verification matching ${data.verificationCode}. Please get a new one from @${bot.me.username}` 
                    })
                }));
                return;
            }

            const user = verificationCodeToUser[data.verificationCode];
            const signedBy = botiq.ethers.ethers.utils.verifyMessage(data.verificationCode, data.verificationCodeSigned);
            if (!botiq.util.isHexEqual(signedBy, data.account)){
                bot.sendMessage(user.id, "Error: Authentication of wallet address failed...");
                socket.write(JSON.stringify({
                    websocketId,
                    dataString: JSON.stringify({
                        error: "Authentication of wallet address failed..."
                    })
                }));
                delete verificationCodeToUser[data.verificationCode];
                return;
            }
            
            const info = {
                user: verificationCodeToUser[data.verificationCode],
                walletAddress: signedBy
            }
            userIdToInfo[verificationCodeToUser[data.verificationCode].id] = info;
            bot.sendMessage(verificationCodeToUser[data.verificationCode].id, `Success! Your wallet has been verified as: ${signedBy}`);
            socket.write(JSON.stringify({
                websocketId,
                dataString: JSON.stringify({
                    username: info.user.username,
                    walletAddress: info.walletAddress
                })
            }));
        });
    });
    walletVerificationsServer.listen(configs.walletVerificationsPort, () => {
        console.log(`Listening for wallet verifications on localhost port ${configs.walletVerificationsPort}.`);
    });

}

