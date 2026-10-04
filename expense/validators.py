
from datetime import datetime

def is_valid_amount(amount):
    try:
        val = float(amount)
        return val > 0
    except (ValueError, TypeError):
        return False

def is_valid_date(date_str):
    if not date_str or date_str.strip() == "":
        return True  # Optional: Defaults to current date if left empty
    try:
        datetime.strptime(date_str, "%Y-%m-%d")
        return True
    except ValueError:
        return False