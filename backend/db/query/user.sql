-- name: CreateUser :exec
INSERT INTO users (
    user_id,
    email,
    password,
    code,
    refresh_token,
    expired_at
)VALUES(
    $1,$2,$3,$4,$5,$6
);

-- name: VerifyRefreshToken :one
SELECT EXISTS (
    SELECT 1
    FROM users
    WHERE user_id = $1                               
      AND refresh_token = $2                         
      AND refresh_token IS NOT NULL                  
      AND expired_at IS NOT NULL                     
      AND $3 >= expired_at                           
      AND $3 <= expired_at + INTERVAL '1 month'      
);

-- name: UpdateRefreshToken :exec
UPDATE users
SET refresh_token = $1
WHERE user_id = $2;

-- name: LogoutById :exec
UPDATE users
SET refresh_token = NULL AND expired_at = NULL
WHERE user_id = $1;

-- name: UpdateCodeById :exec
UPDATE users
SET code = NULL
WHERE email = $1 AND code = $2;

