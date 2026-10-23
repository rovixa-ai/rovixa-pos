
/* ======================================
   ROVIXA POS
   INSTALLER
====================================== */

const INSTALLER_CONFIG = {

    CLIENT_ID:
        "465650752797-ji8ha0uvs5d173v588qapiur7dsl4lnp.apps.googleusercontent.com",

    TEMPLATE_SPREADSHEET_ID:
        "1MNXOrJqIO2xGytntyeHK87R0r_Zf0CNb2W748FXEc14",

    TEMPLATE_SCRIPT_ID:
        "179UpTQqLCA3SavC6M07GFqBLCWHQh87AIFpJ4Wj53rKf_0mCi4FHMJR4",

    DRIVE_API:
        "https://www.googleapis.com/drive/v3",

    SHEETS_API:
        "https://sheets.googleapis.com/v4",

    SCRIPT_API:
        "https://script.googleapis.com/v1",

    FOLDER_NAME:
        "Rovixa POS",

    SCRIPT_CONFIG_RANGE:
        "__INSTALLER_CONFIG!A1:B2",

    SCRIPT_ID_WAIT_INTERVAL:
        1000,

    SCRIPT_ID_TIMEOUT:
        30000,

    OAUTH_SCOPES: [
        "https://www.googleapis.com/auth/drive",
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/script.projects",
        "https://www.googleapis.com/auth/script.deployments"
    ].join(" ")
};


