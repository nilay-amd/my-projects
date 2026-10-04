from datetime import datetime
import storage
import validators

def add_expense(amount, category, description, date_str=""):
    if not validators.is_valid_amount(amount):
        return False, "Amount must be a positive number."
    
    if not date_str or date_str.strip() == "":
        date_str = datetime.now().strftime("%Y-%m-%d")
    elif not validators.is_valid_date(date_str):
        return False, "Invalid date format. Use YYYY-MM-DD."

    expenses = storage.load_expenses()
    
    # Generate incremental unique ID
    new_id = 1 if not expenses else max(e["id"] for e in expenses) + 1
    
    new_expense = {
        "id": new_id,
        "amount": round(float(amount), 2),
        "category": category.strip().title() if category.strip() else "Uncategorized",
        "description": description.strip() if description.strip() else "No Description",
        "date": date_str
    }
    
    expenses.append(new_expense)
    storage.save_expenses(expenses)
    return True, "Expense added successfully!"

def get_all_expenses():
    return storage.load_expenses()

def delete_expense(expense_id):
    expenses = storage.load_expenses()
    filtered_expenses = [e for e in expenses if e["id"] != int(expense_id)]
    
    if len(filtered_expenses) < len(expenses):
        storage.save_expenses(filtered_expenses)
        return True
    return False

def get_summary():
    expenses = storage.load_expenses()
    total = sum(e["amount"] for e in expenses)
    
    category_totals = {}
    for e in expenses:
        cat = e["category"]
        category_totals[cat] = round(category_totals.get(cat, 0) + e["amount"], 2)
        
    return {
        "total": round(total, 2),
        "categories": category_totals
    }