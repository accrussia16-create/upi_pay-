```python
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
import os
import random
import string
from datetime import datetime

load_dotenv()

app = Flask(__name__)

app.config["SECRET_KEY"] = os.getenv(
    "SECRET_KEY",
    "upi-pay-demo-secret-change-this"
)

# =========================================================
# DEMO DATA
# =========================================================

wallet = {
    "balance": 25000.00,
    "completed_exchanges": 128
}

transactions = [
    {
        "id": "UPX-482913",
        "type": "exchange",
        "title": "PKR → INR",
        "amount": 5000,
        "status": "Completed",
        "time": "Today"
    },
    {
        "id": "DEP-731205",
        "type": "deposit",
        "title": "Wallet Deposit",
        "amount": 10000,
        "status": "Completed",
        "time": "Yesterday"
    },
    {
        "id": "UPX-194827",
        "type": "exchange",
        "title": "PKR → USDT",
        "amount": 2500,
        "status": "Completed",
        "time": "2 days ago"
    }
]

orders = {}

# =========================================================
# EXCHANGE RATES
# =========================================================

METHODS = {
    "easypaisa": {
        "name": "EasyPaisa",
        "currency": "PKR",
        "rate": 1.0,
        "label": "EasyPaisa Number",
        "placeholder": "03XX XXXXXXX"
    },
    "jazzcash": {
        "name": "JazzCash",
        "currency": "PKR",
        "rate": 1.0,
        "label": "JazzCash Number",
        "placeholder": "03XX XXXXXXX"
    },
    "upi": {
        "name": "UPI",
        "currency": "INR",
        "rate": 0.3125,
        "label": "UPI ID",
        "placeholder": "name@upi"
    },
    "usdt": {
        "name": "USDT",
        "currency": "USDT",
        "rate": 0.003571,
        "label": "USDT Wallet Address",
        "placeholder": "Enter wallet address"
    }
}

# =========================================================
# HELPERS
# =========================================================

def generate_order_id(prefix="UPX"):
    characters = string.digits
    number = "".join(random.choice(characters) for _ in range(6))
    return f"{prefix}-{number}"


def clean_amount(value):
    try:
        amount = float(value)
        if amount < 0:
            return 0
        return round(amount, 2)
    except (TypeError, ValueError):
        return 0


# =========================================================
# MAIN PAGE
# =========================================================

@app.route("/")
def dashboard():
    return render_template(
        "dashboard.html",
        wallet=wallet,
        transactions=transactions,
        methods=METHODS
    )


# =========================================================
# API: WALLET
# =========================================================

@app.route("/api/wallet", methods=["GET"])
def get_wallet():
    return jsonify({
        "success": True,
        "balance": wallet["balance"],
        "completed_exchanges": wallet["completed_exchanges"]
    })


# =========================================================
# API: METHODS
# =========================================================

@app.route("/api/methods", methods=["GET"])
def get_methods():
    return jsonify({
        "success": True,
        "methods": METHODS
    })


# =========================================================
# API: CALCULATE EXCHANGE
# =========================================================

@app.route("/api/calculate", methods=["POST"])
def calculate_exchange():

    data = request.get_json(silent=True) or {}

    amount = clean_amount(data.get("amount"))
    method = str(data.get("method", "")).lower()

    if method not in METHODS:
        return jsonify({
            "success": False,
            "message": "Invalid payment method."
        }), 400

    if amount <= 0:
        return jsonify({
            "success": False,
            "message": "Enter a valid amount."
        }), 400

    method_data = METHODS[method]

    receive_amount = round(
        amount * method_data["rate"],
        6
    )

    return jsonify({
        "success": True,
        "send_amount": amount,
        "receive_amount": receive_amount,
        "currency": method_data["currency"],
        "rate": method_data["rate"],
        "method": method_data["name"]
    })


# =========================================================
# API: CREATE EXCHANGE
# =========================================================

@app.route("/api/exchange", methods=["POST"])
def create_exchange():

    data = request.get_json(silent=True) or {}

    amount = clean_amount(data.get("amount"))
    method = str(data.get("method", "")).lower()
    receiver = str(data.get("receiver", "")).strip()

    if amount <= 0:
        return jsonify({
            "success": False,
            "message": "Enter a valid exchange amount."
        }), 400

    if method not in METHODS:
        return jsonify({
            "success": False,
            "message": "Please select a valid payment method."
        }), 400

    if not receiver:
        return jsonify({
            "success": False,
            "message": "Please enter receiver details."
        }), 400

    if amount > wallet["balance"]:
        return jsonify({
            "success": False,
            "message": "Insufficient demo wallet balance."
        }), 400

    method_data = METHODS[method]

    receive_amount = round(
        amount * method_data["rate"],
        6
    )

    order_id = generate_order_id()

    order = {
        "id": order_id,
        "amount": amount,
        "receive_amount": receive_amount,
        "send_currency": "PKR",
        "receive_currency": method_data["currency"],
        "method": method_data["name"],
        "receiver": receiver,
        "status": "Created",
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "steps": {
            "created": True,
            "payment": False,
            "complete": False
        }
    }

    orders[order_id] = order

    wallet["balance"] = round(
        wallet["balance"] - amount,
        2
    )

    transactions.insert(
        0,
        {
            "id": order_id,
            "type": "exchange",
            "title": f"PKR → {method_data['currency']}",
            "amount": amount,
            "status": "Created",
            "time": "Just now"
        }
    )

    return jsonify({
        "success": True,
        "message": "Exchange created successfully.",
        "order": order,
        "wallet_balance": wallet["balance"]
    })


# =========================================================
# API: GET ORDER
# =========================================================

@app.route("/api/order/<order_id>", methods=["GET"])
def get_order(order_id):

    order = orders.get(order_id)

    if not order:
        return jsonify({
            "success": False,
            "message": "Order not found."
        }), 404

    return jsonify({
        "success": True,
        "order": order
    })


# =========================================================
# API: TRACK ORDER
# =========================================================

@app.route("/api/order/<order_id>/track", methods=["POST"])
def track_order(order_id):

    order = orders.get(order_id)

    if not order:
        return jsonify({
            "success": False,
            "message": "Order not found."
        }), 404

    # Demo progression:
    # Created → Payment → Complete

    if order["status"] == "Created":
        order["status"] = "Payment"
        order["steps"]["payment"] = True

    elif order["status"] == "Payment":
        order["status"] = "Complete"
        order["steps"]["complete"] = True

        # Update matching transaction
        for transaction in transactions:
            if transaction["id"] == order_id:
                transaction["status"] = "Completed"

        wallet["completed_exchanges"] += 1

    return jsonify({
        "success": True,
        "order": order
    })


# =========================================================
# API: DEPOSIT
# =========================================================

@app.route("/api/deposit", methods=["POST"])
def deposit():

    data = request.get_json(silent=True) or {}

    amount = clean_amount(data.get("amount"))

    if amount <= 0:
        return jsonify({
            "success": False,
            "message": "Enter a valid deposit amount."
        }), 400

    # Demo only
    wallet["balance"] = round(
        wallet["balance"] + amount,
        2
    )

    transaction_id = generate_order_id("DEP")

    transactions.insert(
        0,
        {
            "id": transaction_id,
            "type": "deposit",
            "title": "Wallet Deposit",
            "amount": amount,
            "status": "Completed",
            "time": "Just now"
        }
    )

    return jsonify({
        "success": True,
        "message": "Demo deposit completed.",
        "transaction_id": transaction_id,
        "balance": wallet["balance"]
    })


# =========================================================
# API: WITHDRAW
# =========================================================

@app.route("/api/withdraw", methods=["POST"])
def withdraw():

    data = request.get_json(silent=True) or {}

    amount = clean_amount(data.get("amount"))

    if amount <= 0:
        return jsonify({
            "success": False,
            "message": "Enter a valid withdrawal amount."
        }), 400

    if amount > wallet["balance"]:
        return jsonify({
            "success": False,
            "message": "Insufficient wallet balance."
        }), 400

    # Demo only
    wallet["balance"] = round(
        wallet["balance"] - amount,
        2
    )

    transaction_id = generate_order_id("WDR")

    transactions.insert(
        0,
        {
            "id": transaction_id,
            "type": "withdraw",
            "title": "Wallet Withdrawal",
            "amount": amount,
            "status": "Completed",
            "time": "Just now"
        }
    )

    return jsonify({
        "success": True,
        "message": "Demo withdrawal completed.",
        "transaction_id": transaction_id,
        "balance": wallet["balance"]
    })


# =========================================================
# API: TRANSACTIONS
# =========================================================

@app.route("/api/transactions", methods=["GET"])
def get_transactions():

    return jsonify({
        "success": True,
        "transactions": transactions[:20]
    })


# =========================================================
# HEALTH CHECK
# =========================================================

@app.route("/health", methods=["GET"])
def health():

    return jsonify({
        "status": "ok",
        "application": "UPI-Pay",
        "mode": "demo"
    })


# =========================================================
# ERROR HANDLERS
# =========================================================

@app.errorhandler(404)
def page_not_found(error):

    if request.path.startswith("/api/"):
        return jsonify({
            "success": False,
            "message": "API endpoint not found."
        }), 404

    return "Page not found", 404


@app.errorhandler(500)
def internal_error(error):

    if request.path.startswith("/api/"):
        return jsonify({
            "success": False,
            "message": "Internal server error."
        }), 500

    return "Internal server error", 500


# =========================================================
# RUN SERVER
# =========================================================

if __name__ == "__main__":

    port = int(os.environ.get("PORT", 5000))

    app.run(
        host="0.0.0.0",
        port=port,
        debug=True
    )
```
