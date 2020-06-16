
const rsign = require("./node_modules/jsrsasign/lib/jsrsasign.js");

// generating RSA key pair
 var keypair = rsign.KEYUTIL.generateKeypair("RSA",2048);

// converting key to pem format
var pubKeyPem = rsign.KEYUTIL.getPEM(keypair.pubKeyObj, "PKCS8PUB");
var prvKeyPem = rsign.KEYUTIL.getPEM(keypair.prvKeyObj, "PKCS1PRV");

 // generate TBSCertificate
 var tbsc = new rsign.asn1.x509.TBSCertificate();
 // add basic fields
tbsc.setSerialNumberByParam({'int': 1234});
tbsc.setSignatureAlgByParam({'name': 'SHA512withRSA'});
tbsc.setIssuerByParam({'str': "/C=US/O=Test/CN=CA"});  
tbsc.setNotBeforeByParam({'str': "130511235959Z"});
tbsc.setNotAfterByParam({'str': "150511235959Z"});
tbsc.setSubjectByParam({'str': "/C=US/O=Test/CN=User1"});  
tbsc.setSubjectPublicKeyByGetKey(keypair.pubKeyObj);    // public key stored in certificate
// add extensions
tbsc.appendExtension(new rsign.asn1.x509.BasicConstraints({'cA': false}));
tbsc.appendExtension(new rsign.asn1.x509.KeyUsage({'bin':'11'}));
tbsc.appendExtension(new rsign.asn1.x509.CRLDistributionPoints({'uri':'http://a.com/a.crl'}));

// sign and get PEM certificate with CA private key
var cert = new rsign.asn1.x509.Certificate({'tbscertobj': tbsc,'prvkeyobj': keypair.prvKeyObj});    // going to be a self-signed certificate
cert.sign();
var certPEM = cert.getPEMString();

// Signing a message
var message = "Nour Salman is Adolf Hitler reincarnated!";
var encryptedHash = keypair.prvKeyObj.sign(message, "sha512");
var sigmsg = {"message":message, "signature": encryptedHash};


//  Output
console.log("Public Key:\n"+"n     =     "+keypair.pubKeyObj.n+"\ne     =     "+keypair.pubKeyObj.e+"\nd     =     "+keypair.pubKeyObj.d+
 "\n\nPrivate Key:\n"+"n     =     "+keypair.prvKeyObj.n+"\ne     =     "+keypair.prvKeyObj.e+"\nd     =     "+keypair.prvKeyObj.d);
console.log("\n\n\n");
console.log("Public PEM:\n"+pubKeyPem+"\n\nPrivate PEM:\n"+prvKeyPem);
console.log("\n\n\n");
console.log("X509 Public Key Certificate PEM\n"+certPEM);
console.log("\n\n\n");
///

// //  ####### HACKING ########
// sigmsg["message"] = "Nour Salman is safe.";
// hackerPrvKey = rsign.KEYUTIL.generateKeypair("RSA",2048).prvKeyObj;
// sigmsg["signature"] = hackerPrvKey.signWithMessageHash((new rsign.KJUR.crypto.MessageDigest({"alg": "sha512", "prov": "cryptojs"})).digestString(sigmsg["message"]),"sha512");
// //  ####### HACKING ########

// Extracting public key from certificate (for simulation purposes, no certificate verification.)
var pubKey = rsign.KEYUTIL.getKey(certPEM);
// Signature Verification
var verdict = pubKey.verify(sigmsg.message, sigmsg.signature);

console.log("Signed Message Object:\n");
console.log(sigmsg);
console.log("Signature is "+((verdict)?"valid.":"invalid!"));



/*      TASKS    :
#0:     - consider "users online" panel for selecting a partner using user ip address or username or a fucking combination of ip+username.
        - search for state-of-the-art tech surrounding login and profiles in chat apps
#1: certificates swap
#2: implementing signature with verification
#3: simple verdict indicator for testing 
#4: ???
#5: Frontend++


Initial Schema:

users = {
        username : "user name",
        * userID: <currently ip address of user machine>,
        cert: <user PK certificate for signing>,
        passHash: <user salted password hash, currently null>,
        state: <online/offline/other>
}

chats = {
        * chatID : <chat ID>,
        members : [member_1_ID, memeber_2_ID,..(currently groups are not supported)],
        creationDate: <date when the chat was created>,
        lastUpdate: <date when the chat was last updated>
        <IDs of the last 30 messages exchanged in the chat>
}

messages = {
        * msgID : <ID of message in the chat>,
        * chatID : <ID of chat containing the message>,
        * ownerID: <ID of the user originally sent the message>,
        sendDate: < Date when message was sent from the owner>,
        State: <sent/recieved/read/other>,
        msgBody: <message body>, //* for large bodies, store only reference/URI and use a file system for storing the actual body.
        msgSignature: <signature of the message>,
        <other metadata>
}



userlog = {                     //! CURRENTLY NOT AVAILABLE FOR QUICK DEPLOY PURPOSES        
        * userID: <currently ip address of user machine>,
        * userLogID: <ID of log between the logs of the specific user userID>,
        activity: <login/logout/cookieslogin/cookieslogout/other>,
        activityDate: <Date of when the activity started>
} //? What kind of logging tools/features are included in the database?
userMsgLog = {                          //! CURRENTLY NOT AVAILABLE FOR QUICK DEPLOY PURPOSES
        * msgID: <ID of message in the chat>,
        * chatID : <ID of chat containing the message>,
        * memberID: <ID of chat member reading the message>,
        state: <sent/recieved/read/other>,
        dateRcvd: <Date when message was received by memberID>,
        dateRead: <Date when message was read by memberID>,
        <possibly other metadata specific to memberID>
}
 ? SHOULD I COMBINE MESSAGE WITH USERMESSAGELOG?????????????
 ? IS CLUSTERING A TERM FOR PROCESSING OR STORAGE OR BOTH?

!       TELL THE FUCKERS TO DOCUMENT WHAT CAN BE DONE ASAP!!! Refining should be easier than laying down new information.








 */
