"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Activity } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart as BarChartIcon, PieChart as PieChartIcon, Clock, Star, Dumbbell } from "lucide-react";
import { Loader2 } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, Pie, PieChart, Cell, XAxis, YAxis } from "recharts";


interface DailyData {
  name: string;
  total: number;
}

interface TypeData {
  name: "Study" | "Workout" | "Break";
  value: number;
  fill: string;
}

const COLORS: { [key: string]: string } = {
  Study: "hsl(var(--chart-1))",
  Workout: "hsl(var(--chart-2))",
  Break: "hsl(var(--chart-3))"
};

export function StatisticsClient() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [aggregatedStats, setAggregatedStats] = useState<{ dailyChartData: DailyData[]; typeChartData: TypeData[]; totalMinutes: number; bestDay: DailyData; mostFrequentType: string } | null>(null);

  useEffect(() => {
    if (user) {
      const fetchActivities = async () => {
        setIsLoading(true);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const q = query(
          collection(db, "activities"),
          where("userId", "==", user.uid),
          where("createdAt", ">=", Timestamp.fromDate(sevenDaysAgo)),
          where("status", "==", "validated")
        );

        try {
          const querySnapshot = await getDocs(q);
          const userActivities = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activity));
          setActivities(userActivities);
          const stats = aggregateData(userActivities);
          setAggregatedStats(stats);
        } catch (error) {
          console.error("Error fetching activities:", error);
        } finally { 
          setIsLoading(false);
        }
      };
      fetchActivities();
    }
  }, [user]);
  
  const aggregateData = (activityList: Activity[]): { dailyChartData: DailyData[]; typeChartData: TypeData[]; totalMinutes: number; bestDay: DailyData; mostFrequentType: string } => {
    const dailyDataMap: { [key: string]: number } = {};
    const typeData: { [key: string]: number } = { Study: 0, Workout: 0, Break: 0 };
    let totalMinutes = 0;

    const today = new Date();
    const daysOfWeek = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
        daysOfWeek.push(dayName);
        dailyDataMap[dayName] = 0;
    }

    activityList.forEach(activity => {
      const createdAtDate = activity.createdAt.toDate();
      const day = createdAtDate.toLocaleDateString('en-US', { weekday: 'short' });

      if (dailyDataMap.hasOwnProperty(day)) {
          dailyDataMap[day] += activity.durationMinutes;
      }

      if (COLORS.hasOwnProperty(activity.activityType)) {
          typeData[activity.activityType] += activity.durationMinutes;
      }

      totalMinutes += activity.durationMinutes;
    });

    const dailyChartData: DailyData[] = daysOfWeek.map(name => ({ name, total: dailyDataMap[name] }));

    const typeChartData: TypeData[] = Object.entries(typeData)
      .map(([name, value]) => ({
        name: name as "Study" | "Workout" | "Break",
        value: value,
        fill: COLORS[name as keyof typeof COLORS] || "#cccccc"
      })).filter(item => item.value > 0);
    
    const bestDay = dailyChartData.length > 0 ? dailyChartData.reduce((max, day) => day.total > max.total ? day : max) : { name: 'N/A', total: 0 };
    
    const mostFrequentType = typeChartData.length > 0 ? typeChartData.reduce((max, type) => type.value > max.value ? type : max).name : 'N/A';

    return { dailyChartData, typeChartData, totalMinutes, bestDay, mostFrequentType };
  };

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!aggregatedStats || activities.length === 0) {
    return (
         <div className="flex h-full w-full items-center justify-center"><p className="text-muted-foreground">No validated activity data available for the last 7 days.</p></div>
       );
  }

  const chartConfig = {
    total: {
      label: "Minutes",
    },
    ...Object.fromEntries(
      Object.entries(COLORS).map(([key, value]) => [
        key,
        { label: key, color: value },
      ])
    ),
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
          <CardHeader>
              <CardTitle className="text-3xl font-headline">Your 7-Day Statistics</CardTitle>
              <CardDescription className="text-foreground/80">An overview of your validated productivity trends.</CardDescription>
          </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-primary">{(aggregatedStats.totalMinutes / 60).toFixed(1)} hrs</div>
                <p className="text-xs text-muted-foreground">in the last 7 days</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Best Day</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-primary">{aggregatedStats.bestDay.name}</div>
                <p className="text-xs text-muted-foreground">with {(aggregatedStats.bestDay.total / 60).toFixed(1)} hours logged</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Most Frequent</CardTitle>
                <Dumbbell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-primary">
                    {aggregatedStats.mostFrequentType}</div>
                <p className="text-xs text-muted-foreground">is your top activity category</p>
            </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
            <CardHeader>
                <CardTitle>Weekly Activity</CardTitle>
                <CardDescription className="text-foreground/80">Minutes spent per day.</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <BarChart data={aggregatedStats.dailyChartData} accessibilityLayer>
                        <XAxis dataKey="name" tickLine={false} axisLine={false} stroke="hsl(var(--foreground))" fontSize={12} />
                        <YAxis tickLine={false} axisLine={false} stroke="hsl(var(--foreground))" fontSize={12} tickFormatter={(value: number) => `${value}m`} />
                        <ChartTooltip content={<ChartTooltipContent formatter={(value) => `${value}m`} />} />
                        <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Activity Breakdown</CardTitle>
                <CardDescription className="text-foreground/80">How you've allocated your time.</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
                 <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <PieChart width={300} height={300} accessibilityLayer>
                        <ChartTooltip content={<ChartTooltipContent nameKey="name" formatter={(value) => `${value}m`} />} />
                        <Pie data={aggregatedStats.typeChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                          {aggregatedStats.typeChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                    </PieChart>
                 </ChartContainer>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
