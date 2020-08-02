const express = require('express');
const { performance } = require('perf_hooks');
const app = express();
app.use(express.static(__dirname + '/public'));
const server = require('http').createServer(app);
const io = require('socket.io').listen(server); // importing sockets library as client
const mongo = require('mongodb').MongoClient; // importing MongoClient library as mongo
server.listen(process.env.PORT || 4000);


// connected users / sockets
var onlineUsers = [];

// Connect to mongo
mongo.connect('mongodb://127.0.0.1/mongochat', { useUnifiedTopology: true }, function (err, client) {
    if (err) throw err;
    console.log('MongoDB connected... Babe!'); // good job

    var db = client.db('trustochat'); // db is an object pointing to mongodb just connected to

    // Connect to Socket.io
    io.on('connection', (socket) => { //* CLIENT STARTING POINT  A function to be executed whenever a client connects to the server
        var t0 = performance.now();
        // socekt registeration
        const username = socket.handshake.query.username;
        console.log(username + ' connected.');

        //  Username Check
        const users = db.collection('users');
        users.findOne({ userID: username }, (err, res) => {
            if (err) throw err;
            //console.log('first check:' + res);
            socket.emit('userInfo', res);
        });
        // Get new user info
        socket.on('userInfo', (data, callback) => {
            console.log('REGISTERING NEW USER:' + username + ' ...');
            users.insertOne({
                username: username,
                userID: username,
                cert: data.cert,
                passHash: null,
                status: 'online'
            }, () => {
                let t1 = performance.now();
                console.log(username + ' inserted after ' + (t1 - t0) + 'ms');
                console.log('USER ' + username + ' REGISTERED!')
            });
            callback('server received userInfo.');
        });

        function checkUserInfo() {
            users.findOne({ userID: username }, (err, res) => {
                if (err) throw err;
                if (res == null) setTimeout(checkUserInfo, 2000);
                else return res;
            });
        };
        const userInfoProm = new Promise((resolve) => resolve(checkUserInfo));

        function refresh() {
            setTimeout(() => {
                onlineUsers = onlineUsers.reverse();
                //console.log(username);
                socket.emit('onlineRefresh', onlineUsers);
            }, 6000);
        };
        userInfoProm.then((value) => {
            onlineUsers.push(username);
            refresh();
        });

        socket.on('onlineRefresh', () => {
            refresh();
        });

        socket.on('req-cert', (userID) => {
            console.log('searching for ' + userID + ' cert...');
            users.findOne({ 'userID': userID }, (err, res) => {
                if (err) throw err;
                console.log(userID + ' cert found:');
                console.log(res);
                socket.emit('res-cert', res.cert);
            });
        });


        //* Update user online status
        users.updateOne({ userID: username }, { $set: { status: 'online' } });


        const chats = db.collection('chats');
        //* Get chats from mongo collection
        socket.on('openconv', (convID) => {
            chats.find().limit(100).sort({ _id: 1 }).toArray((err, res) => { // sort messages in ascending according to id (Chronologically)
                if (err) throw err;
                socket.emit('output', res);
            });
        });

        // Handle input events
        socket.on('sigmsg', (sigmsg) => {
            // Check for userID and message
            if (sigmsg.userID != '' && sigmsg.message != '') {  // Should let all checks be in server since client is open for modification
                // Insert message
                //console.log('inserting chats in collection..');
                chats.insertOne({ userID: sigmsg.userID, message: sigmsg.message, signature: sigmsg.signature }, function () {
                    io.emit('output', [sigmsg]);
                    //console.log('chats inserted');
                });
            }
        });



        // Handle clear
        socket.on('clear', (data) => {
            // Remove all chats from collection
            chats.deleteOne({}, function () {
                // Emit cleared
                io.emit('cleared');
            });
        });

        // User Search
        socket.on('userSearchReq', (user_name) => {
            //console.log("RECEIVED :: " + user_name);
            if(user_name.trim().length<3) return;
            users.find({ 'username': {$regex: user_name, $options: 'i'}, cert: { $ne: null } }, { projection: { userID: 1, username: 1 } }).limit(20).toArray((err, res) => {
                if (err) throw err;
                //console.log("search results are ::");
                socket.emit('userSearchRes', res);
                //console.log(res);
            });
        });

        // Handle Disconnect
        socket.on("disconnect", () => {
            let t1 = performance.now();
            console.log(username + ' took ' + (t1 - t0) + 'ms before disconnecting.');
            const onIndex = onlineUsers.indexOf(username);
            if (onIndex > -1) onlineUsers.splice(onIndex, 1);
            users.updateOne({ userID: username }, { $set: { status: 'offline' } });
            socket.removeAllListeners();
            console.log(username + " disconnected.");
        });
    });
});