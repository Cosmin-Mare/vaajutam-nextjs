import { Connection, Request, TYPES } from "tedious";
import type { Member, Post, Project } from "@/lib/types";
import { bufferToBinary } from "@/lib/cnp";

/** Next.js loads .env / .env.local into process.env; do not use `dotenv/config` (it only reads .env and can miss .env.local). */
function getEnv(key: string, ...fallbackKeys: string[]): string | undefined {
  const keys = [key, ...fallbackKeys];
  for (const k of keys) {
    const v = process.env[k];
    if (v !== undefined && v !== "") return v;
  }
  return undefined;
}

function getConfig(): ConstructorParameters<typeof Connection>[0] {
  const user = getEnv("DB_USER", "SQL_USER", "AZURE_SQL_USER", "sqlServerUser");
  const host = getEnv("DB_HOST", "SQL_SERVER", "SQLAZURE_SERVER", "AZURE_SQL_SERVER");
  const pass = getEnv("DB_PASSWORD", "SQL_PASSWORD", "SQLAZURE_PASSWORD", "AZURE_SQL_PASSWORD");
  if (!user || !host || !pass) {
    throw new Error(
      "Set DB_USER, DB_HOST, and DB_PASSWORD in .env.local (see .env.example). " +
        "Optional aliases: AZURE_SQL_USER, AZURE_SQL_SERVER, AZURE_SQL_PASSWORD."
    );
  }
  const database =
    getEnv("DB_NAME", "SQL_DATABASE", "AZURE_SQL_DATABASE") ??
    "vaajutamdindejdb_2024-09-04T17-01Z";
  const port = parseInt(getEnv("DB_PORT", "SQL_PORT") ?? "1433", 10);
  const userName =
    getEnv("DB_USER_NAME") ??
    (user!.includes("@") ? user! : `${user!}@${host!}`);

  // Azure SQL + Node often needs this for cert chain (especially outside Azure datacenter).
  const trustServerCertificate =
    getEnv("DB_TRUST_SERVER_CERT", "SQL_TRUST_SERVER_CERTIFICATE") === "1" ||
    getEnv("DB_TRUST_SERVER_CERT", "SQL_TRUST_SERVER_CERTIFICATE") === "true" ||
    process.env.NODE_ENV === "development";

  return {
    server: host!,
    authentication: {
      type: "default",
      options: {
        userName,
        password: pass!,
      },
    },
    options: {
      port,
      database,
      encrypt: getEnv("DB_ENCRYPT", "SQL_ENCRYPT") !== "0",
      trustServerCertificate,
      connectTimeout: parseInt(getEnv("DB_CONNECT_TIMEOUT_MS") ?? "30000", 10),
      requestTimeout: parseInt(getEnv("DB_REQUEST_TIMEOUT_MS") ?? "30000", 10),
    },
  };
}

function withConnection<T>(fn: (c: Connection) => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    let finished = false;
    const c = new Connection(getConfig());
    c.on("connect", (err) => {
      if (err) {
        if (!finished) {
          finished = true;
          c.close();
          if (process.env.DB_DEBUG === "1" || process.env.NODE_ENV === "development") {
            console.error("[db] connect error:", err.message);
          }
        }
        return reject(err);
      }
      void fn(c)
        .then((r) => {
          if (!finished) {
            finished = true;
            c.close();
            resolve(r);
          }
        })
        .catch((e) => {
          if (!finished) {
            finished = true;
            c.close();
            reject(e);
          }
        });
    });
    c.on("error", (e) => {
      if (!finished) {
        finished = true;
        if (process.env.DB_DEBUG === "1" || process.env.NODE_ENV === "development") {
          console.error("[db] connection error:", e.message);
        }
        c.close();
        reject(e);
      }
    });
    c.connect();
  });
}

export async function getPosts(): Promise<Post[]> {
  return withConnection(
    (c) =>
      new Promise((resolve, reject) => {
        const posts: Post[] = [];
        const r = new Request("SELECT * FROM VaAjutamDinDej.posts ORDER BY date DESC", (err) => {
          if (err) reject(err);
          else resolve(posts);
        });
        r.on("row", (cols) => {
          const id = cols[0]?.value as number;
          const rawDate = cols[3]?.value;
          const date =
            rawDate instanceof Date
              ? rawDate
              : rawDate
                ? new Date(rawDate as string)
                : new Date();
          posts.push({
            id,
            title: cols[1]?.value as string,
            content: cols[2]?.value as string,
            date,
            link: (cols[4]?.value as string) ?? "",
          });
        });
        c.execSql(r);
      })
  );
}

export async function getMembers(): Promise<Member[]> {
  return withConnection(
    (c) =>
      new Promise((resolve, reject) => {
        const members: Member[] = [];
        const r = new Request("SELECT * FROM VaAjutamDinDej.members_fb_link", (err) => {
          if (err) reject(err);
          else resolve(members);
        });
        r.on("row", (cols) => {
          const link = cols[4]?.value;
          members.push({
            id: cols[0]?.value as number,
            name: cols[1]?.value as string,
            status: cols[2]?.value as string,
            is_council: bufferToBinary(cols[3]?.value),
            link: link != null && link !== "" ? (link as string) : null,
          });
        });
        c.execSql(r);
      })
  );
}

export async function getProjects(): Promise<Project[]> {
  return withConnection(
    (c) =>
      new Promise((resolve, reject) => {
        const projects: Project[] = [];
        const r = new Request("SELECT * FROM VaAjutamDinDej.projects", (err) => {
          if (err) reject(err);
          else resolve(projects);
        });
        r.on("row", (cols) => {
          projects.push({
            id: cols[0]?.value as number,
            title: cols[1]?.value as string,
            content: cols[2]?.value as string,
            type: (cols[3]?.value as string) ?? "p",
          });
        });
        c.execSql(r);
      })
  );
}

export async function insertEmail(email: string): Promise<void> {
  if (!email.trim()) return;
  return withConnection(
    (c) =>
      new Promise((resolve, reject) => {
        const r = new Request(
          "INSERT INTO VaAjutamDinDej.emails (email) VALUES (@email)",
          (err) => (err ? reject(err) : resolve())
        );
        r.addParameter("email", TYPES.NVarChar, email.trim(), { length: 500 });
        c.execSql(r);
      })
  );
}

export function isDbConfigured(): boolean {
  const user = getEnv("DB_USER", "SQL_USER", "AZURE_SQL_USER");
  const host = getEnv("DB_HOST", "SQL_SERVER", "SQLAZURE_SERVER", "AZURE_SQL_SERVER");
  const pass = getEnv("DB_PASSWORD", "SQL_PASSWORD", "SQLAZURE_PASSWORD", "AZURE_SQL_PASSWORD");
  return Boolean(user && host && pass);
}
