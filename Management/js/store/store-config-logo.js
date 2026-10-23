// ======================================
// STORE CONFIG LOGO
// TREEHOUSE MANAGEMENT
// ======================================

const StoreConfigLogo = {

    logoSourceChanged() {

        const source =
            document.getElementById(
                "storeConfigLogoSource"
            );

        if (!source) {
            return;
        }

        const value =
            String(source.value || "")
                .trim()
                .toLowerCase();

        const drive =
            document.getElementById(
                "storeConfigLogoDrive"
            );

        const url =
            document.getElementById(
                "storeConfigLogoUrl"
            );

        const file =
            document.getElementById(
                "storeConfigLogoFile"
            );

        if (drive) {
            drive.closest(".config-field")?.classList.toggle(
                "is-hidden",
                value !== "drive"
            );
        }

        if (url) {
            url.closest(".config-field")?.classList.toggle(
                "is-hidden",
                value !== "url"
            );
        }

        if (file) {
            file.closest(".config-field")?.classList.toggle(
                "is-hidden",
                value !== "upload"
            );
        }

        if (value === "drive") {

            this.previewLogo(
                drive?.value || ""
            );

            return;

        }

        if (value === "url") {

            this.previewLogo(
                url?.value || ""
            );

            return;

        }

        if (value === "upload") {

            if (
                file &&
                file.files &&
                file.files.length
            ) {
                return;
            }

            this.previewLogo(
                StoreConfig.logoValue || ""
            );

            return;

        }

        this.hideLogoPreview();

    },


    async logoFileChanged(event) {

        const file =
            event?.target?.files?.[0];

        if (!file) {
            return;
        }

        try {

            const value =
                await this.readImageFile(file);

            StoreConfig.logoValue = value;

            this.previewLogo(value);

        } catch (error) {

            console.error(
                "STORE CONFIG LOGO FILE ERROR:",
                error
            );

            StoreConfig.message(
                "Gagal membaca file logo.",
                "error"
            );

        }

    },


    readImageFile(file) {

        return new Promise(
            (resolve, reject) => {

                if (!file) {
                    reject(
                        new Error(
                            "File logo tidak ditemukan."
                        )
                    );

                    return;
                }

                const reader =
                    new FileReader();

                reader.onload =
                    event => {

                        resolve(
                            event.target.result
                        );

                    };

                reader.onerror =
                    () => {

                        reject(
                            new Error(
                                "Gagal membaca file logo."
                            )
                        );

                    };

                reader.readAsDataURL(file);

            }
        );

    },


    loadLogo() {

        const source =
            document.getElementById(
                "storeConfigLogoSource"
            );

        const drive =
            document.getElementById(
                "storeConfigLogoDrive"
            );

        const url =
            document.getElementById(
                "storeConfigLogoUrl"
            );

        const config =
            StoreConfig.config || {};

        const logoSource =
            String(
                config.LOGO_SOURCE ||
                config.logoSource ||
                ""
            )
                .trim()
                .toLowerCase();

        const logoDrive =
            String(
                config.LOGO_DRIVE ||
                config.logoDrive ||
                ""
            ).trim();

        const logoUrl =
            String(
                config.LOGO_URL ||
                config.logoUrl ||
                ""
            ).trim();

        const logoValue =
            String(
                config.LOGO ||
                config.logo ||
                ""
            ).trim();

        if (source) {

            source.value =
                logoSource || "url";

        }

        if (drive) {
            drive.value = logoDrive;
        }

        if (url) {
            url.value = logoUrl;
        }

        StoreConfig.logoValue =
            logoValue;

        this.logoSourceChanged();

        if (logoValue) {

            this.previewLogo(
                logoValue
            );

        } else if (logoSource === "drive") {

            this.previewLogo(
                logoDrive
            );

        } else if (logoSource === "url") {

            this.previewLogo(
                logoUrl
            );

        } else {

            this.hideLogoPreview();

        }

    },


    isGoogleDriveUrl(url) {

        return /drive\.google\.com/i.test(
            String(url || "")
        );

    },


    getGoogleDriveFileId(url) {

        const value =
            String(url || "")
                .trim();

        const match =
            value.match(
                /file\/d\/([a-zA-Z0-9_-]+)/
            );

        if (match && match[1]) {
            return match[1];
        }

        const queryMatch =
            value.match(
                /[?&]id=([a-zA-Z0-9_-]+)/
            );

        if (
            queryMatch &&
            queryMatch[1]
        ) {
            return queryMatch[1];
        }

        return "";

    },


    getLogoImageUrl(value) {

        const url =
            String(value || "")
                .trim();

        if (!url) {
            return "";
        }

        if (
            this.isGoogleDriveUrl(url)
        ) {

            const fileId =
                this.getGoogleDriveFileId(
                    url
                );

            if (!fileId) {
                return "";
            }

            return (
                "https://drive.google.com/uc" +
                "?export=view&id=" +
                encodeURIComponent(fileId)
            );

        }

        if (
            /^https?:\/\//i.test(url)
        ) {
            return url;
        }

        if (
            url.startsWith("data:image/")
        ) {
            return url;
        }

        return "";

    },


    previewLogo(value) {

        const preview =
            document.getElementById(
                "storeConfigLogoPreview"
            );

        if (!preview) {
            return;
        }

        const imageUrl =
            this.getLogoImageUrl(value);

        if (!imageUrl) {

            this.hideLogoPreview();

            return;

        }

        preview.innerHTML = `
            <img
                src="${StoreConfig.escapeHtml(imageUrl)}"
                alt="Logo Toko"
                style="
                    width:100%;
                    height:100%;
                    object-fit:contain;
                "
            />
        `;

    },


    hideLogoPreview() {

        const preview =
            document.getElementById(
                "storeConfigLogoPreview"
            );

        if (!preview) {
            return;
        }

        preview.innerHTML = "";

    }

};