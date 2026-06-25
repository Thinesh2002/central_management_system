import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  FileText,
  KeyRound,
  LayoutDashboard,
  Lock,
  RefreshCcw,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import api, { getApiError } from "../config/api";
import { getStoredUser } from "../config/auth";

function isLocked(user) {
  if (!user?.locked_until) return false;
  return new Date(user.locked_until) > new Date();
}

function formatDate(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return "-";
  }
}

function toArray(value) {
  if (Array.isArray(value)) return value;

  if (Array.isArray(value?.users)) return value.users;
  if (Array.isArray(value?.pages)) return value.pages;
  if (Array.isArray(value?.logs)) return value.logs;
  if (Array.isArray(value?.loginLogs)) return value.loginLogs;
  if (Array.isArray(value?.login_logs)) return value.login_logs;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.rows)) return value.rows;
  if (Array.isArray(value?.result)) return value.result;

  return [];
}

function StatCard({ title, value, icon: Icon, description, tone = "blue" }) {
  const toneClass = {
    blue: "border-blue-900 bg-blue-950/40 text-blue-300",
    emerald: "border-emerald-900 bg-emerald-950/40 text-emerald-300",
    amber: "border-amber-900 bg-amber-950/40 text-amber-300",
    red: "border-red-900 bg-red-950/40 text-red-300",
    slate: "border-slate-800 bg-slate-950 text-slate-300",
  }[tone];

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-400">{title}</p>
          <h3 className="mt-2 text-3xl font-bold text-white">{value}</h3>
          <p className="mt-2 text-xs text-slate-500">{description}</p>
        </div>

        <div className={`rounded-xl border p-3 ${toneClass}`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

function QuickLink({ to, icon: Icon, title, description }) {
  return (
    <Link
      to={to}
      className="group flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900 p-4 hover:border-blue-800 hover:bg-slate-800/80"
    >
      <div className="flex items-center gap-3">
        <div className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-blue-400">
          <Icon size={20} />
        </div>

        <div>
          <h4 className="font-bold text-white">{title}</h4>
          <p className="text-sm text-slate-400">{description}</p>
        </div>
      </div>

      <ArrowRight
        size={18}
        className="text-slate-500 group-hover:text-blue-400"
      />
    </Link>
  );
}

export default function Dashboard() {
  const currentUser = getStoredUser();

  const [users, setUsers] = useState([]);
  const [pages, setPages] = useState([]);
  const [logs, setLogs] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const results = await Promise.allSettled([
        api.get("/users"),
        api.get("/access/pages"),
        api.get("/logs"),
      ]);

      const usersResult = results[0];
      const pagesResult = results[1];
      const logsResult = results[2];

      if (usersResult.status === "fulfilled") {
        setUsers(toArray(usersResult.value?.data));
      } else {
        setUsers([]);
      }

      if (pagesResult.status === "fulfilled") {
        setPages(toArray(pagesResult.value?.data));
      } else {
        setPages([]);
      }

      if (logsResult.status === "fulfilled") {
        setLogs(toArray(logsResult.value?.data));
      } else {
        setLogs([]);
      }

      const failed = results.find((item) => item.status === "rejected");

      if (failed) {
        setError(getApiError(failed.reason));
      }
    } catch (err) {
      setError(getApiError(err));
      setUsers([]);
      setPages([]);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const safeUsers = Array.isArray(users) ? users : [];
  const safePages = Array.isArray(pages) ? pages : [];
  const safeLogs = Array.isArray(logs) ? logs : [];

  const stats = useMemo(() => {
    const totalUsers = safeUsers.length;

    const activeUsers = safeUsers.filter(
      (user) => user.status === "active"
    ).length;

    const adminUsers = safeUsers.filter(
      (user) => user.role === "admin" || user.role === "master_admin"
    ).length;

    const lockedUsers = safeUsers.filter((user) => isLocked(user)).length;

    const failedAttempts = safeUsers.reduce(
      (total, user) => total + Number(user.failed_login_attempts || 0),
      0
    );

    return {
      totalUsers,
      activeUsers,
      adminUsers,
      lockedUsers,
      failedAttempts,
      totalPages: safePages.length,
    };
  }, [safeUsers, safePages]);

  const recentUsers = safeUsers.slice(0, 5);
  const recentLogs = safeLogs.slice(0, 6);

  return (
    <div className="min-h-full w-full bg-slate-950 text-slate-100">
      <div className="w-full border-b border-slate-800 bg-slate-900 px-5 py-4">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <LayoutDashboard size={24} className="text-blue-400" />
              <h2 className="text-2xl font-bold text-white">Dashboard</h2>
            </div>

            <p className="mt-1 text-sm text-slate-400">
              Welcome back,{" "}
              <span className="font-semibold text-slate-200">
                {currentUser?.user_uid || currentUser?.name || "User"}
              </span>
              . Manage users, page access and login security.
            </p>
          </div>

          <button
            type="button"
            onClick={loadDashboard}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-5 mt-4 rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm font-semibold text-red-300">
          {error}
        </div>
      )}

      <div className="w-full space-y-5 p-5">
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Users"
            value={stats.totalUsers}
            icon={Users}
            description="All created system users"
            tone="blue"
          />

          <StatCard
            title="Active Users"
            value={stats.activeUsers}
            icon={UserCheck}
            description="Users allowed to login"
            tone="emerald"
          />

          <StatCard
            title="Admin Users"
            value={stats.adminUsers}
            icon={ShieldCheck}
            description="Master Admin and Admin users"
            tone="amber"
          />

          <StatCard
            title="Locked Users"
            value={stats.lockedUsers}
            icon={Lock}
            description="Locked because of failed login"
            tone={stats.lockedUsers > 0 ? "red" : "slate"}
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-white">
                  System Overview
                </h3>
                <p className="text-sm text-slate-400">
                  Current authentication and page access summary.
                </p>
              </div>

              <Activity size={20} className="text-blue-400" />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-sm font-semibold text-slate-400">
                  Created Pages
                </p>
                <h4 className="mt-2 text-2xl font-bold text-white">
                  {stats.totalPages}
                </h4>
                <p className="mt-1 text-xs text-slate-500">
                  Pages available for access control
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-sm font-semibold text-slate-400">
                  Failed Attempts
                </p>
                <h4 className="mt-2 text-2xl font-bold text-white">
                  {stats.failedAttempts}
                </h4>
                <p className="mt-1 text-xs text-slate-500">
                  Total failed login attempts
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-sm font-semibold text-slate-400">
                  Your Role
                </p>
                <h4 className="mt-2 text-2xl font-bold capitalize text-white">
                  {(currentUser?.role || "user").replace("_", " ")}
                </h4>
                <p className="mt-1 text-xs text-slate-500">
                  Current logged-in permission level
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4 flex items-center gap-2">
              <KeyRound size={20} className="text-blue-400" />
              <h3 className="text-lg font-bold text-white">Quick Actions</h3>
            </div>

            <div className="space-y-3">
              <QuickLink
                to="/users"
                icon={Users}
                title="User Management"
                description="Create, edit and delete users"
              />

              <QuickLink
                to="/access-control"
                icon={KeyRound}
                title="Access Control"
                description="Set page view/edit/delete access"
              />

              <QuickLink
                to="/logs"
                icon={FileText}
                title="Login Logs"
                description="Check login activity and security"
              />
            </div>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <div>
                <h3 className="text-lg font-bold text-white">Recent Users</h3>
                <p className="text-sm text-slate-400">
                  Latest users from the system.
                </p>
              </div>

              <Link
                to="/users"
                className="text-sm font-semibold text-blue-400 hover:text-blue-300"
              >
                View all
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-950">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-300">
                      User ID
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-300">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-300">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-300">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">
                  {recentUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-800/70">
                      <td className="px-4 py-3 font-semibold text-white">
                        {user.user_uid}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {user.email}
                      </td>

                      <td className="px-4 py-3 capitalize text-slate-300">
                        {user.role?.replace("_", " ")}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            user.status === "active"
                              ? "bg-emerald-950 text-emerald-300"
                              : "bg-red-950 text-red-300"
                          }`}
                        >
                          {user.status}
                        </span>

                        {isLocked(user) && (
                          <span className="ml-2 rounded-full bg-amber-950 px-3 py-1 text-xs font-semibold text-amber-300">
                            locked
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}

                  {!recentUsers.length && (
                    <tr>
                      <td
                        colSpan="4"
                        className="px-4 py-10 text-center text-slate-400"
                      >
                        No users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <div>
                <h3 className="text-lg font-bold text-white">Recent Logs</h3>
                <p className="text-sm text-slate-400">
                  Latest login/security activities.
                </p>
              </div>

              <Link
                to="/logs"
                className="text-sm font-semibold text-blue-400 hover:text-blue-300"
              >
                View all
              </Link>
            </div>

            <div className="divide-y divide-slate-800">
              {recentLogs.map((log, index) => {
                const status = log.status || log.login_status || "-";
                const isSuccess = status === "success";

                return (
                  <div
                    key={log.id || index}
                    className="flex items-start justify-between gap-4 px-5 py-4 hover:bg-slate-800/60"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 rounded-xl border p-2 ${
                          isSuccess
                            ? "border-emerald-900 bg-emerald-950 text-emerald-300"
                            : "border-red-900 bg-red-950 text-red-300"
                        }`}
                      >
                        {isSuccess ? (
                          <ShieldCheck size={16} />
                        ) : (
                          <AlertTriangle size={16} />
                        )}
                      </div>

                      <div>
                        <p className="font-semibold text-white">
                          {log.email ||
                            log.login_identifier ||
                            log.login_user_id ||
                            "Unknown"}
                        </p>

                        <p className="text-sm text-slate-400">
                          {log.action || "login"} • {status}
                        </p>

                        {log.failure_reason && (
                          <p className="mt-1 text-xs text-red-300">
                            {log.failure_reason}
                          </p>
                        )}
                      </div>
                    </div>

                    <p className="whitespace-nowrap text-xs text-slate-500">
                      {formatDate(log.created_at || log.createdAt)}
                    </p>
                  </div>
                );
              })}

              {!recentLogs.length && (
                <div className="px-5 py-10 text-center text-slate-400">
                  No logs found.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}