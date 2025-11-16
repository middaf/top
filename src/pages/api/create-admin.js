// ...existing code...
import { supabaseDb } from "../../database/supabaseUtils";

export default async function handler(req, res) {
  if (req.method === "GET") {
    return res
      .status(200)
      .json({ message: "POST to this endpoint to create an admin user" });
  }

  if (req.method !== "POST") {
    return res.status(405).end();
  }

  try {
    // Check for existing admin
    const { data: existingAdmin, error: checkError } = await supabaseDb.getAdminUser();
    
    if (!checkError && existingAdmin) {
      return res.status(200).json({ id: existingAdmin.id, existing: true });
    }

    const adminDoc = {
      name: "admin",
      password: "ChangeMe123!", // change this
      admin: true,
      email: "admin@example.com",
      idnum: 99999999,
      avatar: "avatar_1",
      balance: 0,
      date: new Date().toISOString().split("T")[0],
      bonus: 0,
      authStatus: "seen",
    };

    const { data: newAdmin, error: createError } = await supabaseDb.createUser(adminDoc);
    if (createError) throw createError;
    
    return res.status(200).json({ id: newAdmin.id, existing: false });
  } catch (err) {
    console.error("create-admin error:", err);
    return res.status(500).json({ error: err.message });
  }
}
// ...existing code...