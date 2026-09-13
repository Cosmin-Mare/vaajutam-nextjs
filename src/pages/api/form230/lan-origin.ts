import type { NextApiRequest, NextApiResponse } from "next";
import os from "os";

function lanOrigin(port: string): string | null {
  const nets = os.networkInterfaces();
  for (const addrs of Object.values(nets)) {
    for (const a of addrs ?? []) {
      const family = String(a.family);
      if (family !== "IPv4" && family !== "4") continue;
      if (a.internal) continue;
      if (a.address.startsWith("169.254.")) continue;
      return `http://${a.address}:${port}`;
    }
  }
  return null;
}

/** Dev helper: phone QR must not use localhost. */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ origin: null });
  }
  const host = req.headers.host ?? "localhost:3000";
  const port = host.includes(":") ? host.split(":").pop()! : "3000";
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ origin: lanOrigin(port) });
}
