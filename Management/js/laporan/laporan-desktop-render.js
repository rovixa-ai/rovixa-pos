const LaporanDesktopRender = {

    render() {

        return `

            <div class="laporan-page">


                <!-- HEADER LAPORAN -->

                <div class="laporan-content-header">

                    <div>

                        <h2>
                            LAPORAN
                        </h2>

                        <p>
                            Laporan transaksi dan aktivitas toko
                        </p>

                    </div>

                </div>


                <!-- MENU LAPORAN -->

                <nav
                    class="laporan-sidebar"
                    id="laporan-sidebar-menu"
                >

                    <button
                        type="button"
                        class="laporan-menu-item active"
                        data-laporan="pembelian"
                    >

                        Pembelian

                    </button>


                    <button
                        type="button"
                        class="laporan-menu-item"
                        data-laporan="penjualan"
                    >

                        Penjualan

                    </button>


                    <button
                        type="button"
                        class="laporan-menu-item"
                        data-laporan="expense"
                    >

                        Expense

                    </button>


                    <button
                        type="button"
                        class="laporan-menu-item"
                        data-laporan="profit"
                    >

                        Profit

                    </button>

                </nav>


                <!-- ISI LAPORAN -->

                <main
                    class="laporan-content"
                    id="laporan-content"
                >

                </main>


            </div>

        `;

    }

};