"use client";

import { useState, useEffect } from "react";
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
import { Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function DashboardClient() {
  const { user, userProfile } = useAuth();
  const [greeting, setGreeting] = useState("Hello");
  const [currentTime, setCurrentTime] = useState(new Date());

  const [goals, setGoals] = useState<Goal[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [showAddGoalForm, setShowAddGoalForm] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: "",
    type: "daily_duration",
    activityCategory: "",
    targetValue: 0,
  });
  const [goalProgress, setGoalProgress] = useState<{ [goalId: string]: number }>({});
  const { toast } = useToast();

  // Helper function to calculate goal progress
  const calculateGoalProgress = (goal: Goal, activities: Activity[]): number => {
    const relevantActivities = activities.filter(activity => activity.activityType === goal.activityCategory && activity.status === 'validated');

    if (goal.type === 'daily_duration') {
      const today = new Date().toDateString();
      const dailyActivities = relevantActivities.filter(activity => activity.createdAt.toDate().toDateString() === today);
      const totalDurationToday = dailyActivities.reduce((sum, activity) => sum + activity.durationMinutes, 0);
      return Math.min((totalDurationToday / goal.targetValue) * 100, 100);
    } else if (goal.type === 'weekly_frequency') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const recentActivities = relevantActivities.filter(activity => activity.createdAt.toDate() >= oneWeekAgo);
      return Math.min((recentActivities.length / goal.targetValue) * 100, 100);
    }
    return 0;
  };

  useEffect(() => {
    const hours = new Date().getHours();
    if (hours < 12) setGreeting("Good Morning");
    else if (hours < 18) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");

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
    if (goals.length > 0) {
      const progressMap: { [goalId: string]: number } = {};
      goals.forEach(goal => {
        progressMap[goal.id!] = calculateGoalProgress(goal, activities);
      });
      setGoalProgress(progressMap);
    }
  }, [goals, activities]);


  const handleAddGoal = async () => {
    if (!user || !newGoal.title.trim() || !newGoal.type || !newGoal.activityCategory.trim() || newGoal.targetValue <= 0 || isNaN(newGoal.targetValue)) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields and ensure target value is greater than 0.",
        variant: "destructive",
      });
      return;
    }

    try {
      await addDoc(collection(db, "goals"), {
        userId: user.uid,
        ...newGoal,
        status: "active",
        createdAt: Timestamp.now(),
      });
      toast({ title: "Goal Added", description: "Your new goal has been successfully added." });
      setNewGoal({ title: "", type: "daily_duration", activityCategory: "", targetValue: 0 });
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

  if (!user || !userProfile) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="flex flex-col gap-6 p-4 bg-background min-h-screen">
      <Card className="shadow-lg border-none bg-card/80 backdrop-filter backdrop-blur-lg">
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
      
      <Card className="shadow-lg border-none bg-card/80 backdrop-filter backdrop-blur-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-headline">Your Goals</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setShowAddGoalForm(!showAddGoalForm)}>
            {showAddGoalForm ? "Hide Form" : "Add New Goal"}
          </Button>
        </CardHeader>
        <CardContent>
          {showAddGoalForm && (
            <div className="mb-6 p-6 border rounded-lg bg-card/70 backdrop-filter backdrop-blur-md flex flex-col gap-4">
              <h3 className="text-lg font-semibold mb-4">Add New Goal</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <Label htmlFor="goal-title">Title</Label>
                  <Input id="goal-title" value={newGoal.title} onChange={(e) => setNewGoal({...newGoal, title: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="goal-type">Type</Label>
                   <Select onValueChange={(value) => setNewGoal({...newGoal, type: value as "daily_duration" | "weekly_frequency"})} value={newGoal.type}>
                    <SelectTrigger id="goal-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily_duration">Daily Duration</SelectItem>
                      <SelectItem value="weekly_frequency">Weekly Frequency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="activity-category">Activity Category</Label>
                   <Input id="activity-category" value={newGoal.activityCategory} onChange={(e) => setNewGoal({...newGoal, activityCategory: e.target.value})} placeholder="e.g., Study" />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="target-value">Target Value (minutes or frequency)</Label>
                  <Input id="target-value" type="number" value={newGoal.targetValue} onChange={(e) => setNewGoal({...newGoal, targetValue: parseInt(e.target.value) || 0})} min="1" />
                </div>
              </div>

              <Button onClick={handleAddGoal} className="self-end bg-primary hover:bg-primary/90 text-primary-foreground">Add Goal</Button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {goals.length === 0 && (
              <p className="text-muted-foreground text-center col-span-full">No goals added yet. Start by adding a new goal!</p>
            )}
            {goals.map(goal => (
              <Card key={goal.id} className={`p-4 flex flex-col justify-between border-none bg-card/70 backdrop-filter backdrop-blur-md ${goalProgress[goal.id!] >= 100 ? 'border-l-4 border-green-500' : ''}`}>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <CardTitle className="text-lg">{goal.title}</CardTitle>
                    {goalProgress[goal.id!] >= 100 && <Trophy className="h-6 w-6 text-green-600" />}
                  </div>
                  <CardDescription>{goal.type.replace('_', ' ')} - {goal.activityCategory}</CardDescription>
                  <p className="text-sm mt-2">Progress: {goalProgress[goal.id!]?.toFixed(1) ?? '0.0'}%</p>
                </div>
                 <div className="flex justify-end mt-4">
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteGoal(goal.id!)}>Delete</Button>
                </div>
              </Card>
            ))} 
          </div>
          </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 auto-rows-fr">
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
