"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function EventRedirect() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/activities/${params.id}`);
  }, [params.id, router]);

  return null;
}
