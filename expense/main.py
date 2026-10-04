import tracker

def print_menu():
    print("\n=== EXPENSE TRACKER (CLI) ===")
    print("1. Add Expense")
    print("2. View All Expenses")
    print("3. View Summary")
    print("4. Delete Expense")
    print("5. Exit")

def main():
    while True:
        print_menu()
        choice = input("Select an option (1-5): ").strip()

        if choice == "1":
            amount = input("Enter amount: ")
            category = input("Enter category (Food, Transport, Utilities, etc.): ")
            description = input("Enter description: ")
            date_str = input("Enter date (YYYY-MM-DD, press Enter for Today): ")
            
            success, message = tracker.add_expense(amount, category, description, date_str)
            print(f"> {message}")

        elif choice == "2":
            expenses = tracker.get_all_expenses()
            if not expenses:
                print("\nNo expenses recorded yet.")
            else:
                print("\nID | Date       | Category       | Amount   | Description")
                print("-" * 60)
                for e in expenses:
                    print(f"{e['id']:<2} | {e['date']} | {e['category']:<14} | Rs{e['amount']:<7.2f} | {e['description']}")

        elif choice == "3":
            summary = tracker.get_summary()
            print(f"\nTotal Overall Spent: Rs{summary['total']:.2f}")
            print("Category Breakdown:")
            for cat, amt in summary["categories"].items():
                print(f"  - {cat}: Rs{amt:.2f}")

        elif choice == "4":
            expense_id = input("Enter Expense ID to delete: ")
            if expense_id.isdigit() and tracker.delete_expense(int(expense_id)):
                print("> Expense deleted successfully.")
            else:
                print("> Expense ID not found or invalid.")

        elif choice == "5":
            print("Goodbye!")
            break
        else:
            print("Invalid selection. Try again.")

if __name__ == "__main__":
    main()