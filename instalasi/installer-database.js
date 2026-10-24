/* ======================================
   ROVIXA POS
   INSTALLER DATABASE
====================================== */

Object.assign(Installer, {

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
        this.waitingForAppsScriptSettings = true;

        this.setBusy(false);

        this.showAppsScriptSettingsStep();
    },


    /* ======================================
       APPS SCRIPT SETTINGS STEP
    ====================================== */

    showAppsScriptSettingsStep() {

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
            "Langkah berikutnya, buka pengaturan Google Apps Script pada akun pelanggan dan aktifkan Google Apps Script API. Setelah selesai, kembali ke installer untuk melanjutkan deployment. Database tidak akan disalin ulang.";

        const settingsLink =
            document.createElement("a");

        settingsLink.href =
            INSTALLER_CONFIG.APPS_SCRIPT_SETTINGS_URL;

        settingsLink.target = "_blank";

        settingsLink.rel =
            "noopener noreferrer";

        settingsLink.textContent =
            "Buka Pengaturan Google Apps Script";

        const databaseLink =
            document.createElement("a");

        databaseLink.href =
            this.spreadsheetUrl;

        databaseLink.target = "_blank";

        databaseLink.rel =
            "noopener noreferrer";

        databaseLink.textContent =
            "Buka Database Rovixa POS";

        const button =
            document.createElement("button");

        button.type = "button";

        button.textContent =
            "Saya Sudah Mengaktifkan API — Lanjutkan";

        button.addEventListener(
            "click",
            () => this.continueDeployment()
        );

        status.append(
            title,
            description,
            settingsLink,
            document.createElement("br"),
            databaseLink,
            document.createElement("br"),
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
            !this.spreadsheetId ||
            !this.waitingForSpreadsheetOpen
        ) {

            this.setStatus(
                "Tahap deployment belum siap. Database hasil salinan tidak ditemukan.",
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

        this.waitingForAppsScriptSettings = false;
        this.oauthPurpose = "deploy";

        this.setBusy(true);

        this.setStatus(
            "Meminta otorisasi Google untuk deployment...",
            "loading"
        );

        this.tokenClient.requestAccessToken({
            prompt: "consent select_account"
        });
    }

});
