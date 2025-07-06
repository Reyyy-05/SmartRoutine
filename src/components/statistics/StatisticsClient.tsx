"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Activity } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, PieChart, Clock, Star, Dumbbell } from "lucide-react";
import { Loader2, BookOpen, Coffee } from "lucide-react";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";

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
          where("createdAt", ">=", Timestamp.fromDate(sevenDaysAgo))
        );

        try {
          const querySnapshot = await getDocs(q);
          const userActivities = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activity));
          setActivities(userActivities);
          const stats = aggregateData(userActivities);
          setAggregatedStats(stats);
        } catch (error) {
          console.error("Error fetching activities:", error);
          // Optionally set an error state to display a message to the user
        } finally { 
          setIsLoading(false);
        }
      };
      fetchActivities();
    }
  }, [user]);
  
  const aggregateData = (activityList: Activity[]): { dailyChartData: DailyData[]; typeChartData: TypeData[]; totalMinutes: number; bestDay: DailyData; mostFrequentType: string } => {
    const dailyData: { [key: string]: number } = {};
    const typeData: { [key: string]: number } = { Study: 0, Workout: 0, Break: 0 }; // Initialize for defined types
    let totalMinutes = 0;

    // Initialize dailyData for the last 7 days
    const today = new Date();
    for (let i = 0; i < 7; i++) {
        const d = new Date(today); // Clone the date object
 d.setDate(today.getDate() - (6-i)); // Start from 7 days ago and go up to today
        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }); // Use consistent locale
        dailyData[dayName] = 0;
    }

    activityList.forEach(activity => {
      // Use toDate() to convert Firestore Timestamp to Date object
      // Ensure createdAt is a Timestamp before calling toDate()
      const createdAtDate = activity.createdAt && (activity.createdAt as any).toDate ? (activity.createdAt as any).toDate() : new Date(); // Handle missing or invalid createdAt
      const day = createdAtDate.toLocaleDateString('en-US', { weekday: 'short' }); // Use consistent locale

      // Ensure we only aggregate for the last 7 days initialized
      const dailyDataKeys = Object.keys(dailyData);
      if (dailyDataKeys.includes(day)) {
          dailyData[day] += activity.durationMinutes;
      }

      // Aggregate by activityType
      const activityType = activity.activityType || 'Other'; // Handle potentially missing type
      // Only aggregate for the types defined in COLORS
      if (COLORS.hasOwnProperty(activityType as keyof typeof COLORS)) {
          typeData[activityType as keyof typeof COLORS] += activity.durationMinutes;
      }

      totalMinutes += activity.durationMinutes;
    });

    // Prepare data for daily chart, ensuring chronological order
    const orderedDailyData: DailyData[] = Object.keys(dailyData).sort((a, b) => {
      const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']; // Define order explicitly
      return daysOfWeek.indexOf(a) - daysOfWeek.indexOf(b);
    }).map(name => ({ name, total: dailyData[name] })); // No reverse needed if ordered correctly

    // Prepare data for type chart
    const typeChartData: TypeData[] = Object.entries(typeData)
 .map(([name, value]) => ({
 name: name as "Study" | "Workout" | "Break", // Cast to specific types
 value: value,
 fill: COLORS[name as keyof typeof COLORS] || "#cccccc" // Use default color if type not in COLORS
      })).filter(item => item.value > 0); // Only include types with recorded activity
    
    const bestDay = orderedDailyData.length > 0 ? orderedDailyData.reduce((max, day) => day.total > max.total ? day : max) : { name: 'N/A', total: 0 };
    
    // Add logic to determine most frequent type based on typeData values
    let mostFrequentType = 'N/A';
    if (Object.keys(typeData).length > 0) {
      mostFrequentType = Object.keys(typeData).reduce((a, b) => typeData[a as keyof typeof typeData] > typeData[b as keyof typeof typeData] ? a : b);
    }
    
    const mostFrequentType = typeChartData.length > 0 ? typeChartData.reduce((max, type) => type.value > max.value ? type : max).name : 'N/A';

    return { dailyChartData: orderedDailyData, typeChartData, totalMinutes, bestDay, mostFrequentType };
  };


  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // If aggregatedStats is null after loading, it means there was no data or an error.
  if (!aggregatedStats || activities.length === 0) {
    return (
         <div className="flex h-full w-full items-center justify-center"><p className="text-muted-foreground">No activity data available for the last 7 days.</p></div>
       );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
          <CardHeader>
              <CardTitle className="text-3xl font-headline">Your 7-Day Statistics</CardTitle>
              <CardDescription className="text-foreground/80">An overview of your productivity trends.</CardDescription>
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
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"> {/* Icon might not fit all types */}
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
                <CardTitle className="text-sm font-medium">Most Frequent</CardTitle> {/* Icon might not fit all types */}
                <Dumbbell className="h-4 w-4 text-muted-foreground" /> {/* Icon might not fit all types */}
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
                <ChartContainer config={COLORS} className="h-[300px] w-full">
                    <RechartsBarChart data={aggregatedStats.dailyChartData}>
                        <XAxis dataKey="name" tickLine={false} axisLine={false} stroke="hsl(var(--foreground))" fontSize={12} />
                        <YAxis tickLine={false} axisLine={false} stroke="hsl(var(--foreground))" fontSize={12} tickFormatter={(value: number) => `${value}m`} />
                        <RechartsTooltip content={<ChartTooltipContent formatter={(value: number) => `${value}m`} />} />
                        <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </RechartsBarChart>
                </ChartContainer>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Activity Breakdown</CardTitle>
                <CardDescription className="text-foreground/80">How you've allocated your time.</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
                 <ChartContainer config={COLORS} className="h-[300px] w-full">
                    <RechartsPieChart width={300} height={300}> {/* Add width and height */}
                        {/* Ensure tooltip nameKey is correct for typeChartData */}
                        <RechartsTooltip content={<ChartTooltipContent nameKey="name" formatter={(value: number) => `${value}m`} />} />
                        <Pie data={aggregatedStats.typeChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label> {/* Use aggregatedStats */}
                          {aggregatedStats.typeChartData.map((entry, index) => (
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
