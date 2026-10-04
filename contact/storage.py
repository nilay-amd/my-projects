import json
import os

FILENAME = "contacts.json"

def load_contacts():
    """Reads contacts from the JSON file. Returns empty dict if file doesn't exist."""
    if os.path.exists(FILENAME):
        try:
            with open(FILENAME, "r") as file:
                return json.load(file)
        except json.JSONDecodeError:
            print("Warning: JSON file corrupted. Starting with an empty contact list.")
            return {}
    return {}

def save_contacts(contacts):
    """Writes the given contacts dictionary back to the JSON file."""
    with open(FILENAME, "w") as file:
        json.dump(contacts, file, indent=4)