// ======================================
// SYNC PEMBELIAN
// TREEHOUSE POS
// ======================================

Object.assign(Sync, {

    async addPembelian(data, options = {}) {

        const id =
            "LOCAL-PB-" +
            Date.now() +
            "-" +
            Math.random().toString(36).slice(2, 7);

        const year =
            PembelianDatabaseConfig.getActiveYear();

        if (!year) {
            throw new Error(
                "Tahun database pembelian belum ditentukan."
            );
        }

        /*
         * Gunakan konfigurasi database yang sudah tersimpan lokal.
         * Tidak memanggil API sebelum transaksi disimpan.
         */

        const cachedDatabase =
            PembelianDatabaseConfig.getActiveDatabase();

        if (!cachedDatabase) {
            throw new Error(
                "Konfigurasi database pembelian lokal tidak ditemukan."
            );
        }

        const resolvedYear =
            cachedDatabase.year || year;

        const pembelianId =
            cachedDatabase.pembelian;

        const detailPembelianId =
            cachedDatabase.detailPembelian;

        const pembayaranId =
            cachedDatabase.pembayaran;

        if (
            !pembelianId ||
            !detailPembelianId ||
            !pembayaranId
        ) {
            throw new Error(
                "Konfigurasi database pembelian lokal tidak lengkap."
            );
        }

        /*
         * Struktur database transaksi dipertahankan.
         */

        const databaseSnapshot = {
            year: resolvedYear,
            pembelianId,
            detailPembelianId,
            pembayaranId
        };

        const pembelian = {
            ...data,
            id,
            database: databaseSnapshot,
            syncStatus: "pending",
            stockUpdated: false,
            stockUpdatedAt: null,
            createdAt: new Date().toISOString(),
            syncedAt: null
        };

        await DB.put(
            "pembelian",
            pembelian
        );

        const queue = {
            id:
                "SYNC-" +
                Date.now() +
                "-" +
                Math.random().toString(36).slice(2, 7),
            type: "pembelian",
            referenceId: id,
            status: options.deferProcess
                ? "waitingMaster"
                : "pending",
            retry: 0,
            createdAt: new Date().toISOString(),
            lastError: null
        };

        await DB.put(
            "syncQueue",
            queue
        );

        /*
         * Perilaku lama tetap berlaku untuk pemanggil lain.
         * Pemanggil yang meminta deferProcess mengatur sinkronisasi
         * setelah persiapan master selesai.
         */

        if (!options.deferProcess) {
            this.autoProcess();
        }

        

        return pembelian;
    },


    async updatePembelian(data, options = {}) {

        if (!data || !data.id) {
            throw new Error(
                "Data pembelian tidak valid."
            );
        }

        const id = data.id;

        const existing =
            await DB.get("pembelian", id);

        if (!existing) {
            throw new Error(
                "Data pembelian tidak ditemukan."
            );
        }

        if (String(id).startsWith("LOCAL-PB-")) {
            throw new Error(
                "Pembelian lokal belum dapat diedit."
            );
        }

        let database =
            existing.database ||
            data.database ||
            null;

        if (
            !database ||
            !database.pembelianId ||
            !database.detailPembelianId ||
            !database.pembayaranId
        ) {

            const year =
                PembelianDatabaseConfig.getActiveYear();

            if (!year) {
                throw new Error(
                    "Tahun database pembelian belum ditentukan."
                );
            }

            const resolveResult =
                await API.get(
                    "resolvePembelianDatabase",
                    { year }
                );

            if (!resolveResult || !resolveResult.success) {
                throw new Error(
                    resolveResult?.message ||
                    "Database pembelian tidak dapat ditentukan."
                );
            }

            database = {
                year: resolveResult.year || year,
                pembelianId: resolveResult.pembelian,
                detailPembelianId: resolveResult.detailPembelian,
                pembayaranId: resolveResult.pembayaran
            };
        }

        if (
            !database.pembelianId ||
            !database.detailPembelianId ||
            !database.pembayaranId
        ) {
            throw new Error(
                "Konfigurasi database pembelian tidak lengkap."
            );
        }

        const allDetails =
            await DB.getAll("detailPembelian");

        const oldItems =
            allDetails
                .filter(item => {
                    const reference =
                        item.pembelianId ||
                        item.transaksiId;

                    return String(reference) === String(id);
                })
                .map(item => ({ ...item }));

        const updatedPembelian = {
            ...existing,
            ...data,
            id,
            database,
            pendingUpdate: {
                originalItems: oldItems
            },
            syncStatus: "pending",
            syncedAt: null,
            updatedAt: new Date().toISOString()
        };

        await DB.put(
            "pembelian",
            updatedPembelian
        );

        const queueList =
            await DB.getAll("syncQueue");

        const existingQueue =
            queueList.find(item =>
                item.type === "pembelianUpdate" &&
                String(item.referenceId) === String(id) &&
                item.status !== "success"
            );

        let queue;

        if (existingQueue) {
            queue = {
                ...existingQueue,
                status: options.deferProcess
                    ? "waitingMaster"
                    : "pending",
                retry: 0,
                lastError: null,
                createdAt: new Date().toISOString()
            };
        } else {
            queue = {
                id:
                    "SYNC-PB-EDIT-" +
                    Date.now() +
                    "-" +
                    Math.random().toString(36).slice(2, 7),
                type: "pembelianUpdate",
                action: "update",
                referenceId: id,
                status: options.deferProcess
                    ? "waitingMaster"
                    : "pending",
                retry: 0,
                createdAt: new Date().toISOString(),
                lastError: null
            };
        }

        await DB.put(
            "syncQueue",
            queue
        );

        if (!options.deferProcess) {
            this.autoProcess();
        }

        

        return updatedPembelian;
    },


    async syncPembelian(queue) {

        const pembelian =
            await DB.get(
                "pembelian",
                queue.referenceId
            );

        if (!pembelian) {
            throw new Error(
                "Data pembelian lokal tidak ditemukan."
            );
        }

        /*
         * Simpan ID server setelah API berhasil agar retry
         * tidak membuat transaksi server baru berulang kali.
         */
        let serverId = pembelian.serverId || null;

        if (!serverId) {

            const result =
                await API.savePembelian(pembelian);

            if (!result || !result.success) {
                throw new Error(
                    result?.message ||
                    "Gagal menyimpan pembelian ke server."
                );
            }

            serverId = result.id;

            if (!serverId) {
                throw new Error(
                    "Server tidak mengembalikan ID pembelian."
                );
            }

            pembelian.serverId = serverId;

            if (result.status) {
                pembelian.status = result.status;
            }

            await DB.put(
                "pembelian",
                pembelian
            );
        }

        const items =
            Array.isArray(pembelian.items)
                ? pembelian.items
                : [];

        /*
         * Perbarui stok hanya sekali.
         * Flag disimpan sebelum melanjutkan ke detail dan pembayaran
         * agar kegagalan di tahap berikutnya tidak menggandakan stok.
         */
        if (!pembelian.stockUpdated) {

            for (
                let index = 0;
                index < items.length;
                index++
            ) {

                const item = items[index];

                const kode = item.barang;

                if (!kode) continue;

                const barang =
                    await DB.get("barang", kode);

                if (!barang) {
                    console.warn(
                        "BARANG TIDAK DITEMUKAN:",
                        kode
                    );
                    continue;
                }

                const allSatuan =
                    await DB.getAll("satuan");

                const satuan =
                    allSatuan.find(row =>
                        String(row.kode) === String(kode) &&
                        String(row.satuan).toLowerCase() ===
                            String(item.satuan).toLowerCase()
                    );

                const isi =
                    Number(satuan?.isi || 1);

                const qty =
                    Number(item.qty || 0);

                const jumlahStok =
                    qty * isi;

                barang.stok =
                    Number(barang.stok || 0) +
                    jumlahStok;

                await DB.put(
                    "barang",
                    barang
                );

                
            }

            pembelian.stockUpdated = true;
            pembelian.stockUpdatedAt =
                new Date().toISOString();

            await DB.put(
                "pembelian",
                pembelian
            );
        }

        /*
         * Pertahankan ID lokal sampai seluruh proses selesai.
         * Jangan hapus transaksi lokal sebelum detail dan pembayaran
         * berhasil disimpan.
         */
        const oldDetail =
            await DB.getAll("detailPembelian");

        const oldDetails =
            oldDetail.filter(item => {
                const reference =
                    item.pembelianId ||
                    item.transaksiId;

                return (
                    String(reference) === String(serverId) ||
                    String(reference) === String(pembelian.id)
                );
            });

        for (const item of oldDetails) {
            await DB.delete(
                "detailPembelian",
                item.id
            );
        }

        for (
            let index = 0;
            index < items.length;
            index++
        ) {

            const item = items[index];

            const detail = {
                id:
                    serverId +
                    "-DETAIL-" +
                    (index + 1),
                pembelianId: serverId,
                transaksiId: serverId,
                kode: item.barang || "",
                nama: item.namaBarang || "",
                satuan: item.satuan || "",
                barcode: item.barcode || "",
                qty: Number(item.qty || 0),
                konversi: Number(item.konversi || 1),
                harga: Number(item.harga || 0),
                disc: Number(item.disc || 0),
                total: Number(item.total || 0)
            };

            await DB.put(
                "detailPembelian",
                detail
            );
        }

        /*
         * Nama object store yang benar adalah pembayaranPembelian,
         * bukan pembayaran.
         */
        const paymentStore =
            "pembayaranPembelian";

        const oldPayments =
            await DB.getAll(paymentStore);

        const oldPaymentList =
            oldPayments.filter(item => {
                const reference =
                    item.pembelianId ||
                    item.transaksiId;

                return (
                    String(reference) === String(serverId) ||
                    String(reference) === String(pembelian.id)
                );
            });

        for (const item of oldPaymentList) {
            await DB.delete(
                paymentStore,
                item.id
            );
        }

        const payments =
            Array.isArray(pembelian.payments)
                ? pembelian.payments
                : [];

        for (
            let index = 0;
            index < payments.length;
            index++
        ) {

            const payment = payments[index];

            const paymentData = {
                id:
                    serverId +
                    "-PAYMENT-" +
                    (index + 1),
                pembelianId: serverId,
                transaksiId: serverId,
                metode: payment.metode || "Cash",
                nominal: Number(payment.nominal || 0),
                kembalian: Number(payment.kembalian || 0)
            };

            await DB.put(
                paymentStore,
                paymentData
            );
        }

        /*
         * Migrasikan ID lokal ke ID server setelah semua langkah
         * di atas berhasil.
         */
        const localId = pembelian.id;

        pembelian.id = serverId;
        pembelian.serverId = serverId;
        pembelian.syncStatus = "synced";
        pembelian.syncedAt = new Date().toISOString();
        pembelian.stockUpdated = true;
        pembelian.stockUpdatedAt =
            pembelian.stockUpdatedAt ||
            new Date().toISOString();

        await DB.put(
            "pembelian",
            pembelian
        );

        if (String(localId) !== String(serverId)) {
            await DB.delete(
                "pembelian",
                localId
            );
        }

        /*
         * Perbarui referensi antrean agar tetap menunjuk ke transaksi
         * yang sudah menggunakan ID server.
         */
        queue.referenceId = serverId;

        await DB.put(
            "syncQueue",
            queue
        );

        

        return {
            success: true,
            id: serverId,
            status: pembelian.status
        };
    },


    async syncUpdatePembelian(queue) {

        const pembelian =
            await DB.get(
                "pembelian",
                queue.referenceId
            );

        if (!pembelian) {
            throw new Error(
                "Data pembelian lokal tidak ditemukan."
            );
        }

        /*
         * SIMPAN PERUBAHAN PEMBELIAN KE SERVER
         */

        const result =
            await API.updatePembelian(pembelian);

        if (!result || !result.success) {
            throw new Error(
                result?.message ||
                "Gagal memperbarui pembelian."
            );
        }

        /*
         * PERBARUI STOK BARANG LOKAL
         *
         * Ambil master Barang terbaru dari server.
         * Hanya field stok yang diperbarui di IndexedDB.
         * Data lokal lainnya tetap dipertahankan.
         */

        try {

            const bootstrapResult =
                await API.getBootstrap();

            if (
                !bootstrapResult ||
                bootstrapResult.success !== true
            ) {
                throw new Error(
                    bootstrapResult?.message ||
                    "Gagal mengambil stok terbaru dari server."
                );
            }

            const barangServer =
                Array.isArray(
                    bootstrapResult.data?.barang
                )
                    ? bootstrapResult.data.barang
                    : [];

            if (!barangServer.length) {
                throw new Error(
                    "Data master Barang dari server kosong."
                );
            }

            let jumlahDiperbarui = 0;

            for (const dataServer of barangServer) {

                if (!dataServer.kode) {
                    continue;
                }

                const barangLokal =
                    await DB.get(
                        "barang",
                        dataServer.kode
                    );

                if (!barangLokal) {
                    continue;
                }

                const stokServer =
                    Number(dataServer.stok);

                if (!Number.isFinite(stokServer)) {
                    continue;
                }

                if (
                    Number(barangLokal.stok || 0) !==
                    stokServer
                ) {

                    const stokSebelumnya =
                        barangLokal.stok;

                    barangLokal.stok =
                        stokServer;

                    await DB.put(
                        "barang",
                        barangLokal
                    );

                    jumlahDiperbarui++;

                    
                }
            }

            

        } catch (stockError) {

            /*
             * Kegagalan memperbarui cache stok tidak membatalkan
             * pembelian yang sudah berhasil disimpan di server.
             * Pesan error dicatat agar dapat diperiksa.
             */

            console.error(
                "GAGAL MEMPERBARUI STOK LOKAL:",
                stockError
            );
        }

        /*
         * PERBARUI STATUS TRANSAKSI LOKAL
         */

        if (result.status) {
            pembelian.status = result.status;
        }

        pembelian.syncStatus = "synced";
        pembelian.syncedAt = new Date().toISOString();
        pembelian.updatedAt = new Date().toISOString();

        await DB.put(
            "pembelian",
            pembelian
        );

        

        return result;
    }

});