import { dataResponse } from "@/app/api/v1/_shared";
import { authFlowTemplates } from "@/modules/auth-config";

export function GET() {
  return dataResponse(
    authFlowTemplates.map(({ id, name, description }) => ({ id, name, description })),
  );
}
