"use client";

import { useState, useEffect, useRef } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
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
  
  const formInputClass = "bg-white/40 backdrop-blur-sm border-black/10 focus:bg-white/60 rounded-2xl h-12";

  return (
    <Card className="bg-white/40 backdrop-blur-2xl border border-white/50 rounded-3xl shadow-lg h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-gray-800">Mulai Aktivitas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 flex-1">
        {!isTracking ? (
          <>
            <Input id="activity-name" placeholder="Nama Aktivitas" value={activityName} onChange={(e) => setActivityName(e.target.value)} className={formInputClass} />
            <Select value={activityType} onValueChange={(value: "Study" | "Workout" | "Break") => setActivityType(value)}>
              <SelectTrigger className={formInputClass}><SelectValue placeholder="Pilih tipe" /></SelectTrigger>
              <SelectContent><SelectItem value="Study">Belajar</SelectItem><SelectItem value="Workout">Olahraga</SelectItem><SelectItem value="Break">Istirahat</SelectItem></SelectContent>
            </Select>
            <Select value={activityDetails.focusLevel} onValueChange={(value) => setActivityDetails({ ...activityDetails, focusLevel: value })}>
              <SelectTrigger className={formInputClass}><SelectValue placeholder="Pilih tingkat fokus" /></SelectTrigger>
              <SelectContent><SelectItem value="Penuh">Penuh</SelectItem><SelectItem value="Sedang">Sedang</SelectItem><SelectItem value="Rendah">Rendah</SelectItem></SelectContent>
            </Select>
            <Select value={activityDetails.priority} onValueChange={(value) => setActivityDetails({ ...activityDetails, priority: value })}>
              <SelectTrigger className={formInputClass}><SelectValue placeholder="Pilih prioritas" /></SelectTrigger>
              <SelectContent><SelectItem value="Tinggi">Tinggi</SelectItem><SelectItem value="Sedang">Sedang</SelectItem><SelectItem value="Rendah">Rendah</SelectItem></SelectContent>
            </Select>
          </>
        ) : (
          <div className="text-center py-6 my-4 border-y-2 border-dashed border-gray-200/80">
            <p className="text-gray-600 text-sm uppercase tracking-widest">{activityName}</p>
            <p className="text-5xl font-extrabold my-2 bg-gradient-to-br from-pink-500 to-purple-600 bg-clip-text text-transparent">{formatTime(elapsedTime)}</p>
             <Input id="evidence" type="file" onChange={(e) => setEvidenceFile(e.target.files ? e.target.files[0] : null)} className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-pink-50 file:text-pink-600 hover:file:bg-pink-100" />
          </div>
        )}
      </CardContent>
      <CardFooter>
        {!isTracking ? (
          <Button onClick={handleStart} className="w-full h-14 text-lg font-semibold bg-gradient-to-br from-green-500 to-green-600 text-white hover:shadow-lg hover:shadow-green-500/30 transition-all duration-300 transform hover:-translate-y-1">
            <Play className="mr-2" /> Mulai
          </Button>
        ) : (
          <Button onClick={handleFinish} className="w-full h-14 text-lg font-semibold bg-gradient-to-br from-red-500 to-red-600 text-white hover:shadow-lg hover:shadow-red-500/30 transition-all duration-300 transform hover:-translate-y-1" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 animate-spin" /> : <Square className="mr-2" />}
            Selesaikan
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