/* ======================================
   INSTALLER
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

            if (this.waitingForSpreadsheetOpen) {
                this.continueDeployment();
                return;
            }

            this.startInstallation();

        });
    },


    /* ======================================
       GOOGLE IDENTITY
    ====================================== */

    loadGoogleIdentity() {

        if (
            window.google &&
            google.accounts &&
            google.accounts.oauth2
        ) {
            this.initializeTokenClient();
            return;
        }

        const existingScript =
            document.querySelector(
                'script[src="https://accounts.google.com/gsi/client"]'
            );

        if (existingScript) {

            existingScript.addEventListener(
                "load",
                () => this.initializeTokenClient(),
                { once: true }
            );

            return;
        }

        const script =
            document.createElement("script");

        script.src =
            "https://accounts.google.com/gsi/client";

        script.async = true;
        script.defer = true;

        script.onload = () => {
            this.initializeTokenClient();
        };

        script.onerror = () => {

            this.setStatus(
                "Google Identity Services gagal dimuat.",
                "error"
            );

        };

        document.head.appendChild(script);
    },


    initializeTokenClient() {

        if (
            !window.google ||
            !google.accounts ||
            !google.accounts.oauth2
        ) {

            this.setStatus(
                "Layanan autentikasi Google belum tersedia.",
                "error"
            );

            return;
        }

        this.tokenClient =
            google.accounts.oauth2.initTokenClient({

                client_id:
                    INSTALLER_CONFIG.CLIENT_ID,

                scope:
                    INSTALLER_CONFIG.OAUTH_SCOPES,

                callback: async (response) => {

                    if (
                        !response ||
                        response.error ||
                        !response.access_token
                    ) {

                        this.setBusy(false);

                        this.setStatus(
                            "Otorisasi Google gagal: " +
                            (
                                response?.error_description ||
                                response?.error ||
                                "Token akses tidak diperoleh."
                            ),
                            "error"
                        );

                        return;
                    }

                    this.accessToken =
                        response.access_token;

                    const purpose =
                        this.oauthPurpose;

                    this.oauthPurpose = "";

                    try {

                        if (purpose === "install") {

                            await this.installStoreDatabase();

                        } else if (purpose === "deploy") {

                            await this.runDeployment();

                        } else {

                            this.setBusy(false);

                            this.setStatus(
                                "Tujuan otorisasi tidak ditemukan. Silakan ulangi langkah terakhir.",
                                "error"
                            );

                        }

                    } catch (error) {

                        this.setBusy(false);

                        this.setStatus(
                            error.message ||
                            "Instalasi gagal.",
                            "error"
                        );

                    }

                }

            });
    },


    /* ======================================
       START INSTALLATION
    ====================================== */

    startInstallation() {

        if (this.busy) {
            return;
        }

        const nameInput =
            document.getElementById("store-name");

        const storeName =
            nameInput?.value?.trim();

        if (!storeName) {

            this.setStatus(
                "Nama toko wajib diisi.",
                "error"
            );

            nameInput?.focus();

            return;
        }

        if (!this.tokenClient) {

            this.setStatus(
                "Layanan Google belum siap. Coba kembali.",
                "error"
            );

            return;
        }

        this.storeName = storeName;
        this.oauthPurpose = "install";

        this.setBusy(true);

        this.setStatus(
            "Meminta izin Google...",
            "loading"
        );

        this.tokenClient.requestAccessToken({
    prompt: "consent select_account"
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
       FIND OR CREATE FOLDER
    ====================================== */

    async findOrCreateFolder() {

        this.setStatus(
            "Memeriksa folder Rovixa POS...",
            "loading"
        );

        const query =
            "name = '" +
            INSTALLER_CONFIG.FOLDER_NAME.replace(
                /'/g,
                "\\'"
            ) +
            "' and mimeType = 'application/vnd.google-apps.folder' and trashed = false";

        const params =
            new URLSearchParams({

                q: query,

                fields:
                    "files(id,name,webViewLink)",

                pageSize: "100"

            });

        const result =
            await this.driveRequest(
                "/files?" + params.toString()
            );

        if (
            result.files &&
            result.files.length > 0
        ) {

            this.folderId =
                result.files[0].id;

            return this.folderId;
        }

        const folder =
            await this.driveRequest(
                "/files",
                {

                    method: "POST",

                    body: JSON.stringify({

                        name:
                            INSTALLER_CONFIG.FOLDER_NAME,

                        mimeType:
                            "application/vnd.google-apps.folder"

                    })

                }
            );

        if (!folder.id) {

            throw new Error(
                "Folder Rovixa POS gagal dibuat."
            );
        }

        this.folderId =
            folder.id;

        return this.folderId;
    },


    /* ======================================
       COPY DATABASE TEMPLATE
    ====================================== */

    async installStoreDatabase() {

        this.setStatus(
            "Menyiapkan folder instalasi...",
            "loading"
        );

        await this.findOrCreateFolder();

        this.setStatus(
            "Menyalin spreadsheet template...",
            "loading"
        );

        const copyResult =
            await this.driveRequest(

                "/files/" +
                encodeURIComponent(
                    INSTALLER_CONFIG.TEMPLATE_SPREADSHEET_ID
                ) +
                "/copy",

                {

                    method: "POST",

                    body: JSON.stringify({

                        name: this.storeName,

                        parents: [
                            this.folderId
                        ]

                    })

                }

            );

        if (!copyResult.id) {

            throw new Error(
                "Spreadsheet hasil salinan tidak memiliki ID."
            );
        }

        this.spreadsheetId =
            copyResult.id;

        this.spreadsheetUrl =
            copyResult.webViewLink ||
            "https://docs.google.com/spreadsheets/d/" +
            this.spreadsheetId +
            "/edit";

        this.waitingForSpreadsheetOpen = true;

        this.setBusy(false);

        this.showOpenSpreadsheetStep();
    },


    /* ======================================
       OPEN SPREADSHEET STEP
    ====================================== */

    showOpenSpreadsheetStep() {

        const status =
            document.getElementById(
                "installer-status"
            );

        if (!status) {
            return;
        }

        status.className =
            "installer-status installer-status-info";

        status.replaceChildren();

        const title =
            document.createElement("strong");

        title.textContent =
            "Database berhasil disalin.";

        const description =
            document.createElement("p");

        description.textContent =
            "Buka spreadsheet hasil salinan. Tunggu sampai sheet __INSTALLER_CONFIG berisi Script ID, lalu kembali ke sini dan lanjutkan deployment.";

        const link =
            document.createElement("a");

        link.href =
            this.spreadsheetUrl;

        link.target = "_blank";

        link.rel =
            "noopener noreferrer";

        link.textContent =
            "Buka Database Rovixa POS";

        const button =
            document.createElement("button");

        button.type = "button";

        button.textContent =
            "Lanjutkan Deployment";

        button.addEventListener(
            "click",
            () => this.continueDeployment()
        );

        status.append(
            title,
            description,
            link,
            button
        );
    },


    /* ======================================
       CONTINUE DEPLOYMENT
    ====================================== */

    async continueDeployment() {

        if (this.busy) {
            return;
        }

        if (
            !this.waitingForSpreadsheetOpen ||
            !this.spreadsheetId
        ) {

            this.setStatus(
                "Tahap deployment belum siap.",
                "error"
            );

            return;
        }

        if (!this.tokenClient) {

            this.setStatus(
                "Layanan Google belum siap.",
                "error"
            );

            return;
        }

        /*
         * Selalu minta token baru untuk deployment.
         * Callback akan menjalankan runDeployment()
         * tanpa memanggil continueDeployment() kembali.
         */
        this.oauthPurpose = "deploy";

        this.setBusy(true);

        this.setStatus(
            "Meminta otorisasi Google untuk deployment...",
            "loading"
        );

       this.tokenClient.requestAccessToken({
    prompt: "consent select_account"
});
    },


    /* ======================================
       RUN DEPLOYMENT
    ====================================== */

    async runDeployment() {

        if (
            !this.waitingForSpreadsheetOpen ||
            !this.spreadsheetId
        ) {

            throw new Error(
                "Spreadsheet hasil salinan tidak ditemukan."
            );
        }

        this.setBusy(true);

        try {

            this.setStatus(
                "Menunggu Script ID hasil salinan...",
                "loading"
            );

            this.scriptId =
                await this.waitForCopiedScriptId();

            this.setStatus(
                "Memverifikasi proyek Apps Script...",
                "loading"
            );

            await this.verifyCopiedScript();

            this.setStatus(
                "Membuat versi Apps Script...",
                "loading"
            );

            const version =
                await this.createScriptVersion();

            if (!version.versionNumber) {

                throw new Error(
                    "Nomor versi Apps Script tidak ditemukan."
                );
            }

            this.setStatus(
                "Melakukan deployment Web App...",
                "loading"
            );

            const deployment =
                await this.createWebAppDeployment(
                    version.versionNumber
                );

            const webApp =
                (deployment.entryPoints || [])
                    .find((entry) =>
                        entry.entryPointType === "WEB_APP"
                    );

            if (!webApp?.webApp?.url) {

                throw new Error(
                    "Deployment dibuat, tetapi URL Web App tidak ditemukan."
                );
            }

            this.webAppUrl =
                webApp.webApp.url;

            this.waitingForSpreadsheetOpen = false;

            this.setBusy(false);

            this.showSuccess();

        } catch (error) {

            this.setBusy(false);

            this.setStatus(
                error.message ||
                "Deployment gagal.",
                "error"
            );

        }
    },


    /* ======================================
       WAIT FOR COPIED SCRIPT ID
    ====================================== */

    async waitForCopiedScriptId() {

        const startedAt =
            Date.now();

        let lastError = "";

        while (
            Date.now() - startedAt <
            INSTALLER_CONFIG.SCRIPT_ID_TIMEOUT
        ) {

            const elapsedSeconds =
                Math.floor(
                    (Date.now() - startedAt) / 1000
                );

            this.setStatus(
                "Menunggu Script ID hasil salinan... " +
                elapsedSeconds +
                " detik dari 30 detik.",
                "loading"
            );

            try {

                const scriptId =
                    await this.readCopiedScriptId();

                if (
                    scriptId &&
                    scriptId !==
                    INSTALLER_CONFIG.TEMPLATE_SCRIPT_ID
                ) {

                    return scriptId;
                }

                lastError =
                    "Script ID yang terbaca masih sama dengan ID template.";

            } catch (error) {

                lastError =
                    error.message;

            }

            await new Promise((resolve) => {

                setTimeout(
                    resolve,
                    INSTALLER_CONFIG.SCRIPT_ID_WAIT_INTERVAL
                );

            });

        }

        throw new Error(
            "Script ID hasil salinan tidak berhasil diperoleh dalam 30 detik. " +
            (lastError || "Pastikan spreadsheet salinan sudah dibuka.")
        );
    },


    /* ======================================
       READ SCRIPT ID FROM SHEET
    ====================================== */

    async readCopiedScriptId() {

        const range =
            encodeURIComponent(
                INSTALLER_CONFIG.SCRIPT_CONFIG_RANGE
            );

        const url =
            INSTALLER_CONFIG.SHEETS_API +
            "/spreadsheets/" +
            encodeURIComponent(this.spreadsheetId) +
            "/values/" +
            range;

        const result =
            await this.apiRequest(url);

        const rows =
            result.values || [];

        const row =
            rows.find((item) =>
                item[0] === "scriptId"
            );

        const scriptId =
            row?.[1]?.trim();

        if (!scriptId) {

            throw new Error(
                "Script ID belum tertulis di sheet konfigurasi."
            );
        }

        if (
            !/^[a-zA-Z0-9_-]+$/.test(scriptId)
        ) {

            throw new Error(
                "Format Script ID tidak valid."
            );
        }

        return scriptId;
    },


    /* ======================================
       VERIFY COPIED SCRIPT
    ====================================== */

    async verifyCopiedScript() {

        const url =
            INSTALLER_CONFIG.SCRIPT_API +
            "/projects/" +
            encodeURIComponent(this.scriptId);

        const project =
            await this.apiRequest(url);

        if (
            !project.scriptId ||
            project.scriptId !== this.scriptId
        ) {

            throw new Error(
                "Proyek Apps Script tidak berhasil diverifikasi."
            );
        }

        if (
            project.parentId &&
            project.parentId !== this.spreadsheetId
        ) {

            throw new Error(
                "Script ID yang ditemukan bukan milik spreadsheet hasil salinan."
            );
        }

        return project;
    },


    /* ======================================
       CREATE VERSION
    ====================================== */

    async createScriptVersion() {

        const url =
            INSTALLER_CONFIG.SCRIPT_API +
            "/projects/" +
            encodeURIComponent(this.scriptId) +
            "/versions";

        return this.apiRequest(
            url,
            {

                method: "POST",

                body: JSON.stringify({

                    description:
                        "Rovixa POS - " +
                        this.storeName +
                        " - Instalasi otomatis"

                })

            }
        );
    },


   /* ======================================
   CREATE WEB APP DEPLOYMENT
====================================== */

async createWebAppDeployment(versionNumber) {

    const url =
        INSTALLER_CONFIG.SCRIPT_API +
        "/projects/" +
        encodeURIComponent(this.scriptId) +
        "/deployments";

    return this.apiRequest(
        url,
        {
            method: "POST",

            body: JSON.stringify({
                versionNumber: versionNumber,

                manifestFileName: "appsscript",

                description:
                    "Rovixa POS Web App - " +
                    this.storeName
            })
        }
    );
},


    /* ======================================
       SUCCESS
    ====================================== */

    showSuccess() {

        const status =
            document.getElementById(
                "installer-status"
            );

        if (!status) {
            return;
        }

        status.className =
            "installer-status installer-status-success";

        status.replaceChildren();

        const title =
            document.createElement("strong");

        title.textContent =
            "Instalasi Rovixa POS berhasil.";

        const description =
            document.createElement("p");

        description.textContent =
            "Database berhasil disalin dan deployment Web App berhasil dibuat.";

        const databaseLink =
            document.createElement("a");

        databaseLink.href =
            this.spreadsheetUrl;

        databaseLink.target = "_blank";

        databaseLink.rel =
            "noopener noreferrer";

        databaseLink.textContent =
            "Buka Database";

        const urlLabel =
            document.createElement("p");

        urlLabel.textContent =
            "URL Web App:";

        const urlLink =
            document.createElement("a");

        urlLink.href =
            this.webAppUrl;

        urlLink.target = "_blank";

        urlLink.rel =
            "noopener noreferrer";

        urlLink.textContent =
            this.webAppUrl;

        const copyButton =
            document.createElement("button");

        copyButton.type = "button";

        copyButton.textContent =
            "Salin URL Web App";

        copyButton.addEventListener(
            "click",
            async () => {

                try {

                    await navigator.clipboard.writeText(
                        this.webAppUrl
                    );

                    copyButton.textContent =
                        "URL berhasil disalin";

                } catch {

                    this.setStatus(
                        "Penyalinan otomatis gagal. Salin URL Web App secara manual.",
                        "error"
                    );

                }

            }
        );

        status.append(
            title,
            description,
            databaseLink,
            urlLabel,
            urlLink,
            copyButton
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


/* ======================================
   INITIALIZE
====================================== */

if (document.readyState === "loading") {

    document.addEventListener(
        "DOMContentLoaded",
        () => Installer.init(),
        { once: true }
    );

} else {

    Installer.init();

}
