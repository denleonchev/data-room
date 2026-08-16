import type { NodeDto } from "@data-room/shared";

// Seed data for the UI slice: the endpoints land in the next PR, so the table,
// breadcrumbs and dialogs are built and checked against this tree instead.

const seededAt = "2026-07-01T09:00:00.000Z";

export const ROOT_ID = "room-1";

export const seedNodes: NodeDto[] = [
  {
    id: ROOT_ID,
    type: "FOLDER",
    name: "My Data Room",
    parentId: null,
    createdAt: seededAt,
    updatedAt: seededAt,
  },
  {
    id: "folder-contracts",
    type: "FOLDER",
    name: "Contracts",
    parentId: ROOT_ID,
    createdAt: seededAt,
    updatedAt: seededAt,
  },
  {
    id: "folder-financials",
    type: "FOLDER",
    name: "Financials",
    parentId: ROOT_ID,
    createdAt: seededAt,
    updatedAt: "2026-08-10T14:32:00.000Z",
  },
  {
    id: "folder-empty",
    type: "FOLDER",
    name: "Due Diligence",
    parentId: ROOT_ID,
    createdAt: seededAt,
    updatedAt: seededAt,
  },
  {
    id: "file-nda",
    type: "FILE",
    name: "NDA.pdf",
    parentId: "folder-contracts",
    createdAt: seededAt,
    updatedAt: seededAt,
  },
  {
    id: "file-msa",
    type: "FILE",
    name: "MSA.pdf",
    parentId: "folder-contracts",
    createdAt: seededAt,
    updatedAt: "2026-08-12T11:05:00.000Z",
  },
  {
    id: "folder-2024",
    type: "FOLDER",
    name: "2024",
    parentId: "folder-financials",
    createdAt: seededAt,
    updatedAt: seededAt,
  },
  {
    id: "file-budget",
    type: "FILE",
    name: "Budget.xlsx",
    parentId: "folder-2024",
    createdAt: seededAt,
    updatedAt: seededAt,
  },
];
