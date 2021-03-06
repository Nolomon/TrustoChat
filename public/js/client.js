// Get Elements
var messages = document.getElementById('messages');
var textarea = document.getElementById('textarea');
var clearBtn = document.getElementById('clear');
var sendBtn = document.getElementById('sendBtn');
var userLabel = document.getElementById('userLabel');
var onlineUsersPanel = document.getElementById('onlineDiv');
var searchInput = document.getElementById("searchInput");
var searchResults = document.getElementById("searchResults");

var username = prompt("Please enter your username:");
userLabel.innerText = "My Name: " + username;
if (username == null || username == "") window.location.reload();
else {

    // Connect to socket.io
    //local: 127.0.0.1
    var socket = io('http://192.168.1.100:4000', { query: { username: username } });

    // Check for connection
    if (socket !== undefined) {
        console.log('Connected to socket.');
        // TIME OUT EVENT
        socket.on('connect_timeout', (timeout) => {
            console.log('TIMEOUT AFTER ' + timeout + 'ms');
        });

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
                        if (prvkey == undefined) window.location.reload();

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
                            for (const k of Object.keys(prvkeyObj.n)) { // checking for the modulus n
                                if (typeof prvkeyObj.n[k] === 'function') continue;
                                if (prvkeyObj.n[k] !== pubkeyObj.n[k]) {
                                    valid = false;
                                    break;
                                }
                            }
                        }

                        //? 3. Is the private portion correct??
                        const sig = new KJUR.crypto.Signature({ "alg": "SHA512withRSA" });
                        sig.init(prvkey);
                        if (!pubkeyObj.verify("I luv u", sig.signString("I luv u"))) valid = false;

                    } while (!valid);
                    //* //////////////////////
                    //* //////////////////////
                }
                else {
                    //* generating RSA key pair
                    const keypair = KEYUTIL.generateKeypair("RSA", 2048);
                    console.log('RSA key pair generated:');
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

                    //* send user info to server
                    console.log("sending userInfo to server...");
                    var t0 = performance.now();
                    socket.emit('userInfo', {
                        cert: certPEM
                    }, (confirmation) => {
                        console.log(`Time taken to receive info: ${performance.now()-t0}ms`);
                        console.log(confirmation);
                    });

                    // calculate private key in pem format
                    prvkey = KEYUTIL.getPEM(keypair.prvKeyObj, "PKCS1PRV");

                    //* Output To User
                    let mdl = btrAlert('This is your private key, keep it safe!!\n\n', prvkey, 'Close to download your private key.');
                    let closeBtn = mdl.getElementsByClassName('btrAlert-closeBtn')[0];
                    closeBtn.addEventListener('click', () => {
                        mdl.remove();
                        downloadText(username+' private key.txt', prvkey);
                        toastSnackbar('Save private key in a secure place!!', 3000);
                    });

                }
            }

            // Enable User Search
            searchInput.disabled = false;
        });

        //* Handle Server Output (incoming messages)
        var otherUserID = null, convID = null;
        let outputCnt = 1;
        socket.on('output', (data) => {
            console.log(outputCnt++);
            console.log("------------------------------------");
            console.log(data);
            if (data.length) {
                for (let x = 0; x < data.length; x++) {
                    //* determin if message belong to the currently open convo
                    if(data[x].userID!=otherUserID && data[x].userID!=username) continue;
                    //* Build out message div
                    const message = document.createElement('div');
                    message.className = (data[x].userID==username)?'my-message':'other-message';
                    message.innerHTML = 
                    "<div class='sender-message'>"+data[x].userID+"</div>"+
                    "<div class='body-message'>"+
                    "<div class='text-message'>"+data[x].message+"</div>";

                    //* ///// SINGATURE VERIFICATION  ////////
                    const pubKey = KEYUTIL.getKey(userCerts.get(data[x].userID));
                    if (pubKey.verify(data[x].message, data[x].signature)) {
                        message.className += " safe-message";
                        message.innerHTML +=
                        "<div class='tooltip'>"+
                        "<img class='ver-icon' src='safe.png' alt='[VERIFIED]'/>"+
                        "<span class='tooltiptext'>Message verified to be from "+data[x].userID+"</span>"+
                        "</div>";
                    }
                    else {
                        message.className += " unsafe-message";
                        message.innerHTML +=
                        "<div class='tooltip'>"+
                        "<img class='ver-icon' src='unsafe.png' alt='[MODIFIED]'/>"+
                        "<span class='tooltiptext'>Verification Failed! message may has been alterd after "+data[x].userID+" sent it!"+"</span>"+
                        "</div>";
                    }

                    message.innerHTML += "</div>";

                    messages.appendChild(message);
                }
            }
        });

        // Handle Server Input
        sendBtn.addEventListener('click', (event) => {
            // Sign message and emit to server
            const sig = new KJUR.crypto.Signature({ "alg": "SHA512withRSA" });
            sig.init(prvkey);
            const encryptedHash = sig.signString(textarea.value);
            const sigmsg = {receiver:otherUserID, convID: convID, userID: username, message: textarea.value, signature: encryptedHash };
            console.log(sigmsg);
            socket.emit('sigmsg', sigmsg);
            textarea.value = '';
        });

        // Handle Chat Clear
        clearBtn.addEventListener('click', () => {
            socket.emit('clear');
        });

        // Clear Messages
        socket.on('cleared', () => {
            let messageDivs = messages.getElementsByTagName('div');
            for(messageDiv of messageDivs) messageDiv.remove();
        });

        // function highlightConvo(panel, usercardID){
        //     // remove previous highlight
        //     let usercards = panel.getElementsByClassName('selected-convo');
        //     for(usercard of usercards){
        //         usercard.className = 'usercard';
        //     }
        //     // highlight the specified conversation
        //     document.getElementById(usercardID).className+=' selected-convo';
        // }

        function openConv(userID) {
            otherUserID = userID;
            document.getElementById('receiverLabel').innerHTML = "Talking to: "+otherUserID;
            convID = (username<=otherUserID)?(username+otherUserID):(otherUserID+username);
            sendBtn.disabled = true;
            textarea.disabled = true;
            // clear conversation panel
            const clearProm = new Promise((resolve) => {
                let convoLabel = document.getElementById('receiverLabel');
                messages.innerHTML = "";
                messages.appendChild(convoLabel);
                messages.innerHTML+="<hr>";
                resolve();
            });
            clearProm.then(() => { // getting other user certificate
                console.log('requesting cert for ' + userID);
                socket.emit('req-cert', userID);
                socket.on('res-cert', (usercert) => {
                    console.log('############       GOT ' + userID + ' CERT!!!       #############');
                    userCerts.set(userID, usercert);
                    socket.emit('openconv', convID);  //* Request the conversation
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
                usercard.setAttribute('class', "usercard");
                usercard.innerText = onuser;
                usercard.addEventListener("click", () => {
                    openConv(onuser);
                    // highlightConvo(onlineUsersPanel,usercard.id);
                });
                onlineUsersPanel.appendChild(usercard);
            }
            socket.emit('onlineRefresh');   // Update onlineUsersPanel (server will take 6000ms)
        });


        //* User Search
        searchInput.addEventListener("input", (event) => {
            setTimeout(() => {
                socket.emit('userSearchReq', searchInput.value);
                socket.once('userSearchRes', (results) => {
                    searchResults.innerHTML = '';
                    for (let user of results) {
                        if (user.userID == username) continue;
                        const usercard = document.createElement('div');
                        usercard.setAttribute('id', "card_" + user.userID);
                        usercard.setAttribute('class', "usercard");
                        usercard.innerText = user.username;
                        usercard.addEventListener("click", () => {
                            openConv(user.userID);
                            // highlightConvo(searchResults,usercard.id);
                        });
                        searchResults.appendChild(usercard);
                    }
                });
            }, 500);

        });

    }


};