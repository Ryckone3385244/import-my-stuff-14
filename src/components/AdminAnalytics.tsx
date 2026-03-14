import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Users, Eye, Monitor, TrendingUp } from "lucide-react";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export const AdminAnalytics = () => {
  // Fetch visitor sessions
  const { data: visitorSessions } = useQuery({
    queryKey: ["analytics-visitor-sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visitor_sessions")
        .select("*")
        .order("first_seen", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch page views
  const { data: pageViews } = useQuery({
    queryKey: ["analytics-page-views"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_views")
        .select("*")
        .order("viewed_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Calculate stats
  const totalVisitors = visitorSessions?.length || 0;
  const totalPageViews = pageViews?.length || 0;
  
  // Calculate unique visitors in last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentVisitors = visitorSessions?.filter(session => 
    new Date(session.first_seen) >= sevenDaysAgo
  ).length || 0;

  // Device type distribution
  const deviceStats = visitorSessions?.reduce((acc, session) => {
    const device = session.device_type || 'unknown';
    acc[device] = (acc[device] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const deviceData = Object.entries(deviceStats || {}).map(([device, count]) => ({
    name: device.charAt(0).toUpperCase() + device.slice(1),
    value: count,
  }));

  // Page views by page
  const pageStats = pageViews?.reduce((acc, view) => {
    acc[view.page_path] = (acc[view.page_path] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topPages = Object.entries(pageStats || {})
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 10)
    .map(([page, count]) => ({
      page,
      views: count,
    }));

  // Calculate visitors over time (last 30 days)
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return date.toISOString().split('T')[0];
  });

  const visitorsByDay = last30Days.map(date => {
    const visitors = visitorSessions?.filter(session => 
      session.first_seen.split('T')[0] === date
    ).length || 0;
    const views = pageViews?.filter(view => 
      view.viewed_at.split('T')[0] === date
    ).length || 0;
    return {
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      visitors,
      views,
    };
  });

  // Calculate cumulative visitors
  let cumulative = 0;
  const cumulativeData = visitorsByDay.map(day => {
    cumulative += day.visitors;
    return {
      ...day,
      total: cumulative,
    };
  });

  // Calculate average time on site
  const avgTimeOnSite = pageViews?.reduce((sum, view) => sum + (view.time_on_page || 0), 0) / (pageViews?.length || 1);
  const avgTimeFormatted = Math.round(avgTimeOnSite / 60); // Convert to minutes

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Visitors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVisitors}</div>
            <p className="text-xs text-muted-foreground">
              Unique sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Page Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPageViews}</div>
            <p className="text-xs text-muted-foreground">
              Total page views
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Time on Site</CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgTimeFormatted}m</div>
            <p className="text-xs text-muted-foreground">
              Per session
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Visitors</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentVisitors}</div>
            <p className="text-xs text-muted-foreground">
              Last 7 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Device Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Visitors by Device</CardTitle>
            <CardDescription>Device type distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={deviceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {deviceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Pages */}
        <Card>
          <CardHeader>
            <CardTitle>Top Pages</CardTitle>
            <CardDescription>Most visited pages</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topPages} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis 
                  dataKey="page" 
                  type="category"
                  width={100}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip />
                <Bar dataKey="views" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Daily Traffic */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Daily Traffic</CardTitle>
            <CardDescription>Visitors and page views over last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={visitorsByDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="visitors" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Visitors"
                />
                <Line 
                  type="monotone" 
                  dataKey="views" 
                  stroke="hsl(var(--secondary))" 
                  strokeWidth={2}
                  name="Page Views"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cumulative Visitors */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Cumulative Visitor Growth</CardTitle>
            <CardDescription>Total unique visitors over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={cumulativeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="total" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Total Visitors"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Visitors */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Visitor Sessions</CardTitle>
          <CardDescription>Latest 10 visitor sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {visitorSessions?.slice(-10).reverse().map((session) => (
              <div key={session.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                <div>
                  <p className="font-medium capitalize">{session.device_type} - {session.browser}</p>
                  <p className="text-sm text-muted-foreground">{session.os}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {new Date(session.first_seen).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(() => {
                      if (!session.referrer) return 'Direct';
                      try {
                        return `From: ${new URL(session.referrer).hostname}`;
                      } catch {
                        return 'Direct';
                      }
                    })()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
