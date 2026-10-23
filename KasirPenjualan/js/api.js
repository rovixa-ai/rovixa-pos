// ======================================
// TREEHOUSE POS
// API
// ======================================

const API = {


    /* ==================================
       BOOTSTRAP CACHE
       ================================== */

    bootstrapCache:
        null,

    bootstrapPromise:
        null,


    /* ==================================
       GET
       ================================== */

    async get(action, params = {}) {

        let url =
            window.API_CONFIG.SCRIPT_URL +
            "?action=" +
            encodeURIComponent(
                action
            );


        Object.keys(params)
            .forEach(
                key => {

                    url +=
                        "&" +
                        encodeURIComponent(
                            key
                        ) +
                        "=" +
                        encodeURIComponent(
                            params[key]
                        );

                }
            );


        const response =
            await fetch(url);


        const text =
            await response.text();


        let result;


        try {

            result =
                JSON.parse(text);

        }

        catch (error) {

            throw new Error(
                "Response API bukan JSON."
            );

        }


        if (
            !result.success
        ) {

            throw new Error(
                result.message ||
                "API gagal."
            );

        }


        return result;

    },


    /* ==================================
       POST
       ================================== */

    async post(action, data = {}) {

        const payload = {

            action:
                action,

            ...data

        };


        const response =
            await fetch(
                CONFIG.API_URL,
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "text/plain;charset=utf-8"

                    },

                    body:
                        JSON.stringify(
                            payload
                        )

                }
            );


        const text =
            await response.text();


        


        let result;


        try {

            result =
                JSON.parse(text);

        }

        catch (error) {

            throw new Error(
                "Response API POST bukan JSON."
            );

        }


        if (
            !result.success
        ) {

            throw new Error(
                result.message ||
                "API POST gagal."
            );

        }


        return result;

    },


    /* ==================================
       POS BOOTSTRAP
       BARANG + SATUAN BARANG
       + STORE CONFIG

       CACHE:
       Satu kali request ke server
       untuk seluruh aplikasi.
       ================================== */

    async bootstrap() {

        /* ==============================
           HASIL SUDAH TERSIMPAN
        ============================== */

        if (
            this.bootstrapCache
        ) {

           


            return this.bootstrapCache;

        }


        /* ==============================
           REQUEST SEDANG BERJALAN

           Jika beberapa module memanggil
           bootstrap bersamaan, semuanya
           menggunakan request yang sama.
        ============================== */

        if (
            this.bootstrapPromise
        ) {

           


            return await this.bootstrapPromise;

        }


        /* ==============================
           REQUEST BARU
        ============================== */

        this.bootstrapPromise =
            (async () => {

                try {

                   


                    const response =
                        await this.get(
                            "bootstrap"
                        );


                    const data =
                        response.data ||
                        {};


                    const result = {

                        barang:
                            Array.isArray(
                                data.barang
                            )
                                ? data.barang
                                : [],

                        satuan:
                            Array.isArray(
                                data.satuan
                            )
                                ? data.satuan
                                : [],

                        storeConfig:
                            data.storeConfig ||
                            {}

                    };


                    this.bootstrapCache =
                        result;




                    return result;

                }

                catch (error) {

                    console.error(
                        "API.bootstrap ERROR:",
                        error
                    );


                    throw error;

                }

                finally {

                    this.bootstrapPromise =
                        null;

                }

            })();


        return await this.bootstrapPromise;

    },


    /* ==================================
       CLEAR BOOTSTRAP CACHE
       ================================== */

    clearBootstrapCache() {

        this.bootstrapCache =
            null;


        this.bootstrapPromise =
            null;


        

    },


    /* ==================================
       RESOLVE DATABASE PENJUALAN
       BERDASARKAN TAHUN
       ================================== */

    async resolvePenjualanDatabase(
        year
    ) {

        return this.get(
            "resolvePenjualanDatabase",
            {
                year:
                    Number(year)
            }
        );

    },


    /* ==================================
       DOWNLOAD DATABASE PENJUALAN
       BERDASARKAN TAHUN
       ================================== */

    async getDownloadPenjualan(
        database
    ) {

        database =
            database || {};


        return this.get(
            "downloadPenjualan",
            {

                year:
                    Number(
                        database.year
                    ),

                penjualanId:
                    String(
                        database.penjualanId ||
                        ""
                    ).trim(),

                detailPenjualanId:
                    String(
                        database.detailPenjualanId ||
                        ""
                    ).trim(),

                pembayaranId:
                    String(
                        database.pembayaranId ||
                        ""
                    ).trim()

            }
        );

    }


};