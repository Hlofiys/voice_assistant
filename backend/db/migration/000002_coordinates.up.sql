CREATE Table locations (
    id SERIAL PRIMARY KEY,
    text VARCHAR(255) NOT NULL,
    pharmacy_number VARCHAR(20) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    pharmacy_name VARCHAR(255) NOT NULL,
    location GEOMETRY(Point, 4326) NOT NULL
);