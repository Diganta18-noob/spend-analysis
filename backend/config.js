import "dotenv/config";

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32)
    throw new Error(
      "JWT_SECRET must be explicitly configured with at least 32 characters",
    );
  return secret;
}
