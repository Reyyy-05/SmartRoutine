"use client";

import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, orderBy, deleteDoc, doc, Timestamp } from "firebase/firestore";
import { deleteObject, ref } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import type { Activity } from "@/types";
import { Trash2, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface TodaysActivitiesTableProps {
  userId: string;
}

const statusConfig: { [key: string]: { icon: React.ElementType; color: string; text: string } } = {
    pending: { icon: Clock, color: "bg-amber-500", text: "Pending" },
    validated: { icon: CheckCircle, color: "bg-green-500", text: "Validated" },
    rejected: { icon: XCircle, color: "bg-red-500", text: "Rejected" },
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
        title: "Activity Deleted",
        description: `${activity.activityName} has been removed.`,
      });

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error deleting activity",
        description: error.message,
      });
    }
  };

  return (
    <Card className="shadow-lg h-full">
      <CardHeader>
        <CardTitle>Today's Activities</CardTitle>
        <CardDescription>A log of your productive moments from today.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center text-muted-foreground py-10">
            <p>No activities logged yet today.</p>
            <p>Start a new activity to see it here!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Activity</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Duration (min)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.map((activity) => {
                   const statusInfo = statusConfig[activity.status] || null;
                   const StatusIcon = statusInfo?.icon;
                  return (
                  <TableRow key={activity.id}>
                    <TableCell className="font-medium">{activity.activityName}</TableCell>
                    <TableCell>{activity.activityType}</TableCell>
                    <TableCell className="text-right">{activity.durationMinutes}</TableCell>
                    <TableCell>
                      {statusInfo && StatusIcon ? (
                       <Badge variant="outline" className="flex items-center gap-1.5 whitespace-nowrap">
                         <StatusIcon className={`w-3.5 h-3.5 ${statusInfo.color} text-white rounded-full p-0.5`} />
                         {statusInfo.text}
                       </Badge>
                      ) : (
                       <Badge variant="outline">Unknown</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the activity and any associated evidence.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel asChild><Button variant="outline">Cancel</Button></AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(activity)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                )})}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
