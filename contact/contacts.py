import storage
import validators

def add_contact(contacts):
    name = input("Enter contact name: ").strip()
    if not name:
        print("Name cannot be empty!")
        return

    if name in contacts:
        print(f"A contact named '{name}' already exists.")
        return

    # Validated inputs loop automatically until clean data is provided
    phone = validators.get_valid_phone()
    email = validators.get_valid_email()

    contacts[name] = {"phone": phone, "email": email}
    storage.save_contacts(contacts)
    print(f"Success: Contact '{name}' saved.")

def view_contacts(contacts):
    if not contacts:
        print("\nNo contacts found.")
        return

    print("\n" + "=" * 30)
    print("      CONTACT LIST")
    print("=" * 30)
    for name, info in contacts.items():
        print(f"Name  : {name}")
        print(f"Phone : {info['phone']}")
        print(f"Email : {info['email']}")
        print("-" * 30)

def search_contact(contacts):
    query = input("Enter name to search: ").strip()
    if query in contacts:
        info = contacts[query]
        print("\n--- Match Found ---")
        print(f"Name  : {query}")
        print(f"Phone : {info['phone']}")
        print(f"Email : {info['email']}")
    else:
        print(f"No contact found for '{query}'.")

def delete_contact(contacts):
    name = input("Enter name of contact to delete: ").strip()
    if name in contacts:
        del contacts[name]
        storage.save_contacts(contacts)
        print(f"Success: Deleted '{name}'.")
    else:
        print(f"No contact found for '{name}'.")



# ==========================================
# FOR WEB SUPPORT
# ==========================================

def get_all_contacts():
    return storage.load_contacts()

def add_contact_web(name, phone, email):
    if not name or not validators.is_valid_phone(phone) or not validators.is_valid_email(email):
        return False
    contacts = storage.load_contacts()
    contacts[name] = {"phone": phone, "email": email}
    storage.save_contacts(contacts)
    return True

def search_contacts_web(query):
    contacts = storage.load_contacts()
    if not query:
        return contacts
    return {k: v for k, v in contacts.items() if query.lower() in k.lower()}

def delete_contact_web(name):
    contacts = storage.load_contacts()
    if name in contacts:
        del contacts[name]
        storage.save_contacts(contacts)
        return True
    return False