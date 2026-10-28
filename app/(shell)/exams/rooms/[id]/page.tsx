import { RoomSeatingClient } from "@/components/exams/room-seating-client";

type Params = Promise<{ id: string }>;

export default async function ExamRoomDetailsPage({ params }: { params: Params }) {
  const { id } = await params;
  return <RoomSeatingClient hallId={id} />;
}
