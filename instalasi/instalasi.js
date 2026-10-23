/* ======================================
   ROVIXA POS
   INSTALLER
====================================== */

const INSTALLER_CONFIG = {

    CLIENT_ID:
        "465650752797-ji8ha0uvs5d173v588qapiur7dsl4lnp.apps.googleusercontent.com",

    TEMPLATE_SPREADSHEET_ID:
        "1MNXOrJqIO2xGytntyeHK87R0r_Zf0CNb2W748FXEc14",

    DRIVE_API:
        "https://www.googleapis.com/drive/v3",

    SHEETS_API:
        "https://sheets.googleapis.com/v4",

    SCRIPT_API:
        "https://script.googleapis.com/v1",

    FOLDER_NAME:
        "Rovixa POS",

    SCRIPT_CONFIG_SHEET:
        "__INSTALLER_CONFIG",

    SCRIPT_CONFIG_RANGE:
        "__INSTALLER_CONFIG!A1:B2",

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

    init() {

        const form =
            document.getElementById("installer-form");

        const installButton =
            document.getElementById("install-button");

        if (!form || !installButton) {
            console.error(
                "Elemen installer tidak ditemukan."
            );

            return;
        }

        if (form.dataset.installerInitialized === "true") {
            return;
        }

        form.dataset.installerInitialized = "true";

        this.loadGoogleIdentity();

        form.addEventListener("submit", (event) => {

            event.preventDefault();

            if (this.waitingForSpreadsheetOpen) {

                this.continueDeployment();

                return;
            }

            this.startInstallation();

        });

        installButton.disabled = false;
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
                "Google Identity Services gagal dimuat. Periksa koneksi internet.",
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

                    try {

                        if (this.waitingForSpreadsheetOpen) {

                            await this.continueDeployment();

                        } else {

                            await this.installStoreDatabase();

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
                "Layanan Google belum siap. Tunggu sebentar lalu coba kembali.",
                "error"
            );

            return;
        }

        this.storeName = storeName;

        this.storeEmail = "";

        this.setBusy(true);

        this.setStatus(
            "Meminta izin Google...",
            "loading"
        );

        this.tokenClient.requestAccessToken({
            prompt: "consent"
        });
    },


    /* ======================================
       API REQUEST
    ====================================== */

    async apiRequest(
        url,
        options = {}
    ) {

        if (!this.accessToken) {

            throw new Error(
                "Token Google belum tersedia."
            );
        }

        const headers = new Headers(
            options.headers || {}
        );

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

        const response = await fetch(url, {
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

            const message =
                result.error?.message ||
                result.message ||
                "Permintaan Google API gagal: HTTP " +
                response.status;

            throw new Error(message);
        }

        return result;
    },


    /* ======================================
       DRIVE REQUEST
    ====================================== */

    async driveRequest(
        path,
        options = {}
    ) {

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

        const folderName =
            INSTALLER_CONFIG.FOLDER_NAME;

        const query =
            "name = '" +
            folderName.replace(/'/g, "\\'") +
            "' and mimeType = 'application/vnd.google-apps.folder' and trashed = false";

        const searchParams =
            new URLSearchParams({

                q: query,

                fields:
                    "files(id,name,mimeType,webViewLink)",

                pageSize: "100"

            });

        const searchResult =
            await this.driveRequest(
                "/files?" + searchParams.toString()
            );

        const folders =
            searchResult.files || [];

        if (folders.length > 0) {

            this.folderId =
                folders[0].id;

            return this.folderId;
        }

        const createdFolder =
            await this.driveRequest(
                "/files",
                {

                    method: "POST",

                    body: JSON.stringify({

                        name: folderName,

                        mimeType:
                            "application/vnd.google-apps.folder"

                    })

                }
            );

        if (!createdFolder.id) {

            throw new Error(
                "Folder Rovixa POS gagal dibuat."
            );
        }

        this.folderId =
            createdFolder.id;

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
            "Menyalin database template...",
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

                        name:
                            this.storeName,

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

        const statusElement =
            document.getElementById("installer-status");

        if (!statusElement) {
            return;
        }

        statusElement.className =
            "installer-status installer-status-info";

        statusElement.innerHTML = "";

        const title =
            document.createElement("strong");

        title.textContent =
            "Database berhasil disalin.";

        const description =
            document.createElement("p");

        description.textContent =
            "Buka spreadsheet hasil salinan di bawah ini. Setelah terbuka, tunggu beberapa detik agar fungsi onOpen menyimpan Script ID, lalu kembali ke halaman installer.";

        const spreadsheetLink =
            document.createElement("a");

        spreadsheetLink.href =
            this.spreadsheetUrl;

        spreadsheetLink.target =
            "_blank";

        spreadsheetLink.rel =
            "noopener noreferrer";

        spreadsheetLink.textContent =
            "Buka Database Rovixa POS";

        const continueButton =
            document.createElement("button");

        continueButton.type =
            "button";

        continueButton.textContent =
            "Lanjutkan Deployment";

        continueButton.addEventListener(
            "click",
            () => this.continueDeployment()
        );

        statusElement.append(
            title,
            description,
            spreadsheetLink,
            continueButton
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

        if (!this.accessToken) {

            this.setBusy(true);

            this.tokenClient.requestAccessToken({
                prompt: ""
            });

            return;
        }

        this.setBusy(true);

        try {

            this.setStatus(
                "Membaca Script ID dari spreadsheet hasil salinan...",
                "loading"
            );

            this.scriptId =
                await this.readCopiedScriptId();

            this.setStatus(
                "Memeriksa proyek Apps Script hasil salinan...",
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
                    "Google tidak mengembalikan nomor versi Apps Script."
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

            const webAppEntry =
                (deployment.entryPoints || [])
                    .find((entry) =>
                        entry.entryPointType === "WEB_APP"
                    );

            const webAppUrl =
                webAppEntry?.webApp?.url;

            if (!webAppUrl) {

                throw new Error(
                    "Deployment berhasil dibuat, tetapi URL Web App tidak ditemukan. Periksa konfigurasi webapp pada manifest Apps Script."
                );
            }

            this.webAppUrl =
                webAppUrl;

            this.waitingForSpreadsheetOpen = false;

            this.setBusy(false);

            this.showSuccess();

        } catch (error) {

            this.setBusy(false);

            this.setStatus(
                "Deployment belum berhasil: " +
                error.message,
                "error"
            );

        }
    },


    /* ======================================
       READ SCRIPT ID
    ====================================== */

    async readCopiedScriptId() {

        const encodedRange =
            encodeURIComponent(
                INSTALLER_CONFIG.SCRIPT_CONFIG_RANGE
            );

        const url =
            INSTALLER_CONFIG.SHEETS_API +
            "/spreadsheets/" +
            encodeURIComponent(this.spreadsheetId) +
            "/values/" +
            encodedRange;

        let result;

        try {

            result = await this.apiRequest(url);

        } catch (error) {

            throw new Error(
                "Sheet konfigurasi belum bisa dibaca. Pastikan spreadsheet hasil salinan sudah dibuka dan fungsi onOpen selesai berjalan. Detail: " +
                error.message
            );

        }

        const rows =
            result.values || [];

        const scriptIdRow =
            rows.find((row) =>
                row[0] === "scriptId"
            );

        const scriptId =
            scriptIdRow?.[1]?.trim();

        if (!scriptId) {

            throw new Error(
                "Script ID belum ditemukan. Pastikan spreadsheet hasil salinan sudah dibuka, fungsi installerSaveScriptId berhasil berjalan, lalu coba lagi."
            );
        }

        if (!/^[a-zA-Z0-9_-]+$/.test(scriptId)) {

            throw new Error(
                "Script ID yang tersimpan memiliki format tidak valid."
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

        if (!project.scriptId) {

            throw new Error(
                "Proyek Apps Script tidak dapat diverifikasi."
            );
        }

        if (
            project.parentId &&
            project.parentId !== this.spreadsheetId
        ) {

            throw new Error(
                "Script ID yang ditemukan bukan milik spreadsheet hasil salinan ini."
            );
        }

        return project;
    },


    /* ======================================
       CREATE SCRIPT VERSION
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

    async createWebAppDeployment(
        versionNumber
    ) {

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

                    versionNumber:
                        versionNumber,

                    manifestFileName:
                        "appsscript",

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

        const statusElement =
            document.getElementById("installer-status");

        if (!statusElement) {
            return;
        }

        statusElement.className =
            "installer-status installer-status-success";

        statusElement.innerHTML = "";

        const title =
            document.createElement("strong");

        title.textContent =
            "Instalasi Rovixa POS berhasil.";

        const description =
            document.createElement("p");

        description.textContent =
            "Database berhasil disalin dan deployment Web App telah dibuat.";

        const databaseLink =
            document.createElement("a");

        databaseLink.href =
            this.spreadsheetUrl;

        databaseLink.target =
            "_blank";

        databaseLink.rel =
            "noopener noreferrer";

        databaseLink.textContent =
            "Buka Database";

        const scriptUrlLabel =
            document.createElement("p");

        scriptUrlLabel.textContent =
            "URL Web App:";

        const scriptUrl =
            document.createElement("a");

        scriptUrl.href =
            this.webAppUrl;

        scriptUrl.target =
            "_blank";

        scriptUrl.rel =
            "noopener noreferrer";

        scriptUrl.textContent =
            this.webAppUrl;

        const copyButton =
            document.createElement("button");

        copyButton.type =
            "button";

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
                        "Tidak dapat menyalin URL secara otomatis. Salin URL yang ditampilkan.",
                        "error"
                    );

                }

            }
        );

        statusElement.append(
            title,
            description,
            databaseLink,
            scriptUrlLabel,
            scriptUrl,
            copyButton
        );

        console.info(
            "Rovixa POS installation completed.",
            {

                storeName:
                    this.storeName,

                spreadsheetId:
                    this.spreadsheetId,

                scriptId:
                    this.scriptId,

                webAppUrl:
                    this.webAppUrl

            }
        );
    },


    /* ======================================
       STATUS
    ====================================== */

    setStatus(
        message,
        type = "info"
    ) {

        const statusElement =
            document.getElementById("installer-status");

        if (!statusElement) {

            console.log(
                "[Installer]",
                message
            );

            return;
        }

        statusElement.className =
            "installer-status installer-status-" +
            type;

        statusElement.textContent =
            message;
    },


    /* ======================================
       BUSY STATE
    ====================================== */

    setBusy(busy) {

        this.busy = busy;

        const button =
            document.getElementById("install-button");

        if (button) {

            button.disabled =
                busy;

            if (busy) {

                button.dataset.previousText =
                    button.textContent;

                button.textContent =
                    "Memproses...";

            } else {

                button.textContent =
                    button.dataset.previousText ||
                    "Instal Rovixa POS";

            }

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