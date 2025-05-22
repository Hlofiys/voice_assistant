-- name: CreateUser :exec
INSERT INTO users (
    user_id,
    email,
    password,
    code
)VALUES(
    $1,$2,$3,$4
);

-- name: VerifyRefreshToken :one
WITH updated_user AS (
    UPDATE users
    SET refresh_token = NULL, expired_at = NULL 
    WHERE refresh_token = $1 
      AND expired_at IS NOT NULL 
      AND $2 <= expired_at     
    RETURNING user_id
)
SELECT user_id FROM updated_user;

-- name: UpdateRefreshToken :exec
UPDATE users
SET refresh_token = $1, expired_at = $2
WHERE user_id = $3;

-- name: GetUserAuthDetailsByEmail :one
SELECT user_id, password, code
FROM users
WHERE email = $1;

-- name: LogoutById :exec
UPDATE users
SET refresh_token = NULL, expired_at = NULL
WHERE user_id = $1;

-- name: UpdateCodeById :one
UPDATE users
SET code = NULL, refresh_token = $3, expired_at = $4
WHERE email = $1 AND code = $2
RETURNING user_id;
