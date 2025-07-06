"use client";

import { useState, useEffect, useRef } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Play, Square } from "lucide-react";

interface ActivityFormProps {
  userId: string;
}

export function ActivityForm({ userId }: ActivityFormProps) {
  const [activityName, setActivityName] = useState("");
  const [activityType, setActivityType] = useState<"Study" | "Workout" | "Break">("Study");
  const [activityDetails, setActivityDetails] = useState<{ [key: string]: any }>({});
  const [isTracking, setIsTracking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const handleStart = () => {
    if (!activityName || !activityType) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please provide an activity name and type.",
      });
      return;
    }
    startTimeRef.current = Date.now();
    setElapsedTime(0);
    setIsTracking(true);
    intervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        setElapsedTime(Date.now() - startTimeRef.current);
      }
    }, 1000);
  };

  const handleFinish = async () => {
    setIsLoading(true);
    if (intervalRef.current) clearInterval(intervalRef.current);

    try {
      let evidenceUrl = "";
      if (evidenceFile) {
        const fileRef = ref(storage, `uploads/${userId}/${Date.now()}_${evidenceFile.name}`);
        await uploadBytes(fileRef, evidenceFile);
        evidenceUrl = await getDownloadURL(fileRef);
      }

      const durationMinutes = Math.floor(elapsedTime / 60000);

      await addDoc(collection(db, "activities"), {
        userId,
        activityName,
        activityType,
        durationMinutes,
        details: activityDetails,
        evidenceUrl: evidenceUrl || null,
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      toast({
        title: "Activity Saved!",
        description: `${activityName} for ${durationMinutes} minutes has been logged.`,
      });

      // Reset state
      setActivityName("");
      setActivityType("Study");
      setEvidenceFile(null);
      setIsTracking(false);
      setElapsedTime(0);
      setActivityDetails({});

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error Saving Activity",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Track New Activity</CardTitle>
        <CardDescription>Start the timer to log your productivity.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {!isTracking ? (
          <>
            <div className="grid gap-2">
              <Label htmlFor="activity-name">Activity Name</Label>
              <Input id="activity-name" placeholder="e.g., Learn React Hooks" value={activityName} onChange={(e) => setActivityName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="activity-type">Activity Type</Label>
              <Select value={activityType} onValueChange={(value: "Study" | "Workout" | "Break") => {
                setActivityType(value)
                setActivityDetails({}); // Reset details on type change
              }}>
                <SelectTrigger id="activity-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Study">Study</SelectItem>
                  <SelectItem value="Workout">Workout</SelectItem>
                  <SelectItem value="Break">Break</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {activityType === 'Study' && (
              <div className="grid gap-2">
                <Label htmlFor="study-focus">Study Focus (Optional)</Label>
                <Input
                  id="study-focus"
                  placeholder="e.g., Chapter 3, React Hooks"
                  value={activityDetails.studyFocus || ''}
                  onChange={(e) => setActivityDetails({ ...activityDetails, studyFocus: e.target.value })}
                />
              </div>
            )}

            {activityType === 'Workout' && (
              <div className="grid gap-2">
                <Label htmlFor="workout-intensity">Intensity Level (Optional)</Label>
                <Select
                  value={activityDetails.workoutIntensity || ''}
                  onValueChange={(value) => setActivityDetails({ ...activityDetails, workoutIntensity: value })}
                >
                  <SelectTrigger id="workout-intensity">
                    <SelectValue placeholder="Select intensity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {activityType === 'Break' && (
              <div className="grid gap-2">
                <Label htmlFor="break-quality">Break/Sleep Quality (Optional)</Label>
                <Select
                  value={activityDetails.breakQuality || ''}
                  onValueChange={(value) => setActivityDetails({ ...activityDetails, breakQuality: value })}
                >
                  <SelectTrigger id="break-quality">
                    <SelectValue placeholder="Select quality" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="refreshing">Refreshing</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="tired">Tired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </>
        ) : (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">{activityName} ({activityType})</p>
            <p className="text-6xl font-bold font-mono my-4">{formatTime(elapsedTime)}</p>
            <div className="grid gap-2">
              <Label htmlFor="evidence">Upload Evidence (Optional)</Label>
              <Input id="evidence" type="file" onChange={(e) => setEvidenceFile(e.target.files ? e.target.files[0] : null)} />
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        {!isTracking ? (
          <Button onClick={handleStart} className="w-full">
            <Play className="mr-2" /> Start Tracking
          </Button>
        ) : (
          <Button onClick={handleFinish} className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 animate-spin" /> : <Square className="mr-2" />}
            Finish & Save
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}