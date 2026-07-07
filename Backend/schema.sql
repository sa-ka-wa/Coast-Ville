-- Connect to property_management database
\c property_management;

-- ============================================================
-- 1. USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(15),
    role VARCHAR(20) DEFAULT 'caretaker' CHECK (role IN ('admin', 'caretaker')),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. PROPERTIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS properties (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address TEXT,
    city VARCHAR(50),
    county VARCHAR(50),
    total_units INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    owner_name VARCHAR(100),
    owner_phone VARCHAR(15),
    owner_email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 3. UNITS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS units (
    id SERIAL PRIMARY KEY,
    property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
    unit_number VARCHAR(20) NOT NULL,
    floor VARCHAR(10),
    unit_type VARCHAR(20) CHECK (unit_type IN ('Studio', '1BR', '2BR', '3BR', 'Penthouse')),
    monthly_rent DECIMAL(10,2),
    deposit DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance')),
    size_sqft INTEGER,
    bedrooms INTEGER,
    bathrooms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(property_id, unit_number)
);

-- ============================================================
-- 4. TENANTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS tenants (
    id SERIAL PRIMARY KEY,
    property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
    unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(15),
    email VARCHAR(100),
    id_number VARCHAR(20),
    monthly_rent DECIMAL(10,2),
    deposit DECIMAL(10,2),
    balance DECIMAL(10,2) DEFAULT 0,
    move_in_date DATE,
    move_out_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'vacating', 'vacated')),
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(15),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 5. PAYMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    receipt_no VARCHAR(50) UNIQUE,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    payment_method VARCHAR(20) CHECK (payment_method IN ('mpesa', 'cash', 'bank', 'cheque')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
    mpesa_code VARCHAR(50),
    phone_number VARCHAR(20),
    merchant_request_id VARCHAR(50),
    checkout_request_id VARCHAR(50),
    mpesa_receipt_number VARCHAR(50),
    transaction_id VARCHAR(50),
    result_code VARCHAR(10),
    result_description VARCHAR(255),
    payment_for_month DATE,
    completed_at TIMESTAMP,
    failed_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 6. WATER READINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS water_readings (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    previous_reading DECIMAL(10,2),
    current_reading DECIMAL(10,2),
    units_used DECIMAL(10,2),
    rate DECIMAL(10,2) DEFAULT 70,
    amount DECIMAL(10,2),
    reading_date DATE,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'billed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 7. WATER BILLS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS water_bills (
    id SERIAL PRIMARY KEY,
    property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL,
    month DATE,
    water_charge DECIMAL(10,2),
    garbage_charge DECIMAL(10,2) DEFAULT 300,
    total DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 8. EXPENSES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
    category VARCHAR(50),
    description TEXT,
    amount DECIMAL(10,2),
    expense_date DATE,
    receipt_no VARCHAR(50),
    vendor_name VARCHAR(100),
    notes TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 9. NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    type VARCHAR(50) CHECK (type IN ('rent_due', 'payment_confirmed', 'water_bill', 'general')),
    title VARCHAR(100),
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    sent_via VARCHAR(20) CHECK (sent_via IN ('whatsapp', 'sms', 'email', 'in_app')),
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(active);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_city ON properties(city);
CREATE INDEX IF NOT EXISTS idx_units_property_id ON units(property_id);
CREATE INDEX IF NOT EXISTS idx_units_status ON units(status);
CREATE INDEX IF NOT EXISTS idx_tenants_property_id ON tenants(property_id);
CREATE INDEX IF NOT EXISTS idx_tenants_unit_id ON tenants(unit_id);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_phone ON tenants(phone);
CREATE INDEX IF NOT EXISTS idx_payments_property_id ON payments(property_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_receipt_no ON payments(receipt_no);
CREATE INDEX IF NOT EXISTS idx_payments_checkout_request_id ON payments(checkout_request_id);
CREATE INDEX IF NOT EXISTS idx_water_readings_tenant_id ON water_readings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_water_readings_reading_date ON water_readings(reading_date);
CREATE INDEX IF NOT EXISTS idx_water_bills_property_id ON water_bills(property_id);
CREATE INDEX IF NOT EXISTS idx_water_bills_tenant_id ON water_bills(tenant_id);
CREATE INDEX IF NOT EXISTS idx_expenses_property_id ON expenses(property_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_id ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- ============================================================
-- INSERT SAMPLE DATA
-- ============================================================

INSERT INTO users (name, email, password, phone, role) VALUES
('Admin User', 'admin@example.com', 'password123', '0712345678', 'admin'),
('Caretaker User', 'caretaker@example.com', 'password123', '0723456789', 'caretaker')
ON CONFLICT (email) DO NOTHING;

INSERT INTO properties (name, address, city, county, total_units, status) VALUES
('Sunset Apartments', '123 Mombasa Road', 'Nairobi', 'Nairobi', 48, 'active'),
('Ocean View Villas', '456 Beach Road', 'Mombasa', 'Mombasa', 24, 'active'),
('Green Valley Estate', '789 Valley Road', 'Nakuru', 'Nakuru', 36, 'active')
ON CONFLICT DO NOTHING;

INSERT INTO units (property_id, unit_number, floor, unit_type, monthly_rent, deposit, status) VALUES
(1, 'A01', '1', '1BR', 12000, 12000, 'available'),
(1, 'A02', '1', '1BR', 12000, 12000, 'available'),
(1, 'A03', '1', '2BR', 15000, 15000, 'occupied'),
(1, 'A04', '1', '2BR', 15000, 15000, 'available'),
(1, 'B01', '2', '2BR', 16000, 16000, 'available'),
(1, 'B02', '2', '2BR', 16000, 16000, 'available'),
(1, 'B03', '2', '3BR', 20000, 20000, 'occupied'),
(1, 'C01', '3', 'Studio', 8000, 8000, 'available'),
(1, 'C02', '3', 'Studio', 8000, 8000, 'available')
ON CONFLICT DO NOTHING;

INSERT INTO tenants (property_id, unit_id, name, phone, email, monthly_rent, move_in_date, status) VALUES
(1, 3, 'John Mwangi', '0712345678', 'john@example.com', 15000, '2024-01-15', 'active'),
(1, 7, 'Mary Wanjiku', '0723456789', 'mary@example.com', 20000, '2024-02-01', 'active')
ON CONFLICT DO NOTHING;

INSERT INTO payments (property_id, tenant_id, unit_id, amount, receipt_no, payment_method, status, payment_date, payment_for_month) VALUES
(1, 1, 3, 15000, 'RCP-20260115-001', 'mpesa', 'paid', '2026-01-15 10:00:00', '2026-01-01'),
(1, 1, 3, 15000, 'RCP-20260215-002', 'mpesa', 'paid', '2026-02-15 10:00:00', '2026-02-01'),
(1, 2, 7, 20000, 'RCP-20260201-003', 'cash', 'paid', '2026-02-01 10:00:00', '2026-02-01')
ON CONFLICT DO NOTHING;

INSERT INTO water_readings (tenant_id, previous_reading, current_reading, units_used, rate, amount, reading_date) VALUES
(1, 2450, 2478, 28, 70, 1960, '2026-06-01'),
(2, 1890, 1915, 25, 70, 1750, '2026-06-01')
ON CONFLICT DO NOTHING;

INSERT INTO water_bills (property_id, tenant_id, unit_id, month, water_charge, garbage_charge, total) VALUES
(1, 1, 3, '2026-06-01', 1960, 300, 2260),
(1, 2, 7, '2026-06-01', 1750, 300, 2050)
ON CONFLICT DO NOTHING;

INSERT INTO expenses (property_id, category, description, amount, expense_date, status) VALUES
(1, 'repairs', 'Fixed leaking pipe in Block A', 3500, '2026-06-05', 'approved'),
(1, 'cleaning', 'Monthly cleaning supplies', 2500, '2026-06-03', 'pending')
ON CONFLICT DO NOTHING;

-- ============================================================
-- CREATE VIEWS
-- ============================================================

CREATE OR REPLACE VIEW property_summary AS
SELECT 
    p.id,
    p.name,
    p.address,
    p.total_units,
    COUNT(DISTINCT u.id) as units_count,
    COUNT(DISTINCT t.id) as tenants_count,
    COALESCE(SUM(t.monthly_rent), 0) as total_rent,
    COALESCE(SUM(pay.amount), 0) as total_collected
FROM properties p
LEFT JOIN units u ON u.property_id = p.id
LEFT JOIN tenants t ON t.property_id = p.id AND t.status = 'active'
LEFT JOIN payments pay ON pay.property_id = p.id AND pay.status = 'paid'
GROUP BY p.id;

CREATE OR REPLACE VIEW tenant_payment_summary AS
SELECT 
    t.id,
    t.name,
    t.unit_id,
    t.monthly_rent,
    COALESCE(SUM(p.amount), 0) as total_paid,
    t.monthly_rent - COALESCE(SUM(p.amount), 0) as balance,
    COUNT(p.id) as payment_count,
    MAX(p.payment_date) as last_payment_date
FROM tenants t
LEFT JOIN payments p ON p.tenant_id = t.id AND p.status = 'paid'
GROUP BY t.id;

-- ============================================================
-- CREATE TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_properties_updated_at ON properties;
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- CREATE FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION get_tenant_balance(tenant_id INTEGER)
RETURNS DECIMAL AS $$
DECLARE
    total_paid DECIMAL;
    total_rent DECIMAL;
BEGIN
    SELECT COALESCE(SUM(amount), 0) INTO total_paid
    FROM payments
    WHERE tenant_id = $1 AND status = 'paid';
    
    SELECT monthly_rent INTO total_rent
    FROM tenants
    WHERE id = $1;
    
    RETURN total_rent - total_paid;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_occupancy_rate(property_id INTEGER)
RETURNS DECIMAL AS $$
DECLARE
    total_units INTEGER;
    occupied_units INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_units
    FROM units
    WHERE property_id = $1;
    
    SELECT COUNT(*) INTO occupied_units
    FROM units
    WHERE property_id = $1 AND status = 'occupied';
    
    IF total_units = 0 THEN
        RETURN 0;
    END IF;
    
    RETURN (occupied_units::DECIMAL / total_units::DECIMAL) * 100;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- VERIFY TABLES CREATED
-- ============================================================
SELECT '✅ Tables created successfully!' as status;
\dt
EOF# Create the schema file
cat > schema.sql << 'EOF'
-- Connect to property_management database
\c property_management;

-- ============================================================
-- 1. USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(15),
    role VARCHAR(20) DEFAULT 'caretaker' CHECK (role IN ('admin', 'caretaker')),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. PROPERTIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS properties (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address TEXT,
    city VARCHAR(50),
    county VARCHAR(50),
    total_units INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    owner_name VARCHAR(100),
    owner_phone VARCHAR(15),
    owner_email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 3. UNITS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS units (
    id SERIAL PRIMARY KEY,
    property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
    unit_number VARCHAR(20) NOT NULL,
    floor VARCHAR(10),
    unit_type VARCHAR(20) CHECK (unit_type IN ('Studio', '1BR', '2BR', '3BR', 'Penthouse')),
    monthly_rent DECIMAL(10,2),
    deposit DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance')),
    size_sqft INTEGER,
    bedrooms INTEGER,
    bathrooms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(property_id, unit_number)
);

-- ============================================================
-- 4. TENANTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS tenants (
    id SERIAL PRIMARY KEY,
    property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
    unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(15),
    email VARCHAR(100),
    id_number VARCHAR(20),
    monthly_rent DECIMAL(10,2),
    deposit DECIMAL(10,2),
    balance DECIMAL(10,2) DEFAULT 0,
    move_in_date DATE,
    move_out_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'vacating', 'vacated')),
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(15),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 5. PAYMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    receipt_no VARCHAR(50) UNIQUE,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    payment_method VARCHAR(20) CHECK (payment_method IN ('mpesa', 'cash', 'bank', 'cheque')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
    mpesa_code VARCHAR(50),
    phone_number VARCHAR(20),
    merchant_request_id VARCHAR(50),
    checkout_request_id VARCHAR(50),
    mpesa_receipt_number VARCHAR(50),
    transaction_id VARCHAR(50),
    result_code VARCHAR(10),
    result_description VARCHAR(255),
    payment_for_month DATE,
    completed_at TIMESTAMP,
    failed_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 6. WATER READINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS water_readings (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    previous_reading DECIMAL(10,2),
    current_reading DECIMAL(10,2),
    units_used DECIMAL(10,2),
    rate DECIMAL(10,2) DEFAULT 70,
    amount DECIMAL(10,2),
    reading_date DATE,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'billed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 7. WATER BILLS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS water_bills (
    id SERIAL PRIMARY KEY,
    property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL,
    month DATE,
    water_charge DECIMAL(10,2),
    garbage_charge DECIMAL(10,2) DEFAULT 300,
    total DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 8. EXPENSES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
    category VARCHAR(50),
    description TEXT,
    amount DECIMAL(10,2),
    expense_date DATE,
    receipt_no VARCHAR(50),
    vendor_name VARCHAR(100),
    notes TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 9. NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    type VARCHAR(50) CHECK (type IN ('rent_due', 'payment_confirmed', 'water_bill', 'general')),
    title VARCHAR(100),
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    sent_via VARCHAR(20) CHECK (sent_via IN ('whatsapp', 'sms', 'email', 'in_app')),
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(active);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_city ON properties(city);
CREATE INDEX IF NOT EXISTS idx_units_property_id ON units(property_id);
CREATE INDEX IF NOT EXISTS idx_units_status ON units(status);
CREATE INDEX IF NOT EXISTS idx_tenants_property_id ON tenants(property_id);
CREATE INDEX IF NOT EXISTS idx_tenants_unit_id ON tenants(unit_id);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_phone ON tenants(phone);
CREATE INDEX IF NOT EXISTS idx_payments_property_id ON payments(property_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_receipt_no ON payments(receipt_no);
CREATE INDEX IF NOT EXISTS idx_payments_checkout_request_id ON payments(checkout_request_id);
CREATE INDEX IF NOT EXISTS idx_water_readings_tenant_id ON water_readings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_water_readings_reading_date ON water_readings(reading_date);
CREATE INDEX IF NOT EXISTS idx_water_bills_property_id ON water_bills(property_id);
CREATE INDEX IF NOT EXISTS idx_water_bills_tenant_id ON water_bills(tenant_id);
CREATE INDEX IF NOT EXISTS idx_expenses_property_id ON expenses(property_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_id ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- ============================================================
-- INSERT SAMPLE DATA
-- ============================================================

INSERT INTO users (name, email, password, phone, role) VALUES
('Admin User', 'admin@example.com', 'password123', '0712345678', 'admin'),
('Caretaker User', 'caretaker@example.com', 'password123', '0723456789', 'caretaker')
ON CONFLICT (email) DO NOTHING;

INSERT INTO properties (name, address, city, county, total_units, status) VALUES
('Sunset Apartments', '123 Mombasa Road', 'Nairobi', 'Nairobi', 48, 'active'),
('Ocean View Villas', '456 Beach Road', 'Mombasa', 'Mombasa', 24, 'active'),
('Green Valley Estate', '789 Valley Road', 'Nakuru', 'Nakuru', 36, 'active')
ON CONFLICT DO NOTHING;

INSERT INTO units (property_id, unit_number, floor, unit_type, monthly_rent, deposit, status) VALUES
(1, 'A01', '1', '1BR', 12000, 12000, 'available'),
(1, 'A02', '1', '1BR', 12000, 12000, 'available'),
(1, 'A03', '1', '2BR', 15000, 15000, 'occupied'),
(1, 'A04', '1', '2BR', 15000, 15000, 'available'),
(1, 'B01', '2', '2BR', 16000, 16000, 'available'),
(1, 'B02', '2', '2BR', 16000, 16000, 'available'),
(1, 'B03', '2', '3BR', 20000, 20000, 'occupied'),
(1, 'C01', '3', 'Studio', 8000, 8000, 'available'),
(1, 'C02', '3', 'Studio', 8000, 8000, 'available')
ON CONFLICT DO NOTHING;

INSERT INTO tenants (property_id, unit_id, name, phone, email, monthly_rent, move_in_date, status) VALUES
(1, 3, 'John Mwangi', '0712345678', 'john@example.com', 15000, '2024-01-15', 'active'),
(1, 7, 'Mary Wanjiku', '0723456789', 'mary@example.com', 20000, '2024-02-01', 'active')
ON CONFLICT DO NOTHING;

INSERT INTO payments (property_id, tenant_id, unit_id, amount, receipt_no, payment_method, status, payment_date, payment_for_month) VALUES
(1, 1, 3, 15000, 'RCP-20260115-001', 'mpesa', 'paid', '2026-01-15 10:00:00', '2026-01-01'),
(1, 1, 3, 15000, 'RCP-20260215-002', 'mpesa', 'paid', '2026-02-15 10:00:00', '2026-02-01'),
(1, 2, 7, 20000, 'RCP-20260201-003', 'cash', 'paid', '2026-02-01 10:00:00', '2026-02-01')
ON CONFLICT DO NOTHING;

INSERT INTO water_readings (tenant_id, previous_reading, current_reading, units_used, rate, amount, reading_date) VALUES
(1, 2450, 2478, 28, 70, 1960, '2026-06-01'),
(2, 1890, 1915, 25, 70, 1750, '2026-06-01')
ON CONFLICT DO NOTHING;

INSERT INTO water_bills (property_id, tenant_id, unit_id, month, water_charge, garbage_charge, total) VALUES
(1, 1, 3, '2026-06-01', 1960, 300, 2260),
(1, 2, 7, '2026-06-01', 1750, 300, 2050)
ON CONFLICT DO NOTHING;

INSERT INTO expenses (property_id, category, description, amount, expense_date, status) VALUES
(1, 'repairs', 'Fixed leaking pipe in Block A', 3500, '2026-06-05', 'approved'),
(1, 'cleaning', 'Monthly cleaning supplies', 2500, '2026-06-03', 'pending')
ON CONFLICT DO NOTHING;

-- ============================================================
-- CREATE VIEWS
-- ============================================================

CREATE OR REPLACE VIEW property_summary AS
SELECT 
    p.id,
    p.name,
    p.address,
    p.total_units,
    COUNT(DISTINCT u.id) as units_count,
    COUNT(DISTINCT t.id) as tenants_count,
    COALESCE(SUM(t.monthly_rent), 0) as total_rent,
    COALESCE(SUM(pay.amount), 0) as total_collected
FROM properties p
LEFT JOIN units u ON u.property_id = p.id
LEFT JOIN tenants t ON t.property_id = p.id AND t.status = 'active'
LEFT JOIN payments pay ON pay.property_id = p.id AND pay.status = 'paid'
GROUP BY p.id;

CREATE OR REPLACE VIEW tenant_payment_summary AS
SELECT 
    t.id,
    t.name,
    t.unit_id,
    t.monthly_rent,
    COALESCE(SUM(p.amount), 0) as total_paid,
    t.monthly_rent - COALESCE(SUM(p.amount), 0) as balance,
    COUNT(p.id) as payment_count,
    MAX(p.payment_date) as last_payment_date
FROM tenants t
LEFT JOIN payments p ON p.tenant_id = t.id AND p.status = 'paid'
GROUP BY t.id;

-- ============================================================
-- CREATE TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_properties_updated_at ON properties;
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- CREATE FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION get_tenant_balance(tenant_id INTEGER)
RETURNS DECIMAL AS $$
DECLARE
    total_paid DECIMAL;
    total_rent DECIMAL;
BEGIN
    SELECT COALESCE(SUM(amount), 0) INTO total_paid
    FROM payments
    WHERE tenant_id = $1 AND status = 'paid';
    
    SELECT monthly_rent INTO total_rent
    FROM tenants
    WHERE id = $1;
    
    RETURN total_rent - total_paid;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_occupancy_rate(property_id INTEGER)
RETURNS DECIMAL AS $$
DECLARE
    total_units INTEGER;
    occupied_units INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_units
    FROM units
    WHERE property_id = $1;
    
    SELECT COUNT(*) INTO occupied_units
    FROM units
    WHERE property_id = $1 AND status = 'occupied';
    
    IF total_units = 0 THEN
        RETURN 0;
    END IF;
    
    RETURN (occupied_units::DECIMAL / total_units::DECIMAL) * 100;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- VERIFY TABLES CREATED
-- ============================================================
SELECT '✅ Tables created successfully!' as status;
\dt
