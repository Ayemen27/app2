import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutDashboard, HardHat, Drill, Briefcase } from "lucide-react";

export default function Dashboard() {
  // Queries for stats (assuming API endpoints exist or will be created)
  const { data: projectsData } = useQuery({ queryKey: ["/api/projects"] });
  const { data: workersData } = useQuery({ queryKey: ["/api/workers"] });
  const { data: wellsData } = useQuery({ queryKey: ["/api/wells"] });

  const projects = Array.isArray(projectsData) ? projectsData : (projectsData as any)?.data || [];
  const workers = Array.isArray(workersData) ? workersData : (workersData as any)?.data || [];
  const wells = Array.isArray(wellsData) ? wellsData : (wellsData as any)?.data || [];

  const stats = [
    {
      title: "إجمالي المشاريع",
      value: projects.length,
      icon: Briefcase,
      description: "المشاريع القائمة والمكتملة",
    },
    {
      title: "القوى العاملة",
      value: workers.length,
      icon: HardHat,
      description: "المهندسين والعمال المسجلين",
    },
    {
      title: "الآبار المنفذة",
      value: wells.length,
      icon: Drill,
      description: "آبار المياه الجاري تنفيذها",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <LayoutDashboard className="w-6 h-6 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight">لوحة التحكم الإدارية</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat, index) => (
          <Card key={index} className="hover-elevate">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
