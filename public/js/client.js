// Get Elements
var status = document.getElementById('status');
var messages = document.getElementById('messages');
var textarea = document.getElementById('textarea');
var clearBtn = document.getElementById('clear');
var sendBtn = document.getElementById('sendBtn');
var profile = document.getElementById('profile');
var onlineUsersPanel = document.getElementById('users-sidebar');


var username = prompt("Please enter your username:");
profile.innerText = username;
if (username == null || username == "") window.location.reload(false); 
else {
    // Set default status
    var statusDefault = status.textContent;

    // Set status
    var setStatus = function (s) {
        status.textContent = s;
        if (s !== statusDefault) {
            console.log('status set!');
            var delay = setTimeout(() => {
                setStatus(statusDefault);
            }, 1500);
        }
    }

    // Connect to socket.io
    //console.log(username);
    //local: 127.0.0.1
    var socket = io('http://192.168.1.100:4000', { query: { username: username } }); ////////////////////           HERE!!!!          /////////////////////////////////////////////////

    // Check for connection
    if (socket !== undefined) {
        console.log('Connected to socket.');

        //* username check
        var prvkey; // user private key
        var newconn = true; // first connection check
        var userCerts = new Map(); // certificates of users in chat
        socket.on('userInfo', function (userInfo) {
            if (newconn) {
                console.log("userInfo received.");
                newconn = false;
                if (userInfo !== null && userInfo !== '') {
                    userCerts.set(username, userInfo.cert);
                    //* /////////////////////////
                    //* Private Key Verification:
                    //* /////////////////////////
                    let valid = false;
                    do {
                        prvkey = prompt("Please paste your private key here:");
                        if(prvkey==undefined) window.location.reload(true);

                        //? 1. Is it a key??
                        let prvkeyObj;
                        try {
                            prvkeyObj = KEYUTIL.getKey(prvkey);
                        } catch (err) {
                            if (err === "not supported argument") continue; // not a key.
                            else console.error(err);
                        }
                        //console.log(prvkeyObj);
                        let pubkeyObj = KEYUTIL.getKey(userCerts.get(username));
                        //console.log(pubkeyObj);

                        //? 2. Is the public portion correct??
                        if (prvkeyObj.isPrivate && prvkeyObj.e === pubkeyObj.e) {
                            valid = true;
                            for(const k of Object.keys(prvkeyObj.n)){
                                if( typeof prvkeyObj.n[k] === 'function') continue;
                                if (prvkeyObj.n[k] !== pubkeyObj.n[k]){
                                    valid = false;
                                    break;
                                }
                            }
                        }

                         //? 3. Is the private portion correct??
                         const sig = new KJUR.crypto.Signature({ "alg": "SHA512withRSA" });
                         sig.init(prvkey);
                         if( !pubkeyObj.verify("I luv u", sig.signString("I luv u")) ) valid = false;

                    } while (!valid);
                    //* //////////////////////
                    //* //////////////////////
                }
                else {
                    //* generating RSA key pair
                    const keypair = KEYUTIL.generateKeypair("RSA", 2048);
                    console.log(keypair);

                    //* generate TBSCertificate
                    const tbsc = new KJUR.asn1.x509.TBSCertificate();
                    // add basic fields
                    tbsc.setSerialNumberByParam({ 'int': 1234 });
                    tbsc.setSignatureAlgByParam({ 'name': 'SHA512withRSA' });
                    tbsc.setIssuerByParam({ 'str': "/C=US/O=Test/CN=CA" });
                    tbsc.setNotBeforeByParam({ 'str': "130511235959Z" });
                    tbsc.setNotAfterByParam({ 'str': "150511235959Z" });
                    tbsc.setSubjectByParam({ 'str': "/C=US/O=Test/CN=User1" });
                    tbsc.setSubjectPublicKeyByGetKey(keypair.pubKeyObj);    // public key stored in certificate
                    // add extensions
                    tbsc.appendExtension(new KJUR.asn1.x509.BasicConstraints({ 'cA': false }));
                    tbsc.appendExtension(new KJUR.asn1.x509.KeyUsage({ 'bin': '11' }));
                    tbsc.appendExtension(new KJUR.asn1.x509.CRLDistributionPoints({ 'uri': 'http://a.com/a.crl' }));

                    //* sign and get PEM certificate with CA private key
                    const cert = new KJUR.asn1.x509.Certificate({ 'tbscertobj': tbsc, 'prvkeyobj': keypair.prvKeyObj });    // going to be a self-signed certificate
                    cert.sign();
                    certPEM = cert.getPEMString();
                    userCerts.set(username, certPEM);
                    // console.log("certificate is stored as:\n\n"+userCerts.get(username));

                    ////// send user info to server
                    socket.emit('userInfo', {
                        cert: certPEM
                    }, () => {
                        console.log('userInfo sent to server.');
                    });
                    // show private key in pem format
                    prvkey = KEYUTIL.getPEM(keypair.prvKeyObj, "PKCS1PRV");
                    alert("This is your private key, keep it safe!!\n\n" + prvkey);

                }
            }
        });

        // // get other users certificates
        // socket.on('certificate', (usercert)=>{
        //     userCerts.set(usercert.userID, usercert.cert);
        //     //console.log(usercert);
        // });

        //* Handle Server Output (incoming messages)
        let outputCnt = 1;
        socket.on('output', (data) => {
            console.log(outputCnt++);
            console.log("------------------------------------");
            console.log(data);
            if (data.length) {
                for (let x = 0; x < data.length; x++) {
                    // Build out message div
                    const message = document.createElement('div');
                    message.setAttribute('class', 'chat-message');
                    message.textContent = data[x].userID + ": " + data[x].message;

                    /////// SINGATURE VERIFICATION  ////////
                    //console.log(userCerts.get(data[x].userID));
                    const pubKey = KEYUTIL.getKey(userCerts.get(data[x].userID));
                    if (pubKey.verify(data[x].message, data[x].signature)) message.textContent += "\n\n    [VERIFIED]";
                    else message.textContent += "\n\n    [MODIFIED]";

                    messages.appendChild(message);
                    /////////////////       JSRSASIGN EXAMPLE       /////////////////////
                    // message = document.createElement('div');
                    // message.setAttribute('class', 'chat-message');
                    // message.textContent = data[x].userID + ' SHA512:    '
                    // + (new KJUR.crypto.MessageDigest({"alg": "sha512", "prov": "cryptojs"})).digestString(data[x].message);
                    // messages.appendChild(message);
                    ///////////////
                }
            }
        });

        // Get Status From Server
        socket.on('status', (data) => {
            // get message status
            setStatus((typeof data === 'object') ? data.message : data);

            // If status is message sent, clear text
            if (data.clear) {
                textarea.value = '';
            }
        });
        // Handle Server Input
        sendBtn.addEventListener('click', (event) => {
            // Sign message and emit to server input
            const sig = new KJUR.crypto.Signature({ "alg": "SHA512withRSA" });
            sig.init(prvkey);
            const encryptedHash = sig.signString(textarea.value);
            const sigmsg = { userID: username, message: textarea.value, signature: encryptedHash };
            socket.emit('sigmsg', sigmsg);

            //event.preventDefault(); // prevents page reloading
        });

        // Handle Chat Clear
        clearBtn.addEventListener('click', () => {
            socket.emit('clear');
        });

        // Clear Messages
        socket.on('cleared', () => {
            messages.textContent = '';
        });

        function openConv(userID) {
            sendBtn.disabled = true;
            textarea.disabled = true;
            // clear conversation panel
            const clearProm = new Promise((resolve) => {
                while (messages.firstChild && messages.removeChild(messages.firstChild));
                resolve();
            });

            clearProm.then(() => { // getting other user certificate
                console.log('requesting cert for ' + userID);
                socket.emit('req-cert', userID);
                socket.on('res-cert', (usercert) => {
                    console.log('############       GOT ' + userID + ' CERT!!!       #############');
                    userCerts.set(userID, usercert);
                    socket.emit('openconv', null);
                    sendBtn.disabled = false;
                    textarea.disabled = false;
                    socket.removeAllListeners('res-cert'); // or you could've used socket.once() instead of socket.on()
                });
            });
        }

        socket.on('onlineRefresh', (onlineUsers) => {
            console.log(onlineUsers);
            onlineUsersPanel.innerHTML = '';
            for (let onuser of onlineUsers) {
                if (onuser == username) continue;
                console.log(onuser);
                const usercard = document.createElement('div');
                usercard.setAttribute('id', "card_" + onuser);
                usercard.innerText = onuser;
                usercard.onclick = (function (param) {
                    return () => openConv(param);
                })(onuser);
                onlineUsersPanel.appendChild(usercard);
            }
            socket.emit('onlineRefresh');   // Update onlineUsersPanel (server will take 6000ms)
        });

    }


};