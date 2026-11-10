import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  ShieldCheck,
  Award,
  Sparkles,
  RefreshCw,
  Search,
  CheckCircle2,
  X,
  Lock,
  Unlock,
  Clock,
  Wallet,
  Receipt
} from 'lucide-react';
import {
  fetchAllUsers,
  fetchRecentPayments,
  grant90DayPass,
  revoke90DayPass,
  grantChallengeUnlock,
  revokeChallengeUnlock,
  updatePassPrice,
  hasActive90DayPass,
  getRemainingPassDays,
  toMillis,
  PASS_DURATION_DAYS
} from '../services/userService';

const formatRelativeTime = (val) => {
  const ms = toMillis(val);
  if (!ms) return 'Never';
  const diffMin = Math.floor((Date.now() - ms) / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(ms).toLocaleDateString();
};

export default function AdminDashboard({
  user,
  customChallenges = [],
  monetizationSettings,
  onClose
}) {
  const [usersList, setUsersList] = useState([]);
  const [paymentsList, setPaymentsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [busyUid, setBusyUid] = useState(null);
  const [selectedChallengeGrant, setSelectedChallengeGrant] = useState('');

  const [passPriceInput, setPassPriceInput] = useState(
    monetizationSettings?.passPriceKes ?? 300
  );
  const [savingPrice, setSavingPrice] = useState(false);
  const [priceSavedMsg, setPriceSavedMsg] = useState('');

  useEffect(() => {
    if (monetizationSettings?.passPriceKes !== undefined) {
      setPassPriceInput(monetizationSettings.passPriceKes);
    }
  }, [monetizationSettings?.passPriceKes]);

  const loadUsers = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const [usersRes, paymentsRes] = await Promise.allSettled([
        fetchAllUsers(user),
        fetchRecentPayments(user, 50)
      ]);
      if (usersRes.status === 'fulfilled') {
        setUsersList(usersRes.value);
      } else {
        throw usersRes.reason;
      }
      if (paymentsRes.status === 'fulfilled') {
        setPaymentsList(paymentsRes.value);
      } else {
        console.warn('Could not load recent M-Pesa transactions:', paymentsRes.reason);
      }
    } catch (err) {
      console.error('Admin fetch users failed:', err);
      setError(
        err.message ||
          'Could not load users collection. Verify your Firestore rules permit admin reads on users.'
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const stats = useMemo(() => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const active24h = usersList.filter((u) => now - toMillis(u.lastSeenAt) <= dayMs).length;
    const active7d = usersList.filter((u) => now - toMillis(u.lastSeenAt) <= 7 * dayMs).length;
    const activePasses = usersList.filter((u) => hasActive90DayPass(u)).length;
    const totalPassesEarned = usersList.reduce(
      (sum, u) => sum + (u.totalPassed || 0),
      0
    );
    const paidCustom = customChallenges.filter((c) => Number(c.price) > 0).length;
    const completedPayments = paymentsList.filter((p) => p.status === 'COMPLETED');
    const liveRevenueKes = completedPayments
      .filter((p) => p.environment === 'production')
      .reduce((sum, p) => sum + (Number(p.paidAmount ?? p.amount) || 0), 0);
    const sandboxRevenueKes = completedPayments
      .filter((p) => p.environment !== 'production')
      .reduce((sum, p) => sum + (Number(p.paidAmount ?? p.amount) || 0), 0);
    return {
      totalUsers: usersList.length,
      active24h,
      active7d,
      activePasses,
      totalPassesEarned,
      paidCustom,
      completedTxCount: completedPayments.length,
      liveRevenueKes,
      sandboxRevenueKes
    };
  }, [usersList, customChallenges, paymentsList]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return usersList;
    return usersList.filter(
      (u) =>
        (u.email || '').toLowerCase().includes(q) ||
        (u.displayName || '').toLowerCase().includes(q)
    );
  }, [usersList, searchQuery]);

  const handleSavePassPrice = async (e) => {
    e.preventDefault();
    setSavingPrice(true);
    setPriceSavedMsg('');
    try {
      const saved = await updatePassPrice(user, passPriceInput);
      setPriceSavedMsg(`90-Day Pass price updated to KES ${saved}`);
      setTimeout(() => setPriceSavedMsg(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingPrice(false);
    }
  };

  const handleTogglePass = async (targetUser) => {
    setBusyUid(targetUser.uid || targetUser.id);
    try {
      const uid = targetUser.uid || targetUser.id;
      if (hasActive90DayPass(targetUser)) {
        await revoke90DayPass(user, uid);
      } else {
        await grant90DayPass(user, uid, PASS_DURATION_DAYS);
      }
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyUid(null);
    }
  };

  const handleGrantChallenge = async (targetUid, challengeId) => {
    if (!challengeId) return;
    setBusyUid(targetUid);
    try {
      const targetUser = usersList.find((u) => (u.uid || u.id) === targetUid);
      const alreadyHas = targetUser?.unlockedChallengeIds?.includes(challengeId);
      if (alreadyHas) {
        await revokeChallengeUnlock(user, targetUid, challengeId);
      } else {
        await grantChallengeUnlock(user, targetUid, challengeId);
      }
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyUid(null);
    }
  };

  const paidCustomChallenges = useMemo(
    () => customChallenges.filter((c) => Number(c.price) > 0),
    [customChallenges]
  );

  return (
    <div className="bg-slate-900 border border-emerald-700/60 rounded-2xl p-4 sm:p-5 text-slate-100 shadow-2xl flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
              ADMIN USER &amp; ACCESS DASHBOARD
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                M-Pesa Daraja Ready
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Monitor signed-in learners, custom challenge unlocks, and manage 90-day exam passes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadUsers}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700"
              title="Close Dashboard"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* KPI Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3">
          <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
            <span>Signed-In Users</span>
            <Users className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1">{stats.totalUsers}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {stats.active24h} today • {stats.active7d} in 7 days
          </div>
        </div>

        <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3">
          <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
            <span>Active 90-Day Passes</span>
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-1">{stats.activePasses}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            3-month full custom access
          </div>
        </div>

        <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3">
          <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
            <span>Custom Challenges</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-300 mt-1">{customChallenges.length}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {stats.paidCustom} paid • {customChallenges.length - stats.paidCustom} free
          </div>
        </div>

        <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3">
          <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
            <span>Exam Passes Earned</span>
            <Award className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1">{stats.totalPassesEarned}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Across signed-in learners</div>
        </div>
      </div>

      {/* Global 90-Day Pass Pricing Setting */}
      <form
        onSubmit={handleSavePassPrice}
        className="bg-slate-950/80 border border-amber-500/30 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3"
      >
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-amber-400 shrink-0" />
          <div>
            <div className="text-xs font-extrabold text-amber-300">
              90-Day Unlock-All Pass Price (3 Months Full Driving School Term)
            </div>
            <div className="text-[11px] text-slate-400">
              Unlocks all paid custom challenges for {PASS_DURATION_DAYS} days via automatic Daraja M-Pesa STK Push checkout.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400">KES</span>
          <input
            type="number"
            min="10"
            step="10"
            value={passPriceInput}
            onChange={(e) => setPassPriceInput(e.target.value)}
            className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-extrabold text-white focus:outline-none focus:border-amber-400"
          />
          <button
            type="submit"
            disabled={savingPrice}
            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition disabled:opacity-50"
          >
            {savingPrice ? 'Saving...' : 'Update Price'}
          </button>
        </div>
      </form>

      {priceSavedMsg && (
        <div className="p-2.5 rounded-lg bg-emerald-950/90 border border-emerald-700/60 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {priceSavedMsg}
        </div>
      )}

      {error && (
        <div className="p-2.5 rounded-lg bg-rose-950/90 border border-rose-700/60 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Search & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search learners by name or email..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        {paidCustomChallenges.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-semibold">Single Unlock Tool:</span>
            <select
              value={selectedChallengeGrant}
              onChange={(e) => setSelectedChallengeGrant(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-amber-300"
            >
              <option value="">Select paid challenge...</option>
              {paidCustomChallenges.map((c, idx) => (
                <option key={c.id} value={c.id}>
                  C{customChallenges.findIndex((x) => x.id === c.id) + 1}: {c.title} (KES {c.price})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto max-h-80">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-900/95 text-slate-400 uppercase text-[10px] tracking-wider sticky top-0 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Learner</th>
                <th className="py-2.5 px-3">Last Active</th>
                <th className="py-2.5 px-3">Progress</th>
                <th className="py-2.5 px-3">90-Day Pass</th>
                <th className="py-2.5 px-3">Single Unlocks</th>
                <th className="py-2.5 px-3 text-right">Admin Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500">
                    Loading platform users...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500">
                    No signed-in learners match your filter yet. Users appear here automatically when they sign in with Google.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const uid = u.uid || u.id;
                  const passActive = hasActive90DayPass(u);
                  const daysLeft = getRemainingPassDays(u);
                  const completedCount = u.completedChallenges?.length || 0;
                  const unlockedIds = u.unlockedChallengeIds || [];
                  const isSelectedChallengeUnlocked =
                    selectedChallengeGrant && unlockedIds.includes(selectedChallengeGrant);

                  return (
                    <tr key={uid} className="hover:bg-slate-900/60 transition">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          {u.photoURL ? (
                            <img
                              src={u.photoURL}
                              alt=""
                              className="w-6 h-6 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400 shrink-0">
                              {(u.displayName || u.email || 'U')[0].toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-bold text-white flex items-center gap-1.5 truncate">
                              {u.displayName || 'Student'}
                              {u.role === 'admin' && (
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">
                        {formatRelativeTime(u.lastSeenAt)}
                      </td>

                      <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">
                        <span className="font-bold text-emerald-300">{completedCount}</span> done
                        <span className="text-slate-500"> • {u.totalAttempts || 0} tries</span>
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {passActive ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-extrabold">
                            Active ({daysLeft}d left)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-bold">
                            Free Tier
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">
                        {unlockedIds.length} unlocked
                      </td>

                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {selectedChallengeGrant && (
                            <button
                              type="button"
                              disabled={busyUid === uid}
                              onClick={() => handleGrantChallenge(uid, selectedChallengeGrant)}
                              className={`px-2 py-1 rounded text-[10px] font-bold border transition flex items-center gap-1 disabled:opacity-50 ${
                                isSelectedChallengeUnlocked
                                  ? 'bg-rose-950/60 border-rose-700/60 text-rose-300 hover:bg-rose-900/60'
                                  : 'bg-sky-950/70 border-sky-700/60 text-sky-300 hover:bg-sky-900/60'
                              }`}
                            >
                              {isSelectedChallengeUnlocked ? (
                                <>
                                  <Lock className="w-3 h-3" /> Lock
                                </>
                              ) : (
                                <>
                                  <Unlock className="w-3 h-3" /> Unlock
                                </>
                              )}
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={busyUid === uid}
                            onClick={() => handleTogglePass(u)}
                            className={`px-2 py-1 rounded text-[10px] font-bold border transition disabled:opacity-50 ${
                              passActive
                                ? 'bg-rose-950/60 border-rose-700/60 text-rose-300 hover:bg-rose-900/60'
                                : 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30'
                            }`}
                          >
                            {passActive ? 'Revoke 90d' : '+90d Pass'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent M-Pesa Transactions */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <Receipt className="w-3.5 h-3.5" />
            Recent M-Pesa STK Push Transactions ({paymentsList.length})
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-slate-300 font-semibold">
              Live Revenue:{' '}
              <strong className="text-emerald-300">
                KES {stats.liveRevenueKes.toLocaleString()}
              </strong>
            </span>
            {stats.sandboxRevenueKes > 0 && (
              <span className="text-slate-400 font-semibold">
                Sandbox Tests:{' '}
                <strong className="text-amber-300">
                  KES {stats.sandboxRevenueKes.toLocaleString()}
                </strong>
              </span>
            )}
          </div>
        </div>

        {paymentsList.length === 0 ? (
          <div className="text-xs text-slate-500 py-3 text-center">
            No M-Pesa STK Push transactions recorded yet. Test or live checkouts will appear here automatically.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-56">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="text-[10px] uppercase text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-1.5 px-2">Learner</th>
                  <th className="py-1.5 px-2">Plan</th>
                  <th className="py-1.5 px-2">Amount</th>
                  <th className="py-1.5 px-2">Receipt</th>
                  <th className="py-1.5 px-2">Status</th>
                  <th className="py-1.5 px-2 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {paymentsList.map((tx) => {
                  const statusColor =
                    tx.status === 'COMPLETED'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : tx.status === 'PENDING'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40';
                  return (
                    <tr key={tx.id} className="hover:bg-slate-900/50">
                      <td className="py-1.5 px-2">
                        <div className="font-bold text-slate-200 truncate max-w-[160px]">
                          {tx.userEmail || tx.userName || tx.uid}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {tx.phoneNumber}
                        </div>
                      </td>
                      <td className="py-1.5 px-2 text-slate-300 truncate max-w-[150px]">
                        {tx.plan === 'pass90'
                          ? '90-Day Pass'
                          : tx.challengeTitle || 'Single Challenge'}
                      </td>
                      <td className="py-1.5 px-2 font-bold text-white whitespace-nowrap">
                        KES {tx.paidAmount ?? tx.amount}
                      </td>
                      <td className="py-1.5 px-2 font-mono text-[11px] text-slate-300 whitespace-nowrap">
                        {tx.mpesaReceiptNumber || '—'}
                      </td>
                      <td className="py-1.5 px-2 whitespace-nowrap">
                        <span
                          className={`px-1.5 py-0.5 rounded border text-[9px] font-black uppercase ${statusColor}`}
                        >
                          {tx.status}
                        </span>
                        {tx.environment !== 'production' && (
                          <span className="ml-1 px-1 py-0.5 rounded bg-slate-800 text-amber-300 text-[9px] font-bold">
                            SANDBOX
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 px-2 text-right text-slate-400 whitespace-nowrap">
                        {formatRelativeTime(tx.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Custom Challenge Unlock Metrics */}
      {customChallenges.length > 0 && (
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-amber-400 mb-2">
            Custom Challenge Unlocks &amp; Pricing Summary
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {customChallenges.map((c, idx) => {
              const unlockCount = usersList.filter(
                (u) => u.unlockedChallengeIds?.includes(c.id) || hasActive90DayPass(u)
              ).length;
              const passCount = usersList.filter((u) =>
                u.completedChallenges?.includes(c.id)
              ).length;
              return (
                <div
                  key={c.id}
                  className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-white truncate">
                      C{idx + 1}: {c.title}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {unlockCount} with access • {passCount} passed
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-black shrink-0 ${
                      Number(c.price) > 0
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {Number(c.price) > 0 ? `KES ${c.price}` : 'FREE'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

