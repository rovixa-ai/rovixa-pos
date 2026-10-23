const API = {

    URL: window.API_CONFIG.SCRIPT_URL,

    async get(action, params = {}) {

        const query =
            new URLSearchParams({
                action,
                ...params
            });

        const response =
            await fetch(
                `${this.URL}?${query.toString()}`
            );

        const text =
            await response.text();

        try {

            return JSON.parse(text);

        } catch (error) {

            console.error(
                "API RESPONSE:",
                text
            );

            throw new Error(
                "Response API bukan JSON"
            );

        }

    },

    async post(data = {}) {

        const response =
            await fetch(
                this.URL,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "text/plain;charset=utf-8"
                    },
                    body:
                        JSON.stringify(data)
                }
            );

        const text =
            await response.text();

        try {

            return JSON.parse(text);

        } catch (error) {

            console.error(
                "API RESPONSE:",
                text
            );

            throw new Error(
                "Response API bukan JSON"
            );

        }

    },

    getUsers() {

        return this.get("users");

    },

    getBarang() {

        return this.get("barang");

    },

    getSatuan(barang) {

        return this.get(
            "satuan",
            {
                barang
            }
        );

    },

    getBootstrap() {

        return this.get("bootstrap");

    },

    getDownloadPembelian(database) {

        database = database || {};

        return this.get(
            "downloadPembelian",
            {
                year:
                    database.year,

                pembelianId:
                    database.pembelian,

                detailPembelianId:
                    database.detailPembelian,

                pembayaranId:
                    database.pembayaran
            }
        );

    },

    saveBarang(data) {

        return this.post({
            action: "saveBarang",
            ...data
        });

    },

    saveSatuan(data) {

        return this.post({
            action: "saveSatuan",
            ...data
        });

    },

    updateSatuan(data) {

        return this.post({
            action: "updateSatuan",
            ...data
        });

    },

    saveStokAdjustment(data) {

        return this.post({
            action: "saveStokAdjustment",
            ...data
        });

    },

    updateBarang(data) {

        return this.post({
            action: "updateBarang",
            ...data
        });

    },

    savePembelian(data) {

        return this.post({
            action: "savePembelian",
            ...data
        });

    },

    updatePembelian(data) {

        return this.post({
            action: "updatePembelian",
            ...data
        });

    },

    saveLaporanPembelian(data) {

        return this.post({
            action: "saveLaporanPembelian",
            ...data
        });

    },

    printLaporanPembelian(data) {

        return this.post({
            action: "printLaporanPembelian",
            ...data
        });

    }

};