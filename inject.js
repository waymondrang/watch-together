//DECLARE HEAD ELEMENT
const head = document.head || document.getElementsByTagName("head")[0] || document.documentElement;

//GET PARAMETER FUNCTION
/**
 * 
 * @param {String} name THE PARAMETER
 * @param {URL} url THE URL STRING
 */

function getParameterByName(name, url) {
    name = name.replace(/[\[\]]/g, '\\$&');
    var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

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
    font-family: monospace;
    font-size: 12px;
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
    line-height: initial;
}
#watch-together-header p, #watch-together-header a {
    margin: 0;
    margin-bottom: 8px;
    font-size: 12px;
    padding: 0;
    border: 0;
    background: transparent;
    display: block;
    font-weight: normal;
    color: #fff;
    line-height: initial;
}
#watch-together-settings button {
    margin-top: 4px;
    border-radius: 4px;
    color: #1b1b1b;
    font-family: monospace;
    border: none;
    background-color: #fff;
    font-size: 12px;
    transition: all 0.5s cubic-bezier(0.23, 1, 0.320, 1);
    word-break: break-word;
}
#watch-together-settings button:disabled {
    margin-top: 4px;
    border-radius: 4px;
    color: #1b1b1b1a;
    font-family: monospace;
    border: none;
    background-color: #ffffff1a;
    font-size: 12px;
    cursor: not-allowed;
}
#watch-together-room {
    padding: 4px;
    font-family: monospace;
    border-radius: 4px;
    border: none;
    background-color: #fff;
    color: #1b1b1b;
    font-size: 12px;
    transition: all 0.5s cubic-bezier(0.23, 1, 0.320, 1);
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
    margin: 0;
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
    flex-direction: row;
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
var url;
var socketid;
var mismatchurl;
var navigateto;
var autoredirect;

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
console.log("WATCH TOGETHER SCRIPT INJECTED.")

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
if (video) {
    video.controls = false;
}

