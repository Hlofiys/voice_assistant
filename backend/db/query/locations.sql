-- name: GetNearestPharmacy :one
SELECT id, text, ST_AsText(location) AS location_wkt
		FROM locations
		ORDER BY location <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)
		LIMIT 1;