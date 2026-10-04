import webbrowser
from threading import Timer
from flask import Flask, render_template, request, redirect, url_for
import tracker

app = Flask(__name__)

@app.route('/')
def home():
    expenses = tracker.get_all_expenses()
    summary = tracker.get_summary()
    return render_template('front.html', expenses=expenses, summary=summary)

@app.route('/add', methods=['POST'])
def add():
    amount = request.form.get('amount', '')
    category = request.form.get('category', '')
    description = request.form.get('description', '')
    date_str = request.form.get('date', '')

    tracker.add_expense(amount, category, description, date_str)
    return redirect(url_for('home'))

@app.route('/delete/<int:expense_id>', methods=['POST'])
def delete(expense_id):
    tracker.delete_expense(expense_id)
    return redirect(url_for('home'))

def open_browser():
    webbrowser.open_new('http://127.0.0.1:5000')

if __name__ == '__main__':
    Timer(1.0, open_browser).start()
    app.run(port=5000, debug=False)