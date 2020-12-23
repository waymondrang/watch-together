function inject() {
    //SEND ALERT
    //alert("injecting script...")
    const injectscript = document.createElement('script');
    injectscript.setAttribute("src", chrome.extension.getURL('inject.js'));
    injectscript.id = "inject-script";
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