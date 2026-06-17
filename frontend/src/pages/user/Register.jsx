import React, { useState } from "react";
import API from "../../config/api";
import { storeAuth } from "../../config/auth";
import { useNavigate, Link } from "react-router-dom";

export default function Register({ onAuth }) {
  const [name, setName] = useState("");
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      const res = await API.post("/user/register", {
        name,
        user_id: userId,
        email,
        password,
      });

      const { token, user } = res.data;
      storeAuth(user, token);
      if (onAuth) onAuth(user);

      navigate("/dashboard"); // ✅ after register → dashboard
    } catch (err) {
      setMsg(err.response?.data?.message || "Register failed");
    } finally {
      setLoading(false);
    }
  };

return (
  <div className="flex items-center justify-center">
    <div className="w-full max-w-lg bg-[#020617] border border-white/10 rounded-xl shadow-xl p-8">

      <h2 className="text-2xl font-semibold mb-2 text-center text-white">
        Create Account
      </h2>
      <p className="text-sm text-gray-400 text-center mb-6">
        Add a new user to the system
      </p>

      {msg && (
        <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/30 px-4 py-2 rounded-lg">
          {msg}
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        <input
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full bg-[#0f172a] border border-white/10 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <input
          type="text"
          placeholder="User ID"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          required
          className="w-full bg-[#0f172a] border border-white/10 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full bg-[#0f172a] border border-white/10 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full bg-[#0f172a] border border-white/10 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-semibold transition disabled:opacity-60"
        >
          {loading ? "Creating account..." : "Create User"}
        </button>
      </form>

    </div>
  </div>
);
}