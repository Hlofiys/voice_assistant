CREATE Table users (
    user_id UUID PRIMARY KEY,
    email VARCHAR NOT NULL UNIQUE,
    password TEXT NOT NULL,
    code VARCHAR(8),
    refresh_token TEXT UNIQUE,
    expired_at TIMESTAMP
);