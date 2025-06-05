-- name: GetNearestPharmacy :many
SELECT id, text, ST_AsText(location) AS location_wkt
		FROM locations
		ORDER BY location <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)
		LIMIT 3;

-- name: CheckPharmacyByNumber :one
SELECT EXISTS (
  SELECT 1 FROM locations WHERE pharmacy_number = $1
);

-- name: CheckPharmacyByPhone :one
SELECT EXISTS (
  SELECT 1 FROM locations WHERE phone = $1
);

-- name: CheckPharmacyByName :one
SELECT EXISTS (
  SELECT 1 FROM locations WHERE pharmacy_name ILIKE $1
);