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
                fields: "files(id,name,webViewLink)",
                pageSize: "100"
            });

        const result =
            await this.driveRequest(
                "/files?" + params.toString()
            );

        if (result.files && result.files.length > 0) {
            this.folderId = result.files[0].id;
            return this.folderId;
        }

        const folder =
            await this.driveRequest(
                "/files",
                {
                    method: "POST",
                    body: JSON.stringify({
                        name: INSTALLER_CONFIG.FOLDER_NAME,
                        mimeType: "application/vnd.google-apps.folder"
                    })
                }
            );

        if (!folder.id) {
            throw new Error(
                "Folder Rovixa POS gagal dibuat."
            );
        }

        this.folderId = folder.id;
        return this.folderId;
    },


    /* ======================================
       COPY TEMPLATE SPREADSHEET STRUCTURE
    ====================================== */

    async installStoreDatabase() {

        if (this.busy && !this._databaseProcessActive) {
            return;
        }

        const startedBusy =
            this.busy;

        this._databaseProcessActive = true;
        this.setBusy(true);

        try {

            /*
             * MENCEGAH PEMBUATAN SPREADSHEET GANDA
             */

            if (this.spreadsheetId) {

                this.spreadsheetUrl =
                    this.spreadsheetUrl ||
                    "https://docs.google.com/spreadsheets/d/" +
                    this.spreadsheetId +
                    "/edit";

                if (!this.scriptId) {

                    this.databaseReadyForScript = true;

                    await this.createBoundScriptFromTemplate();

                }

                if (this.scriptId) {
                    await this.runDeployment();
                    return;
                }

                throw new Error(
                    "Database sudah dibuat. Instalasi dilanjutkan dari tahap Apps Script."
                );
            }

            this.setStatus(
                "Menyiapkan folder instalasi...",
                "loading"
            );

            await this.findOrCreateFolder();

            this.setStatus(
                "Membaca struktur spreadsheet template...",
                "loading"
            );

            const template =
                await this.apiRequest(
                    INSTALLER_CONFIG.SHEETS_API +
                    "/spreadsheets/" +
                    encodeURIComponent(
                        INSTALLER_CONFIG.TEMPLATE_SPREADSHEET_ID
                    ) +
                    "?fields=" +
                    encodeURIComponent(
                        "spreadsheetId,properties(title,locale,timeZone,autoRecalc,spreadsheetTheme),sheets(properties(sheetId,title,index)),namedRanges"
                    )
                );

            if (!template.sheets || !template.sheets.length) {
                throw new Error(
                    "Sheet pada spreadsheet template tidak ditemukan."
                );
            }

            const sourceSheets =
                [...template.sheets].sort(
                    (a, b) =>
                        (a.properties.index || 0) -
                        (b.properties.index || 0)
                );

            const spreadsheetProperties = {
                title: this.storeName
            };

            [
                "locale",
                "timeZone",
                "autoRecalc",
                "iterativeCalculation",
                "spreadsheetTheme"
            ].forEach((key) => {

                if (template.properties?.[key] !== undefined) {

                    spreadsheetProperties[key] =
                        template.properties[key];

                }

            });

            this.setStatus(
                "Membuat spreadsheet pelanggan...",
                "loading"
            );

            const created =
                await this.apiRequest(
                    INSTALLER_CONFIG.SHEETS_API +
                    "/spreadsheets",
                    {
                        method: "POST",
                        body: JSON.stringify({
                            properties: spreadsheetProperties
                        })
                    }
                );

            if (!created.spreadsheetId) {
                throw new Error(
                    "Spreadsheet pelanggan gagal dibuat."
                );
            }

            this.spreadsheetId =
                created.spreadsheetId;

            this.spreadsheetUrl =
                "https://docs.google.com/spreadsheets/d/" +
                this.spreadsheetId +
                "/edit";

            /*
             * Simpan progres sesegera mungkin agar jika proses
             * berikutnya gagal, installer tidak membuat database baru.
             */

            this.databaseReadyForScript = false;

            const initialSheetId =
                created.sheets?.[0]?.properties?.sheetId;

            await this.moveSpreadsheetToFolder();

            const copiedSheets = [];

            for (
                let i = 0;
                i < sourceSheets.length;
                i++
            ) {

                const sourceSheet =
                    sourceSheets[i].properties;

                this.setStatus(
                    "Menyalin sheet " +
                    (i + 1) +
                    " dari " +
                    sourceSheets.length +
                    ": " +
                    sourceSheet.title +
                    "...",
                    "loading"
                );

                const copied =
                    await this.apiRequest(
                        INSTALLER_CONFIG.SHEETS_API +
                        "/spreadsheets/" +
                        encodeURIComponent(
                            INSTALLER_CONFIG.TEMPLATE_SPREADSHEET_ID
                        ) +
                        "/sheets/" +
                        encodeURIComponent(
                            sourceSheet.sheetId
                        ) +
                        ":copyTo",
                        {
                            method: "POST",
                            body: JSON.stringify({
                                destinationSpreadsheetId:
                                    this.spreadsheetId
                            })
                        }
                    );

                if (!copied.sheetId) {
                    throw new Error(
                        "Sheet '" +
                        sourceSheet.title +
                        "' gagal disalin."
                    );
                }

                copiedSheets.push({
                    sourceSheetId: sourceSheet.sheetId,
                    newSheetId: copied.sheetId,
                    title: sourceSheet.title,
                    index: sourceSheet.index
                });

            }

            this.setStatus(
                "Menyusun nama dan urutan sheet...",
                "loading"
            );

            const firstBatch = [];

            if (initialSheetId !== undefined) {

                firstBatch.push({
                    deleteSheet: {
                        sheetId: initialSheetId
                    }
                });

            }

            copiedSheets.forEach(
                (sheet, index) => {

                    firstBatch.push({
                        updateSheetProperties: {
                            properties: {
                                sheetId: sheet.newSheetId,
                                title:
                                    "__INSTALLER_TEMP_" +
                                    index +
                                    "_" +
                                    sheet.newSheetId
                            },
                            fields: "title"
                        }
                    });

                }
            );

            if (firstBatch.length) {

                await this.apiRequest(
                    INSTALLER_CONFIG.SHEETS_API +
                    "/spreadsheets/" +
                    encodeURIComponent(
                        this.spreadsheetId
                    ) +
                    ":batchUpdate",
                    {
                        method: "POST",
                        body: JSON.stringify({
                            requests: firstBatch
                        })
                    }
                );

            }

            const renameRequests =
                copiedSheets.map(
                    (sheet) => ({
                        updateSheetProperties: {
                            properties: {
                                sheetId: sheet.newSheetId,
                                title: sheet.title,
                                index: sheet.index
                            },
                            fields: "title,index"
                        }
                    })
                );

            if (renameRequests.length) {

                await this.apiRequest(
                    INSTALLER_CONFIG.SHEETS_API +
                    "/spreadsheets/" +
                    encodeURIComponent(
                        this.spreadsheetId
                    ) +
                    ":batchUpdate",
                    {
                        method: "POST",
                        body: JSON.stringify({
                            requests: renameRequests
                        })
                    }
                );

            }

            await this.copyNamedRanges(
                template.namedRanges || [],
                copiedSheets
            );

            this.databaseReadyForScript = true;

            this.setStatus(
                "Membuat Apps Script yang terikat ke spreadsheet pelanggan...",
                "loading"
            );

            await this.createBoundScriptFromTemplate();

            this.waitingForSpreadsheetOpen = true;
            this.waitingForAppsScriptSettings = false;

            await this.runDeployment();

        } catch (error) {

            this.setBusy(false);

            throw error;

        } finally {

            this._databaseProcessActive = false;

            if (this.busy) {
                this.setBusy(false);
            }

        }

    },


    /* ======================================
       MOVE SPREADSHEET TO CUSTOMER FOLDER
    ====================================== */

    async moveSpreadsheetToFolder() {

        const file =
            await this.driveRequest(
                "/files/" +
                encodeURIComponent(
                    this.spreadsheetId
                ) +
                "?fields=id,parents,webViewLink"
            );

        const params =
            new URLSearchParams({
                addParents: this.folderId,
                fields: "id,parents,webViewLink"
            });

        if (file.parents && file.parents.length) {

            params.set(
                "removeParents",
                file.parents.join(",")
            );

        }

        const moved =
            await this.driveRequest(
                "/files/" +
                encodeURIComponent(
                    this.spreadsheetId
                ) +
                "?" +
                params.toString(),
                {
                    method: "PATCH",
                    body: JSON.stringify({})
                }
            );

        if (moved.webViewLink) {

            this.spreadsheetUrl =
                moved.webViewLink;

        }

    },


    /* ======================================
       COPY NAMED RANGES
    ====================================== */

    async copyNamedRanges(
        namedRanges,
        copiedSheets
    ) {

        if (!namedRanges.length) {
            return;
        }

        const sheetIdMap =
            new Map(
                copiedSheets.map(
                    (sheet) => [
                        sheet.sourceSheetId,
                        sheet.newSheetId
                    ]
                )
            );

        const requests = [];

        namedRanges.forEach((item) => {

            if (!item.name || !item.range) {
                return;
            }

            const range = {
                ...item.range
            };

            if (range.sheetId !== undefined) {

                const newSheetId =
                    sheetIdMap.get(
                        range.sheetId
                    );

                if (newSheetId === undefined) {
                    return;
                }

                range.sheetId = newSheetId;

            }

            requests.push({
                addNamedRange: {
                    namedRange: {
                        name: item.name,
                        range
                    }
                }
            });

        });

        if (!requests.length) {
            return;
        }

        await this.apiRequest(
            INSTALLER_CONFIG.SHEETS_API +
            "/spreadsheets/" +
            encodeURIComponent(
                this.spreadsheetId
            ) +
            ":batchUpdate",
            {
                method: "POST",
                body: JSON.stringify({
                    requests
                })
            }
        );

    },


    /* ======================================
       CREATE BOUND APPS SCRIPT FROM TEMPLATE
    ====================================== */

    async createBoundScriptFromTemplate() {

        if (!this.spreadsheetId) {

            throw new Error(
                "Spreadsheet pelanggan belum tersedia."
            );

        }

        if (this.scriptId) {
            return this.scriptId;
        }

        const templateContent =
            await this.apiRequest(
                INSTALLER_CONFIG.SCRIPT_API +
                "/projects/" +
                encodeURIComponent(
                    INSTALLER_CONFIG.TEMPLATE_SCRIPT_ID
                ) +
                "/content"
            );

        if (!templateContent.files?.length) {

            const error = new Error(
                "Kode Apps Script template tidak dapat dibaca. Pastikan Apps Script API aktif dan akun memiliki akses ke template."
            );

            error.service = "apps-script";

            throw error;

        }

        const createdProject =
            await this.apiRequest(
                INSTALLER_CONFIG.SCRIPT_API +
                "/projects",
                {
                    method: "POST",
                    body: JSON.stringify({
                        title:
                            "Rovixa POS - " +
                            this.storeName,
                        parentId:
                            this.spreadsheetId
                    })
                }
            );

        if (!createdProject.scriptId) {

            throw new Error(
                "Apps Script terikat gagal dibuat."
            );

        }

        this.scriptId =
            createdProject.scriptId;

        const files =
            templateContent.files.map(
                (file) => ({
                    name: file.name,
                    type: file.type,
                    source: file.source
                })
            );

        const manifest =
            files.find(
                (file) =>
                    file.name === "appsscript" &&
                    file.type === "JSON"
            );

        if (!manifest) {

            throw new Error(
                "Manifest appsscript.json tidak ditemukan pada template."
            );

        }

        await this.apiRequest(
            INSTALLER_CONFIG.SCRIPT_API +
            "/projects/" +
            encodeURIComponent(
                this.scriptId
            ) +
            "/content",
            {
                method: "PUT",
                body: JSON.stringify({
                    files
                })
            }
        );

        const project =
            await this.apiRequest(
                INSTALLER_CONFIG.SCRIPT_API +
                "/projects/" +
                encodeURIComponent(
                    this.scriptId
                )
            );

        if (
            project.parentId !==
            this.spreadsheetId
        ) {

            throw new Error(
                "Apps Script baru tidak terikat pada spreadsheet pelanggan."
            );

        }

        return this.scriptId;

    },


    /* ======================================
       APPS SCRIPT SETTINGS STEP
    ====================================== */

    showAppsScriptSettingsStep(message) {

        this.waitingForAppsScriptSettings = true;

        if (typeof this.showActionPanel === "function") {

            this.setStatus(
                message ||
                "Periksa pengaturan Google Apps Script API sebelum melanjutkan instalasi.",
                "error"
            );

            this.showActionPanel(
                "Persiapan Google Apps Script API",
                "Buka halaman pengaturan di tab baru. Aktifkan API jika diperlukan, lalu kembali ke installer dan tekan Lanjutkan Instalasi."
            );

            const content =
                document.getElementById(
                    "installer-action-content"
                );

            if (content) {

                const settingsLink =
                    document.createElement("a");

                settingsLink.href =
                    INSTALLER_CONFIG.APPS_SCRIPT_SETTINGS_URL;

                settingsLink.target = "_blank";
                settingsLink.rel = "noopener noreferrer";

                settingsLink.textContent =
                    "Buka Pengaturan Apps Script API";

                settingsLink.className =
                    "secondary-button";

                settingsLink.style.display =
                    "inline-flex";

                settingsLink.style.marginBottom =
                    "12px";

                const continueButton =
                    this.createActionButton(
                        "Lanjutkan Instalasi",
                        () => this.continueDeployment()
                    );

                content.replaceChildren(
                    settingsLink,
                    continueButton
                );

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
            "installer-status installer-status-info";

        status.replaceChildren();

        const title =
            document.createElement("strong");

        title.textContent =
            "Persiapan Google Apps Script API";

        const description =
            document.createElement("p");

        description.textContent =
            message ||
            "Periksa pengaturan Apps Script API sebelum melanjutkan instalasi.";

        const settingsLink =
            document.createElement("a");

        settingsLink.href =
            INSTALLER_CONFIG.APPS_SCRIPT_SETTINGS_URL;

        settingsLink.target = "_blank";
        settingsLink.rel = "noopener noreferrer";

        settingsLink.textContent =
            "Buka Pengaturan Google Apps Script";

        status.append(
            title,
            description,
            settingsLink
        );

    },


    /* ======================================
       CONTINUE INSTALLATION / DEPLOYMENT
    ====================================== */

    async continueDeployment() {

        if (this.busy) {
            return;
        }

        if (!this.tokenClient) {

            this.setStatus(
                "Layanan Google belum siap.",
                "error"
            );

            return;
        }

        const nameInput =
            document.getElementById("store-name");

        const storeName =
            nameInput?.value?.trim() ||
            this.storeName ||
            "";

        if (!storeName) {

            this.setStatus(
                "Nama toko wajib diisi.",
                "error"
            );

            nameInput?.focus();

            return;
        }

        this.storeName = storeName;

        if (this.spreadsheetId && this.scriptId) {
            this.oauthPurpose = "deploy";
        } else {
            this.oauthPurpose = "verify-api";
        }

        this.setBusy(true);

        this.setStatus(
            this.oauthPurpose === "deploy"
                ? "Meminta otorisasi Google untuk melanjutkan deployment..."
                : "Meminta otorisasi Google untuk memeriksa Apps Script API...",
            "loading"
        );

        try {

            this.tokenClient.requestAccessToken({
                prompt: "consent select_account"
            });

        } catch (error) {

            this.oauthPurpose = "";

            this.setBusy(false);

            this.setStatus(
                error.message ||
                "Permintaan otorisasi Google gagal.",
                "error"
            );

        }

    }

});