function initsocket() {

    var input = roomcodeinput;
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
        logstatus("[SOCKET] JOINED ROOM")
        pausebutton.disabled = false;
        playbutton.disabled = false;
    })

    socket.on("disconnect", function () {
        socketid = null;
        input.disabled = false;
        connect.disabled = false;
        connect.innerText = "disconnected";
        logstatus("[SOCKET] SOCKET DISCONNECTED")
        pausebutton.disabled = true;
        playbutton.disabled = true;
    })

    socket.on("count-update", function (data) {
        count.innerText = `connected: ${data.count}`;
        logstatus("[COUNT] UPDATING USER COUNT.")
    })

    socket.on("ping", console.log("pong"))

    socket.on("admin-mode", function (data) {
        logstatus("[ADMIN] ADMIN MODE ACTIVATED 🎉")
        message.innerText = "you are admin!";
        admin = true;
        socket.emit("admin-set-url", { url: window.location.href.includes("?") ? window.location.href + `&watchtogetherroomcode=${room}` : window.location.origin + window.location.pathname + `?watchtogetherroomcode=${room}` })
        setInterval(function () {
            if (video.playing) {
                var date = new Date();
                socket.emit("sync", { time: date.getTime(), currentTime: video.currentTime, playing: video.playing })
                //logstatus(`[ADMIN] emitting sync video`)
                //console.log("emitting sync", { time: date.getTime(), currentTime: video.currentTime, playing: video.playing })
            }
        }, 1000)
        //LISTEN TO URL CHANGES
        var oldurl = document.location.href;
        var urlobserver = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                if (oldurl !== document.location.href) {
                    oldurl = document.location.href;
                    var params = new URLSearchParams(window.location.search);
                    params.delete("watchtogetherroomcode");
                    var search = params.toString();
                    socket.emit("admin-set-url", { url: search ? window.location.origin + window.location.pathname + "?" + search + `&watchtogetherroomcode=${room}` : window.location.origin + window.location.pathname + `?watchtogetherroomcode=${room}` })
                }
            });
        });

        urlobserver.observe(document.querySelector("body"), {
            childList: true,
            subtree: true
        });
    })

    socket.on("set-url", function (data) {
        //NEW INCOMING URL
        var setbaseurl;
        if (data["url"].split(/\?/).length === 2) {
            var oldparams = new URLSearchParams(data["url"].split(/\?/)[1]);
            oldparams.delete("watchtogetherroomcode");
            var oldsearch = oldparams.toString();
            setbaseurl = data["url"].split(/\?/)[0] + "?" + oldsearch;
        } else {
            setbaseurl = data["url"];
        }
        //OLD URL
        var ogbaseurl;
        var params = new URLSearchParams(window.location.search);
        params.delete("watchtogetherroomcode");
        var search = params.toString();
        ogbaseurl = window.location.origin + window.location.pathname + "?" + search;
        console.log("COMPARING OLD URL TO NEW URL", ogbaseurl, setbaseurl)
        //COMPARE
        if (setbaseurl !== ogbaseurl) {
            redirect.disabled = false;
            message.innerText = "url received, press to navigate";
            mismatchurl = true;
            navigateto = data["url"];
            return;
            message.innerText = "self-destructing";
            console.log("USER DECLINED, ABORTING PROCESS")
            settings.remove()
            socket.disconnect();
            document.querySelector("#inject-script").remove();
        }
    })

    socket.on("sync", function (data) {
        if (nosync) {
            logstatus("[SYNC] CANNOT SYNC, OVERRIDE")
            return
        } else if (mismatchurl) {
            logstatus("[SYNC] CANNOT SYNC, MISMATCH URL")
            return
        }
        var currentdate = new Date();
        var currentTime = data["playing"] ? (currentdate.getTime() - data["time"]) / 1000 + data["currentTime"] : data["currentTime"];
        console.log("SYNC INCOMING FROM ADMIN", data);
        console.log("CALCULATED CURRENTTIME", currentTime, "ACTUAL CURRENTTIME", video.currentTime);
        if (data["playing"] && !video.playing) {
            video.play();
            logstatus("[SYNC] PLAYING VIDEO")
        } else if (!data["playing"] && video.playing) {
            video.pause();
            logstatus("[SYNC] PAUSING VIDEO")
        }
        if (Math.abs(currentTime - video.currentTime) > compensation) {
            if (Math.abs(currentTime - video.currentTime) > compensation * 2) {
                video.currentTime = currentTime + compensation;
                logstatus(`[SYNC] VIDEO OFFSET ABOVE ${compensation * 2}, COMPENSATING BY ${compensation} SECONDS`)
            } else {
                video.currentTime = currentTime;
                logstatus(`[SYNC] VIDEO OFFSET BY MORE THAN ${compensation} SECONDS`)
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
        console.log("ONSEEKING EVENT TRIGGERED, SEEKING NEW POSITION");
        console.log(video.currentTime);
        event.preventDefault();
        //socket.emit("seeking", { currentTime: video.currentTime })
    }

    video.onseeked = function (event) {
        console.log("ONSEEKED EVENT TRIGGERED");
        console.log(video.currentTime)
        event.preventDefault();
        //socket.emit("seeking", { currentTime: video.currentTime })
        //socket.emit("play", { currentTime: video.currentTime })
    }

    socket.on("seeking", function (data) {
        console.log("ANOTHER USER IS SEEKING", data)
        video.currentTime = data.currentTime;
    })

    video.onloadeddata = function () {
        logstatus("[READY] VIDEO IS READY TO PLAY")
        console.log("VIDEO IS READY TO PLAY, INITIALIZED.");
        socket.emit("ready", { currentTime: video.currentTime })
    }

    socket.on("ready", function (data) {
        console.log("ANOTHER READY IS READY TO PLAY", data)
        //video.currentTime = data.currentTime;
    })

    video.onwaiting = function () {
        console.log("VIDEO IS WAITING TO LOAD");
        socket.emit("waiting", { currentTime: video.currentTime })
    };

    socket.on("waiting", function (data) {
        console.log("ANOTHER USER IS WAITING TO LOAD", data)
        //video.currentTime = data.currentTime;
    })

    video.onplay = function (event) {
        playing = true;
        console.log("ONPLAY EVENT TRIGGERED")
        //event.preventDefault();
        //socket.emit("play", { currentTime: video.currentTime });
        //video.play();
        return
    };

    socket.on("play", function (data) {
        if (mismatchurl) {
            logstatus("[PLAY] MISMATCH URL, NOT PLAYING");
            return
        }
        logstatus("[PLAY] ANOTHER USER IS PLAYING")
        console.log("ANOTHER USER IS PLAYING", data)
        video.pause();
        var offset = (new Date().getTime() - data["time"]) / 1000;
        console.log("PLAY OFFSET CALCULATED", offset)
        var currentTime = offset + data["currentTime"] + compensation;
        video.currentTime = currentTime;
        video.play();
        console.log("VIDEO IS NOW PLAYING");
    })

    video.onpause = function (event) {
        playing = false;
        console.log("ONPAUSE EVENT TRIGGERED")
        //event.preventDefault();
        //socket.emit("pause", { currentTime: video.currentTime });
        return
    }

    socket.on("pause", function (data) {
        if (mismatchurl) {
            logstatus("[PAUSE] MISMATCH URL, NOT PAUSING");
            return
        }
        logstatus("[PAUSE] ANOTHER USED PAUSED")
        console.log("ANOTHER USER PAUSED", data)
        video.pause();
        var currentTime = data["currentTime"];
        video.currentTime = currentTime;
        console.log("VIDEO IS NOW PAUSED");
    })

    video.oncanplay = function () {
        console.log("ONCANPLAY EVENT TRIGGERED")
        //socket.emit("seeking", { currentTime: video.currentTime });
    }

    video.onplaying = function (event) {
        playing = true;
        console.log("ONPLAY EVENT TRIGGERED")
        //event.preventDefault();
        //socket.emit("seeking", { currentTime: video.currentTime });
        return
    }

    video.onwaiting = function () {
        console.log("ONWAITING EVENT TRIGGERED")
    }

    video.onclick = function (event) {
        event.preventDefault()
        var currenttime = new Date();
        if (video.playing) {
            logstatus("[PLAY] VIDEO IS PLAYING")
            console.log("ONCLICK EVENT TRIGGERED, PLAYING VIDEO")
            socket.emit("play", { currentTime: video.currentTime, time: currenttime.getTime() });
            video.play();
        } else {
            logstatus("[PAUSE] VIDEO IS PAUSED")
            console.log("ONCLICK EVENT TRIGGERED, PAUSING VIDEO")
            socket.emit("pause", { currentTime: video.currentTime, time: currenttime.getTime() });
            video.pause();
        }
        return;
    }

    window.onbeforeunload = function () {
        socket.disconnect();
    }
}

function play() {
    if (mismatchurl) {
        logstatus("[PLAY] MISMATCH URL, NOT PLAYING");
        return
    }
    var currenttime = new Date();
    socket.emit("play", { currentTime: video.currentTime, time: currenttime.getTime() });
    video.play();
}

function pause() {
    if (mismatchurl) {
        logstatus("[PAUSE] MISMATCH URL, NOT PAUSING");
        return
    }
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

const roomcodeinput = document.createElement("input");
roomcodeinput.id = "watch-together-room";
roomcodeinput.placeholder = "room code";
roomcodeinput.onkeyup = function (event) {
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

const redirectlabel = document.createElement("p");
redirectlabel.innerText = "auto-redirect?";

const redirect = document.createElement("button");
redirect.checked = false;
redirect.onclick = function (event) {
    if (navigateto) {
        message.innerText = "navigating to url";
        window.location.replace(navigateto);
    }
};
redirect.innerText = "redirect 🔃";
redirect.id = "redirect";
redirect.disabled = true;

playpausecontainer.insertBefore(pausebutton, playpausecontainer.lastChild);
playpausecontainer.insertBefore(playbutton, playpausecontainer.lastChild);

//APPEND BUTTONS TO DASHBOARD
settings.insertBefore(roomcodeinput, settings.lastChild);
settings.insertBefore(connect, settings.lastChild);
settings.insertBefore(playpausecontainer, settings.lastChild);
settings.insertBefore(count, settings.lastChild);
settings.insertBefore(message, settings.lastChild);
settings.insertBefore(videostatus, settings.lastChild);
//settings.insertBefore(redirectlabel, settings.lastChild); NO LABEL, REMOVED CHECKBOX
settings.insertBefore(redirect, settings.lastChild);
settings.insertBefore(closebutton, settings.lastChild);

//INSERT SETTINGS DASHBOARD INTO BODY
document.body.insertBefore(settings, document.body.firstChild);
console.log("INSERTED SETTINGS DASHBOARD")

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

const params = new URLSearchParams(window.location.search);
const roomcode = params.get('watchtogetherroomcode');
const redirectparam = params.get('watchtogetherredirect');

if (roomcode) {
    roomcodeinput.value = roomcode;
    initsocket();
}

logstatus("[SETUP] SETUP COMPLETE ✨")