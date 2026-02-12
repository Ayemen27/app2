import { useQuery, useMutation } from "@tanstack/react-query";
import { Task, InsertTask, insertTaskSchema } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2 } from "lucide-react";
import { QUERY_KEYS } from "@/constants/queryKeys";

export default function Tasks() {
  const { toast } = useToast();
  const { data: tasks, isLoading } = useQuery<Task[]>({ 
    queryKey: QUERY_KEYS.tasks 
  });

  const form = useForm<InsertTask>({
    resolver: zodResolver(insertTaskSchema),
    defaultValues: { title: "", description: "", completed: false }
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertTask) => {
      await apiRequest("POST", "/api/tasks", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks });
      form.reset();
      toast({ title: "Task created" });
    }
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: number, completed: boolean }) => {
      await apiRequest("PATCH", `/api/tasks/${id}`, { completed });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks });
      toast({ title: "Task deleted", variant: "destructive" });
    }
  });

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Add New Task</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl><Input {...field} data-testid="input-task-title" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Input {...field} data-testid="input-task-desc" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={createMutation.isPending} data-testid="button-task-submit">
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Task
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {tasks?.map((task) => (
          <Card key={task.id} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <Checkbox 
                checked={task.completed} 
                onCheckedChange={(checked) => toggleMutation.mutate({ id: task.id, completed: !!checked })}
                data-testid={`checkbox-task-${task.id}`}
              />
              <div className={task.completed ? "line-through text-muted-foreground" : ""}>
                <div className="font-medium" data-testid={`text-task-title-${task.id}`}>{task.title}</div>
                <div className="text-sm text-muted-foreground">{task.description}</div>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => deleteMutation.mutate(task.id)}
              data-testid={`button-delete-task-${task.id}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
