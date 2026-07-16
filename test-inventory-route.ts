import { NextRequest } from "next/server";
import { GET } from "./src/app/api/finance/inventory/route.ts";

// Mock getServerSession to bypass auth
jest = { mock: () => {} }; // Mocking not possible easily here, let's just modify the route to skip auth
