"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { ActivityForm } from "./ActivityForm";
import { TodaysActivitiesTable } from "./TodaysActivitiesTable";
import { ProductivityInsights } from "./ProductivityInsights";

export function DashboardClient() {
  const { user, userProfile } = useAuth();
  const [greeting, setGreeting] = useState("Hello");
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const hours = new Date().getHours();
    if (hours < 12) setGreeting("Good Morning");
    else if (hours < 18) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!user || !userProfile) {
    return null; // or a loading skeleton
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-3xl font-headline">{greeting}, {userProfile.username}!</CardTitle>
              <CardDescription>Let's make today productive.</CardDescription>
            </div>
            <div className="text-right">
              <p className="text-2xl font-semibold font-mono">{currentTime.toLocaleTimeString()}</p>
              <p className="text-sm text-muted-foreground">{currentTime.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>
        </CardHeader>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 flex flex-col gap-6">
           <ActivityForm userId={user.uid} />
           <ProductivityInsights userId={user.uid} />
        </div>
        <div className="lg:col-span-2">
          <TodaysActivitiesTable userId={user.uid} />
        </div>
      </div>
    </div>
  );
}
