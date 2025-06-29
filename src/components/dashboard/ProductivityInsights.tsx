"use client";

import { useState, useEffect } from "react";
import { getProductivityInsights, ProductivityInsightsInput } from "@/ai/flows/productivity-insights";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Lightbulb } from "lucide-react";

interface ProductivityInsightsProps {
  userId: string;
}

export function ProductivityInsights({ userId }: ProductivityInsightsProps) {
  const [insights, setInsights] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const q = query(
        collection(db, "activities"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc"),
        limit(50) // Limit to last 50 activities for performance
      );
      
      const querySnapshot = await getDocs(q);
      const activityHistory = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          activityName: data.activityName,
          activityType: data.activityType,
          durationMinutes: data.durationMinutes,
          details: data.details,
          createdAt: data.createdAt.toDate().toISOString(),
        };
      });

      if (activityHistory.length < 3) {
        setInsights(["Log a few more activities to unlock your personal AI insights!"]);
        return;
      }
      
      const input: ProductivityInsightsInput = { userId, activityHistory };
      const result = await getProductivityInsights(input);
      setInsights(result.insights);
    } catch (e) {
      console.error(e);
      setError("Could not fetch AI insights at this time.");
      setInsights([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchInsights();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);


  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>AI Productivity Insight</CardTitle>
            <CardDescription>Smart feedback on your routine.</CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={fetchInsights} disabled={isLoading}>
            <Lightbulb className={`h-5 w-5 ${isLoading ? 'animate-pulse' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="ml-2">Analyzing your patterns...</p>
          </div>
        ) : error ? (
          <p className="text-destructive text-center">{error}</p>
        ) : (
          <ul className="space-y-2 list-disc pl-5">
            {insights.map((insight, index) => (
              <li key={index} className="text-sm text-foreground/90">{insight}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
