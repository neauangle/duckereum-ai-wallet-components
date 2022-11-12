To run the demo:

Open a direct message with @BotFather and create a new bot using /newbot. You can call it anything. In the congratulations message, 
@BotFather will give you an access token. Paste this into the telegramAccessToken field of telegram_bot/user-config.json.

Double-click on run.bat to start the bot and the verification site on your local machine. 

In a private chat with the telegram bot you created, use /request_verification_token to request a verification token. 

Go to http://localhost, connect your MetaMask, enter the verification code and click Verify. Sign the message in MetaMask. 

If everything worked, you should have received a message in the telegram bot letting you know your wallet address has been verified.