from App import create_app
from App.Extension import db
import sqlalchemy as sa

app = create_app()
with app.app_context():
    inspector = sa.inspect(db.engine)
    columns = [col['name'] for col in inspector.get_columns('payments')]
    
    # Columns to add
    new_columns = {
        'phone_number': 'VARCHAR(20)',
        'checkout_request_id': 'VARCHAR(50)',
        'merchant_request_id': 'VARCHAR(50)',
        'mpesa_receipt_number': 'VARCHAR(50)',
        'transaction_id': 'VARCHAR(50)',
        'result_code': 'VARCHAR(10)',
        'result_description': 'VARCHAR(255)',
        'completed_at': 'TIMESTAMP',
        'failed_at': 'TIMESTAMP'
    }
    
    print("Checking database columns...")
    for col_name, col_type in new_columns.items():
        if col_name not in columns:
            try:
                db.engine.execute(f'ALTER TABLE payments ADD COLUMN {col_name} {col_type}')
                print(f'✅ Added column: {col_name}')
            except Exception as e:
                print(f'❌ Failed to add {col_name}: {e}')
        else:
            print(f'✅ Column already exists: {col_name}')
    
    print('\n✅ Database update complete!')
