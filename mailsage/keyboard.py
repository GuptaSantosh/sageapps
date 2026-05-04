"""
MailSage — Keyboard helpers
"""

def main_menu():
    return {
        "keyboard": [
            ["📬 Brief", "🔄 Refresh"],
            ["⚙️ Settings", "❓ Help"]
        ],
        "resize_keyboard": True,
        "persistent": True
    }
