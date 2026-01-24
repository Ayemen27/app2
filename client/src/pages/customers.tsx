import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from "@/components/ui/card";
import { 
  Users, Plus, Search, Phone, Mail, MapPin, 
  MoreVertical, Edit2, Trash2, UserPlus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

export default function CustomersPage() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="container mx-auto p-6 space-y-8" dir="rtl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            إدارة الزبائن
          </h1>
          <p className="text-muted-foreground mt-1 font-medium">إضافة ومتابعة بيانات الزبائن والمشاريع المرتبطة بهم</p>
        </div>
        <Button className="gap-2 hover-elevate">
          <UserPlus className="h-4 w-4" />
          إضافة زبون جديد
        </Button>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <div className="relative group max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="البحث باسم الزبون أو رقم الهاتف..." 
              className="pr-10 h-11 rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
            {/* Placeholder for customer cards */}
            <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-2xl border border-dashed col-span-full">
              <Users className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground font-medium">لا يوجد زبائن حالياً</p>
              <Button variant="link" className="text-primary mt-2">ابدأ بإضافة أول زبون</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
