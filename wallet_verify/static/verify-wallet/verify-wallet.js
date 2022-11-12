const LOCATION = 'localhost';

let ws = new WebSocket(`wss://${LOCATION}:443/websockets`);
ws.addEventListener('message', messageHandler);
ws.onerror = event => {
    console.log("Unable to establish ssl websocket. Attempting to fallback to http...");
    ws = new WebSocket(`ws://${LOCATION}:80/websockets`);
    ws.addEventListener('message', messageHandler);
};

const verifiedBlock = document.getElementById('verified-block');
const verifiedUsername = document.getElementById('verified-username');
const verifiedWalletAddress = document.getElementById('verified-wallet-address');
function messageHandler(event){
    const json = JSON.parse(event.data);
    console.log(json);
    if (json.error){
        alert(json.error);
    } else if (json.username){
        verifiedBlock.style.visibility = 'visible';
        verifiedUsername.innerText = '@' + json.username;
        verifiedWalletAddress.innerText = json.walletAddress;
    }
};



const web3UnsupportedErrorDisplay = document.getElementById('web3-unsupported-error-display');
const connectButton = document.getElementById('connect-button');
const connectedAddressDisplay = document.getElementById('connected-address-display');

const verificationCodeInput = document.getElementById('verification-code-input');
const verifyButton = document.getElementById('verify-button');

let account;

connectButton.disabled = true;
verificationCodeInput.disabled = true;
verifyButton.disabled = true;
if (window.ethereum) {
    web3UnsupportedErrorDisplay.style.visibility = 'hidden';
    connectButton.style.visibility = 'visible';
    connectButton.disabled = false;

    ethereum.on('chainChanged', async () => {
        if ((await ethereum.request({ method: 'eth_chainId' })) !== '0x1'){
            window.location.reload();
        }
    });

    ethereum.on('accountsChanged', async (accounts) => {
        account = accounts[0]
        if (!account){
            window.location.reload();
        }
        connectedAddressDisplay.innerText = `${account}`;
    });


    connectButton.addEventListener('click', async event => {
        connectButton.disabled = true;
        try {
            const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
            account = accounts[0];
            
            let chainId = await ethereum.request({ method: 'eth_chainId' });
            console.log('chainId', chainId);
            if (chainId !== '0x1'){
                await ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x1' }],
                });
            }
            

            verificationCodeInput.disabled = false;
            verifyButton.disabled = false;
            connectButton.style.visibility = 'hidden';
            connectedAddressDisplay.style.visibility = 'visible';
            connectedAddressDisplay.innerText = `${account}`;
            
        } catch (error) {
            console.log(error);
            connectButton.disabled = false;
        }
    });

    verifyButton.addEventListener('click', async event => {
        try {
            const verificationCodeHex = `0x${utf8ToHex(verificationCodeInput.value.trim())}`;
            const verificationCodeSigned = await ethereum.request({
              method: 'personal_sign',
              params: [verificationCodeHex, account],
            });
            const message = {
                verificationCode: verificationCodeInput.value,
                verificationCodeHex,
                verificationCodeSigned,
                account,  
            }
            ws.send(JSON.stringify(message));
          } catch (error) {
            console.log(error);
          }
    });

}













//https://stackoverflow.com/a/60505243
function hexToUtf8(s){
  return decodeURIComponent(
     s.replace(/\s+/g, '') // remove spaces
      .replace(/[0-9a-f]{2}/g, '%$&') // add '%' before each 2 characters
  );
}
const utf8encoder = new TextEncoder();
function utf8ToHex(s){
  const rb = utf8encoder.encode(s);
  let r = '';
  for (const b of rb) {
    r += ('0' + b.toString(16)).slice(-2);
  }
  return r;
}
