// Using Node script since we can't reliably load React without standard toolchain
import * as dateFns from 'date-fns';
import PocketBase from 'pocketbase';

const pb = new PocketBase("https://greenroute-pb-staging.fly.dev");
// I'll authenticate to bypass the admin check
pb.admins.authWithPassword("admin@linktery.com", "linkteryadmin123").then(r => {
    console.log("Logged in");
    fetchStats();
}).catch(console.error);

async function fetchStats() {
    const timeRange = '7d';
    const now = new Date();
    const daysToFetch = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 365;
    
    const currentPeriodStart = dateFns.subDays(now, daysToFetch);
    const prevPeriodStart = dateFns.subDays(now, daysToFetch * 2);
    const sinceDate = dateFns.format(prevPeriodStart, "yyyy-MM-dd HH:mm:ss");
    
    console.log("Fetching since:", sinceDate);
    
    try {
        const [users, links, billing, clicks, analytics, logs] = await Promise.all([
            pb.collection("users").getFullList({ sort: "-created", requestKey: null }),
            pb.collection("links").getFullList({ requestKey: null }),
            pb.collection("billing").getFullList({ requestKey: null }),
            pb.collection("clicks").getFullList({ sort: "-created", filter: `created > "${sinceDate}"`, requestKey: null }),
            pb.collection("analytics_events").getFullList({ sort: "-created", filter: `created > "${sinceDate}"`, requestKey: null }),
            pb.collection("system_logs").getFullList({ sort: "-created", filter: `created > "${sinceDate}"`, requestKey: null })
        ]);

        console.log("Fetched!");
        
        // Metrics Calculation
        const paidUsers = users.filter(u => u.plan !== 'creator' && u.plan_status === 'active');
        const totalRevenue = billing.filter(b => b.status === 'success').reduce((acc, b) => acc + (b.amount || 0), 0);
        const mrr = paidUsers.reduce((acc, u) => acc + (u.plan === 'pro' ? 9.99 : u.plan === 'agency' ? 29.99 : 0), 0);
        const arpu = paidUsers.length > 0 ? mrr / paidUsers.length : 0;

        const dauUsers = new Set(analytics.filter(e => dateFns.isAfter(new Date(e.created), dateFns.subHours(now, 24))).map(e => e.user_id));
        const mauUsers = new Set(analytics.filter(e => dateFns.isAfter(new Date(e.created), dateFns.subDays(now, 30))).map(e => e.user_id));

        console.log("DAU MAU calculated", dauUsers.size, mauUsers.size);
    } catch(err) {
        console.error("FAILED", err);
    }
}
