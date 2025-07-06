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
  const [activityDetails, setActivityDetails] = useState<{ [key: string]: any }>({ focusLevel: 'Penuh', priority: 'Tinggi'});
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
        title: "Informasi Kurang",
        description: "Mohon isi nama dan tipe aktivitas.",
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

      const durationMinutes = Math.max(1, Math.floor(elapsedTime / 60000));

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
        title: "Aktivitas Tersimpan!",
        description: `${activityName} selama ${durationMinutes} menit telah dicatat.`,
      });

      // Reset state
      setActivityName("");
      setActivityType("Study");
      setEvidenceFile(null);
      setIsTracking(false);
      setElapsedTime(0);
      setActivityDetails({ focusLevel: 'Penuh', priority: 'Tinggi' });

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error Menyimpan Aktivitas",
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
    <Card className="shadow-lg border-none bg-card/80 backdrop-filter backdrop-blur-lg">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Mulai Aktivitas</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {!isTracking ? (
          <>
            <div className="grid gap-2">
              <Label htmlFor="activity-name">Nama Aktivitas</Label>
              <Input id="activity-name" placeholder="e.g., Belajar PHP" value={activityName} onChange={(e) => setActivityName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="activity-type">Tipe Aktivitas</Label>
              <Select value={activityType} onValueChange={(value: "Study" | "Workout" | "Break") => setActivityType(value)}>
                <SelectTrigger id="activity-type">
                  <SelectValue placeholder="Pilih tipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Study">Belajar</SelectItem>
                  <SelectItem value="Workout">Olahraga</SelectItem>
                  <SelectItem value="Break">Istirahat</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="focus-level">Tingkat Fokus</Label>
              <Select value={activityDetails.focusLevel} onValueChange={(value) => setActivityDetails({ ...activityDetails, focusLevel: value })}>
                <SelectTrigger id="focus-level">
                  <SelectValue placeholder="Pilih tingkat fokus" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Penuh">Penuh</SelectItem>
                  <SelectItem value="Sedang">Sedang</SelectItem>
                  <SelectItem value="Rendah">Rendah</SelectItem>
                </SelectContent>
              </Select>
            </div>
             <div className="grid gap-2">
              <Label htmlFor="priority">Prioritas</Label>
              <Select value={activityDetails.priority} onValueChange={(value) => setActivityDetails({ ...activityDetails, priority: value })}>
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Pilih prioritas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tinggi">Tinggi</SelectItem>
                  <SelectItem value="Sedang">Sedang</SelectItem>
                  <SelectItem value="Rendah">Rendah</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        ) : (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">{activityName} ({activityType})</p>
            <p className="text-6xl font-bold font-mono my-4">{formatTime(elapsedTime)}</p>
            <div className="grid gap-2">
              <Label htmlFor="evidence">Unggah Bukti (Opsional)</Label>
              <Input id="evidence" type="file" onChange={(e) => setEvidenceFile(e.target.files ? e.target.files[0] : null)} />
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        {!isTracking ? (
          <Button onClick={handleStart} className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 h-11 text-base">
            <Play className="mr-2" /> Mulai
          </Button>
        ) : (
          <Button onClick={handleFinish} className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 animate-spin" /> : <Square className="mr-2" />}
            Selesai & Simpan
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
