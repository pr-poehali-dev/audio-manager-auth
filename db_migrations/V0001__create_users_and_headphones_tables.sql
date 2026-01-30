
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    yandex_id VARCHAR(255) UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS headphones (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    device_name VARCHAR(255) NOT NULL,
    device_id VARCHAR(255) NOT NULL,
    last_connected TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT false,
    eq_bass INTEGER DEFAULT 50,
    eq_mid INTEGER DEFAULT 50,
    eq_treble INTEGER DEFAULT 50,
    sound_mode VARCHAR(50) DEFAULT 'normal',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS battery_history (
    id SERIAL PRIMARY KEY,
    headphone_id INTEGER REFERENCES headphones(id),
    battery_level INTEGER NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS usage_history (
    id SERIAL PRIMARY KEY,
    headphone_id INTEGER REFERENCES headphones(id),
    duration_minutes INTEGER NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_yandex_id ON users(yandex_id);
CREATE INDEX IF NOT EXISTS idx_headphones_user_id ON headphones(user_id);
CREATE INDEX IF NOT EXISTS idx_battery_history_headphone_id ON battery_history(headphone_id);
CREATE INDEX IF NOT EXISTS idx_usage_history_headphone_id ON usage_history(headphone_id);
