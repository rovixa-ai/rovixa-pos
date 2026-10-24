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
                    "spreadsheetId,properties(title,locale,timeZone,autoRecalc,iterativeCalculation,spreadsheetTheme),sheets(properties(sheetId,title,index)),namedRanges"
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

        const initialSheetId =
            created.sheets?.[0]?.properties?.sheetId;

        this.spreadsheetUrl =
            "https://docs.google.com/spreadsheets/d/" +
            this.spreadsheetId +
            "/edit";

        try {
            await this.moveSpreadsheetToFolder();

            const copiedSheets = [];

            for (let i = 0; i < sourceSheets.length; i++) {

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
                        encodeURIComponent(sourceSheet.sheetId) +
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
                        "Sheet '" + sourceSheet.title +
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

            copiedSheets.forEach((sheet, index) => {
                firstBatch.push({
                    updateSheetProperties: {
                        properties: {
                            sheetId: sheet.newSheetId,
                            title: "__INSTALLER_TEMP_" +
                                index + "_" + sheet.newSheetId
                        },
                        fields: "title"
                    }
                });
            });

            if (firstBatch.length) {
                await this.apiRequest(
                    INSTALLER_CONFIG.SHEETS_API +
                    "/spreadsheets/" +
                    encodeURIComponent(this.spreadsheetId) +
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
                copiedSheets.map((sheet) => ({
                    updateSheetProperties: {
                        properties: {
                            sheetId: sheet.newSheetId,
                            title: sheet.title,
                            index: sheet.index
                        },
                        fields: "title,index"
                    }
                }));

            if (renameRequests.length) {
                await this.apiRequest(
                    INSTALLER_CONFIG.SHEETS_API +
                    "/spreadsheets/" +
                    encodeURIComponent(this.spreadsheetId) +
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

            this.setStatus(
                "Membuat Apps Script yang terikat ke spreadsheet pelanggan...",
                "loading"
            );

            await this.createBoundScriptFromTemplate();

            this.setStatus(
                "Menyimpan Script ID baru...",
                "loading"
            );

            await this.saveScriptIdToSpreadsheet();

            this.waitingForSpreadsheetOpen = true;
            this.waitingForAppsScriptSettings = false;

            await this.runDeployment();

        } catch (error) {
            this.setBusy(false);
            throw error;
        }
    },


    /* ======================================
       MOVE SPREADSHEET TO CUSTOMER FOLDER
    ====================================== */

    async moveSpreadsheetToFolder() {

        const file =
            await this.driveRequest(
                "/files/" +
                encodeURIComponent(this.spreadsheetId) +
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
                encodeURIComponent(this.spreadsheetId) +
                "?" + params.toString(),
                {
                    method: "PATCH",
                    body: JSON.stringify({})
                }
            );

        if (moved.webViewLink) {
            this.spreadsheetUrl = moved.webViewLink;
        }
    },


    /* ======================================
       COPY NAMED RANGES
    ====================================== */

    async copyNamedRanges(namedRanges, copiedSheets) {

        if (!namedRanges.length) {
            return;
        }

        const sheetIdMap = new Map(
            copiedSheets.map((sheet) => [
                sheet.sourceSheetId,
                sheet.newSheetId
            ])
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
                    sheetIdMap.get(range.sheetId);

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
            encodeURIComponent(this.spreadsheetId) +
            ":batchUpdate",
            {
                method: "POST",
                body: JSON.stringify({ requests })
            }
        );
    },


    /* ======================================
       CREATE BOUND APPS SCRIPT FROM TEMPLATE
    ====================================== */

    async createBoundScriptFromTemplate() {

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
            throw new Error(
                "Kode Apps Script template tidak dapat dibaca. Pastikan Apps Script API aktif dan akun memiliki akses ke template."
            );
        }

        const createdProject =
            await this.apiRequest(
                INSTALLER_CONFIG.SCRIPT_API +
                "/projects",
                {
                    method: "POST",
                    body: JSON.stringify({
                        title: "Rovixa POS - " + this.storeName,
                        parentId: this.spreadsheetId
                    })
                }
            );

        if (!createdProject.scriptId) {
            throw new Error(
                "Apps Script terikat gagal dibuat."
            );
        }

        this.scriptId = createdProject.scriptId;

        const files =
            templateContent.files.map((file) => ({
                name: file.name,
                type: file.type,
                source: file.source
            }));

        const manifest =
            files.find((file) =>
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
            encodeURIComponent(this.scriptId) +
            "/content",
            {
                method: "PUT",
                body: JSON.stringify({ files })
            }
        );

        const project =
            await this.apiRequest(
                INSTALLER_CONFIG.SCRIPT_API +
                "/projects/" +
                encodeURIComponent(this.scriptId)
            );

        if (project.parentId !== this.spreadsheetId) {
            throw new Error(
                "Apps Script baru tidak terikat pada spreadsheet pelanggan."
            );
        }
    },


    /* ======================================
       SAVE NEW SCRIPT ID IN CONFIG SHEET
    ====================================== */

    async saveScriptIdToSpreadsheet() {

        const range =
            encodeURIComponent(
                INSTALLER_CONFIG.SCRIPT_CONFIG_RANGE
            );

        const url =
            INSTALLER_CONFIG.SHEETS_API +
            "/spreadsheets/" +
            encodeURIComponent(this.spreadsheetId) +
            "/values/" + range +
            "?valueInputOption=RAW";

        await this.apiRequest(
            url,
            {
                method: "PUT",
                body: JSON.stringify({
                    range: INSTALLER_CONFIG.SCRIPT_CONFIG_RANGE,
                    majorDimension: "ROWS",
                    values: [
                        ["Key", "Value"],
                        ["scriptId", this.scriptId]
                    ]
                })
            }
        );
    },


    /* ======================================
       LEGACY SETTINGS STEP
       Kept for compatibility with existing UI.
    ====================================== */

    showAppsScriptSettingsStep() {

        const status =
            document.getElementById("installer-status");

        if (!status) {
            return;
        }

        status.className =
            "installer-status installer-status-info";

        status.replaceChildren();

        const title =
            document.createElement("strong");

        title.textContent =
            "Spreadsheet pelanggan berhasil dibuat.";

        const description =
            document.createElement("p");

        description.textContent =
            "Jika Google Apps Script API belum aktif pada akun ini, aktifkan melalui pengaturan berikut lalu coba deployment lagi. Spreadsheet tidak akan dibuat ulang.";

        const settingsLink =
            document.createElement("a");

        settingsLink.href =
            INSTALLER_CONFIG.APPS_SCRIPT_SETTINGS_URL;

        settingsLink.target = "_blank";
        settingsLink.rel = "noopener noreferrer";
        settingsLink.textContent =
            "Buka Pengaturan Google Apps Script";

        const databaseLink =
            document.createElement("a");

        databaseLink.href = this.spreadsheetUrl;
        databaseLink.target = "_blank";
        databaseLink.rel = "noopener noreferrer";
        databaseLink.textContent =
            "Buka Database Rovixa POS";

        status.append(
            title,
            description,
            settingsLink,
            document.createElement("br"),
            databaseLink
        );
    },


    /* ======================================
       CONTINUE DEPLOYMENT
    ====================================== */

    async continueDeployment() {

        if (this.busy) {
            return;
        }

        if (!this.spreadsheetId || !this.scriptId) {
            this.setStatus(
                "Tahap deployment belum siap. Spreadsheet atau Script ID tidak ditemukan.",
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

        this.oauthPurpose = "deploy";
        this.setBusy(true);

        this.setStatus(
            "Meminta otorisasi Google untuk melanjutkan deployment...",
            "loading"
        );

        this.tokenClient.requestAccessToken({
            prompt: "consent select_account"
        });
    }

});
