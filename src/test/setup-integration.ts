import { config } from "dotenv";
import { vi } from "vitest";

config({ quiet: true });
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
