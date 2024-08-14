"use client";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const goToCapturePage = () => {
    router.push("/CaptureTest");
  };
  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <title>Title</title>
      <div className="">
        <button
          className="bg-blue-200 p-5 rounded-[10vh] font-bold"
          onClick={goToCapturePage}
        >
          Capture Image Feature
        </button>
      </div>
    </main>
  );
}
