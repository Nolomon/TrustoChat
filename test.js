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
 */
