function inject() {

    //DECLARE HEAD ELEMENT
    const head = document.head || document.getElementsByTagName("head")[0] || document.documentElement;

    //INJECT SOCKETIO SCRIPT
    const socketio = document.createElement("script");
    socketio.setAttribute("src", chrome.extension.getURL('socket.js'));
    socketio.type = "module";
    socketio.async = false;
    head.insertBefore(socketio, head.lastChild);

    //SEND ALERT
    //alert("injecting script...")
    const injectscript = document.createElement('script');
    injectscript.setAttribute("src", chrome.extension.getURL('inject.js'));
    injectscript.id = "inject-script";
    injectscript.async = false;
    document.body.insertBefore(injectscript, document.body.lastChild);
}

var initvideo = document.querySelector("video");
if (!initvideo) {
    var videoobserver = new MutationObserver(function (mutations, me) {
        var video = document.querySelector("video");
        if (video) {
            inject()
            me.disconnect(); //STOP OBSERVING
            return;
        }
    });

    //START OBSERVING
    videoobserver.observe(document, {
        childList: true,
        subtree: true
    });
} else {
    inject()
}