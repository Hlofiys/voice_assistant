CREATE Table locations (
    id SERIAL PRIMARY KEY,
    text VARCHAR(255) NOT NULL,
    location GEOMETRY(Point, 4326) NOT NULL
);