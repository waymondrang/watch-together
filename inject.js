//DECLARE HEAD ELEMENT
const head = document.head || document.getElementsByTagName("head")[0] || document.documentElement;

//INJECT SOCKETIO SCRIPT
const socketio = document.createElement("script");
socketio.src = `https://unpkg.com/socket.io-client@3.0.1/dist/socket.io.min.js`;
var socketid;
head.insertBefore(socketio, head.lastChild);

//INJECT CSS
const stylization = document.createElement("style");
stylization.innerHTML = `
#watch-together-settings {
    box-sizing: border-box;
    position: fixed;
    bottom: 12px;
    right: 12px;
    display: flex;
    flex-direction: column;
    padding: 12px;
    width: 150px;
    height: fit-content;
    border: 0.0625rem solid #1b1b1b9a;
    border-radius: 6px;
    background-color: #1b1b1b5a;
    color: #fff;
    backdrop-filter: blur(4px);
    z-index: 9999999;
    font-family: monospace !important;
    font-size: 12px !important;
}
#watch-together-header {
    cursor: grab;
}
#watch-together-header h1 {
    margin: 0;
    margin-bottom: 4px;
    font-size: 18px;
    padding: 0;
    border: 0;
    background: transparent;
    display: block;
    font-weight: bold;
    color: #fff;
}
#watch-together-header p, a {
    margin: 0;
    margin-bottom: 8px;
    font-size: 12px;
    padding: 0;
    border: 0;
    background: transparent;
    display: block;
    font-weight: normal;
    color: #fff;
}
#watch-together-settings button {
    margin-top: 4px;
    border-radius: 4px;
    color: #1b1b1b !important;
    font-family: monospace;
    border: none;
    background-color: #fff !important;
    font-size: 12px;
    transition: all 0.5s cubic-bezier(0.23, 1, 0.320, 1) !important;
    word-break: break-word;
}
#watch-together-settings button:disabled {
    margin-top: 4px;
    border-radius: 4px;
    color: #1b1b1b1a !important;
    font-family: monospace;
    border: none;
    background-color: #ffffff1a !important;
    font-size: 12px;
    cursor: not-allowed;
}
#watch-together-room {
    padding: 4px;
    font-family: monospace;
    border-radius: 4px;
    border: none;
    background-color: #fff !important;
    color: #1b1b1b !important;
    font-size: 12px;
    transition: all 0.5s cubic-bezier(0.23, 1, 0.320, 1) !important;
}
#watch-together-room:disabled {
    padding: 4px;
    font-family: monospace;
    border-radius: 4px;
    border: none;
    font-size: 12px;
    cursor: not-allowed;
}
.message-box {
    margin-top: 4px;
    background-color: #1b1b1b1a;
    padding: 4px;
    border-radius: 4px;
    color: #cecece;
    font-size: 12px;
}
#log {
    display: none;
    max-height: 80px;
    overflow-y: auto;
    padding: 4px;
    background-color: #1b1b1b;
    color: #cecece;
    font-family: monospace;
    border-radius: 6px;
    font-size: 8px;
}
#remotecontrol {
    display: none;
    position: absolute;
    z-index: -1;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
}
#playpausecontainer {
    display: flex;
}
#play {
    margin-right: 4px;
}
#pause, #play {
    width: 50%;
    word-break: normal;
}
`
head.insertBefore(stylization, head.lastChild);

//DECLARE SOCKET
var socket;

//DECLARE STATES
var playing;
var admin;
var nosync;

//COMPENSATION
var compensation = 0.25;

//ADD PREFIX TO CONSOLE LOG
var LOG_PREFIX = "[WATCH TOGETHER] ";
var log = console.log;
console.log = function () {
    var args = Array.from(arguments);
    args.unshift(LOG_PREFIX);
    log.apply(console, args);
}

//ACKNOWLEDGE SCRIPT INJECTION
console.log("watch together script injected.")

//DEFINE PLAYING
Object.defineProperty(HTMLMediaElement.prototype, "playing", {
    get: function () {
        return !!(this.currentTime > 0 && !this.paused && !this.ended && this.readyState > 2);
    }
})

//CREATE SETTINGS DASHBOARD
const settings = document.createElement("div");
settings.id = "watch-together-settings";
settings.innerHTML = `
<div id="watch-together-header">
    <h1>watch together</h1>
    <p>created with <3 by <a href="https://github.com/waymondrang">raymond wang</a></p>
</div>
`

//CREATE MESSAGE BOXES
const message = document.createElement("p");
const count = document.createElement("p");
var statuslog = [];
const videostatus = document.createElement("span");
message.className = count.className = videostatus.className = "message-box";
videostatus.id = "log"
message.innerText = count.innerText = videostatus.innerText = "...";

