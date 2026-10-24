/* ======================================
   TREEHOUSE POS
   GOOGLE APPS SCRIPT API CONFIG
   MULTI-CLIENT CONFIGURATION
====================================== */

(function (window, document) {

    "use strict";

    const CENTRAL_API_URL =
        "https://script.google.com/macros/s/AKfycbyEGC57wQqgx5LNw_TgfnbFIXPxjrN0H4I_17nT1cI5KOT5UotyBBViOyNTbkAQ8HFD/exec";

    

    const params =
        new URLSearchParams(window.location.search);

    const clientId =
        (params.get("client") || "").trim();

    let resolvePromise = null;

    const API_CONFIG = {

        SCRIPT_URL: DEFAULT_SCRIPT_URL,

        CENTRAL_API_URL: CENTRAL_API_URL,

        CLIENT_ID: clientId,

        STORE_NAME: "",

        READY: false,

        ERROR: null,

        init() {

            if (resolvePromise) {
                return resolvePromise;
            }

            resolvePromise = new Promise((resolve, reject) => {

                if (!clientId) {

                    this.ERROR =
                        "ID pelanggan tidak ditemukan pada URL.";

                    reject(new Error(this.ERROR));

                    return;

                }

                const callbackName =
                    "__treehouseClientConfigCallback";

                const timeoutId =
                    window.setTimeout(() => {

                        cleanup();

                        this.ERROR =
                            "Waktu pengambilan konfigurasi pelanggan habis.";

                        reject(new Error(this.ERROR));

                    }, 15000);

                const script =
                    document.createElement("script");

                let completed = false;

                function cleanup() {

                    if (completed) {
                        return;
                    }

                    completed = true;

                    window.clearTimeout(timeoutId);

                    delete window[callbackName];

                    if (script.parentNode) {
                        script.parentNode.removeChild(script);
                    }

                }

                window[callbackName] = (result) => {

                    cleanup();

                    if (
                        !result ||
                        result.success !== true ||
                        !result.scriptUrl
                    ) {

                        API_CONFIG.ERROR =
                            result && result.message
                                ? result.message
                                : "Konfigurasi pelanggan tidak valid.";

                        reject(new Error(API_CONFIG.ERROR));

                        return;

                    }

                    API_CONFIG.SCRIPT_URL =
                        result.scriptUrl;

                    API_CONFIG.STORE_NAME =
                        result.storeName || "";

                    API_CONFIG.CLIENT_ID =
                        result.clientId || clientId;

                    API_CONFIG.READY = true;

                    API_CONFIG.ERROR = null;

                    resolve(API_CONFIG);

                };

                script.async = true;

                script.onerror = () => {

                    cleanup();

                    API_CONFIG.ERROR =
                        "Gagal menghubungi API konfigurasi pelanggan.";

                    reject(new Error(API_CONFIG.ERROR));

                };

                script.src =
                    CENTRAL_API_URL +
                    "?action=resolveClient" +
                    "&client=" +
                    encodeURIComponent(clientId) +
                    "&callback=" +
                    encodeURIComponent(callbackName);

                document.head.appendChild(script);

            });

            return resolvePromise;

        }

    };

    window.API_CONFIG = API_CONFIG;

})(window, document);