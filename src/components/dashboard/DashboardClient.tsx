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
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

export function DashboardClient() {
  const { user, userProfile, loading } = useAuth();
  const [greeting, setGreeting] = useState("Hello");
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");

  const [goals, setGoals] = useState<Goal[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [showAddGoalForm, setShowAddGoalForm] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: "",
    type: "daily_duration" as "daily_duration" | "weekly_frequency",
    activityCategory: "Study",
    targetValue: 0,
  });
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

    const timer = setInterval(() => {
        const now = new Date();
        setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
        setCurrentDate(now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    }, 1000);
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

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const activitiesQuery = query(collection(db, "activities"), where("userId", "==", user.uid), where("createdAt", ">=", Timestamp.fromDate(startOfToday)));
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

  const handleAddGoal = async () => {
    if (!user) return;
    if (!newGoal.title.trim() || !newGoal.activityCategory.trim() || !newGoal.type || !newGoal.targetValue) {
      toast({ variant: "destructive", title: "Validation Error", description: "Please fill all fields for the new goal." });
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
      toast({ title: "Error", description: "Failed to add goal.", variant: "destructive" });
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "goals", goalId));
      toast({ title: "Goal Deleted", description: "The goal has been successfully deleted." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete goal.", variant: "destructive" });
    }
  };

  if (loading || !user || !userProfile) {
    return <div className="flex h-screen w-full items-center justify-center bg-transparent"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  const firstName = userProfile.username.split(' ')[0];

  return (
    <div className="flex flex-col gap-6 min-h-full">
      <Card className="bg-white/40 backdrop-blur-2xl border border-white/50 rounded-3xl shadow-lg p-2">
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-4xl font-extrabold text-gray-800">{greeting}, {firstName}!</CardTitle>
              <CardDescription className="text-gray-600 text-lg">Ini adalah ringkasan produktivitasmu hari ini.</CardDescription>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-3xl font-bold text-gray-800 tracking-wider">{currentTime || "00:00:00"}</div>
              <div className="text-sm text-gray-500">{currentDate || "..."}</div>
            </div>
          </div>
        </CardHeader>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        <div className="lg:col-span-3">
            <ActivityForm userId={user.uid} />
        </div>
        
        <div className="lg:col-span-5">
            <TodaysActivitiesTable />
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
            <Card className="bg-white/40 backdrop-blur-2xl border border-white/50 rounded-3xl shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xl font-semibold text-gray-800">Target Aktif</CardTitle>
                    <Button variant="link" size="sm" className="text-pink-500 font-semibold hover:text-pink-600" onClick={() => setShowAddGoalForm(!showAddGoalForm)}>
                        <Plus className="mr-1 h-4 w-4" />
                        {showAddGoalForm ? "Tutup" : "Tambah"}
                    </Button>
                </CardHeader>
                <CardContent>
                    {showAddGoalForm && (
                        <div className="mb-4 p-4 border rounded-2xl bg-white/50 flex flex-col gap-3 animate-in fade-in-0 slide-in-from-top-5 duration-300">
                            <h3 className="text-md font-semibold">Tambah Goal Baru</h3>
                             <Input value={newGoal.title} onChange={(e) => setNewGoal({...newGoal, title: e.target.value})} placeholder="Judul Target" className="form-input" />
                             <Select onValueChange={(value: "daily_duration" | "weekly_frequency") => setNewGoal({...newGoal, type: value})} value={newGoal.type}>
                                <SelectTrigger className="form-input"><SelectValue /></SelectTrigger>
                                <SelectContent><SelectItem value="daily_duration">Durasi Harian</SelectItem><SelectItem value="weekly_frequency">Frekuensi Mingguan</SelectItem></SelectContent>
                             </Select>
                             <Select onValueChange={(value) => setNewGoal({...newGoal, activityCategory: value})} value={newGoal.activityCategory}>
                                <SelectTrigger className="form-input"><SelectValue /></SelectTrigger>
                                <SelectContent><SelectItem value="Study">Belajar</SelectItem><SelectItem value="Workout">Olahraga</SelectItem><SelectItem value="Break">Istirahat</SelectItem></SelectContent>
                            </Select>
                            <Input type="number" value={newGoal.targetValue || ''} onChange={(e) => setNewGoal({...newGoal, targetValue: parseInt(e.target.value) || 0})} placeholder="Nilai Target (menit/kali)" min="1" className="form-input" />
                            <div className="flex gap-2 justify-end">
                              <Button onClick={() => setShowAddGoalForm(false)} variant="ghost" size="sm">Batal</Button>
                              <Button onClick={handleAddGoal} size="sm" className="bg-gradient-to-br from-green-500 to-green-600 text-white hover:shadow-lg hover:shadow-green-500/30">Simpan</Button>
                            </div>
                        </div>
                    )}
                    <div className="space-y-4">
                     {goals.length === 0 ? (
                        <div className="text-center text-gray-500 py-5 text-sm">Belum ada target.</div>
                    ) : (
                        goals.map(goal => {
                            const {progress, value} = calculateGoalProgress(goal, activities);
                            return (
                            <div key={goal.id!} className="relative group">
                                <Button variant="ghost" size="icon" className="absolute top-0 right-0 w-6 h-6 rounded-full text-gray-400 hover:bg-red-100 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDeleteGoal(goal.id!)}><Trash2 className="w-3 h-3"/></Button>
                                <p className="font-semibold text-gray-700 text-sm mb-1 pr-4">{goal.title}</p>
                                <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                                    <span>Progres</span>
                                    <span className="font-medium">{value}/{goal.targetValue} {goal.type === 'daily_duration' ? 'menit' : 'kali'}</span>
                                </div>
                                <Progress value={progress} className="h-2 bg-black/10 [&>div]:bg-gradient-to-r [&>div]:from-pink-500 [&>div]:to-purple-500"/>
                            </div>
                            )
                        })
                    )}
                    </div>
                </CardContent>
            </Card>
           <ProductivityInsights userId={user.uid} />
        </div>
      </div>
    </div>
  );
}
