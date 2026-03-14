"use client";

import { useEffect, useState } from "react";

type Poll = {
  id: string;
  question: string;
  options: string[];
  tallies: number[];
  totalVotes: number;
  expiresAt: string | null;
  createdAt: string;
};

type Props = {
  entityType: string;
  entityId: string;
};

export function PollWidget({ entityType, entityId }: Props) {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [votedPolls, setVotedPolls] = useState<Record<string, number>>({});
  const [votingPoll, setVotingPoll] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPolls = async () => {
      try {
        const res = await fetch(
          `/api/polls?entityType=${entityType}&entityId=${entityId}`,
        );
        if (res.ok) {
          const data = await res.json();
          setPolls(data.polls ?? []);
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    };
    fetchPolls();
  }, [entityType, entityId]);

  const handleVote = async (pollId: string, optionIndex: number) => {
    setVotingPoll(pollId);
    setError(null);

    try {
      const res = await fetch(`/api/polls/${pollId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionIndex }),
      });

      if (res.status === 401) {
        setError("Sign in to vote");
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to vote");
      }

      setVotedPolls((prev) => ({ ...prev, [pollId]: optionIndex }));
      // Update tallies locally
      setPolls((prev) =>
        prev.map((p) => {
          if (p.id !== pollId) return p;
          const newTallies = [...p.tallies];
          newTallies[optionIndex] += 1;
          return { ...p, tallies: newTallies, totalVotes: p.totalVotes + 1 };
        }),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong",
      );
    } finally {
      setVotingPoll(null);
    }
  };

  if (loading) {
    return (
      <p className="text-zinc-600 text-sm">Loading polls...</p>
    );
  }

  if (polls.length === 0) return null;

  return (
    <div className="space-y-4 mt-6">
      <h2 className="text-lg font-bold text-white">Polls</h2>
      {error && (
        <p className="text-red-400 text-sm" role="alert">
          {error}
        </p>
      )}
      {polls.map((poll) => {
        const hasVoted = poll.id in votedPolls;
        const isExpired =
          poll.expiresAt && new Date(poll.expiresAt) < new Date();
        const showResults = hasVoted || !!isExpired;

        return (
          <div
            key={poll.id}
            className="bg-brand-surface border border-zinc-800 rounded-lg p-4"
          >
            <h3 className="font-medium text-white mb-3">{poll.question}</h3>
            {isExpired && (
              <p className="text-xs text-zinc-500 mb-2">Poll has ended</p>
            )}
            <div className="space-y-2">
              {poll.options.map((option, i) => {
                const pct =
                  poll.totalVotes > 0
                    ? Math.round((poll.tallies[i] / poll.totalVotes) * 100)
                    : 0;

                if (showResults) {
                  return (
                    <div key={i} className="relative">
                      <div
                        className="absolute inset-0 bg-brand-gold/10 rounded"
                        style={{ width: `${pct}%` }}
                      />
                      <div className="relative flex items-center justify-between px-3 py-2 text-sm">
                        <span
                          className={`text-zinc-300 ${
                            votedPolls[poll.id] === i
                              ? "font-semibold text-brand-gold"
                              : ""
                          }`}
                        >
                          {option}
                        </span>
                        <span className="text-zinc-500 text-xs ml-2">
                          {pct}% ({poll.tallies[i]})
                        </span>
                      </div>
                    </div>
                  );
                }

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleVote(poll.id, i)}
                    disabled={votingPoll === poll.id}
                    className="w-full text-left px-3 py-2 rounded bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700 hover:text-white transition-colors disabled:opacity-50"
                  >
                    {option}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-zinc-600 mt-2">
              {poll.totalVotes} vote{poll.totalVotes !== 1 ? "s" : ""}
            </p>
          </div>
        );
      })}
    </div>
  );
}
