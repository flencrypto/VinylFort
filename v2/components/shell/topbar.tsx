"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Bell, Plus, Search } from "lucide-react"
import CommandK from "@/components/shell/command-k"

export default function Topbar() {
  const [cmdOpen, setCmdOpen] = useState(false)

  return (
    <div className="flex items-center gap-3 px-4 py-3 md:px-6">
      <div className="flex items-center gap-2 md:hidden">
        <Link href="/vault" className="font-semibold tracking-tight">
          VinylVault
        </Link>
      </div>

      <div className="flex-1" />

      {/* Global search — trigger button shown on sm+; dialog portal always in DOM */}
      <div className="hidden sm:flex items-center gap-2">
        <CommandK open={cmdOpen} onOpenChange={setCmdOpen} />
      </div>

      <Button asChild className="hidden sm:inline-flex">
        <Link href="/add">
          <Plus className="h-4 w-4 mr-2" />
          Add record
        </Link>
      </Button>

      <Button variant="ghost" size="icon" aria-label="Notifications">
        <Bell className="h-4 w-4" />
      </Button>

      {/* Mobile search + add */}
      <div className="flex sm:hidden items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Search"
          onClick={() => setCmdOpen(true)}
        >
          <Search className="h-4 w-4" />
        </Button>
        <Button asChild size="icon" aria-label="Add">
          <Link href="/add">
            <Plus className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
