```javascript
/* =========================================================
   UPI-PAY — FRONTEND APPLICATION
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    // =====================================================
    // ELEMENTS
    // =====================================================

    const sendAmount = document.getElementById("sendAmount");
    const receiveAmount = document.getElementById("receiveAmount");
    const receiveCurrency = document.getElementById("receiveCurrency");
    const receiveSymbol = document.getElementById("receiveSymbol");
    const exchangeRate = document.getElementById("exchangeRate");

    const receiverLabel = document.getElementById("receiverLabel");
    const receiverDetails = document.getElementById("receiverDetails");

    const continueExchange =
        document.getElementById("continueExchange");

    const balanceValue =
        document.getElementById("balanceValue");

    const sidebarBalance =
        document.getElementById("sidebarBalance");

    const completedValue =
        document.getElementById("completedValue");

    const transactionsList =
        document.getElementById("transactionsList");

    const orderModal =
        document.getElementById("orderModal");

    const closeOrderModal =
        document.getElementById("closeOrderModal");

    const orderId =
        document.getElementById("orderId");

    const trackOrder =
        document.getElementById("trackOrder");

    const modalSendAmount =
        document.getElementById("modalSendAmount");

    const modalReceiveAmount =
        document.getElementById("modalReceiveAmount");

    const progressCreated =
        document.getElementById("progressCreated");

    const progressPayment =
        document.getElementById("progressPayment");

    const progressComplete =
        document.getElementById("progressComplete");

    const moneyModal =
        document.getElementById("moneyModal");

    const closeMoneyModal =
        document.getElementById("closeMoneyModal");

    const moneyTitle =
        document.getElementById("moneyTitle");

    const moneyAmount =
        document.getElementById("moneyAmount");

    const moneyAction =
        document.getElementById("moneyAction");

    const supportButton =
        document.getElementById("supportButton");

    const refreshTransactions =
        document.getElementById("refreshTransactions");

    const menuButton =
        document.getElementById("menuButton");


    // =====================================================
    // STATE
    // =====================================================

    let selectedMethod = "upi";
    let currentOrder = null;
    let moneyActionType = "deposit";

    const methodData = {
        easypaisa: {
            name: "EasyPaisa",
            currency: "PKR",
            symbol: "₨",
            rate: 1,
            label: "EasyPaisa Number",
            placeholder: "03XX XXXXXXX"
        },

        jazzcash: {
            name: "JazzCash",
            currency: "PKR",
            symbol: "₨",
            rate: 1,
            label: "JazzCash Number",
            placeholder: "03XX XXXXXXX"
        },

        upi: {
            name: "UPI",
            currency: "INR",
            symbol: "₹",
            rate: 0.3125,
            label: "UPI ID",
            placeholder: "name@upi"
        },

        usdt: {
            name: "USDT",
            currency: "USDT",
            symbol: "₮",
            rate: 0.003571,
            label: "USDT Wallet Address",
            placeholder: "Enter wallet address"
        }
    };


    // =====================================================
    // HELPERS
    // =====================================================

    function formatNumber(number, decimals = 2) {

        const value = Number(number);

        if (!Number.isFinite(value)) {
            return "0.00";
        }

        return value.toLocaleString("en-US", {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }


    function formatReceive(number) {

        const value = Number(number);

        if (!Number.isFinite(value)) {
            return "0";
        }

        if (value >= 1000) {
            return formatNumber(value, 2);
        }

        if (value >= 1) {
            return formatNumber(value, 4);
        }

        return value.toFixed(6);
    }


    function showMessage(message, type = "success") {

        let notification =
            document.getElementById("appNotification");

        if (!notification) {

            notification =
                document.createElement("div");

            notification.id =
                "appNotification";

            notification.style.position =
                "fixed";

            notification.style.top =
                "20px";

            notification.style.right =
                "20px";

            notification.style.zIndex =
                "9999";

            notification.style.maxWidth =
                "340px";

            notification.style.padding =
                "13px 16px";

            notification.style.borderRadius =
                "12px";

            notification.style.fontSize =
                "12px";

            notification.style.fontWeight =
                "700";

            notification.style.boxShadow =
                "0 20px 50px rgba(0,0,0,.4)";

            notification.style.transition =
                "opacity .2s ease, transform .2s ease";

            document.body.appendChild(notification);
        }

        notification.textContent = message;

        notification.style.color =
            type === "error"
                ? "#ffd9de"
                : "#dfffee";

        notification.style.background =
            type === "error"
                ? "rgba(100,20,32,.96)"
                : "rgba(12,72,44,.96)";

        notification.style.border =
            type === "error"
                ? "1px solid rgba(255,101,120,.3)"
                : "1px solid rgba(53,229,138,.3)";

        notification.style.opacity = "1";
        notification.style.transform = "translateY(0)";

        clearTimeout(notification._timer);

        notification._timer =
            setTimeout(() => {

                notification.style.opacity = "0";
                notification.style.transform =
                    "translateY(-8px)";

            }, 3000);
    }


    function setBalance(balance) {

        const formatted =
            `₨${formatNumber(balance, 2)}`;

        if (balanceValue) {
            balanceValue.textContent = formatted;
        }

        if (sidebarBalance) {
            sidebarBalance.textContent = formatted;
        }
    }


    function setButtonLoading(button, loading, normalText) {

        if (!button) return;

        if (loading) {

            button.disabled = true;
            button.style.opacity = "0.65";
            button.style.cursor = "wait";
            button.dataset.originalText =
                button.querySelector("span")?.textContent ||
                button.textContent;

            const span =
                button.querySelector("span");

            if (span) {
                span.textContent = "Processing...";
            } else {
                button.textContent = "Processing...";
            }

        } else {

            button.disabled = false;
            button.style.opacity = "1";
            button.style.cursor = "pointer";

            const span =
                button.querySelector("span");

            if (span) {
                span.textContent =
                    normalText || "Continue Exchange";
            }
        }
    }


    async function api(url, options = {}) {

        const response =
            await fetch(url, {
                headers: {
                    "Content-Type": "application/json",
                    ...(options.headers || {})
                },
                ...options
            });

        let data = {};

        try {
            data = await response.json();
        } catch {
            data = {
                success: false,
                message: "Server returned an invalid response."
            };
        }

        if (!response.ok || data.success === false) {

            throw new Error(
                data.message ||
                `Request failed (${response.status})`
            );
        }

        return data;
    }


    // =====================================================
    // EXCHANGE CALCULATOR
    // =====================================================

    function calculateLocally() {

        const amount =
            Number(sendAmount?.value || 0);

        const data =
            methodData[selectedMethod];

        if (!data) return;

        const result =
            amount > 0
                ? amount * data.rate
                : 0;

        if (receiveAmount) {

            receiveAmount.value =
                result > 0
                    ? formatReceive(result)
                    : "0";
        }

        if (receiveCurrency) {
            receiveCurrency.textContent =
                data.currency;
        }

        if (receiveSymbol) {
            receiveSymbol.textContent =
                data.symbol;
        }

        if (exchangeRate) {

            exchangeRate.textContent =
                `1 PKR = ${data.rate} ${data.currency}`;
        }
    }


    async function calculateFromServer() {

        const amount =
            Number(sendAmount?.value || 0);

        if (!Number.isFinite(amount) || amount <= 0) {
            calculateLocally();
            return;
        }

        try {

            const result =
                await api("/api/calculate", {
                    method: "POST",
                    body: JSON.stringify({
                        amount,
                        method: selectedMethod
                    })
                });

            if (receiveAmount) {
                receiveAmount.value =
                    formatReceive(result.receive_amount);
            }

            if (receiveCurrency) {
                receiveCurrency.textContent =
                    result.currency;
            }

            const data =
                methodData[selectedMethod];

            if (receiveSymbol && data) {
                receiveSymbol.textContent =
                    data.symbol;
            }

            if (exchangeRate) {

                exchangeRate.textContent =
                    `1 PKR = ${result.rate} ${result.currency}`;
            }

        } catch {

            calculateLocally();
        }
    }


    // =====================================================
    // METHOD SELECTION
    // =====================================================

    document
        .querySelectorAll(".method-card")
        .forEach(card => {

            card.addEventListener("click", () => {

                const method =
                    card.dataset.method;

                if (!methodData[method]) {
                    return;
                }

                selectedMethod = method;

                document
                    .querySelectorAll(".method-card")
                    .forEach(item => {
                        item.classList.remove("selected");
                    });

                card.classList.add("selected");

                const data =
                    methodData[method];

                if (receiverLabel) {
                    receiverLabel.textContent =
                        data.label;
                }

                if (receiverDetails) {
                    receiverDetails.placeholder =
                        data.placeholder;
                    receiverDetails.value = "";
                }

                calculateFromServer();
            });
        });


    // =====================================================
    // AMOUNT INPUT
    // =====================================================

    if (sendAmount) {

        sendAmount.addEventListener(
            "input",
            () => {
                calculateFromServer();
            }
        );
    }


    // =====================================================
    // CREATE EXCHANGE
    // =====================================================

    if (continueExchange) {

        continueExchange.addEventListener(
            "click",
            async () => {

                const amount =
                    Number(sendAmount?.value || 0);

                const receiver =
                    String(
                        receiverDetails?.value || ""
                    ).trim();

                if (!Number.isFinite(amount) || amount <= 0) {

                    showMessage(
                        "Please enter a valid amount.",
                        "error"
                    );

                    sendAmount?.focus();

                    return;
                }

                if (!receiver) {

                    showMessage(
                        "Please enter receiver details.",
                        "error"
                    );

                    receiverDetails?.focus();

                    return;
                }

                setButtonLoading(
                    continueExchange,
                    true
                );

                try {

                    const result =
                        await api("/api/exchange", {
                            method: "POST",

                            body: JSON.stringify({
                                amount,
                                method: selectedMethod,
                                receiver
                            })
                        });

                    currentOrder =
                        result.order;

                    openOrderModal(
                        result.order
                    );

                    setBalance(
                        result.wallet_balance
                    );

                    if (moneyAmount) {
                        moneyAmount.value = "";
                    }

                    await loadTransactions();

                    showMessage(
                        "Exchange order created successfully."
                    );

                } catch (error) {

                    showMessage(
                        error.message ||
                        "Unable to create exchange.",
                        "error"
                    );

                } finally {

                    setButtonLoading(
                        continueExchange,
                        false,
                        "Continue Exchange"
                    );
                }
            }
        );
    }


    // =====================================================
    // ORDER MODAL
    // =====================================================

    function openOrderModal(order) {

        if (!orderModal) return;

        currentOrder = order;

        if (orderId) {
            orderId.textContent =
                order.id;
        }

        if (modalSendAmount) {
            modalSendAmount.textContent =
                `₨${formatNumber(order.amount, 2)}`;
        }

        if (modalReceiveAmount) {

            let symbol = "";

            if (order.receive_currency === "INR") {
                symbol = "₹";
            } else if (order.receive_currency === "USDT") {
                symbol = "₮";
            } else {
                symbol = "₨";
            }

            modalReceiveAmount.textContent =
                `${symbol}${formatReceive(order.receive_amount)}`;
        }

        resetProgress();

        orderModal.classList.add("show");

        document.body.style.overflow = "hidden";
    }


    function closeOrder() {

        if (!orderModal) return;

        orderModal.classList.remove("show");

        document.body.style.overflow = "";
    }


    function resetProgress() {

        [
            progressCreated,
            progressPayment,
            progressComplete
        ].forEach(step => {

            if (step) {
                step.classList.remove("active");
            }
        });

        progressCreated?.classList.add("active");

        if (trackOrder) {
            trackOrder.innerHTML =
                "<span>Track Order</span><strong>→</strong>";
            trackOrder.disabled = false;
            trackOrder.style.opacity = "1";
        }
    }


    function updateProgress(order) {

        if (!order) return;

        progressCreated?.classList.remove("active");
        progressPayment?.classList.remove("active");
        progressComplete?.classList.remove("active");

        if (order.steps?.created) {
            progressCreated?.classList.add("active");
        }

        if (order.steps?.payment) {
            progressPayment?.classList.add("active");
        }

        if (order.steps?.complete) {
            progressComplete?.classList.add("active");
        }

        if (trackOrder) {

            if (order.status === "Created") {

                trackOrder.innerHTML =
                    "<span>Continue Tracking</span><strong>→</strong>";

            } else if (order.status === "Payment") {

                trackOrder.innerHTML =
                    "<span>Complete Demo Order</span><strong>→</strong>";

            } else {

                trackOrder.innerHTML =
                    "<span>Order Complete ✓</span>";

                trackOrder.disabled = true;
                trackOrder.style.opacity = "0.55";
            }
        }
    }


    if (closeOrderModal) {
        closeOrderModal.addEventListener(
            "click",
            closeOrder
        );
    }


    if (orderModal) {

        orderModal.addEventListener(
            "click",
            event => {

                if (
                    event.target === orderModal
                ) {
                    closeOrder();
                }
            }
        );
    }


    // =====================================================
    // TRACK ORDER
    // =====================================================

    if (trackOrder) {

        trackOrder.addEventListener(
            "click",
            async () => {

                if (!currentOrder?.id) {
                    return;
                }

                trackOrder.disabled = true;

                try {

                    const result =
                        await api(
                            `/api/order/${currentOrder.id}/track`,
                            {
                                method: "POST"
                            }
                        );

                    currentOrder =
                        result.order;

                    updateProgress(
                        currentOrder
                    );

                    await loadTransactions();

                    if (
                        currentOrder.status ===
                        "Complete"
                    ) {

                        showMessage(
                            "Demo order completed successfully."
                        );

                        const walletResult =
                            await api("/api/wallet");

                        setBalance(
                            walletResult.balance
                        );

                        if (completedValue) {
                            completedValue.textContent =
                                walletResult.completed_exchanges;
                        }

                    } else {

                        showMessage(
                            `Order status: ${currentOrder.status}`
                        );
                    }

                } catch (error) {

                    showMessage(
                        error.message ||
                        "Unable to track order.",
                        "error"
                    );

                    trackOrder.disabled = false;
                }
            }
        );
    }


    // =====================================================
    // MONEY MODAL
    // =====================================================

    document
        .querySelectorAll("[data-modal]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const action =
                        button.dataset.modal;

                    if (
                        action !== "deposit" &&
                        action !== "withdraw"
                    ) {
                        return;
                    }

                    moneyActionType = action;

                    if (moneyTitle) {

                        moneyTitle.textContent =
                            action === "deposit"
                                ? "Deposit Money"
                                : "Withdraw Money";
                    }

                    if (moneyAction) {

                        moneyAction.textContent =
                            action === "deposit"
                                ? "Add to Wallet"
                                : "Withdraw from Wallet";
                    }

                    if (moneyAmount) {
                        moneyAmount.value = "";
                        moneyAmount.focus();
                    }

                    moneyModal?.classList.add("show");

                    document.body.style.overflow = "hidden";
                }
            );
        });


    if (closeMoneyModal) {

        closeMoneyModal.addEventListener(
            "click",
            closeMoney
        );
    }


    function closeMoney() {

        moneyModal?.classList.remove("show");

        document.body.style.overflow = "";
    }


    if (moneyModal) {

        moneyModal.addEventListener(
            "click",
            event => {

                if (
                    event.target === moneyModal
                ) {
                    closeMoney();
                }
            }
        );
    }


    // =====================================================
    // DEPOSIT / WITHDRAW
    // =====================================================

    if (moneyAction) {

        moneyAction.addEventListener(
            "click",
            async () => {

                const amount =
                    Number(moneyAmount?.value || 0);

                if (!Number.isFinite(amount) || amount <= 0) {

                    showMessage(
                        "Enter a valid amount.",
                        "error"
                    );

                    moneyAmount?.focus();

                    return;
                }

                moneyAction.disabled = true;
                moneyAction.style.opacity = "0.6";

                try {

                    const endpoint =
                        moneyActionType === "deposit"
                            ? "/api/deposit"
                            : "/api/withdraw";

                    const result =
                        await api(endpoint, {
                            method: "POST",

                            body: JSON.stringify({
                                amount
                            })
                        });

                    setBalance(
                        result.balance
                    );

                    closeMoney();

                    await loadTransactions();

                    showMessage(
                        result.message
                    );

                } catch (error) {

                    showMessage(
                        error.message ||
                        "Transaction failed.",
                        "error"
                    );

                } finally {

                    moneyAction.disabled = false;
                    moneyAction.style.opacity = "1";
                }
            }
        );
    }


    // =====================================================
    // LOAD TRANSACTIONS
    // =====================================================

    async function loadTransactions() {

        if (!transactionsList) return;

        try {

            const result =
                await api("/api/transactions");

            renderTransactions(
                result.transactions
            );

        } catch {

            // Keep server-rendered transactions.
        }
    }


    function renderTransactions(items) {

        if (!transactionsList) return;

        if (!items || items.length === 0) {

            transactionsList.innerHTML = `
                <div class="transaction">
                    <div class="transaction-info">
                        <strong>No transactions yet</strong>
                        <span>Your activity will appear here.</span>
                    </div>
                </div>
            `;

            return;
        }

        transactionsList.innerHTML =
            items
                .slice(0, 10)
                .map(transaction => {

                    let icon = "↗";

                    if (
                        transaction.type ===
                        "deposit"
                    ) {
                        icon = "+";
                    }

                    if (
                        transaction.type ===
                        "withdraw"
                    ) {
                        icon = "−";
                    }

                    const amount =
                        `₨${formatNumber(
                            transaction.amount,
                            2
                        )}`;

                    return `
                        <div class="transaction">

                            <div class="transaction-icon">
                                ${icon}
                            </div>

                            <div class="transaction-info">

                                <strong>
                                    ${escapeHtml(
                                        transaction.title
                                    )}
                                </strong>

                                <span>
                                    ${escapeHtml(
                                        transaction.id
                                    )}
                                    ·
                                    ${escapeHtml(
                                        transaction.time
                                    )}
                                </span>

                            </div>

                            <div class="transaction-amount">

                                <strong>
                                    ${amount}
                                </strong>

                                <span class="status completed">
                                    ${escapeHtml(
                                        transaction.status
                                    )}
                                </span>

                            </div>

                        </div>
                    `;
                })
                .join("");
    }


    function escapeHtml(value) {

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    // =====================================================
    // REFRESH
    // =====================================================

    if (refreshTransactions) {

        refreshTransactions.addEventListener(
            "click",
            async () => {

                refreshTransactions.disabled = true;

                await loadTransactions();

                refreshTransactions.disabled = false;

                showMessage(
                    "Transactions refreshed."
                );
            }
        );
    }


    // =====================================================
    // NAVIGATION
    // =====================================================

    document
        .querySelectorAll(".nav-item")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    document
                        .querySelectorAll(".nav-item")
                        .forEach(item => {
                            item.classList.remove(
                                "active"
                            );
                        });

                    button.classList.add("active");

                    const section =
                        button.dataset.section;

                    if (section === "exchange") {

                        document
                            .getElementById(
                                "exchangeSection"
                            )
                            ?.scrollIntoView({
                                behavior: "smooth"
                            });

                    } else if (section === "wallet") {

                        document
                            .getElementById(
                                "walletSection"
                            )
                            ?.scrollIntoView({
                                behavior: "smooth"
                            });

                    } else if (section === "orders") {

                        document
                            .getElementById(
                                "ordersSection"
                            )
                            ?.scrollIntoView({
                                behavior: "smooth"
                            });
                    }
                }
            );
        });


    // =====================================================
    // SUPPORT
    // =====================================================

    if (supportButton) {

        supportButton.addEventListener(
            "click",
            () => {

                showMessage(
                    "Support is available in the full production version."
                );
            }
        );
    }


    // =====================================================
    // MOBILE MENU
    // =====================================================

    if (menuButton) {

        menuButton.addEventListener(
            "click",
            () => {

                showMessage(
                    "Mobile navigation is available through the sections below."
                );
            }
        );
    }


    // =====================================================
    // ESCAPE KEY
    // =====================================================

    document.addEventListener(
        "keydown",
        event => {

            if (event.key !== "Escape") {
                return;
            }

            closeOrder();
            closeMoney();
        }
    );


    // =====================================================
    // INITIAL LOAD
    // =====================================================

    calculateLocally();

    loadTransactions();

    api("/api/wallet")
        .then(result => {

            setBalance(
                result.balance
            );

            if (completedValue) {

                completedValue.textContent =
                    result.completed_exchanges;
            }
        })
        .catch(() => {
            // Server-rendered values remain visible.
        });

});
```
