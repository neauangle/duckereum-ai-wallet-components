## Instructions

1. To create a new telegram bot, open a direct message with @BotFather and use the */newbot* command. You can call the bot anything. In the congratulations message, 
@BotFather will give you an access token. Paste this token into the telegramAccessToken field of telegram_bot/user-config.json.

2. Install [Node](https://nodejs.org/en/download/) if you haven't already.

3. Double-click on run.bat to start both the bot and the verification site on your local machine (alternatively you can run them each yourself from the command line- they're both just node projects).

4. In a private chat with the telegram bot you created, use /request_verification_token to request a verification token. 

5. Go to http://localhost/, connect to your MetaMask, paste in the verification code and click Verify. Sign the message in MetaMask.

If everything worked, you should receive a message in the telegram bot letting you know your wallet address has been verified. You should also see confirmation on the verification site.

## Notes
* In verification_site/static/verify/verify.js, you will see `const LOCATION = 'localhost';`. This needs to be changed to your server machine's IP address or a registered domain for it to work for people not on your local machine. 
* Everything is primed to use https when it comes to that- just drop the server.key and server.cert into the verification_site/ folder.