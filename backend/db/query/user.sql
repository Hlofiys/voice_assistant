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
WITH updated_rows AS (
    UPDATE users
    SET refresh_token = NULL, expired_at = NULL 
    WHERE refresh_token = $1 
      AND expired_at IS NOT NULL 
      AND $2 <= expired_at     
    RETURNING 1
)
SELECT EXISTS (SELECT 1 FROM updated_rows);

-- name: UpdateRefreshToken :exec
UPDATE users
SET refresh_token = $1, expired_at = $2
WHERE user_id = $3;

-- name: GetUserByEmailAndPassword :one
SELECT user_id
FROM users
WHERE email = $1 AND password = $2;

-- name: GetPasswordByEmail :one
SELECT password
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