//LOGGING FUNCTION
function logstatus(log) {
    var message = `[${new Date().toLocaleTimeString()}]${log}`
    statuslog.push(message);
    if (statuslog.length > 10) {
        statuslog.splice(0, 1)
    }
    videostatus.innerHTML = statuslog.map(e => `<span>${e}</span>`).join("<br />");
    videostatus.scrollTop = videostatus.scrollHeight;
}

//DECLARE VIDEO ELEMENT
const video = document.querySelectorAll("video")[document.querySelectorAll("video").length - 1];
video.controls = false;

function initsocket() {
    var input = roomcode;
    var room = input.value;
    if (!room) {
        return
    }
    //FOR PRODUCTION
    socket = io("watch-together-server.herokuapp.com");
    //FOR DEVELOPMENT
    //socket = io("/")
    socket.emit("join-room", { room: room });
    connect.innerText = "connecting";
    socket.on("room-confirmed", function (data) {
        socketid = data.socketid;
        input.disabled = true;
        connect.disabled = true;
        connect.innerText = "connected!";
        logstatus("[SOCKET] joined room")
        pausebutton.disabled = false;
        playbutton.disabled = false;
    })

    socket.on("disconnect", function() {
        socketid = null;
        input.disabled = false;
        connect.disabled = false;
        connect.innerText = "disconnected";
        logstatus("[SOCKET] socket disconnected")
        pausebutton.disabled = true;
        playbutton.disabled = true;
    })

    socket.on("count-update", function (data) {
        count.innerText = `connected: ${data.count}`;
        logstatus("[COUNT] updating user count")
    })

    socket.on("ping", console.log("pong"))

    socket.on("admin-mode", function (data) {
        logstatus("[ADMIN] admin mode activated")
        message.innerText = "you are admin!";
        admin = true;
        setInterval(function () {
            if (video.playing) {
                var date = new Date();
                socket.emit("sync", { time: date.getTime(), currentTime: video.currentTime, playing: video.playing })
                //logstatus(`[ADMIN] emitting sync video`)
                //console.log("emitting sync", { time: date.getTime(), currentTime: video.currentTime, playing: video.playing })
            }
        }, 1000)
    })

    socket.on("sync", function (data) {
        if (nosync) {
            logstatus("[SYNC] cannot sync, no override")
            return
        }
        var currentdate = new Date();
        var currentTime = data["playing"] ? (currentdate.getTime() - data["time"]) / 1000 + data["currentTime"] : data["currentTime"];
        console.log("sync incoming from admin", data);
        console.log("calculated currentTime", currentTime, "actual currentTime", video.currentTime);
        if (data["playing"] && !video.playing) {
            video.play();
            logstatus("[SYNC] playing video")
        } else if (!data["playing"] && video.playing) {
            video.pause();
            logstatus("[SYNC] pausing video")
        }
        if (Math.abs(currentTime - video.currentTime) > compensation) {
            if (Math.abs(currentTime - video.currentTime) > compensation * 2) {
                video.currentTime = currentTime + compensation;
                logstatus(`[SYNC] video offset above ${compensation * 2}, compensating by ${compensation} seconds`)
            } else {
                video.currentTime = currentTime;
                logstatus(`[SYNC] video offset by more than ${compensation} seconds`)
            }
        }
    })

    video.onmousedown = function (event) {
        nosync = true;
    }

    video.onmouseup = function (event) {
        setTimeout(function () {
            nosync = false;
        }, 300)
    }

    video.onseeking = function (event) {
        console.log("seeking new position");
        console.log(video.currentTime);
        event.preventDefault();
        //socket.emit("seeking", { currentTime: video.currentTime })
    }

    video.onseeked = function (event) {
        console.log("finished seeking");
        console.log(video.currentTime)
        event.preventDefault();
        //socket.emit("seeking", { currentTime: video.currentTime })
        //socket.emit("play", { currentTime: video.currentTime })
    }

    socket.on("seeking", function (data) {
        console.log("another user is seeking", data)
        video.currentTime = data.currentTime;
    })

    video.onloadeddata = function () {
        logstatus("[READY] video is ready to play")
        console.log("video data is intiailized. ready to play.");
        socket.emit("ready", { currentTime: video.currentTime })
    }

    socket.on("ready", function (data) {
        console.log("another user is ready", data)
        //video.currentTime = data.currentTime;
    })

    video.onwaiting = function () {
        console.log("video is waiting for load.");
        socket.emit("waiting", { currentTime: video.currentTime })
    };

    socket.on("waiting", function (data) {
        console.log("another user is waiting for load", data)
        //video.currentTime = data.currentTime;
    })

    video.onplay = function (event) {
        playing = true;
        console.log("onplay triggered")
        //event.preventDefault();
        //socket.emit("play", { currentTime: video.currentTime });
        //video.play();
        return
    };

    socket.on("play", function (data) {
        logstatus("[PLAY] another user is playing")
        console.log("another user is playing", data)
        video.pause();
        var offset = (new Date().getTime() - data["time"]) / 1000;
        console.log("play offset calculated", offset)
        var currentTime = offset + data["currentTime"] + compensation;
        video.currentTime = currentTime;
        video.play();
        console.log("video is now playing.");
    })

    video.onpause = function (event) {
        playing = false;
        console.log("onpause triggered")
        //event.preventDefault();
        //socket.emit("pause", { currentTime: video.currentTime });
        return
    }

    socket.on("pause", function (data) {
        logstatus("[PAUSE] another user paused")
        console.log("another user paused", data)
        video.pause();
        var currentTime = data["currentTime"];
        video.currentTime = currentTime;
        console.log("video is now paused.");
    })

    video.oncanplay = function () {
        console.log("oncanplay event triggered")
        //socket.emit("seeking", { currentTime: video.currentTime });
    }

    video.onplaying = function (event) {
        playing = true;
        console.log("onplay triggered")
        //event.preventDefault();
        //socket.emit("seeking", { currentTime: video.currentTime });
        return
    }

    video.onwaiting = function () {
        console.log("onwaiting event triggered")
    }

    video.onclick = function (event) {
        event.preventDefault()
        var currenttime = new Date();
        if (video.playing) {
            logstatus("[PLAY] video is playing")
            console.log("onclick, playing video")
            socket.emit("play", { currentTime: video.currentTime, time: currenttime.getTime() });
            video.play();
        } else {
            logstatus("[PAUSE] video is paused")
            console.log("onclick, pausing video")
            socket.emit("pause", { currentTime: video.currentTime, time: currenttime.getTime() });
            video.pause();
        }
        console.log("onclick event triggered", playing)
        return;
    }
}

