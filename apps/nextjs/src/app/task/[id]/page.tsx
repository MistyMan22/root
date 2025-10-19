import { TaskPage } from "~/app/_components/task-page";

export default function TaskPageRoute({ params }: { params: { id: string } }) {
  return <TaskPage todoId={params.id} />;
}
