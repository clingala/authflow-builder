import type { NextRequest } from "next/server";
import { toNextJsHandler } from "better-auth/next-js";

import { getAuth } from "@/lib/auth/server";

function handlers() {
  return toNextJsHandler(getAuth());
}

export function GET(request: NextRequest) {
  return handlers().GET(request);
}

export function POST(request: NextRequest) {
  return handlers().POST(request);
}

