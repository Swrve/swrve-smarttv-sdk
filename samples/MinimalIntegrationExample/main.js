(function () {
    SwrveSDK.createInstance({
        appId: -1,
        apiKey: "<api-key>",
        stack: "us",
        httpsTimeoutSeconds: 60,
    });

    document.querySelector(".btn-queue-event").addEventListener("click", function() {
        SwrveSDK.sendEvent("testMe", {data: "Hello", data2: "Goodbye"});
    });

    document.querySelector(".btn-send-queue").addEventListener("click", function() {
        SwrveSDK.sendQueuedEvents();
    });
})();
