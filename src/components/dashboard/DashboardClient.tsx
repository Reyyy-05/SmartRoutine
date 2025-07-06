"use client";

import { useState, useEffect, useCallback } from "react";
import { collection, query, where, onSnapshot, addDoc, Timestamp, deleteDoc, doc } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ActivityForm } from "./ActivityForm";
import { TodaysActivitiesTable } from "./TodaysActivitiesTable";
import { ProductivityInsights } from "./ProductivityInsights";
import { Goal, Activity } from "@/types";
import { Trophy, Loader2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";


export function DashboardClient() {
  const { user, userProfile, loading } = useAuth();
  const [greeting, setGreeting] = useState("Hello");
  const [currentTime, setCurrentTime] = useState(new Date());

  const [goals, setGoals] = useState<Goal[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [showAddGoalForm, setShowAddGoalForm] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: "",
    type: "daily_duration" as "daily_duration" | "weekly_frequency",
    activityCategory: "Study",
    targetValue: 0,
  });
  const [goalProgress, setGoalProgress] = useState<{ [goalId: string]: number }>({});
  const { toast } = useToast();

  const calculateGoalProgress = useCallback((goal: Goal, activities: Activity[]): {progress: number, value: number} => {
    const relevantActivities = activities.filter(activity => activity.activityType === goal.activityCategory && activity.status === 'validated');

    if (goal.type === 'daily_duration') {
      const today = new Date().toDateString();
      const dailyActivities = relevantActivities.filter(activity => activity.createdAt.toDate().toDateString() === today);
      const totalDurationToday = dailyActivities.reduce((sum, activity) => sum + activity.durationMinutes, 0);
      return {
        progress: Math.min((totalDurationToday / goal.targetValue) * 100, 100),
        value: totalDurationToday
      };
    } else if (goal.type === 'weekly_frequency') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const recentActivities = relevantActivities.filter(activity => activity.createdAt.toDate() >= oneWeekAgo);
      return {
        progress: Math.min((recentActivities.length / goal.targetValue) * 100, 100),
        value: recentActivities.length
      };
    }
    return { progress: 0, value: 0 };
  }, []);

  useEffect(() => {
    const hours = new Date().getHours();
    if (hours < 12) setGreeting("Selamat Pagi");
    else if (hours < 18) setGreeting("Selamat Siang");
    else if (hours < 21) setGreeting("Selamat Sore");
    else setGreeting("Selamat Malam");

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  useEffect(() => {
    if (!user) return;

    const goalsQuery = query(collection(db, "goals"), where("userId", "==", user.uid));
    const unsubscribeGoals = onSnapshot(goalsQuery, (snapshot) => {
      const goalsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Goal[];
      setGoals(goalsData);
    }, (error) => {
      console.error("Error fetching goals: ", error);
      toast({ title: "Error", description: "Failed to load goals.", variant: "destructive" });
    });

    const activitiesQuery = query(collection(db, "activities"), where("userId", "==", user.uid));
    const unsubscribeActivities = onSnapshot(activitiesQuery, (snapshot) => {
      const activitiesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activity));
      setActivities(activitiesData.sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime()));
    }, (error) => {
      console.error("Error fetching activities: ", error);
      toast({ title: "Error", description: "Failed to load activities.", variant: "destructive" });
    });

    return () => {
      unsubscribeGoals();
      unsubscribeActivities();
    };
  }, [user, toast]);

  useEffect(() => {
    if (goals.length > 0 && activities.length >= 0) {
      const progressMap: { [goalId: string]: number } = {};
      goals.forEach(goal => {
        progressMap[goal.id!] = calculateGoalProgress(goal, activities).progress;
      });
      setGoalProgress(progressMap);
    }
  }, [goals, activities, calculateGoalProgress]);

  const handleAddGoal = async () => {
    if (!user) {
      toast({ title: "Error", description: "User not authenticated.", variant: "destructive" });
      return;
    }
    if (!newGoal.title.trim() || !newGoal.activityCategory.trim() || !newGoal.type) {
      toast({
        title: "Validation Error",
        description: "Title, type, and activity category cannot be empty.",
        variant: "destructive",
      });
      return;
    }

    if (newGoal.targetValue <= 0 || isNaN(newGoal.targetValue)) {
     toast({
       title: "Validation Error",
       description: "Target value must be a positive number.",
       variant: "destructive",
     });
     return;
   }

    try {
      await addDoc(collection(db, "goals"), {
        userId: user.uid,
        title: newGoal.title.trim(),
        type: newGoal.type,
        activityCategory: newGoal.activityCategory.trim(),
        targetValue: newGoal.targetValue,
        status: "active",
        createdAt: Timestamp.now(),
      });
      toast({ title: "Goal Added", description: "Your new goal has been successfully added." });
      setNewGoal({ title: "", type: "daily_duration", activityCategory: "Study", targetValue: 0 });
      setShowAddGoalForm(false);
    } catch (error) {
      console.error("Error adding goal: ", error);
      toast({ title: "Error", description: "Failed to add goal.", variant: "destructive" });
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!user) return;

    try {
      await deleteDoc(doc(db, "goals", goalId));
      toast({ title: "Goal Deleted", description: "The goal has been successfully deleted." });
    } catch (error) {
      console.error("Error deleting goal: ", error);
      toast({ title: "Error", description: "Failed to delete goal.", variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="flex h-screen w-full items-center justify-center bg-transparent"><Loader2 className="h-12 w-12 animate-spin text-primary-foreground" /></div>;
  }

  if (!user || !userProfile) {
    return <div className="flex h-screen w-full items-center justify-center bg-transparent"><Loader2 className="h-12 w-12 animate-spin text-primary-foreground" /></div>;
  }


  return (
    <div className="flex flex-col gap-6 p-6 bg-transparent min-h-screen">
      <Card className="shadow-lg border-none bg-card/80 backdrop-filter backdrop-blur-lg">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-4xl font-bold">{greeting}, {userProfile.username}!</CardTitle>
              <CardDescription>Ini adalah ringkasan produktivitasmu hari ini.</CardDescription>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold font-mono text-foreground/90">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</p>
              <p className="text-sm text-muted-foreground">{currentTime.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>
        </CardHeader>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 auto-rows-fr">
        <ActivityForm userId={user.uid} />
        
        <TodaysActivitiesTable />

        <div className="flex flex-col gap-6">
            <Card className="shadow-lg border-none bg-card/80 backdrop-filter backdrop-blur-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-lg font-semibold">Target Aktif</CardTitle>
                    <Button variant="link" size="sm" className="text-primary-foreground" onClick={() => setShowAddGoalForm(!showAddGoalForm)}>
                        <Plus className="mr-1 h-4 w-4" />
                        {showAddGoalForm ? "Tutup" : "Tambah"}
                    </Button>
                </CardHeader>
                <CardContent>
                    {showAddGoalForm && (
                        <div className="mb-4 p-4 border rounded-lg bg-card/70 flex flex-col gap-3">
                            <h3 className="text-md font-semibold">Tambah Goal Baru</h3>
                            <div className="space-y-2">
                                <Label htmlFor="goal-title">Judul</Label>
                                <Input id="goal-title" value={newGoal.title} onChange={(e) => setNewGoal({...newGoal, title: e.target.value})} placeholder="e.g., Belajar 1 Jam"/>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="activity-category">Kategori Aktivitas</Label>
                                <Select onValueChange={(value) => setNewGoal({...newGoal, activityCategory: value})} value={newGoal.activityCategory}>
                                    <SelectTrigger id="activity-category"><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                                    <SelectContent>
                                    <SelectItem value="Study">Belajar</SelectItem>
                                    <SelectItem value="Workout">Olahraga</SelectItem>
                                    <SelectItem value="Break">Istirahat</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="target-value">Target (menit atau frekuensi)</Label>
                                <Input id="target-value" type="number" value={newGoal.targetValue || ''} onChange={(e) => setNewGoal({...newGoal, targetValue: parseInt(e.target.value) || 0})} min="1" />
                            </div>
                            <Button onClick={handleAddGoal} className="self-end bg-primary-foreground text-white">Tambah Goal</Button>
                        </div>
                    )}
                    {goals.length === 0 ? (
                        <div className="text-center text-muted-foreground py-5">
                            <p>Belum ada target.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {goals.map(goal => {
                                const {progress, value} = calculateGoalProgress(goal, activities);
                                return (
                                <div key={goal.id!} className="flex flex-col">
                                    <div className="flex justify-between items-end text-sm mb-1">
                                        <span className="font-medium">{goal.title}</span>
                                        <span className="font-semibold text-muted-foreground">{value}/{goal.targetValue}</span>
                                    </div>
                                    <Progress value={progress} className="h-2"/>
                                    <Button variant="link" size="sm" className="text-destructive self-end h-auto p-0 mt-1" onClick={() => handleDeleteGoal(goal.id!)}>Hapus</Button>
                                </div>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

           <ProductivityInsights userId={user.uid} />
        </div>
      </div>
    </div>
  );
}
