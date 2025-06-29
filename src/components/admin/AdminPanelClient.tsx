"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { Activity, UserProfile } from "@/types";
import { Loader2, Check, X, ExternalLink } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from 'date-fns';

export function AdminPanelClient() {
  const [pendingActivities, setPendingActivities] = useState<Activity[]>([]);
  const [users, setUsers] = useState<Map<string, UserProfile>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const q = query(
      collection(db, "activities"),
      where("status", "==", "pending"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const activities: Activity[] = [];
      querySnapshot.forEach((doc) => {
        activities.push({ id: doc.id, ...doc.data() } as Activity);
      });
      setPendingActivities(activities);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchUsernames = async () => {
      if (pendingActivities.length > 0) {
        const userIds = [...new Set(pendingActivities.map(act => act.userId))];
        const newUsersMap = new Map(users);
        const usersToFetch = userIds.filter(id => !newUsersMap.has(id));

        if (usersToFetch.length > 0) {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where('uid', 'in', usersToFetch));
            const userDocs = await getDocs(q);
            userDocs.forEach(doc => {
                newUsersMap.set(doc.id, doc.data() as UserProfile);
            });
            setUsers(newUsersMap);
        }
      }
    };
    fetchUsernames();
  }, [pendingActivities]);

  const activitiesWithUsernames = useMemo(() => {
    return pendingActivities.map(activity => ({
        ...activity,
        username: users.get(activity.userId)?.username || 'Loading...'
    }));
  }, [pendingActivities, users]);


  const handleUpdateStatus = async (activityId: string, status: "validated" | "rejected") => {
    const activityRef = doc(db, "activities", activityId);
    try {
      await updateDoc(activityRef, { status });
      toast({
        title: "Activity Updated",
        description: `The activity has been ${status}.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message,
      });
    }
  };

  return (
    <div className="flex flex-col gap-6">
       <Card>
          <CardHeader>
              <CardTitle className="text-3xl font-headline">Admin Validation Panel</CardTitle>
              <CardDescription>Review and validate user-submitted activities.</CardDescription>
          </CardHeader>
      </Card>
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : pendingActivities.length === 0 ? (
            <div className="text-center text-muted-foreground py-20">
              <p className="text-lg">All caught up!</p>
              <p>No pending activities to validate.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Evidence</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activitiesWithUsernames.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell className="font-medium">{activity.username}</TableCell>
                    <TableCell>
                        <p>{activity.activityName}</p>
                        <p className="text-xs text-muted-foreground">{activity.activityType}</p>
                    </TableCell>
                    <TableCell>{activity.durationMinutes} min</TableCell>
                    <TableCell>{formatDistanceToNow(activity.createdAt.toDate(), { addSuffix: true })}</TableCell>
                    <TableCell>
                      {activity.evidenceUrl ? (
                        <Button variant="outline" size="sm" asChild>
                           <Link href={activity.evidenceUrl} target="_blank" rel="noopener noreferrer">
                            View <ExternalLink className="ml-2 h-3 w-3" />
                           </Link>
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-sm">None</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="icon" variant="outline" className="text-green-600 hover:text-green-600 hover:bg-green-100" onClick={() => handleUpdateStatus(activity.id, "validated")}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="outline" className="text-red-600 hover:text-red-600 hover:bg-red-100" onClick={() => handleUpdateStatus(activity.id, "rejected")}>
                        <X className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
