"use client";

import { useState, useEffect } from "react";
import { getProductivityInsights, ProductivityInsightsInput, ProductivityInsightsOutput } from "@/ai/flows/productivity-insights";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Lightbulb, Trophy, BrainCircuit, AlertTriangle, RefreshCw } from "lucide-react";

interface ProductivityInsightsProps {
  userId: string;
}

const insightIcons: { [key: string]: React.ElementType } = {
  consistency: Trophy,
  focus: BrainCircuit,
  rest: AlertTriangle,
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
        limit(50)
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
    <Card className="bg-white/40 backdrop-blur-2xl border border-white/50 rounded-3xl shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
            <BrainCircuit className="w-6 h-6 text-purple-500" />
            <CardTitle className="text-xl font-semibold text-gray-800">Analisis Cerdas</CardTitle>
        </div>
        <Button variant="ghost" size="icon" onClick={fetchInsights} disabled={isLoading} className="text-gray-500 hover:text-purple-500 hover:bg-purple-500/10 rounded-full">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center p-4 text-gray-600">
            <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
            <p className="ml-2 text-sm">Menganalisis pola Anda...</p>
          </div>
        ) : error ? (
          <p className="text-gray-500 text-center text-sm p-4">{error}</p>
        ) : (
          <div className="space-y-4">
            {insights && Object.entries(insights).map(([key, insight]) => {
              if (!insight.title) return null;
              const Icon = insightIcons[key] || Lightbulb;
               const iconColor = key === 'consistency' ? 'text-green-600' : key === 'focus' ? 'text-blue-600' : 'text-yellow-600';
              return (
                <div key={key} className="flex items-start gap-3">
                    <Icon className={`w-5 h-5 mt-1 flex-shrink-0 ${iconColor}`} />
                    <div>
                        <h4 className="font-semibold text-sm text-gray-800">{insight.title}</h4>
                        <p className="text-xs text-gray-600">{insight.description}</p>
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
