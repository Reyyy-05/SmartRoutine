"use client";

import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, orderBy, deleteDoc, doc, Timestamp } from "firebase/firestore";
import { deleteObject, ref } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import type { Activity } from "@/types";
import { Trash2, CheckCircle, XCircle, Loader2, Hourglass } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TodaysActivitiesTableProps {
  userId: string;
}

const statusConfig: { [key: string]: { icon: React.ElementType; color: string; text: string } } = {
    pending: { icon: Hourglass, color: "text-amber-500", text: "Pending" },
    validated: { icon: CheckCircle, color: "text-green-500", text: "Validated" },
    rejected: { icon: XCircle, color: "text-red-500", text: "Rejected" },
};

export function TodaysActivitiesTable({ userId }: TodaysActivitiesTableProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) {
        setIsLoading(false);
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const q = query(
      collection(db, "activities"),
      where("userId", "==", userId),
      where("createdAt", ">=", Timestamp.fromDate(today)),
      where("createdAt", "<", Timestamp.fromDate(tomorrow)),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const userActivities: Activity[] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activity));
      setActivities(userActivities);
      setIsLoading(false);
    }, (error) => {
        console.error("Error fetching today's activities: ", error);
        toast({ title: "Error", description: "Could not fetch today's activities.", variant: "destructive" });
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [userId, toast]);

  const handleDelete = async (activity: Activity) => {
    if (!activity?.id) {
        toast({ title: "Error", description: "Unable to delete activity. Missing activity ID.", variant: "destructive" });
        return;
    }
    try {
      await deleteDoc(doc(db, "activities", activity.id));

      if (activity.evidenceUrl) {
        const fileRef = ref(storage, activity.evidenceUrl);
        await deleteObject(fileRef).catch((storageError) => {
            console.warn("Could not delete evidence file from storage:", storageError);
        });
      }
      
      toast({
        title: "Aktivitas Dihapus",
        description: `${activity.activityName} telah dihapus.`,
      });

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error menghapus aktivitas",
        description: error.message,
      });
    }
  };

  return (
    <Card className="shadow-lg h-full border-none bg-card/80 backdrop-filter backdrop-blur-lg">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Aktivitas Hari Ini</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center text-muted-foreground py-10">
            <p>Belum ada aktivitas hari ini.</p>
            <p>Mulai aktivitas baru untuk melihatnya di sini!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-muted-foreground">AKTIVITAS</TableHead>
                  <TableHead className="text-muted-foreground text-center">NILAI</TableHead>
                  <TableHead className="text-muted-foreground text-center">STATUS</TableHead>
                  <TableHead className="text-muted-foreground text-right">AKSI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.map((activity) => {
                  const statusInfo = statusConfig[activity.status];
                  const StatusIcon = statusInfo?.icon;
                  const priority = activity.details?.priority?.charAt(0) || '-';

                  return (
                    <TableRow key={activity.id}>
                      <TableCell className="font-medium">
                          {activity.activityName}
                          <p className="text-xs text-muted-foreground">{activity.durationMinutes} menit</p>
                      </TableCell>
                       <TableCell className="text-center">
                        <Badge variant={priority === 'T' ? 'destructive' : priority === 'R' ? 'outline' : 'secondary'} className="w-6 h-6 flex items-center justify-center p-0">{priority}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {statusInfo && StatusIcon ? (
                           <StatusIcon className={`w-5 h-5 inline-block ${statusInfo.color}`} />
                        ) : (
                         <span>-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive/70 hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tindakan ini tidak bisa dibatalkan. Ini akan menghapus aktivitas secara permanen.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel asChild><Button variant="outline">Batal</Button></AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(activity)} className="bg-destructive hover:bg-destructive/90">Hapus</Button>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