function play() {
    var currenttime = new Date();
    socket.emit("play", { currentTime: video.currentTime, time: currenttime.getTime() });
    video.play();
}

function pause() {
    nosync = true;
    var currenttime = new Date();
    socket.emit("pause", { currentTime: video.currentTime, time: currenttime.getTime() });
    video.pause();
    setTimeout(function () {
        nosync = false;
    }, 200)
}

//CREATE BUTTONS FOR DASHBOARD
const connect = document.createElement("button");
connect.onclick = initsocket;
connect.innerText = "connect to room";

const closebutton = document.createElement("button");
closebutton.onclick = function () {
    settings.remove()
    socket.disconnect();
    document.querySelector("#inject-script").remove();
};
closebutton.innerText = "close 🎄";

const roomcode = document.createElement("input");
roomcode.id = "watch-together-room";
roomcode.placeholder = "room code";
roomcode.onkeyup = function(event) {
    if (event.keyCode === 13) {
        initsocket();
    }
}

const playpausecontainer = document.createElement("div");
playpausecontainer.id = "playpausecontainer";

const playbutton = document.createElement("button");
playbutton.onclick = play;
playbutton.innerText = "play 🎅";
playbutton.id = "play";
playbutton.disabled = true;

const pausebutton = document.createElement("button");
pausebutton.onclick = pause;
pausebutton.innerText = "pause ⛄";
pausebutton.id = "pause";
pausebutton.disabled = true;

playpausecontainer.insertBefore(pausebutton, playpausecontainer.lastChild);
playpausecontainer.insertBefore(playbutton, playpausecontainer.lastChild);

//APPEND BUTTONS TO DASHBOARD
settings.insertBefore(roomcode, settings.lastChild);
settings.insertBefore(connect, settings.lastChild);
settings.insertBefore(playpausecontainer, settings.lastChild);
settings.insertBefore(count, settings.lastChild);
settings.insertBefore(message, settings.lastChild);
settings.insertBefore(videostatus, settings.lastChild);
settings.insertBefore(closebutton, settings.lastChild);

//INSERT SETTINGS DASHBOARD INTO BODY
document.body.insertBefore(settings, document.body.firstChild);
console.log("inserted settings dashboard")

//MAKE DRAGGABLE
dragElement(settings);

function dragElement(element) {
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    document.querySelector("#watch-together-header").onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        element.style.top = (element.offsetTop - pos2) + "px";
        element.style.left = (element.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

logstatus("[SETUP] setup complete ✨")