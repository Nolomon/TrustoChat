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
    if(err){
        throw err;
    }
    console.log('MongoDB connected... Bitch!'); // good job

    var db = client.db('trustochat'); // db is an object pointing to mongodb just connected to

    // Create function to send status
    sendStatus = function(socket, s){ // Pre-defined function
        socket.emit('status', s);
    }

    // Connect to Socket.io
    io.on('connection', async (socket)=>{ //* CLIENT STARTING POINT  A function to be executed whenever a client connects to the server

        // socekt registeration
        const username = socket.handshake.query.username;
        console.log(username+' connected.');
        //connectedUsers.set(username, socket);
        //console.log('Number of connected users is:', connectedUsers.size);


        //  Username Check
        const users = db.collection('users');
        let usercert; // client certificate
        let userInfo = users.findOne({userID:username});

        // Get new user info
        let newUserInfo = new Promise((resolve)=>{
            userInfo.then((res)=>{
                socket.emit('userInfo',res);
                if(res!=null) resolve(null);
            });
            socket.on('userInfo', (data)=>{
                users.insertOne({
                    username : username,
                    userID: username,
                    cert: data.cert,
                    passHash: null,
                    status: 'online'
                }, resolve(data));
            });
        });

        function refresh(){
            setTimeout(()=>{
				onlineUsers = onlineUsers.reverse();
                socket.emit('onlineRefresh', onlineUsers);
			},6000);
        };

        Promise.all([userInfo,newUserInfo]).then(()=>{
            onlineUsers.push(username);
			refresh();
        });
        socket.on('onlineRefresh',()=>{
            refresh();
        });
        
        socket.on('getcert',(userID)=>{
            certToSend = users.findOne({'userID':userID}, (res) => socket.emit('getcert',res.cert));
        });

//? ///////////////////////////////////////////////////////////////////////////////////////////////////////////
//!                                     Need Synchronization !!!
//? ///////////////////////////////////////////////////////////////////////////////////////////////////////////
        //* Update user online status
        users.updateOne({userID: username},{$set:{status:'online'}});


        const chats = db.collection('chats');
        //* Get chats from mongo collection
        chats.find().limit(100).sort({_id:1}).toArray((err, res)=>{ // sort messages in ascending according to id (Chronologically)
            if(err){
                throw err;
            }
            socket.emit('output', res);
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
                        message: 'Message sent', // this is the shiiiiiiiit
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
            users.updateOne({userID: username},{$set:{status:'offline'}});
            //connectedUsers.delete(username);
            console.log(username+" disconnected.");
            //console.log('Number of connected users is:', connectedUsers.size);
        });
    });
});