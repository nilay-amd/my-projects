import re

def is_valid_phone(phone):
    """
    Checks if phone number contains 10 to 15 digits (with an optional leading '+').
    Examples of valid input: +12345678901, 9876543210
    """
    pattern = r"^\+?\d{10,15}$"
    return bool(re.match(pattern, phone))

def is_valid_email(email):
    """
    Checks for standard email structure: username@domain.extension
    Examples of valid input: user@gmail.com, john.doe@univ.edu
    """
    pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    return bool(re.match(pattern, email))

def get_valid_phone():
    """Keeps prompting the user until a valid phone number is entered."""
    while True:
        phone = input("Enter phone number: ").strip()
        if is_valid_phone(phone):
            return phone
        print("Invalid phone number. Must contain 10-15 digits (optional '+' allowed).")

def get_valid_email():
    """Keeps prompting the user until a valid email format is entered."""
    while True:
        email = input("Enter email address: ").strip()
        if is_valid_email(email):
            return email
        print("Invalid email format. Try again (e.g. name@example.com).")