/*======================================
TREEHOUSE POS
SATUAN FORM MODAL
======================================*/

const SatuanForm = {

    modalId: "satuan-form-modal",

    barangAktif: null,

    /*======================================
    FORM
    ======================================*/

    form(barang = null, options = {}) {

        Satuan.formOptions = options || {};

        this.barangAktif = barang;

        const editMode = !!(
            barang &&
            barang.id
        );

        // Hapus modal form sebelumnya jika ada.
        this.close();

        const modal = document.createElement("div");

        modal.id = this.modalId;
        modal.className = "satuan-form-modal";
        modal.setAttribute("role", "presentation");

        modal.innerHTML = `

            <div
                class="satuan-form-modal-backdrop"
                data-satuan-modal-close="false"
            ></div>

            <section
                class="satuan-form-modal-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="satuan-form-modal-title"
            >

                <div class="satuan-page satuan-form-page">

                    <div class="satuan-header satuan-form-header">

                        <div>

                            <h2 id="satuan-form-modal-title">
                                ${
                                    editMode
                                        ? "Edit Satuan"
                                        : "Satuan Baru"
                                }
                            </h2>

                            <p>
                                ${
                                    editMode
                                        ? "Ubah data satuan barang"
                                        : "Tambah satuan barang"
                                }
                            </p>

                        </div>

                        <button
                            type="button"
                            class="satuan-form-close"
                            id="satuan-form-tutup"
                            aria-label="Tutup form satuan"
                        >
                            &times;
                        </button>

                    </div>

                    <div class="satuan-form-card satuan-form-main-card">

                        <div class="satuan-form-grid satuan-form-main-grid">

                            <div class="satuan-field satuan-form-field">

                                <label for="satuan-barang">
                                    Barang
                                </label>

                                <select id="satuan-barang"></select>

                            </div>

                            <div class="satuan-field satuan-form-field">

                                <label for="satuan-nama">
                                    Satuan
                                </label>

                                <input
                                    id="satuan-nama"
                                    type="text"
                                    placeholder="Contoh: Dus"
                                    value="${this.escapeAttribute(barang?.satuan || "")}"
                                >

                            </div>

                            <div class="satuan-field satuan-form-field">

                                <label for="satuan-barcode">
                                    Barcode Satuan
                                </label>

                                <input
                                    id="satuan-barcode"
                                    type="text"
                                    inputmode="numeric"
                                    placeholder="Barcode satuan"
                                    value="${
                                        this.escapeAttribute(
                                            editMode
                                                ? barang?.barcodeSatuan || ""
                                                : options.barcode || ""
                                        )
                                    }"
                                >

                            </div>

                            <div class="satuan-field satuan-form-field">

                                <label for="satuan-konversi">
                                    Konversi ke Satuan Dasar
                                </label>

                                <input
                                    id="satuan-konversi"
                                    type="number"
                                    min="1"
                                    value="${
                                        editMode
                                            ? Number(barang?.isi || 1)
                                            : 1
                                    }"
                                >

                            </div>

                            <div class="satuan-field satuan-form-field">

                                <label for="satuan-harga-beli-terakhir">
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

                                <label for="satuan-harga-jual">
                                    Harga Jual
                                </label>

                                <input
                                    id="satuan-harga-jual"
                                    type="number"
                                    min="0"
                                    value="${
                                        editMode
                                            ? Number(barang?.hargaJual || 0)
                                            : 0
                                    }"
                                >

                            </div>

                            <div class="satuan-field satuan-form-field">

                                <label for="satuan-discount">
                                    Discount
                                </label>

                                <input
                                    id="satuan-discount"
                                    type="number"
                                    min="0"
                                    value="${
                                        editMode
                                            ? Number(barang?.discount || 0)
                                            : 0
                                    }"
                                >

                            </div>

                        </div>

                        <div class="satuan-form-actions satuan-form-main-actions">

                            <button
                                class="btn-secondary"
                                id="satuan-batal"
                                type="button"
                            >
                                Batal
                            </button>

                            <button
                                class="btn-primary"
                                id="satuan-simpan"
                                type="button"
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

            </section>

        `;

        document.body.appendChild(modal);

        this.bindEvents(editMode, barang);

        this.loadBarang(
            editMode
                ? { kode: barang.kode }
                : barang
        );

        this.loadHargaBeliTerakhir();

        const firstInput = modal.querySelector(
            "#satuan-nama"
        );

        if (firstInput) {
            firstInput.focus();
        }
    },

    /*======================================
    ESCAPE ATTRIBUTE
    ======================================*/

    escapeAttribute(value = "") {

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/"/g, "&quot;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/'/g, "&#39;");
    },

    /*======================================
    EVENT FORM
    ======================================*/

    bindEvents(editMode, barang) {

        const modal = document.getElementById(
            this.modalId
        );

        if (!modal) {
            return;
        }

        const barangSelect = modal.querySelector(
            "#satuan-barang"
        );

        const satuanInput = modal.querySelector(
            "#satuan-nama"
        );

        const konversiInput = modal.querySelector(
            "#satuan-konversi"
        );

        const batalButton = modal.querySelector(
            "#satuan-batal"
        );

        const simpanButton = modal.querySelector(
            "#satuan-simpan"
        );

        const tutupButton = modal.querySelector(
            "#satuan-form-tutup"
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

        if (batalButton) {

            batalButton.addEventListener(
                "click",
                () => {
                    this.cancel();
                }
            );

        }

        if (tutupButton) {

            tutupButton.addEventListener(
                "click",
                () => {
                    this.cancel();
                }
            );

        }

        if (simpanButton) {

            simpanButton.addEventListener(
                "click",
                () => {
                    SatuanSave.save(
                        editMode
                            ? barang
                            : null
                    );
                }
            );

        }

    },

    /*======================================
    BATAL / TUTUP MODAL
    ======================================*/

    async cancel() {

        const options = Satuan.formOptions || {};

        const returnTo = options.returnTo;

        const barangInduk = options.barangInduk;

        // Tutup modal edit terlebih dahulu.
        this.close();

        // Jika dibuka dari BarangDetail,
        // tampilkan kembali modal detail.
        if (returnTo === "barang-detail") {

            if (barangInduk) {

                await BarangDetail.open(
                    barangInduk
                );

            } else {

                Router.go("barang");

            }

            return;
        }

        // Perilaku sebelumnya dipertahankan.
        if (this.barangAktif) {

            Barang.menu(
                this.barangAktif
            );

        } else {

            Router.go("barang");

        }

    },

    /*======================================
    TUTUP MODAL
    ======================================*/

    close() {

        const modal = document.getElementById(
            this.modalId
        );

        if (modal) {
            modal.remove();
        }

    },

    /*======================================
    LOAD BARANG SELECT
    ======================================*/

    async loadBarangSelect() {

        const select = document.getElementById(
            "satuan-barang"
        );

        if (!select) {
            return;
        }

        const barangList = await DB.getAll(
            "barang"
        );

        const activeList = barangList.filter(
            item => item.status !== "Nonaktif"
        );

        select.innerHTML = `

            <option value="">
                Pilih Barang
            </option>

            ${
                activeList
                    .map(item => `

                        <option value="${this.escapeAttribute(item.kode)}">
                            ${this.escapeAttribute(item.kode)} -
                            ${this.escapeAttribute(item.nama)}
                        </option>

                    `)
                    .join("")
            }

        `;

        return activeList;

    },

    /*======================================
    LOAD BARANG
    ======================================*/

    async loadBarang(selectedBarang = null) {

        const select = document.getElementById(
            "satuan-barang"
        );

        if (!select) {
            return;
        }

        const barangList = await this.loadBarangSelect();

        if (!barangList) {
            return;
        }

        if (
            selectedBarang &&
            selectedBarang.kode
        ) {

            select.value = selectedBarang.kode;

        }

        await this.loadHargaBeliTerakhir();

    },

    /*======================================
    LOAD HARGA BELI TERAKHIR
    ======================================*/

    async loadHargaBeliTerakhir() {

        const hargaInput = document.getElementById(
            "satuan-harga-beli-terakhir"
        );

        const barangSelect = document.getElementById(
            "satuan-barang"
        );

        const satuanInput = document.getElementById(
            "satuan-nama"
        );

        const konversiInput = document.getElementById(
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

        const kode = String(
            barangSelect.value || ""
        ).trim();

        const namaSatuan = String(
            satuanInput.value || ""
        ).trim();

        const isiTujuan = Number(
            konversiInput.value || 0
        );

        if (
            !kode ||
            !namaSatuan ||
            isiTujuan <= 0
        ) {

            hargaInput.value = "Rp 0";

            return;

        }

        const detailList = await DB.getAll(
            "detailPembelian"
        );

        const filtered = detailList.filter(
            item => {

                const itemKode = String(
                    item.kode || ""
                ).trim();

                return itemKode === kode;

            }
        );

        if (!filtered.length) {

            hargaInput.value = "Rp 0";

            return;

        }

        /*
         * DETAIL PEMBELIAN TERAKHIR
         * Harga dan isi berasal dari
         * snapshot transaksi pembelian.
         */

        const last = filtered[
            filtered.length - 1
        ];

        const hargaPembelian = Number(
            last.harga || 0
        );

        const isiPembelian = Number(
            last.isi || 0
        );

        if (
            hargaPembelian <= 0 ||
            isiPembelian <= 0
        ) {

            hargaInput.value = "Rp 0";

            return;

        }

        // Harga dasar.
        const hargaDasar =
            hargaPembelian / isiPembelian;

        // Harga sesuai satuan form.
        const hargaSatuan =
            hargaDasar * isiTujuan;

        hargaInput.value =
            "Rp " +
            hargaSatuan.toLocaleString("id-ID");

    }

};