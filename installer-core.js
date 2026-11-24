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

    recoveryStorageKey: "ROVIXA_POS_INSTALLER_RECOVERY_V1",
    recoveryStateReady: false,

    recoveryFields: [
        "storeName",
        "folderId",
        "spreadsheetId",
        "spreadsheetUrl",
        "scriptId",
        "webAppUrl",
        "clientConfigurationSaved",
        "waitingForSpreadsheetOpen",
        "waitingForAppsScriptSettings",
        "databaseReadyForScript"
    ],

    initializeRecoveryState() {

        const fields = this.recoveryFields || [];

        fields.forEach((field) => {

            let currentValue = this[field];

            Object.defineProperty(this, field, {
                configurable: true,
                enumerable: true,

                get() {
                    return currentValue;
                },

                set(value) {
                    currentValue = value;

                    if (this.recoveryStateReady) {
                        this.saveRecoveryState();
                    }
                }
            });
        });

        let savedState = null;

        try {

            const rawState =
                window.sessionStorage.getItem(
                    this.recoveryStorageKey
                );

            if (rawState) {
                savedState = JSON.parse(rawState);
            }

        } catch (error) {

            try {
                window.sessionStorage.removeItem(
                    this.recoveryStorageKey
                );
            } catch (storageError) {
                // Storage tidak tersedia; installer tetap dapat digunakan.
            }

        }

        if (
            savedState &&
            savedState.version === 1 &&
            savedState.data &&
            typeof savedState.data === "object"
        ) {

            fields.forEach((field) => {

                if (!Object.prototype.hasOwnProperty.call(
                    savedState.data,
                    field
                )) {
                    return;
                }

                const value = savedState.data[field];

                if (field === "clientConfigurationSaved" ||
                    field === "waitingForSpreadsheetOpen" ||
                    field === "waitingForAppsScriptSettings" ||
                    field === "databaseReadyForScript") {

                    if (typeof value === "boolean") {
                        this[field] = value;
                    }

                    return;
                }

                if (
                    typeof value === "string" &&
                    value.length <= 2048
                ) {
                    this[field] = value;
                }
            });
        }

        this.recoveryStateReady = true;
        this.saveRecoveryState();

        const nameInput =
            document.getElementById("store-name");

        if (nameInput && this.storeName) {
            nameInput.value = this.storeName;
        }

        if (this.databaseReadyForScript && nameInput) {
            nameInput.disabled = true;
        }

        return Boolean(this.spreadsheetId || this.scriptId || this.webAppUrl);
    },


    saveRecoveryState() {

        if (!this.recoveryStateReady) {
            return false;
        }

        const data = {};

        (this.recoveryFields || []).forEach((field) => {
            data[field] = this[field];
        });

        try {

            window.sessionStorage.setItem(
                this.recoveryStorageKey,
                JSON.stringify({
                    version: 1,
                    data
                })
            );

            return true;

        } catch (error) {

            return false;
        }
    },


    clearRecoveryState() {

        try {
            window.sessionStorage.removeItem(
                this.recoveryStorageKey
            );
        } catch (error) {
            // Tidak mengganggu proses utama jika storage tidak tersedia.
        }

        this.recoveryStateReady = false;

        (this.recoveryFields || []).forEach((field) => {
            const defaults = {
                storeName: "",
                folderId: "",
                spreadsheetId: "",
                spreadsheetUrl: "",
                scriptId: "",
                webAppUrl: "",
                clientConfigurationSaved: false,
                waitingForSpreadsheetOpen: false,
                waitingForAppsScriptSettings: false,
                databaseReadyForScript: false
            };

            this[field] = defaults[field];
        });

        this.recoveryStateReady = true;
    },


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

        const hasRecoveredInstallation =
            this.initializeRecoveryState();

        this.loadGoogleIdentity();

        if (hasRecoveredInstallation) {

            if (this.webAppUrl) {

                if (this.clientConfigurationSaved) {
                    this.showSuccess();
                } else {
                    this.waitingForSpreadsheetOpen = true;
                    this.showRetryDeploymentStep(
                        "Deployment Web App sudah tersedia. Otorisasi Google kembali untuk menyimpan hasil instalasi tanpa membuat database baru."
                    );
                }

            } else if (
                this.spreadsheetId &&
                this.scriptId
            ) {

                this.waitingForSpreadsheetOpen = true;

                this.showRetryDeploymentStep(
                    "Progres instalasi dipulihkan. Database dan Apps Script yang sudah dibuat akan digunakan kembali."
                );

            } else if (this.spreadsheetId) {

                this.showAppsScriptSettingsStep(
                    "Database pelanggan sudah ditemukan. Lanjutkan proses Apps Script menggunakan database yang sama."
                );

            }
        }

        form.addEventListener("submit", (event) => {

            event.preventDefault();

            if (this.busy) {
                return;
            }

            if (this.webAppUrl && this.clientConfigurationSaved) {
                this.showSuccess();
                return;
            }

            if (
                this.webAppUrl &&
                !this.clientConfigurationSaved &&
                this.accessToken
            ) {
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

            const label =
                button.querySelector(
                    "span:not(.button-arrow)"
                ) || button;

            if (busy) {

                if (!button.dataset.previousText) {
                    button.dataset.previousText =
                        label.textContent.trim();
                }

                label.textContent =
                    "Memproses...";

                button.disabled = true;
                button.dataset.loading = "true";
                button.setAttribute("aria-busy", "true");

            } else {

                label.textContent =
                    button.dataset.previousText ||
                    "Hubungkan Google & Mulai Instalasi";

                button.disabled = false;
                delete button.dataset.loading;
                button.removeAttribute("aria-busy");

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