import { Algorithm, hash, verify } from "@node-rs/argon2";

const passwordOptions = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
};

const dummyPasswordHash = hash("holistic-mind-dummy-password", passwordOptions);

export function hashPassword(password: string) {
  return hash(password, passwordOptions);
}

export function verifyPassword(passwordHash: string, password: string) {
  return verify(passwordHash, password);
}

export async function performDummyPasswordCheck(password: string) {
  await verify(await dummyPasswordHash, password);
}
