from App import create_app
from App.Models.UserModel import User
from App.Extension import db
from werkzeug.security import generate_password_hash

app = create_app()
with app.app_context():
    user = User.query.filter_by(email='admin_caretaker@example.com').first()
    
    if not user:
        user = User(
            name='Admin Caretaker',
            email='admin_caretaker@example.com',
            password=generate_password_hash('password123'),
            phone='0712345678',
            role='admin',
            secondary_role='caretaker',
            active=True
        )
        db.session.add(user)
        db.session.commit()
        print('✅ User created successfully!')
    else:
        user.secondary_role = 'caretaker'
        user.role = 'admin'
        db.session.commit()
        print('✅ User updated successfully!')
    
    print(f'Email: {user.email}')
    print(f'Role: {user.role}')
    print(f'Secondary Role: {user.secondary_role}')
