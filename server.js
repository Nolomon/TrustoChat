const express = require('express');
const app = express();
app.use('/', express.static(__dirname, {index: "index.html"}));
const server = require('http').createServer(app);
const io = require('socket.io').listen(server); // importing sockets library as client
const mongo = require('mongodb').MongoClient; // importing MongoClient library as mongo
server.listen(process.env.PORT || 4000);

// app.get('/', function (req, res){ // redirect root
//      res.sendFile(__dirname + '/index2.html');
// });

//var cnt1=0, cnt2=0, cnt3=0, cnt4=0;
var cnt=1;
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

    // connected users / sockets
    var connectedUsers

    // Connect to Socket.io
    io.on('connection', function(socket){ //* CLIENT STARTING POINT  A function to be executed whenever a client connects to the server
        console.log(io.sockets.sockets+"\n\n\n");
        console.log("connection #"+cnt);cnt++;
        //  Username Check
        const username = socket.handshake.query.username;
        const users = db.collection('users');
        users.findOne({userID:username}, function(err, res){
            if (err) return err;
            socket.emit('userInfo', res);
            // console.log("userInfo : ");
            // console.log(res);
        });
        // Get new user info
        socket.on('userInfo', function(userInfo){
            users.insertOne({
                username : username,
                userID: username,
                cert: userInfo.cert,
                passHash: null,
                status: 'online'
            });
        });
        users.updateOne({userID: username},{$set:{status:'online'}});
        const chats = db.collection('chats');
        // Get chats from mongo collection
        chats.find().limit(100).sort({_id:1}).toArray(function(err, res){ // sort messages in ascending according to id (Chronologically)
            if(err){
                throw err;
            }

            // Emit the messages
            //console.log('fetching chats..');
            socket.emit('output', res);
            //console.log('chats fetched');
        });

        //! This techinique is temporary and for simulation purpose only.
        //* Distributing certificates on users





        // Handle input events
        socket.on('sigmsg', function(sigmsg){
            //console.log("input to server #"+cnt3++);
            // Check for userID and message
            if(sigmsg.userID != '' && sigmsg.message != ''){  // Should let all checks be in server since client is open for modification
                // Insert message
                //console.log('inserting chats in collection..');
                chats.insertOne({userID: sigmsg.userID, message: sigmsg.message, signature: sigmsg.signature}, function(){
                    io.emit('output', [sigmsg]);
                    // Send status object
                    //console.log('chats inserted');
                    sendStatus(socket, {
                        message: 'Message sent', // this is the shiiiiiiiit
                        clear: true
                    });
                });
            }
        });

        // Handle clear
        socket.on('clear', function(data){
            //console.log("clear execution #"+cnt4++);
            // Remove all chats from collection
            chats.deleteOne({}, function(){
                // Emit cleared
                socket.emit('cleared');
            });
        });
        
        // Handle Disconnect
        socket.on("disconnect", ()=>{
            users.updateOne({userID: username},{$set:{status:'offline'}});
            console.log("Disconnected");
            console.log(io.sockets.sockets+"\n\n\n");
        });
    });
});