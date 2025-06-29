"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Activity } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, PieChart, Clock, Star, Dumbbell, BookOpen, Coffee } from "lucide-react";
import { Loader2 } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart as RechartsBarChart, Pie, PieChart as RechartsPieChart, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip, Cell } from "recharts";

interface DailyData {
  name: string;
  total: number;
}

interface TypeData {
  name: "Study" | "Workout" | "Break";
  value: number;
  fill: string;
}

const COLORS = {
  Study: "hsl(var(--chart-1))",
  Workout: "hsl(var(--chart-2))",
  Break: "hsl(var(--chart-3))"
};

export function StatisticsClient() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
          where("createdAt", ">=", Timestamp.fromDate(sevenDaysAgo))
        );

        const querySnapshot = await getDocs(q);
        const userActivities = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activity));
        setActivities(userActivities);
        setIsLoading(false);
      };
      fetchActivities();
    }
  }, [user]);

  const aggregateData = () => {
    const dailyData: { [key: string]: number } = {};
    const typeData: { [key: string]: number } = { Study: 0, Workout: 0, Break: 0 };
    let totalMinutes = 0;

    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
        if(!dailyData[dayName]) dailyData[dayName] = 0;
    }

    activities.forEach(activity => {
      const day = activity.createdAt.toDate().toLocaleDateString('en-US', { weekday: 'short' });
      if (dailyData.hasOwnProperty(day)) {
        dailyData[day] += activity.durationMinutes;
      }
      if (typeData.hasOwnProperty(activity.activityType)) {
        typeData[activity.activityType] += activity.durationMinutes;
      }
      totalMinutes += activity.durationMinutes;
    });

    const dailyChartData: DailyData[] = Object.entries(dailyData)
      .map(([name, total]) => ({ name, total }))
      .reverse();

    const typeChartData: TypeData[] = Object.entries(typeData)
      .map(([name, value]) => ({ name: name as "Study" | "Workout" | "Break", value, fill: COLORS[name as keyof typeof COLORS] }));
      
    const bestDay = dailyChartData.reduce((max, day) => day.total > max.total ? day : max, dailyChartData[0] || { name: 'N/A', total: 0 });

    return { dailyChartData, typeChartData, totalMinutes, bestDay };
  };

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const { dailyChartData, typeChartData, totalMinutes, bestDay } = aggregateData();

  return (
    <div className="flex flex-col gap-6">
      <Card>
          <CardHeader>
              <CardTitle className="text-3xl font-headline">Your 7-Day Statistics</CardTitle>
              <CardDescription>An overview of your productivity trends.</CardDescription>
          </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{(totalMinutes / 60).toFixed(1)} hrs</div>
                <p className="text-xs text-muted-foreground">in the last 7 days</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Best Day</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{bestDay.name}</div>
                <p className="text-xs text-muted-foreground">with {(bestDay.total / 60).toFixed(1)} hours logged</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Most Frequent</CardTitle>
                <Dumbbell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{typeChartData.reduce((max, type) => type.value > max.value ? type : max, typeChartData[0] || {name: 'N/A'}).name}</div>
                <p className="text-xs text-muted-foreground">is your top activity category</p>
            </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
            <CardHeader>
                <CardTitle>Weekly Activity</CardTitle>
                <CardDescription>Minutes spent per day.</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={{}} className="h-[300px] w-full">
                    <RechartsBarChart data={dailyChartData}>
                        <XAxis dataKey="name" tickLine={false} axisLine={false} stroke="hsl(var(--foreground))" fontSize={12} />
                        <YAxis tickLine={false} axisLine={false} stroke="hsl(var(--foreground))" fontSize={12} tickFormatter={(value) => `${value}m`} />
                        <RechartsTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </RechartsBarChart>
                </ChartContainer>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Activity Breakdown</CardTitle>
                <CardDescription>How you've allocated your time.</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
                 <ChartContainer config={{}} className="h-[300px] w-full">
                    <RechartsPieChart>
                        <RechartsTooltip content={<ChartTooltipContent nameKey="name" />} />
                        <Pie data={typeChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                          {typeChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                    </RechartsPieChart>
                 </ChartContainer>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
