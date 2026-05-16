import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Users, Activity, Calendar, ExternalLink, DollarSign, Receipt, ChevronDown } from "lucide-react";
import { pb } from "@/lib/pocketbase";
import { toast } from "sonner";
import { format, isValid } from "date-fns";
import { Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

const safeFormat = (d: string, fmt: string) => {
  if (!d) return "—";
  const date = new Date(d);
  return isValid(date) ? format(date, fmt) : "—";
};

type Promocode = {
  id: string;
  code: string;
  max_uses: number;
  current_uses: number;
  reward_plan: string;
  reward_days: number;
  is_active: boolean;
  created: string;
};

type UserData = {
  id: string;
  username: string;
  email: string;
  plan: string;
  created: string;
  avatar: string;
  collectionId: string;
};

type PromocodeLog = {
  id: string;
  expand?: { user_id?: UserData };
  plan_awarded: string;
  days_awarded: number;
  created: string;
};

type PaymentUser = {
  id: string;
  username: string;
  email: string;
  avatar: string;
};

type PaymentRecord = {
  id: string;
  user: PaymentUser;
  plan: string;
  amount: number;
  status: string;
  payment_method: string;
  is_first: boolean;
  created: string;
};

type PaymentsData = {
  totalSpend: number;
  totalPayments: number;
  payments: PaymentRecord[];
};

export default function AdminPromocodeStats() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [promo, setPromo] = useState<Promocode | null>(null);
  const [logs, setLogs] = useState<PromocodeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentsData, setPaymentsData] = useState<PaymentsData | null>(null);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [showPayments, setShowPayments] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        const promoRecord = await pb.collection("promocodes").getOne(id);
        setPromo(promoRecord as unknown as Promocode);

        // Use the new custom endpoint which safely exposes user emails to admins
        const response = await pb.send(`/api/admin/promocodes/${id}/stats`, {
          method: 'GET',
        });
        
        // Map the response to the expected PromocodeLog format
        const mappedLogs = response.map((item: any) => ({
          id: item.id,
          plan_awarded: item.plan_awarded,
          created: item.created,
          expand: {
            user_id: item.user
          }
        }));
        
        setLogs(mappedLogs);
      } catch (err) {
        console.error("Failed to load promocode stats:", err);
        toast.error("Failed to load promocode statistics");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // Fetch payments data
  useEffect(() => {
    const fetchPayments = async () => {
      if (!id) return;
      try {
        const data = await pb.send(`/api/admin/promocodes/${id}/payments`, {
          method: 'GET',
        });
        setPaymentsData(data as PaymentsData);
      } catch (err) {
        console.error("Failed to load payment stats:", err);
      } finally {
        setPaymentsLoading(false);
      }
    };
    fetchPayments();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!promo) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold text-foreground">Promocode not found</h2>
        <button onClick={() => navigate(-1)} className="mt-4 text-accent hover:underline">Go back</button>
      </div>
    );
  }

  const getAvatarUrl = (user: UserData | PaymentUser) => {
    if (user.avatar) {
      return `${pb.baseUrl}/api/files/users/${user.id}/${user.avatar}`;
    }
    return `https://api.dicebear.com/7.x/initials/svg?seed=${user.username || "U"}&backgroundColor=111111&textColor=ffffff`;
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-12 pt-4 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-muted-foreground hover:text-foreground hover:bg-surface rounded-lg transition-colors group" title="Go back">
            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-mono tracking-tight">{promo.code}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${promo.is_active ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                {promo.is_active ? 'Active' : 'Archived'}
              </span>
            </div>
            <p className="text-muted-foreground text-sm mt-1">Detailed statistics and user redemptions</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center border border-accent/20 shrink-0">
            <Users className="w-6 h-6 text-accent" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Uses</p>
            <h3 className="text-2xl font-bold text-foreground mt-0.5">{promo.current_uses} <span className="text-base font-normal text-muted-foreground">/ {promo.max_uses || "∞"}</span></h3>
          </div>
        </div>
        <div className="glass-card p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shrink-0">
            <Activity className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Reward</p>
            <h3 className="text-xl font-bold text-foreground mt-0.5 uppercase">{promo.reward_plan} <span className="text-base font-normal text-muted-foreground lowercase">({promo.reward_days} days)</span></h3>
          </div>
        </div>

        {/* Total Spend KPI */}
        <div className="glass-card p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0">
            <DollarSign className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Spend</p>
            {paymentsLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mt-1" />
            ) : (
              <h3 className="text-2xl font-bold text-emerald-500 mt-0.5">
                ${paymentsData?.totalSpend?.toFixed(2) || "0.00"}
              </h3>
            )}
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20 shrink-0">
            <Calendar className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Created</p>
            <h3 className="text-lg font-bold text-foreground mt-0.5">{safeFormat(promo.created, "MMM d, yyyy")}</h3>
          </div>
        </div>
      </div>

      {/* Payment Logs Section */}
      <div className="glass-card rounded-2xl overflow-hidden border border-border">
        <button
          onClick={() => setShowPayments(!showPayments)}
          className="w-full p-5 border-b border-border bg-surface/30 flex items-center justify-between hover:bg-surface/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <Receipt className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-foreground text-lg">Payment Logs</h3>
              <p className="text-sm text-muted-foreground">
                {paymentsData ? `${paymentsData.totalPayments} payment${paymentsData.totalPayments !== 1 ? 's' : ''} • $${paymentsData.totalSpend.toFixed(2)} total` : 'Loading...'}
              </p>
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${showPayments ? 'rotate-180' : ''}`} />
        </button>

        {showPayments && (
          <div className="overflow-x-auto animate-in slide-in-from-top-2 duration-200">
            {paymentsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-accent" />
              </div>
            ) : !paymentsData || paymentsData.payments.length === 0 ? (
              <div className="px-6 py-12 text-center text-muted-foreground italic">
                No payments from users of this promocode yet.
              </div>
            ) : (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-background/50 text-muted-foreground">
                  <tr>
                    <th className="px-6 py-4 font-medium">User</th>
                    <th className="px-6 py-4 font-medium">Email</th>
                    <th className="px-6 py-4 font-medium">Plan</th>
                    <th className="px-6 py-4 font-medium">Amount</th>
                    <th className="px-6 py-4 font-medium">Type</th>
                    <th className="px-6 py-4 font-medium">Method</th>
                    <th className="px-6 py-4 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {paymentsData.payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-surface/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={getAvatarUrl(payment.user)}
                            alt={payment.user.username}
                            className="w-8 h-8 rounded-full object-cover border border-border"
                          />
                          <span className="font-medium text-foreground">@{payment.user.username}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-muted-foreground text-xs">{payment.user.email}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-accent/10 text-accent border border-accent/20">
                          {payment.plan}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-bold ${payment.amount > 0 ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                          ${payment.amount.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          payment.is_first
                            ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                            : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                        }`}>
                          {payment.is_first ? 'First' : 'Renewal'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground text-xs">{payment.payment_method || "—"}</td>
                      <td className="px-6 py-4 text-muted-foreground">{safeFormat(payment.created, "MMM d, yyyy • HH:mm")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="glass-card rounded-2xl overflow-hidden border border-border">
        <div className="p-5 border-b border-border bg-surface/30">
          <h3 className="font-semibold text-foreground text-lg">Redemption History</h3>
          <p className="text-sm text-muted-foreground">Users who activated this promocode</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-background/50 text-muted-foreground">
              <tr>
                <th className="px-6 py-4 font-medium">User</th>
                <th className="px-6 py-4 font-medium">Email</th>
                <th className="px-6 py-4 font-medium">Current Plan</th>
                <th className="px-6 py-4 font-medium">Redemption Date</th>
                <th className="px-6 py-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic">
                    No users have redeemed this promocode yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const user = log.expand?.user_id;
                  if (!user) return null;
                  
                  return (
                    <tr key={log.id} className="hover:bg-surface/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img src={getAvatarUrl(user)} alt={user.username} className="w-9 h-9 rounded-full object-cover border border-border" />
                          <div>
                            <p className="font-semibold text-foreground">@{user.username}</p>
                            <p className="text-[11px] text-muted-foreground">Joined {safeFormat(user.created, "MMM yyyy")}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-muted-foreground">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-accent/10 text-accent border border-accent/20">
                          {user.plan || "Creator"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{safeFormat(log.created, "MMM d, yyyy • HH:mm")}</td>
                      <td className="px-6 py-4 text-right">
                        <Link to={`/admin/users/${user.id}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface hover:bg-accent hover:text-accent-foreground text-foreground transition-colors text-xs font-medium">
                          View Profile
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
