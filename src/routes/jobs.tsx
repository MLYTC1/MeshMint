import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Briefcase,
  MapPin,
  Clock,
  Coins,
  Search,
  MessageSquare,
} from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/jobs")({
  head: () => ({
    meta: [
      { title: "Jobs — Mesh Mint" },
      {
        name: "description",
        content: "3D and Web3 gigs from studios and creators.",
      },
    ],
  }),
  component: JobsPage,
});

interface Job {
  id: string;
  title: string;
  category: string;
  location: string;
  description: string;
  studio: string;
  role: string;
  postedAgo: string;
  budgetMin: number;
  budgetMax: number;
  currency: "SOL" | "USDC";
}

const JOBS: Job[] = [
  {
    id: "j1",
    title: "Stylized character for indie RPG",
    category: "Characters",
    location: "Remote",
    description:
      "Need a stylized hero with rig and 4 outfits. 4-week timeline.",
    studio: "Hollow Pine Studios",
    role: "3D Character Artist",
    postedAgo: "2h ago",
    budgetMin: 8,
    budgetMax: 12,
    currency: "SOL",
  },
  {
    id: "j2",
    title: "Sci-fi weapon pack (10 assets)",
    category: "Props",
    location: "Remote",
    description: "PBR weapon set, 4K textures, low-poly LODs. Unreal-ready.",
    studio: "Nova Forge",
    role: "Hard-surface Artist",
    postedAgo: "1d ago",
    budgetMin: 1500,
    budgetMax: 2500,
    currency: "USDC",
  },
  {
    id: "j3",
    title: "Modular environment kit",
    category: "Environments",
    location: "Remote · EU timezone",
    description:
      "Cyberpunk alley kit — modular walls, props, decals. 6-week build.",
    studio: "Skyrift Labs",
    role: "Environment Artist",
    postedAgo: "5h ago",
    budgetMin: 14,
    budgetMax: 22,
    currency: "SOL",
  },
  {
    id: "j4",
    title: "Avatar wearables for metaverse drop",
    category: "Wearables",
    location: "Remote",
    description:
      "10 wearables, optimized for VRM. Includes physics-ready hair.",
    studio: "Loop Atelier",
    role: "Stylized 3D Artist",
    postedAgo: "3d ago",
    budgetMin: 800,
    budgetMax: 1400,
    currency: "USDC",
  },
];

const CATS = ["All", "Characters", "Props", "Environments", "Wearables"];

function JobsPage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");

  const filtered = useMemo(
    () =>
      JOBS.filter(
        (j) =>
          (cat === "All" || j.category === cat) &&
          (!q ||
            `${j.title} ${j.studio} ${j.description}`
              .toLowerCase()
              .includes(q.toLowerCase()))
      ),
    [q, cat]
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Gigs
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
          Jobs for 3D creators
        </h1>
        <p className="mt-2 text-muted-foreground">
          Paid in SOL or USDC · Settled on-chain.
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search jobs, studios…"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {CATS.map((c) => (
            <Badge
              key={c}
              variant={cat === c ? "default" : "outline"}
              onClick={() => setCat(c)}
              className="cursor-pointer"
            >
              {c}
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map((j) => (
          <Card key={j.id} className="p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{j.category}</Badge>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {j.location}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> {j.postedAgo}
                  </span>
                </div>
                <h3 className="mt-3 text-lg font-semibold">{j.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {j.description}
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <Avatar className="h-8 w-8 bg-gradient-mint">
                    <AvatarFallback className="bg-transparent text-xs text-primary-foreground">
                      {j.studio.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-sm">
                    <p className="font-medium">{j.studio}</p>
                    <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                      <Briefcase className="h-3 w-3" /> {j.role}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-stretch gap-2 sm:items-end">
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm font-semibold">
                  <Coins className="h-4 w-4 text-primary" />
                  {j.budgetMin}–{j.budgetMax} {j.currency}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Message
                  </Button>
                  <Button size="sm" className="shadow-glow">
                    Apply
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
