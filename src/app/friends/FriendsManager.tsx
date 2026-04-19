"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useToast } from "@/components/Toast";

type FriendUser = {
  id: string;
  name: string | null;
  profileName: string | null;
  image: string | null;
  username: string | null;
} | null;

type FriendItem = {
  connectionId: string;
  user: FriendUser;
};

function getDisplayName(user: FriendUser) {
  return user?.profileName || user?.name || "Unknown";
}

export function FriendsManager({
  initialAccepted,
  initialPendingReceived,
  initialPendingSent,
}: {
  initialAccepted: FriendItem[];
  initialPendingReceived: FriendItem[];
  initialPendingSent: FriendItem[];
}) {
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(initialAccepted);
  const [pendingReceived, setPendingReceived] = useState(initialPendingReceived);
  const [pendingSent, setPendingSent] = useState(initialPendingSent);

  async function sendRequest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!username.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast(data?.error || "Could not send friend request.");
        return;
      }

      setUsername("");
      toast("Friend request sent.");
      window.location.reload();
    } catch {
      toast("Could not send friend request.");
    } finally {
      setSubmitting(false);
    }
  }

  async function respondToRequest(connectionId: string, action: "accept" | "decline") {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/friends/${connectionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast(data?.error || "Could not update request.");
        return;
      }

      const item = pendingReceived.find((entry) => entry.connectionId === connectionId);
      setPendingReceived((prev) => prev.filter((entry) => entry.connectionId !== connectionId));
      if (action === "accept" && item) {
        setAccepted((prev) => [item, ...prev]);
        toast("Friend request accepted.");
      } else {
        toast("Friend request declined.");
      }
    } catch {
      toast("Could not update request.");
    } finally {
      setSubmitting(false);
    }
  }

  async function removeFriend(connectionId: string) {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/friends/${connectionId}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast(data?.error || "Could not remove friend.");
        return;
      }

      setAccepted((prev) => prev.filter((entry) => entry.connectionId !== connectionId));
      toast("Friend removed.");
    } catch {
      toast("Could not remove friend.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="mb-8 p-4 rounded-lg bg-brand-surface border border-zinc-800">
        <h2 className="text-white font-semibold mb-3">Add a friend</h2>
        <form onSubmit={sendRequest} className="flex gap-2">
          <input
            type="text"
            name="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
            required
            className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-brand-gold"
          />
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 rounded-lg bg-brand-gold text-brand-dark font-semibold text-sm hover:bg-brand-gold/90 transition-colors disabled:opacity-60"
          >
            {submitting ? "Sending..." : "Send Request"}
          </button>
        </form>
      </div>

      {pendingReceived.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">
            Pending Requests ({pendingReceived.length})
          </h2>
          <div className="space-y-2">
            {pendingReceived.map((item) => {
              const displayName = getDisplayName(item.user);
              return (
                <div
                  key={item.connectionId}
                  className="flex items-center gap-3 p-3 rounded-lg bg-brand-surface border border-zinc-800"
                >
                  {item.user?.image ? (
                    <Image
                      src={item.user.image}
                      alt=""
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-zinc-400 font-bold">
                      {displayName[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{displayName}</p>
                    {item.user?.username && (
                      <p className="text-zinc-500 text-sm">@{item.user.username}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => respondToRequest(item.connectionId, "accept")}
                      disabled={submitting}
                      className="px-3 py-1.5 rounded-md bg-brand-gold text-brand-dark text-sm font-medium hover:bg-brand-gold/90 transition-colors disabled:opacity-60"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => respondToRequest(item.connectionId, "decline")}
                      disabled={submitting}
                      className="px-3 py-1.5 rounded-md bg-zinc-800 text-zinc-400 text-sm hover:bg-zinc-700 hover:text-white transition-colors disabled:opacity-60"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="mb-8">
        <h2 className="text-xl font-bold text-white mb-4">
          Friends ({accepted.length})
        </h2>
        {accepted.length > 0 ? (
          <div className="space-y-2">
            {accepted.map((item) => {
              const displayName = getDisplayName(item.user);
              return (
                <div
                  key={item.connectionId}
                  className="flex items-center gap-3 p-3 rounded-lg bg-brand-surface border border-zinc-800 hover:border-zinc-700 transition-colors"
                >
                  {item.user?.image ? (
                    <Image
                      src={item.user.image}
                      alt=""
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-zinc-400 font-bold">
                      {displayName[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    {item.user?.username ? (
                      <Link
                        href={`/u/${item.user.username}`}
                        className="text-white font-medium hover:text-brand-gold transition-colors truncate block"
                      >
                        {displayName}
                      </Link>
                    ) : (
                      <p className="text-white font-medium truncate">{displayName}</p>
                    )}
                    {item.user?.username && (
                      <p className="text-zinc-500 text-sm">@{item.user.username}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFriend(item.connectionId)}
                    disabled={submitting}
                    className="px-3 py-1.5 rounded-md bg-zinc-800 text-zinc-500 text-xs hover:bg-red-900/30 hover:text-red-400 transition-colors disabled:opacity-60"
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 px-6 rounded-lg bg-brand-surface border border-zinc-800 border-dashed text-center">
            <p className="text-zinc-400 font-medium mb-2">No friends yet</p>
            <p className="text-zinc-500 text-sm max-w-sm mx-auto">
              Search for other comedy fans by username to add them as friends.
            </p>
          </div>
        )}
      </section>

      {pendingSent.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-zinc-400 mb-3">
            Sent Requests ({pendingSent.length})
          </h2>
          <div className="space-y-2">
            {pendingSent.map((item) => {
              const displayName = getDisplayName(item.user);
              return (
                <div
                  key={item.connectionId}
                  className="flex items-center gap-3 p-3 rounded-lg bg-brand-surface/50 border border-zinc-800/50"
                >
                  {item.user?.image ? (
                    <Image
                      src={item.user.image}
                      alt=""
                      width={32}
                      height={32}
                      className="w-8 h-8 rounded-full object-cover opacity-70"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 text-sm font-bold">
                      {displayName[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-zinc-400 text-sm truncate">{displayName}</p>
                  </div>
                  <span className="text-zinc-600 text-xs">Pending</span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
