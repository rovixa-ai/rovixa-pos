/* ======================================
   ROVIXA POS
   INSTALLER CORE
====================================== */

const Installer = {

    tokenClient: null,
    accessToken: null,

    storeName: "",
    storeEmail: "",
    googleEmail: "",
    clientConfigurationEmail: "",
    clientConfigurationSaved: false,

    folderId: "",
    spreadsheetId: "",
    spreadsheetUrl: "",

    scriptId: "",
    webAppUrl: "",

    busy: false,
    waitingForSpreadsheetOpen: false,
    waitingForAppsScriptSettings: false,
    databaseReadyForScript: false,
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

            if (this.webAppUrl && !this.clientConfigurationSaved) {

                this.retrySaveClientConfiguration();
                return;
            }

            if (
                this.waitingForAppsScriptSettings ||
                this.waitingForSpreadsheetOpen
            ) {
                this.continueDeployment();
                return;
            }

            this.startInstallation();

        });
    },


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

            const error = new Error(apiMessage);

            error.status = response.status;

            error.service =
                url.includes("script.googleapis.com")
                    ? "apps-script"
                    : url.includes("sheets.googleapis.com")
                        ? "sheets"
                        : url.includes("googleapis.com/drive/")
                            ? "drive"
                            : "google-api";

            error.apiStatus =
                result.error?.status || "";

            error.apiReason =
                (result.error?.errors || [])
                    .map((item) => item.reason || "")
                    .filter(Boolean);

            throw error;
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

        if (
            typeof this.updateStatusPanel === "function"
        ) {

            const titleMap = {
                info: "Informasi instalasi",
                loading: "Sedang memproses instalasi",
                error: "Proses memerlukan perhatian",
                success: "Proses berhasil"
            };

            const badgeMap = {
                info: "Informasi",
                loading: "Memproses",
                error: "Perlu tindakan",
                success: "Berhasil"
            };

            this.updateStatusPanel(
                titleMap[type] || titleMap.info,
                badgeMap[type] || badgeMap.info,
                type
            );

            const status =
                document.getElementById(
                    "installer-status"
                );

            if (status) {

                status.replaceChildren();

                const paragraph =
                    document.createElement("p");

                paragraph.textContent =
                    message || "";

                status.appendChild(paragraph);

                status.classList.add("visible");
                status.classList.remove(
                    "error",
                    "success"
                );

                if (type === "error") {
                    status.classList.add("error");
                }

                if (type === "success") {
                    status.classList.add("success");
                }
            }

            return;
        }

        const status =
            document.getElementById(
                "installer-status"
            );

        if (!status) {
            return;
        }

        status.className =
            "status visible";

        if (type === "error") {
            status.classList.add("error");
        }

        if (type === "success") {
            status.classList.add("success");
        }

        status.textContent =
            message || "";
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

        if (button) {

            button.disabled = busy;

            if (busy) {

                if (!button.dataset.previousText) {
                    button.dataset.previousText =
                        button.textContent.trim();
                }

                button.textContent =
                    "Memproses...";

            } else {

                button.textContent =
                    button.dataset.previousText ||
                    "Hubungkan Google & Mulai Instalasi";

            }
        }

        const form =
            document.getElementById(
                "installer-form"
            );

        const storeNameInput =
            document.getElementById(
                "store-name"
            );

        if (storeNameInput) {
            storeNameInput.disabled =
                busy || this.databaseReadyForScript;
        }

        if (form) {
            form.setAttribute(
                "aria-busy",
                String(busy)
            );
        }

        const actionPanel =
            document.getElementById(
                "installer-action-panel"
            );

        if (actionPanel) {
            actionPanel.setAttribute(
                "aria-busy",
                String(busy)
            );
        }
    }

};