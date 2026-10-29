const SatuanForm = {

    form(barang = null, options = {}) {

    Satuan.formOptions =
        options || {};

    this.barangAktif =
        barang;

    const editMode =
        !!(
            barang &&
            barang.id
        );

        document.getElementById(
            "page"
        ).innerHTML = `

            <div class="satuan-page satuan-form-page">


                <div class="satuan-header satuan-form-header">

                    <div>

                        <h2>
                            ${editMode
                                ? "Edit Satuan"
                                : "Satuan Baru"}
                        </h2>

                        <p>
                            ${editMode
                                ? "Ubah data satuan barang"
                                : "Tambah satuan barang"}
                        </p>

                    </div>

                </div>


                <div class="satuan-form-card satuan-form-main-card">


                    <div class="satuan-form-grid satuan-form-main-grid">


                        <div class="satuan-field satuan-form-field">

                            <label>
                                Barang
                            </label>

                            <select
                                id="satuan-barang"
                            >
                            </select>

                        </div>


                        <div class="satuan-field satuan-form-field">

                            <label>
                                Satuan
                            </label>

                            <input
                                id="satuan-nama"
                                type="text"
                                placeholder="Contoh: Dus"
                                value="${barang?.satuan || ""}"
                            >

                        </div>


                        <div class="satuan-field satuan-form-field">

                            <label>
                                Barcode Satuan
                            </label>

                            <input
                                id="satuan-barcode"
                                type="text"
                                inputmode="numeric"
                                placeholder="Barcode satuan"
                                value="${
                                    editMode
                                        ? barang?.barcodeSatuan || ""
                                        : options.barcode || ""
                                }"
                            >

                        </div>


                        <div class="satuan-field satuan-form-field">

                            <label>
                                Konversi ke Satuan Dasar
                            </label>

                            <input
                                id="satuan-konversi"
                                type="number"
                                min="1"
                                value="${
                                    editMode
                                        ? Number(
                                            barang?.isi || 1
                                          )
                                        : 1
                                }"
                            >

                        </div>


                        <div class="satuan-field satuan-form-field">

                            <label>
                                Harga Beli Terakhir
                            </label>

                            <input
                                id="satuan-harga-beli-terakhir"
                                type="text"
                                value="Rp 0"
                                readonly
                            >

                        </div>


                        <div class="satuan-field satuan-form-field">

                            <label>
                                Harga Jual
                            </label>

                            <input
                                id="satuan-harga-jual"
                                type="number"
                                min="0"
                                value="${
                                    editMode
                                        ? Number(
                                            barang?.hargaJual || 0
                                          )
                                        : 0
                                }"
                            >

                        </div>


                        <div class="satuan-field satuan-form-field">

                            <label>
                                Discount
                            </label>

                            <input
                                id="satuan-discount"
                                type="number"
                                min="0"
                                value="${
                                    editMode
                                        ? Number(
                                            barang?.discount || 0
                                          )
                                        : 0
                                }"
                            >

                        </div>


                    </div>


                    <div class="satuan-form-actions satuan-form-main-actions">

                        <button
                            class="btn-secondary"
                            id="satuan-batal"
                        >
                            Batal
                        </button>


                        <button
                            class="btn-primary"
                            id="satuan-simpan"
                        >
                            ${
                                editMode
                                    ? "Simpan Perubahan"
                                    : "Simpan"
                            }
                        </button>

                    </div>


                </div>

            </div>

        `;


        this.loadBarang(
            editMode
                ? {
                    kode: barang.kode
                }
                : barang
        );


        const barangSelect =
            document.getElementById(
                "satuan-barang"
            );


        const satuanInput =
            document.getElementById(
                "satuan-nama"
            );


        const konversiInput =
            document.getElementById(
                "satuan-konversi"
            );


        if (barangSelect) {

            barangSelect.addEventListener(
                "change",
                () => {

                    this.loadHargaBeliTerakhir();

                }
            );

        }


        if (satuanInput) {

            satuanInput.addEventListener(
                "input",
                () => {

                    this.loadHargaBeliTerakhir();

                }
            );

        }


        if (konversiInput) {

            konversiInput.addEventListener(
                "input",
                () => {

                    this.loadHargaBeliTerakhir();

                }
            );

        }


       
document.getElementById(
    "satuan-batal"
).addEventListener(
    "click",
    () => {

        if (this.barangAktif) {

            Barang.menu(
                this.barangAktif
            );

        } else {

            Router.go("barang");

        }

    }
);


        document.getElementById(
            "satuan-simpan"
        ).addEventListener(
            "click",
            () => {

                SatuanSave.save(
                    editMode
                        ? barang
                        : null
                );

            }
        );


        this.loadHargaBeliTerakhir();

    },


    async loadBarangSelect() {

        const select =
            document.getElementById(
                "satuan-barang"
            );

        if (!select) {
            return;
        }


        const barangList =
            await DB.getAll(
                "barang"
            );


        const activeList =
            barangList.filter(
                item =>
                    item.status !==
                    "Nonaktif"
            );


        select.innerHTML = `

            <option value="">
                Pilih Barang
            </option>

            ${
                activeList
                    .map(item => `

                        <option
                            value="${item.kode}"
                        >
                            ${item.kode}
                            - ${item.nama}
                        </option>

                    `)
                    .join("")
            }

        `;


        return activeList;

    },


    async loadBarang(
        selectedBarang = null
    ) {

        const select =
            document.getElementById(
                "satuan-barang"
            );

        if (!select) {
            return;

        }


        const barangList =
            await this.loadBarangSelect();


        if (!barangList) {
            return;
        }


        if (
            selectedBarang &&
            selectedBarang.kode
        ) {

            select.value =
                selectedBarang.kode;

        }


        await this.loadHargaBeliTerakhir();

    },


    async loadHargaBeliTerakhir() {

        const hargaInput =
            document.getElementById(
                "satuan-harga-beli-terakhir"
            );


        const barangSelect =
            document.getElementById(
                "satuan-barang"
            );


        const satuanInput =
            document.getElementById(
                "satuan-nama"
            );


        const konversiInput =
            document.getElementById(
                "satuan-konversi"
            );


        if (
            !hargaInput ||
            !barangSelect ||
            !satuanInput ||
            !konversiInput
        ) {

            return;

        }


        const kode =
            String(
                barangSelect.value ||
                ""
            ).trim();


        const namaSatuan =
            String(
                satuanInput.value ||
                ""
            ).trim();


        const isiTujuan =
            Number(
                konversiInput.value || 0
            );


        if (
            !kode ||
            !namaSatuan ||
            isiTujuan <= 0
        ) {

            hargaInput.value =
                "Rp 0";

            return;

        }


        const detailList =
            await DB.getAll(
                "detailPembelian"
            );


        const filtered =
            detailList.filter(
                item => {

                    const itemKode =
                        String(
                            item.kode ||
                            ""
                        ).trim();


                    return (
                        itemKode === kode
                    );

                }
            );


        if (!filtered.length) {

            hargaInput.value =
                "Rp 0";

            return;

        }


        /*
         * DETAIL PEMBELIAN TERAKHIR
         *
         * Harga dan isi berasal dari
         * snapshot transaksi pembelian.
         */

        const last =
            filtered[
                filtered.length - 1
            ];


        const hargaPembelian =
            Number(
                last.harga || 0
            );


        const isiPembelian =
            Number(
                last.isi || 0
            );


        if (
            hargaPembelian <= 0 ||
            isiPembelian <= 0
        ) {

            hargaInput.value =
                "Rp 0";

            return;

        }


        /*
         * HARGA DASAR
         */

        const hargaDasar =
            hargaPembelian /
            isiPembelian;


        /*
         * HARGA SESUAI SATUAN FORM
         */

        const hargaSatuan =
            hargaDasar *
            isiTujuan;


        hargaInput.value =
            "Rp " +
            hargaSatuan.toLocaleString(
                "id-ID"
            );

    }

};