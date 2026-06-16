export type StubUser = {
  id: string;
  username: string;
  email: string;
  password: string;
  avatarUrl?: string;
};

/** Safe user type (without password) — used by both client and server */
export type User = {
  id: string;
  username: string;
  email: string;
};

const stubUsers: StubUser[] = [
  {
    id: "1",
    username: "Demo User",
    email: "demo@mathdemos.com",
    password: "demo123",
  },
];

export function findUserByCredentials(
  email: string,
  password: string
): StubUser | null {
  return (
    stubUsers.find(
      (u) => u.email === email && u.password === password
    ) ?? null
  );
}

export function findUserByEmail(email: string): StubUser | null {
  return stubUsers.find((u) => u.email === email) ?? null;
}

export function toSafeUser(user: StubUser): User {
  return { id: user.id, username: user.username, email: user.email };
}
