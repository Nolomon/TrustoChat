const express = require('express');
const app = express();
app.use(express.static(__dirname+'/public'));
const server = require('http').createServer(app);
const io = require('socket.io').listen(server); // importing sockets library as client
const mongo = require('mongodb').MongoClient; // importing MongoClient library as mongo
server.listen(process.env.PORT || 4000);


// connected users / sockets
//var connectedUsers = new Map();
var onlineUsers = [];

// Connect to mongo
mongo.connect('mongodb://127.0.0.1/mongochat', { useUnifiedTopology: true }, function(err, client){
    //console.log("mongo.connect execution #"+cnt1++);
    if(err) throw err;
    console.log('MongoDB connected... Bitch!'); // good job

    var db = client.db('trustochat'); // db is an object pointing to mongodb just connected to

    // Create function to send status
    sendStatus = function(socket, s){ // Pre-defined function
        socket.emit('status', s);
    }

    // Connect to Socket.io
    io.on('connection', (socket)=>{ //* CLIENT STARTING POINT  A function to be executed whenever a client connects to the server

        // socekt registeration
        const username = socket.handshake.query.username;
        console.log(username+' connected.');

        //  Username Check
        const users = db.collection('users');
        users.findOne({userID:username}, (err, res)=>{
            if(err) throw err;
            console.log('first check:'+res);
            socket.emit('userInfo', res);
        });
        // Get new user info
        socket.on('userInfo', (data)=>{
            console.log('REGISTERING NEW USER:'+username+' ...');
            users.insertOne({
                username : username,
                userID: username,
                cert: data.cert,
                passHash: null,
                status: 'online'
            },()=>console.log('USER '+username+' REGISTERED!'));
        });

        function checkUserInfo(){
            users.findOne({userID:username}, (err, res)=>{
                if(err) throw err;
                if(res==null) setTimeout(checkUserInfo, 2000);
                else return res;
            });
        };
        const userInfoProm = new Promise((resolve)=>resolve(checkUserInfo));

        function refresh(){
            setTimeout(()=>{
                onlineUsers = onlineUsers.reverse();
                console.log(username);
                socket.emit('onlineRefresh', onlineUsers);
			},6000);
        };
        userInfoProm.then((value)=>{
            onlineUsers.push(username);
			refresh();
        });

        socket.on('onlineRefresh',()=>{
            refresh();
        });
        
        socket.on('req-cert',(userID)=>{
            console.log('searching for '+userID+' cert...');
            users.findOne({'userID':userID}, (err, res) => {
                if(err) throw err;
                console.log(userID+' cert found:');
                console.log(res);
                socket.emit('res-cert',res.cert);
            });
        });

    //? ///////////////////////////////////////////////////////////////////////////////////////////////////////////
    //!                                     Need Synchronization !!!                                             //
    //? ///////////////////////////////////////////////////////////////////////////////////////////////////////////
        //* Update user online status
        users.updateOne({userID: username},{$set:{status:'online'}});


        const chats = db.collection('chats');
        //* Get chats from mongo collection
        socket.on('openconv', (convID)=>{
            chats.find().limit(100).sort({_id:1}).toArray((err, res)=>{ // sort messages in ascending according to id (Chronologically)
                if(err) throw err;
                socket.emit('output', res);
            });
        });

        // Handle input events
        socket.on('sigmsg', (sigmsg)=>{
            //console.log("input to server #"+cnt3++);
            // Check for userID and message
            if(sigmsg.userID != '' && sigmsg.message != ''){  // Should let all checks be in server since client is open for modification
                // Insert message
                console.log('inserting chats in collection..');
                chats.insertOne({userID: sigmsg.userID, message: sigmsg.message, signature: sigmsg.signature}, function(){
                    io.emit('output', [sigmsg]);
                    // Send status object
                    console.log('chats inserted');
                    sendStatus(socket, {
                        message: 'Message sent',
                        clear: true
                    });
                });
            }
        });



        // Handle clear
        socket.on('clear', (data)=>{
            // Remove all chats from collection
            chats.deleteOne({}, function(){
                // Emit cleared
                io.emit('cleared');
            });
        });



        // Handle Disconnect
        socket.on("disconnect", ()=>{
            const onIndex = onlineUsers.indexOf(username);
            if(onIndex>-1) onlineUsers.splice(onIndex,1);
            users.updateOne({userID: username},{$set:{status:'offline'}});
            socket.removeAllListeners();
            console.log(username+" disconnected.");
        });
    });
});