"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { Activity } from "@/types";
import { useToast } from "@/hooks/use-toast";

// Mock data to display in the table
const mockActivities: Partial<Activity>[] = [
  {
    id: '1',
    activityName: 'Belajar Next.js',
    activityType: 'Study',
    durationMinutes: 45,
    status: 'validated',
    details: { priority: 'Tinggi', focusLevel: 'Penuh' },
  },
  {
    id: '2',
    activityName: 'Lari Pagi',
    activityType: 'Workout',
    durationMinutes: 30,
    status: 'pending',
    details: { priority: 'Sedang', focusLevel: 'Sedang' },
  },
  {
    id: '3',
    activityName: 'Istirahat Nonton Film',
    activityType: 'Break',
    durationMinutes: 90,
    status: 'rejected',
    details: { priority: 'Rendah', focusLevel: 'Rendah' },
  },
  {
    id: '4',
    activityName: 'Mengerjakan Proyek',
    activityType: 'Study',
    durationMinutes: 120,
    status: 'validated',
    details: { priority: 'Tinggi', focusLevel: 'Penuh' },
  },
];


export function TodaysActivitiesTable() {
  const { toast } = useToast();

  const statusConfig: { [key in Activity['status']]: { label: string; variant: "default" | "secondary" | "destructive" | "outline" | null | undefined } } = {
    pending: { label: "Pending", variant: "outline" },
    validated: { label: "Validated", variant: "secondary" },
    rejected: { label: "Rejected", variant: "destructive" },
  };

  const handleDelete = (activityId: string) => {
    // In a real app, you would call a function to delete the activity from Firestore.
    // For this example, we'll just show a toast notification.
    toast({
      title: "Fungsi Hapus",
      description: `Ini adalah contoh aksi hapus untuk aktivitas ID: ${activityId}`,
    });
  };

  return (
    <Card className="shadow-lg h-full border-none bg-card/80 backdrop-filter backdrop-blur-lg lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Aktivitas Hari Ini</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {mockActivities.length === 0 ? (
          <div className="text-center text-muted-foreground py-10">
            <p>Belum ada aktivitas hari ini.</p>
          </div>
        ) : (
          <div className="max-h-[350px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card/90 backdrop-filter backdrop-blur-lg">
                <TableRow>
                  <TableHead>Aktivitas</TableHead>
                  <TableHead>Durasi</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Nilai</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockActivities.map((activity) => {
                  const currentStatus = statusConfig[activity.status!];
                  return (
                    <TableRow key={activity.id}>
                      <TableCell>
                        <p className="font-medium">{activity.activityName}</p>
                        <p className="text-xs text-muted-foreground">{activity.activityType}</p>
                      </TableCell>
                      <TableCell>{activity.durationMinutes} min</TableCell>
                      <TableCell>
                        <Badge variant={currentStatus.variant}>
                          {currentStatus.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-xs">
                          <span className="font-semibold">P: {activity.details!.priority}</span>
                          <span>F: {activity.details!.focusLevel}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(activity.id!)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
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
