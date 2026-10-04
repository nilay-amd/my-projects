from flask import Flask, render_template, request, redirect, url_for
import contacts

app = Flask(__name__)

@app.route('/')
def home():
    saved_contacts = contacts.get_all_contacts()
    return render_template('front.html', contacts=saved_contacts)

@app.route('/add', methods=['POST'])
def add():
    name = request.form.get('name', '').strip()
    phone = request.form.get('phone', '').strip()
    email = request.form.get('email', '').strip()

    contacts.add_contact_web(name, phone, email)
    return redirect(url_for('home'))

@app.route('/search', methods=['GET'])
def search():
    query = request.args.get('query', '').strip()
    filtered = contacts.search_contacts_web(query)
    return render_template('front.html', contacts=filtered, search_query=query)

@app.route('/delete', methods=['POST'])
def delete():
    name = request.form.get('name', '').strip()
    contacts.delete_contact_web(name)
    return redirect(url_for('home'))

if __name__ == '__main__':
    app.run(debug=True)