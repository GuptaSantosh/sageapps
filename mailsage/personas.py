PERSONAS = {
    "salaried": {
        "name": "Salaried Professional",
        "emoji": "💼",
        "signal": {
            "priority_senders": [
                "hr@", "payroll@", "salary@", "it@", "admin@",
                "noreply@hdfcbank", "alerts@icicibank", "alerts@axisbank",
                "noreply@yesbank", "insurance", "mediclaim",
                "epfindia", "incometax", "traces"
            ],
            "alert_keywords": [
                "salary credited", "reimbursement", "form 16",
                "tds deducted", "pf credit", "insurance premium",
                "policy due", "travel approved", "expense claim",
                "increment", "appraisal", "offer letter"
            ],
            "noise_filters": [
                "newsletter", "unsubscribe", "promotional",
                "sale", "discount", "offer", "deal",
                "job alert", "hiring", "linkedin job",
                "webinar", "workshop", "course",
                "mutual fund sip reminder", "credit card reward points"
            ],
            "context_tags": ["salaried", "india", "tax", "epf"]
        }
    },

    "investor": {
        "name": "Investor",
        "emoji": "📈",
        "signal": {
            "priority_senders": [
                "zerodha", "groww", "kite", "coin",
                "bseindia", "nseindia", "cdsl", "nsdl",
                "camsonline", "kfintech", "mfuonline",
                "sbimf", "hdfcmf", "nippon", "mirae",
                "incometax", "traces", "cams"
            ],
            "alert_keywords": [
                "trade executed", "order placed", "order rejected",
                "dividend credited", "redemption", "folio",
                "capital gains", "cas statement", "portfolio value",
                "market alert", "circuit breaker", "bulk deal",
                "rights issue", "bonus shares", "ipo allotment",
                "form 26as", "advance tax"
            ],
            "noise_filters": [
                "newsletter", "unsubscribe", "promotional",
                "sale", "discount", "credit card offer",
                "job alert", "webinar", "course",
                "new fund offer nfo",
                "sip reminder"
            ],
            "context_tags": ["investor", "stocks", "mf", "tax", "india"]
        }
    },

    "founder": {
        "name": "Founder / Self-employed",
        "emoji": "🏢",
        "signal": {
            "priority_senders": [
                "gst", "traces", "incometax", "mca",
                "razorpay", "cashfree", "stripe", "paypal",
                "aws", "digitalocean", "google cloud",
                "zoho", "quickbooks", "tally",
                "vendor@", "invoice@", "billing@", "legal@"
            ],
            "alert_keywords": [
                "payment received", "invoice due", "overdue",
                "gst filing", "gst return", "tds payment",
                "advance tax", "mca filing", "roc",
                "contract", "agreement", "legal notice",
                "server down", "payment failed", "refund",
                "subscription renewed", "renewal reminder",
                "bank transaction", "upi credit"
            ],
            "noise_filters": [
                "newsletter", "unsubscribe", "promotional",
                "sale", "discount", "job alert",
                "linkedin connection", "webinar",
                "reward points", "cashback offer"
            ],
            "context_tags": ["founder", "gst", "vendor", "india", "compliance"]
        }
    },

    "family": {
        "name": "Family Manager",
        "emoji": "👨‍👩‍👧",
        "signal": {
            "priority_senders": [
                "school", "cbse", "icse", "academy",
                "hospital", "clinic", "apollo", "fortis",
                "igl", "bescom", "tata power", "adani electricity",
                "lici", "licindia", "insurance",
                "noreply@hdfcbank", "alerts@icicibank",
                "amazon", "flipkart"
            ],
            "alert_keywords": [
                "fee due", "fee reminder", "school circular",
                "exam schedule", "result", "pta meeting",
                "medical report", "lab report", "prescription",
                "insurance premium", "policy renewal",
                "electricity bill", "gas bill", "water bill",
                "emi due", "loan statement",
                "ration card", "aadhar", "passport"
            ],
            "noise_filters": [
                "newsletter", "unsubscribe", "promotional offer",
                "sale", "flash sale", "discount",
                "job alert", "hiring", "webinar",
                "credit card reward", "cashback",
                "app download", "refer and earn"
            ],
            "context_tags": ["family", "school", "bills", "health", "india"]
        }
    }
}

DEFAULT_SIGNAL = {
    "priority_senders": [],
    "alert_keywords": [],
    "noise_filters": [],
    "context_tags": []
}
