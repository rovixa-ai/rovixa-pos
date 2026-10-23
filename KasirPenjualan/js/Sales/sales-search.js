// ======================================
// SALES
// SEARCH
// ======================================

Object.assign(
    Sales,
    {

        /* ==================================
           SEARCH
        ================================== */

        search(value) {

            const text =
                String(
                    value || ""
                )
                .trim()
                .toLowerCase();


            if (!text) {

                this.renderProducts();

                return;

            }


            const result =
                this.products.filter(
                    product => {

                        const kode =
                            String(
                                product.kode || ""
                            )
                            .toLowerCase();


                        const barcode =
                            String(
                                product.barcode || ""
                            )
                            .toLowerCase();


                        const nama =
                            String(
                                product.nama || ""
                            )
                            .toLowerCase();


                        const foundUnit =
                            Array.isArray(
                                product.satuan
                            )
                            &&
                            product.satuan.some(
                                unit =>

                                    String(
                                        unit.barcodeSatuan || ""
                                    )
                                    .toLowerCase()
                                    .includes(
                                        text
                                    )

                            );


                        return (

                            kode.includes(
                                text
                            )

                            ||

                            barcode.includes(
                                text
                            )

                            ||

                            nama.includes(
                                text
                            )

                            ||

                            foundUnit

                        );

                    }
                );


            this.renderProducts(
                result
            );

        },


       /* ==================================
   HANDLE BARCODE
================================== */

handleBarcode(value, options = {}) {

    const barcode =
        String(
            value || ""
        ).trim();

    if (!barcode) {
        return;
    }

    const clearOptions = {
        focus: options.focus !== false
    };

    /* ==============================
       BARCODE SATUAN
    ============================== */

    for (
        const product of
        this.products
    ) {

        const unit =
            Array.isArray(
                product.satuan
            )
                ? product.satuan.find(
                    item =>
                        String(
                            item.barcodeSatuan || ""
                        ).trim() === barcode
                )
                : null;

        if (unit) {

            Cart.addItem(
                product,
                unit
            );

            this.clearSearch(
                clearOptions
            );

            return;

        }

    }

    /* ==============================
       BARCODE UTAMA
    ============================== */

    const product =
        this.products.find(
            item =>
                String(
                    item.barcode || ""
                ).trim() === barcode
        );

    if (product) {

        /* ==========================
           SATU SATUAN
        ========================== */

        if (
            Array.isArray(
                product.satuan
            ) &&
            product.satuan.length === 1
        ) {

            Cart.addItem(
                product,
                product.satuan[0]
            );

            this.clearSearch(
                clearOptions
            );

            return;

        }

        /* ==========================
           BANYAK SATUAN
        ========================== */

        UnitModal.open(
            product.kode
        );

        this.clearSearch(
            clearOptions
        );

        return;

    }

    /* ==============================
       BARCODE TIDAK DITEMUKAN
    ============================== */

    Notification.warning(
        "Barcode tidak ditemukan"
    );

    this.clearSearch(
        clearOptions
    );

},


        /* ==================================
   CLEAR SEARCH
================================== */

clearSearch(options = {}) {

    const search =
        document.getElementById(
            "searchProduct"
        );

    if (!search) {
        return;
    }

    search.value = "";

    this.renderProducts();

    if (options.focus !== false) {
        search.focus();
    }

}

    }
);