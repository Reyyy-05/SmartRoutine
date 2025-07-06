"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { collection, query, where, onSnapshot, Timestamp, deleteDoc, doc, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2, Loader2 } from "lucide-react";
import type { Activity } from "@/types";
import { useToast } from "@/hooks/use-toast";

export function TodaysActivitiesTable() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const q = query(
      collection(db, "activities"),
      where("userId", "==", user.uid),
      where("createdAt", ">=", Timestamp.fromDate(startOfToday)),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userActivities = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Activity[];
      setActivities(userActivities);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching activities:", error);
      toast({ variant: "destructive", title: "Gagal memuat aktivitas" });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, toast]);

  const handleDelete = async (activityId: string) => {
    try {
      await deleteDoc(doc(db, "activities", activityId));
      toast({ title: "Aktivitas dihapus" });
    } catch (error) {
      console.error("Error deleting activity:", error);
      toast({ variant: "destructive", title: "Gagal menghapus aktivitas" });
    }
  };

  const statusConfig: { [key in Activity['status']]: { label: string; variant: "default" | "secondary" | "destructive" | "outline" | null | undefined } } = {
    pending: { label: "Pending", variant: "outline" },
    validated: { label: "Valid", variant: "secondary" },
    rejected: { label: "Ditolak", variant: "destructive" },
  };

  return (
    <Card className="bg-white/40 backdrop-blur-2xl border border-white/50 rounded-3xl shadow-lg h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-gray-800">Aktivitas Hari Ini</CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1">
        <div className="overflow-y-auto h-full max-h-[500px]">
          {isLoading ? (
            <div className="flex justify-center items-center h-full"><Loader2 className="w-8 h-8 animate-spin text-pink-500" /></div>
          ) : activities.length === 0 ? (
            <div className="text-center text-gray-500 py-20 flex flex-col items-center">
              <Trash2 className="w-16 h-16 text-gray-300 mb-4" />
              <p>Belum ada aktivitas hari ini.</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 bg-white/60 backdrop-blur-sm z-10">
                <TableRow className="border-b border-gray-100">
                  <TableHead className="text-xs font-semibold uppercase text-gray-500 tracking-wider">Aktivitas</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-gray-500 tracking-wider">Nilai</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-gray-500 tracking-wider text-center">Status</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-gray-500 tracking-wider text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.map((activity) => {
                  const currentStatus = statusConfig[activity.status];
                  return (
                    <TableRow key={activity.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                      <TableCell>
                        <p className="font-medium text-gray-800">{activity.activityName}</p>
                        <p className="text-sm text-gray-500">{activity.durationMinutes} menit</p>
                      </TableCell>
                       <TableCell>
                        <div className="flex flex-col text-xs text-gray-600">
                          <span><span className="font-semibold">P:</span> {activity.details?.priority}</span>
                          <span><span className="font-semibold">F:</span> {activity.details?.focusLevel}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={currentStatus.variant} className="capitalize">{currentStatus.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                             <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-500 hover:bg-red-100 rounded-full w-8 h-8">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Anda yakin?</AlertDialogTitle>
                              <AlertDialogDescription>Tindakan ini tidak dapat dibatalkan. Ini akan menghapus aktivitas Anda secara permanen.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(activity.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Hapus</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
