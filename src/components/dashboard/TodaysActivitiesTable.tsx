"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// A minimal version of the component to debug the persistent parsing error.
export function TodaysActivitiesTable({ userId }: { userId: string }) {
  return (
    <Card className="shadow-lg h-full border-none bg-card/80 backdrop-filter backdrop-blur-lg">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Aktivitas Hari Ini (Debug)</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="text-center text-muted-foreground py-10">
          <p>Jika Anda melihat ini, artinya error build sudah teratasi.</p>
          <p>Kita bisa melanjutkan pengembangan dari sini.</p>
        </div>
      </CardContent>
    </Card>
  );
}
