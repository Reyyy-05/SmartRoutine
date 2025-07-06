"use client";

import { useState, useEffect } from "react";
import { getProductivityInsights, ProductivityInsightsInput, ProductivityInsightsOutput } from "@/ai/flows/productivity-insights";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Lightbulb, Trophy, BrainCircuit, TriangleAlert } from "lucide-react";

interface ProductivityInsightsProps {
  userId: string;
}

const insightIcons: { [key: string]: React.ElementType } = {
  consistency: Trophy,
  focus: BrainCircuit,
  rest: TriangleAlert,
};

export function ProductivityInsights({ userId }: ProductivityInsightsProps) {
  const [insights, setInsights] = useState<ProductivityInsightsOutput['insights'] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async () => {
    setIsLoading(true);
    setError(null);
    setInsights(null);

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
        setError("Catat minimal 3 aktivitas untuk mendapatkan analisis cerdas.");
        return;
      }
      
      const input: ProductivityInsightsInput = { userId, activityHistory };
      const result = await getProductivityInsights(input);
      setInsights(result.insights);
    } catch (e) {
      console.error(e);
      setError("Tidak dapat mengambil analisis AI saat ini.");
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    if (userId) {
      fetchInsights();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);


  return (
    <Card className="shadow-lg border-none bg-card/80 backdrop-filter backdrop-blur-lg">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-primary-foreground" />
            <CardTitle className="text-lg font-semibold">Analisis Cerdas</CardTitle>
        </div>
        <Button variant="ghost" size="icon" onClick={fetchInsights} disabled={isLoading}>
            <Lightbulb className={`h-5 w-5 ${isLoading ? 'animate-pulse' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary-foreground" />
            <p className="ml-2">Menganalisis pola Anda...</p>
          </div>
        ) : error ? (
          <p className="text-muted-foreground text-center text-sm p-4">{error}</p>
        ) : (
          <div className="space-y-4">
            {insights && Object.entries(insights).map(([key, insight]) => {
              if (!insight.title) return null;
              const Icon = insightIcons[key] || BrainCircuit;
              return (
                <div key={key} className="flex items-start gap-3">
                    <Icon className="w-5 h-5 mt-1 text-secondary flex-shrink-0" />
                    <div>
                        <h4 className="font-semibold">{insight.title}</h4>
                        <p className="text-sm text-foreground/80">{insight.description}</p>
                    </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
