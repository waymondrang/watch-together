//INITIALIZE ENVIRONMENT VARIABLES
require("dotenv").config()

//ADD PREFIX TO CONSOLE LOG
var LOG_PREFIX = "[WATCH TOGETHER] ";
var log = console.log;
console.log = function () {
    var args = Array.from(arguments);
    args.unshift(LOG_PREFIX);
    log.apply(console, args);
}

//DECLARATIONS
const uri = process.env.MONGO_URI;
const express = require("express")
const app = express();
const port = process.env.PORT || 80;
const http = require("http");
const socket = require("socket.io");
const server = http.createServer(app);
const io = socket(server, { cors: { allow: "*" } });
const { MongoClient } = require('mongodb');

//INITIAITE MONGODB
const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});
(async () => {
    await client.connect();
    await client.db("watchtogether").collection("rooms").deleteMany({})
})()

//DISABLE ALL CONSOLE LOGGING
//console.log = function () { }

//USE SOURCE FOLDER
app.use(express.static('./source', { setHeaders: function (response, path, stat) { response.set("Cache-Control", "no-store") }, maxAge: '0', etag: false }));

//SETUP TESTING DOMAIN
app.get("*", function (request, response) {
    response.set({ "Cache-Control": "no-store" })
    response.set({ "etag": false })
    response.sendFile(__dirname + "/index.html")
})

//ON SOCKET CONNECTION
io.on("connection", function (socket) {
    console.log("user connected to socket", socket.handshake.address)
    socket.on("join-room", async function (initial) {
        var room = initial.room;
        socket.join(room)
        var results = await client.db("watchtogether").collection("rooms").findOne({ _id: room }, { projection: { connected: 1, url: 1 } })
        console.log(results)
        var connected = results ? results["connected"] : [];
        var url = results ? results["url"] : "";
        if (!connected.length) {
            connected.push(socket.id)
            client.db("watchtogether").collection("rooms").updateOne({ _id: room }, { $set: { connected: connected, admin: socket.id } }, { upsert: true });
            socket.emit("admin-mode", { room: room })
        } else {
            connected.push(socket.id)
            client.db("watchtogether").collection("rooms").updateOne({ _id: room }, { $set: { connected: connected } }, { upsert: true })
        }
        if (url) {
            socket.emit("set-url", { url: url })
        }
        console.log("user joined room", room)
        socket.emit("room-confirmed", { socketid: socket.id });
        io.sockets.in(room).emit('count-update', { count: connected.length })
        socket.on("admin-set-url", function (data) {
            var url = data["url"];
            socket.to(room).broadcast.emit('set-url', { url: url });
            client.db("watchtogether").collection("rooms").updateOne({ _id: room }, { $set: { url: url } }, { upsert: true })
        })
        socket.on("sync", function (data) {
            var currentTime = data["playing"] ? new Date().getTime() - data["time"] + data["currentTime"] : data["currentTime"];
            //console.log("setting synced currentTime in room", room, currentTime)
            client.db("watchtogether").collection("rooms").updateOne({ _id: room }, { $set: { currentTime: currentTime } }, { upsert: true })
            socket.to(room).broadcast.emit("sync", data)
        })
        socket.on("seeking", function (data) {
            console.log("video is seeking", data)
            socket.to(room).broadcast.emit('seeking', data)
            //io.sockets.in(room).emit("seeking", { ...data, socketid: socket.id })
        })
        socket.on("ready", function (data) {
            console.log("user is ready to play", data)
            socket.to(room).broadcast.emit('ready', { ...data, socketid: socket.id })
        })
        socket.on("waiting", function (data) {
            console.log("user is waiting for video to load", data)
            //socket.to(room).broadcast.emit('waiting', { ...data, socketid: socket.id })
        })
        socket.on("play", function (data) {
            console.log("user started video playback", data)
            socket.to(room).broadcast.emit('play', { ...data, socketid: socket.id })
            //io.sockets.in(room).emit("play", { ...data, socketid: socket.id })
        })
        socket.on("pause", function (data) {
            console.log("user paused video", data)
            socket.to(room).broadcast.emit('pause', { ...data, socketid: socket.id })
            //io.sockets.in(room).emit("pause", { ...data, socketid: socket.id })
        })
        socket.on("disconnect", async () => {
            console.log("user disconnected from room", room)
            //OLD DISCONNECT SCRIPT
            var results = await client.db("watchtogether").collection("rooms").findOne({ _id: room }, { projection: { connected: 1, admin: 1 } })
            var connected = results ? results["connected"] : [];
            var index = connected.indexOf(socket.id)
            connected.splice(index, 1)
            console.log("connected", connected)
            if (!connected.length) {
                client.db("watchtogether").collection("rooms").deleteOne({ _id: room });
            } else {
                if (results["admin"] === socket.id) {
                    client.db("watchtogether").collection("rooms").updateOne({ _id: room }, { $set: { connected: connected, admin: connected[0] } })
                    io.to(connected[0]).emit("admin-mode", { room: room })
                } else {
                    client.db("watchtogether").collection("rooms").updateOne({ _id: room }, { $set: { connected: connected } })
                }
                io.sockets.in(room).emit('count-update', { count: connected.length })
            }
        })
    })
    socket.on("disconnect", () => {
        console.log("user disconnected")
    })
})

server.listen(port, () => console.log(`http server is running on port: ${port}`));