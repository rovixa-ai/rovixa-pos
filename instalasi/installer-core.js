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

    this.busy = Boolean(busy);

    const isBusy = this.busy;

    const form =
        document.getElementById(
            "installer-form"
        );

    const installButton =
        document.getElementById(
            "install-button"
        );

    const storeNameInput =
        document.getElementById(
            "store-name"
        );

    const actionPanel =
        document.getElementById(
            "installer-action-panel"
        );

    /*
     * SIMPAN STATUS AWAL TOMBOL
     * DAN NONAKTIFKAN SEMUA TOMBOL
     */

    const buttons =
        document.querySelectorAll(
            "button"
        );

    buttons.forEach((button) => {

        if (isBusy) {

            if (
                !button.hasAttribute(
                    "data-installer-busy"
                )
            ) {

                button.dataset.installerWasDisabled =
                    String(button.disabled);

                button.setAttribute(
                    "data-installer-busy",
                    "true"
                );
            }

            button.disabled = true;

            return;
        }

        /*
         * PULIHKAN STATUS AWAL
         */

        if (
            button.hasAttribute(
                "data-installer-busy"
            )
        ) {

            button.disabled =
                button.dataset.installerWasDisabled === "true";

            button.removeAttribute(
                "data-installer-busy"
            );

            delete button.dataset.installerWasDisabled;
        }
    });

    /*
     * TOMBOL UTAMA
     */

    if (installButton) {

        if (isBusy) {

            if (!installButton.dataset.previousText) {
                installButton.dataset.previousText =
                    installButton.textContent.trim();
            }

            installButton.textContent =
                "Memproses...";

        } else {

            installButton.textContent =
                installButton.dataset.previousText ||
                "Hubungkan Google & Mulai Instalasi";
        }
    }

    /*
     * INPUT NAMA TOKO
     */

    if (storeNameInput) {

        storeNameInput.disabled =
            isBusy ||
            Boolean(this.databaseReadyForScript);
    }

    /*
     * STATUS FORM
     */

    if (form) {

        form.setAttribute(
            "aria-busy",
            String(isBusy)
        );
    }

    /*
     * STATUS PANEL TINDAKAN
     */

    if (actionPanel) {

        actionPanel.setAttribute(
            "aria-busy",
            String(isBusy)
        );
    }
}

};