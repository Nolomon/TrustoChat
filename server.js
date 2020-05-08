const express = require('express');
const app = express();
app.use(express.static(__dirname + "/"));
const server = require('http').createServer(app);
const io = require('socket.io').listen(server); // importing sockets library as client
const mongo = require('mongodb').MongoClient; // importing MongoClient library as mongo
server.listen(process.env.PORT || 4000);

app.get('/', function (req, res){ // map root to index.html
    res.sendFile(__dirname + '/index.html')
});

//var cnt1=0, cnt2=0, cnt3=0, cnt4=0;
// Connect to mongo
mongo.connect('mongodb://127.0.0.1/mongochat', { useUnifiedTopology: true }, function(err, client){
    //console.log("mongo.connect execution #"+cnt1++);
    if(err){
        throw err;
    }
    console.log('MongoDB connected... Bitch!'); // good job

    var db = client.db('mongochat'); // db is an object pointing to mongodb just connected to

    // Create function to send status
    sendStatus = function(socket, s){ // Pre-defined function
        socket.emit('status', s);
    }

    // Connect to Socket.io
    io.on('connection', function(socket){ // CLIENT STARTING POINT  A function to be executed whenever a client connects to the server
        //console.log("io.connect execution #"+cnt2++);
        console.log('connecting new client...');
        let chat = db.collection('chats'); // parallel to creating a table in mysql
        console.log('new client connected!');

        // Get chats from mongo collection
        chat.find().limit(100).sort({_id:1}).toArray(function(err, res){ // sort messages in ascending according to id (Chronologically)
            if(err){
                throw err;
            }

            // Emit the messages
            console.log('fetching chats..');
            socket.emit('output', res);
            console.log('chats fetched');
        });

        // Handle input events
        socket.on('input', function(data){
            //console.log("input to server #"+cnt3++);
            let name = data.name;
            let message = data.message;

            // Check for name and message
            if(name == '' || message == ''){  // Should let all checks be in server since client is open for modification
                // Send error status
                sendStatus(socket, 'Please enter a name and message');
            } else {
                // Insert message
                console.log('inserting chats in collection..');
                chat.insertOne({name: name, message: message}, function(){
                    io.emit('output', [data]);

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
        socket.on('clear', function(data){
            //console.log("clear execution #"+cnt4++);
            // Remove all chats from collection
            chat.remove({}, function(){
                // Emit cleared
                socket.emit('cleared');
            });
        });
        
        // Handle Disconnect
        socket.on("disconnect", ()=>{
            console.log("Disconnected")
        });
    });
});