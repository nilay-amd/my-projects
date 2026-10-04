import storage
import contacts

def display_menu():
    print("\n=========================")
    print("    CONTACT BOOK MENU    ")
    print("=========================")
    print("1. Add New Contact")
    print("2. View All Contacts")
    print("3. Search Contact")
    print("4. Delete Contact")
    print("5. Exit")

def main():
    contact_data = storage.load_contacts()

    while True:
        display_menu()
        choice = input("\nSelect an option (1-5): ").strip()

        if choice == "1":
            contacts.add_contact(contact_data)
        elif choice == "2":
            contacts.view_contacts(contact_data)
        elif choice == "3":
            contacts.search_contact(contact_data)
        elif choice == "4":
            contacts.delete_contact(contact_data)
        elif choice == "5":
            print("Exiting application. Goodbye!")
            break
        else:
            print("Invalid selection. Please choose between 1 and 5.")

if __name__ == "__main__":
    main()