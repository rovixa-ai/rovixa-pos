/* ======================================
   ROVIXA POS
   INSTALLER CORE
====================================== */

const Installer = {

    tokenClient: null,
    accessToken: null,

    storeName: "",
    storeEmail: "",

    folderId: "",
    spreadsheetId: "",
    spreadsheetUrl: "",

    scriptId: "",
    webAppUrl: "",

    busy: false,
    waitingForSpreadsheetOpen: false,
    waitingForAppsScriptSettings: false,
    oauthPurpose: "",

    init() {

        const form =
            document.getElementById("installer-form");

        if (!form) {
            return;
        }

        if (
            form.dataset.installerInitialized === "true"
        ) {
            return;
        }

        form.dataset.installerInitialized = "true";

        this.loadGoogleIdentity();

        form.addEventListener("submit", (event) => {

            event.preventDefault();

            if (this.busy) {
                return;
            }

            if (this.waitingForAppsScriptSettings) {
                this.continueDeployment();
                return;
            }

            if (this.waitingForSpreadsheetOpen) {
                this.continueDeployment();
                return;
            }

            this.startInstallation();

        });
    },


    /* ======================================
       API REQUEST
    ====================================== */

    async apiRequest(url, options = {}) {

        if (!this.accessToken) {

            throw new Error(
                "Token Google belum tersedia. Ulangi otorisasi Google."
            );
        }

        const headers =
            new Headers(options.headers || {});

        headers.set(
            "Authorization",
            "Bearer " + this.accessToken
        );

        if (
            options.body &&
            !headers.has("Content-Type")
        ) {

            headers.set(
                "Content-Type",
                "application/json"
            );

        }

        const response =
            await fetch(url, {
                ...options,
                headers
            });

        const responseText =
            await response.text();

        let result = {};

        try {

            result = responseText
                ? JSON.parse(responseText)
                : {};

        } catch {

            result = {
                message: responseText
            };

        }

        if (!response.ok) {

            const apiMessage =
                result.error?.message ||
                result.message ||
                "Google API gagal: HTTP " +
                response.status;

            throw new Error(apiMessage);
        }

        return result;
    },


    async driveRequest(path, options = {}) {

        return this.apiRequest(
            INSTALLER_CONFIG.DRIVE_API + path,
            options
        );
    },


    /* ======================================
       STATUS
    ====================================== */

    setStatus(message, type = "info") {

        const status =
            document.getElementById(
                "installer-status"
            );

        if (!status) {
            return;
        }

        status.className =
            "installer-status installer-status-" +
            type;

        status.textContent =
            message;
    },


    /* ======================================
       BUSY STATE
    ====================================== */

    setBusy(busy) {

        this.busy = busy;

        const button =
            document.getElementById(
                "install-button"
            );

        if (!button) {
            return;
        }

        button.disabled = busy;

        if (busy) {

            if (!button.dataset.previousText) {
                button.dataset.previousText =
                    button.textContent;
            }

            button.textContent =
                "Memproses...";

        } else {

            button.textContent =
                button.dataset.previousText ||
                "Instal Rovixa POS";

        }
    }

};
