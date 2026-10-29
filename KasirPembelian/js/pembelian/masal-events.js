
/* ======================================
TREEHOUSE POS
PEMBELIAN MASSAL
EVENT HANDLER
FILE: masal-events.js
====================================== */

Object.assign(PembelianMassal, {

    /* ======================================
       BIND EVENT
    ====================================== */

    bindEvents() {

        const page = document.getElementById(
            "pembelian-massal-modal"
        );

        if (!page) {
            return;
        }

        if (page.dataset.eventsBound === "true") {
            return;
        }

        page.dataset.eventsBound = "true";

        page.addEventListener("click", event => {

            const target = event.target;

            if (!(target instanceof Element)) {
                return;
            }

            const actionButton = target.closest(
                "[data-massal-action]"
            );

            if (actionButton) {

                const action =
                    actionButton.dataset.massalAction;

                if (action === "reset") {
                    this.resetForm();
                    return;
                }

                if (action === "close") {
                    this.close();
                    return;
                }

                if (action === "scan-barcode") {

                    const index = Number(
                        actionButton.dataset.massalIndex
                    );

                    if (
                        !Number.isInteger(index) ||
                        !this.items[index]
                    ) {
                        Dialog.error(
                            "Baris item tidak ditemukan.",
                            "Scanner Barcode"
                        );
                        return;
                    }

                    if (
                        typeof PembelianBarcodeScanner === "undefined" ||
                        typeof PembelianBarcodeScanner.openForMassal !== "function"
                    ) {
                        Dialog.error(
                            "Scanner barcode belum tersedia.",
                            "Scanner Barcode"
                        );
                        return;
                    }

                    PembelianBarcodeScanner.openForMassal(index);
                    return;
                }
            }

            const addButton = target.closest(
                "#massal-tambah-item, #massal-tambah-item-bottom"
            );

            if (addButton) {
                PembelianMassalItem.addItem(this);
                return;
            }

            const removeButton = target.closest(
                "[data-massal-remove]"
            );

            if (removeButton) {

                const index = Number(
                    removeButton.dataset.massalRemove
                );

                if (
                    Number.isInteger(index) &&
                    index >= 0 &&
                    index < this.items.length
                ) {

                    this.items.splice(index, 1);

                    PembelianMassalItem.renderItems(this);

                    this.updateTotal();
                }

                return;
            }

            if (target.closest("#massal-isi-sisa")) {

                const nominal = document.getElementById(
                    "massal-nominal"
                );

                if (nominal) {
                    nominal.value = String(this.getTotal());
                }

                return;
            }

            if (target.closest("#massal-simpan")) {
                this.save();
            }
        });

        /*==================================
          CHANGE INPUT
        ==================================*/

        page.addEventListener("change", event => {

            const target = event.target;

            if (!(
                target instanceof HTMLInputElement ||
                target instanceof HTMLSelectElement
            )) {
                return;
            }

            if (!target.dataset.massalField) {
                return;
            }

            const index = Number(
                target.dataset.massalIndex
            );

            const field = target.dataset.massalField;

            if (!this.items[index]) {
                return;
            }

            if (field === "namaBarang") {

                PembelianMassalItem.changeNamaBarang(
                    index,
                    target.value,
                    this
                );

                return;
            }

            if (field === "barang") {

                PembelianMassalItem.changeBarang(
                    index,
                    target.value,
                    this
                );

                return;
            }

            if (field === "satuan") {

                PembelianMassalSatuan.changeSatuan(
                    index,
                    target.value,
                    this
                );

                return;
            }

            if (field === "barcode") {

                this.cariBarcodeSatuan(
                    index,
                    target.value,
                    page
                );

                return;
            }

            if (field === "kode") {

                this.items[index].barang =
                    target.value.trim().toUpperCase();

                return;
            }

            if (
                field === "konversi" ||
                field === "qty" ||
                field === "harga" ||
                field === "hargaJualPCS" ||
                field === "hargaJual"
            ) {

                this.items[index][field] =
                    Math.max(
                        0,
                        Number(target.value) || 0
                    );

                this.updateTotal();
            }
        });

        /*==================================
          INPUT REALTIME
        ==================================*/

        page.addEventListener("input", event => {

            const target = event.target;

            if (!(
                target instanceof HTMLInputElement ||
                target instanceof HTMLSelectElement
            )) {
                return;
            }

            if (!target.dataset.massalField) {
                return;
            }

            const index = Number(
                target.dataset.massalIndex
            );

            const field = target.dataset.massalField;

            if (!this.items[index]) {
                return;
            }

            if (field === "namaBarang") {

                this.items[index].namaBarang =
                    target.value;

                return;
            }

            if (field === "barcode") {

                this.items[index].barcode =
                    target.value;

                return;
            }

            if (field === "kode") {

                this.items[index].barang =
                    target.value.trim().toUpperCase();

                return;
            }

            if (field === "satuan") {

                this.items[index].satuan =
                    target.value;

                return;
            }

            if (
                field === "konversi" ||
                field === "qty" ||
                field === "harga" ||
                field === "hargaJualPCS" ||
                field === "hargaJual"
            ) {

                this.items[index][field] =
                    Math.max(
                        0,
                        Number(target.value) || 0
                    );

                this.updateTotal();
            }
        });

    },

    /* ======================================
       CARI BARCODE SATUAN BARANG
    ====================================== */

    cariBarcodeSatuan(index, barcode, page) {

        const item = this.items[index];

        if (!item) {
            return;
        }

        const barcodeDicari =
            PembelianMassalMaster.normalizeBarcode(barcode);

        item.barcode = barcodeDicari;

        if (!barcodeDicari) {
            return;
        }

        const satuanDitemukan =
            (this.satuanList || []).find(
                satuan =>
                    PembelianMassalMaster.normalizeBarcode(
                        satuan.barcodeSatuan
                    ) === barcodeDicari
            );

        if (!satuanDitemukan) {
            return;
        }

        const kodeBarang =
            PembelianMassalMaster.normalizeKode(
                satuanDitemukan.kode
            );

        const barangDitemukan =
            (this.barangList || []).find(
                barang =>
                    PembelianMassalMaster.normalizeKode(
                        barang.kode
                    ) === kodeBarang
            );

        if (!barangDitemukan) {
            return;
        }

        item.barang = kodeBarang;
        item.namaBarang = barangDitemukan.nama || "";

        item.satuanList =
            (this.satuanList || []).filter(
                satuan =>
                    String(satuan.kode) ===
                    String(barangDitemukan.kode)
            );

        const satuanTerpilih =
            item.satuanList.find(
                satuan =>
                    PembelianMassalMaster.normalizeBarcode(
                        satuan.barcodeSatuan
                    ) === barcodeDicari
            );

        item.satuan = satuanTerpilih
            ? satuanTerpilih.satuan || ""
            : satuanDitemukan.satuan || "";

        const satuanAktif =
            satuanTerpilih || satuanDitemukan;

        item.barcode =
            satuanAktif.barcodeSatuan || "";

        item.konversi =
            PembelianMassalMaster.toNumber(
                satuanAktif.isi,
                PembelianMassalMaster.toNumber(
                    satuanAktif.konversi,
                    1
                )
            );

        item.harga =
            PembelianMassalMaster.toNumber(
                satuanAktif.hargaBeli,
                0
            );

        item.hargaJual =
            PembelianMassalMaster.toNumber(
                satuanAktif.hargaJual,
                0
            );

        const satuanPCS =
            item.satuanList.find(
                satuan =>
                    PembelianMassalMaster.normalizeSatuan(
                        satuan.satuan
                    ) === "PCS"
            );

        item.hargaJualPCS =
            PembelianMassalMaster.toNumber(
                satuanPCS?.hargaJual,
                0
            );

        PembelianMassalItem.renderItems(this);

        this.updateTotal();
    }

});
