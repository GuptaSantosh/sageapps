"""
MailSage — Keyboard helpers
"""

def main_menu():
    return {
        "keyboard": [
            ["📬 Brief", "🔄 Refresh"],
            ["⚙️ Settings", "🎭 Persona"],
            ["🔗 Auth", "⏰ Set Time"],
            ["🗑 Reset", "❓ Help"]
        ],
        "resize_keyboard": True,
        "persistent": True
    }
