"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import type { Activity, UserProfile } from "@/types";
import { Loader2, Check, X, ExternalLink } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from 'date-fns';

export function AdminPanelClient() {
  const { userProfile, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  const [pendingActivities, setPendingActivities] = useState<Activity[]>([]);
  const [users, setUsers] = useState<Map<string, UserProfile>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Admin role check
  useEffect(() => {
    if (!isAuthLoading && userProfile && userProfile.role !== 'admin') {
      router.push('/dashboard'); // Redirect non-admin users
    }
  }, [userProfile, isAuthLoading, router]);

  useEffect(() => {
    if (!userProfile || userProfile.role !== 'admin') return; // Only fetch if admin

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
  }, [userProfile]); // Add userProfile to dependency array

  useEffect(() => {
 const fetchUsernames = async () => {
      if (pendingActivities.length > 0) {
        const userIds = [...new Set(pendingActivities.map(act => act.userId))];
        const newUsersMap = new Map(users);
        const usersToFetch = userIds.filter(id => id && !newUsersMap.has(id)); // Ensure id is not null/undefined

        if (usersToFetch.length > 0) {
 const usersRef = collection(db, "users");
 // Firestore 'in' query has a limit of 10
          const batches = [];
          for (let i = 0; i < usersToFetch.length; i += 10) { // Batch fetch users
            batches.push(usersToFetch.slice(i, i + 10));
          }

 for (const batch of batches) {
            const q = query(usersRef, where('uid', 'in', batch));
            const userDocs = await getDocs(q);
            userDocs.forEach(doc => {
                    newUsersMap.set(doc.id, doc.data() as UserProfile);
                });
            }
            setUsers(newUsersMap);
        }
      }
    };
    fetchUsernames();
  }, [pendingActivities, users]); // Added users to dependency array

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

  // Display loading state or redirect before rendering content
  if (isAuthLoading || (userProfile && userProfile.role !== 'admin')) {
      return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      ); // Or a simple loading message/component
  }

 // Render admin panel only if user is admin
  if (!userProfile || userProfile.role !== 'admin') {
      return null; // Should be redirected by useEffect, but this is a fallback
  }

  return (
    <div className="flex flex-col gap-6 p-6 bg-background min-h-screen">
       <Card className="shadow-lg">
          <CardHeader>
              <CardTitle className="text-3xl font-headline">Admin Validation Panel</CardTitle>
              <CardDescription>Review and validate user-submitted activities.</CardDescription>
          </CardHeader>
      </Card>
      <Card className="shadow-lg">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary"/>
            </div>
          ) : pendingActivities.length === 0 ? (
            <div className="text-center text-muted-foreground py-20">
              <p className="text-lg">All caught up!</p>
              <p>No pending activities to validate.</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-primary/10">
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
 {activity.evidenceUrl ? ( // Removed extra closing parenthesis
 <Button variant="outline" size="sm" asChild >
                           <Link href={activity.evidenceUrl} target="_blank" rel="noopener noreferrer">
                            View <ExternalLink className="ml-2 h-3 w-3"/>
                          </Link>
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-sm">None</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2 min-w-[100px]">
                      <Button size="icon" variant="outline" className="text-green-600 hover:text-green-600 hover:bg-green-100" onClick={() => handleUpdateStatus(activity.id!, "validated")}>
                        <Check className="h-4 w-4" />
                      </Button>
 <Button size="icon" variant="outline" className="text-red-600 hover:text-red-600 hover:bg-red-100" onClick={() => handleUpdateStatus(activity.id!, "rejected")}> {/* Added ! for non-null assertion */}
                        <X className="h-4 w-4" />
                      </Button>
                    </TableCell>
 </TableRow>
                ))}
              </TableBody>
            </Table>
          )} {/* Added closing curly brace */}
        </CardContent>
      </Card>
    </div>
  );
}
