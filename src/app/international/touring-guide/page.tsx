import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "International Touring Guide | Punchline Atlas",
  description:
    "Visa requirements, work permits, tax info, and practical tips for comedians touring internationally.",
};

interface TouringInfo {
  id: string;
  country: string;
  countryCode: string;
  visaRequired: boolean;
  visaType: string | null;
  processingTime: string | null;
  workPermitRequired: boolean;
  taxInfo: string | null;
  tips: string[];
  resources: Array<{ name: string; url: string; description?: string }> | null;
}

export default async function TouringGuidePage() {
  let touringInfo: TouringInfo[] = [];

  try {
    touringInfo = (await prisma.touringInfo.findMany({
      orderBy: { country: "asc" },
    })) as unknown as TouringInfo[];
  } catch {
    // DB not configured
  }

  return (
    <div className="md:mt-0 mt-12 max-w-5xl mx-auto px-4">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/international"
          className="text-sm text-purple-400 hover:text-purple-300 mb-4 inline-block"
        >
          &larr; Back to International
        </Link>
        <h1 className="text-3xl font-bold text-white mb-3">
          International Touring Guide
        </h1>
        <p className="text-gray-400 max-w-2xl">
          Essential information for comedians planning international tours,
          including visa requirements, work permits, tax considerations, and
          practical tips.
        </p>
      </div>

      {touringInfo.length === 0 ? (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 text-center">
          <p className="text-gray-400">
            No touring information available yet. Check back soon!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {touringInfo.map((info: { id: string; country: string; countryCode: string; visaRequired: boolean; visaType: string | null; processingTime: string | null; workPermitRequired: boolean; taxInfo: string | null; tips: string[]; resources: unknown }) => (
            <div
              key={info.id}
              className="bg-gray-800 rounded-xl border border-gray-700 p-6"
            >
              <h2 className="text-xl font-semibold text-white mb-4">
                {info.country}
                <span className="text-sm text-gray-500 ml-2">
                  ({info.countryCode})
                </span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                {/* Visa */}
                <div className="bg-gray-900 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-400 mb-2">
                    Visa Requirements
                  </h3>
                  <p className="text-white">
                    {info.visaRequired ? "Visa required" : "No visa required"}
                  </p>
                  {info.visaType && (
                    <p className="text-sm text-gray-400 mt-1">
                      Type: {info.visaType}
                    </p>
                  )}
                  {info.processingTime && (
                    <p className="text-sm text-gray-400 mt-1">
                      Processing: {info.processingTime}
                    </p>
                  )}
                </div>

                {/* Work Permit */}
                <div className="bg-gray-900 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-400 mb-2">
                    Work Permit
                  </h3>
                  <p className="text-white">
                    {info.workPermitRequired
                      ? "Work permit required"
                      : "No work permit required"}
                  </p>
                </div>
              </div>

              {/* Tax Info */}
              {info.taxInfo && (
                <div className="bg-gray-900 rounded-lg p-4 mb-4">
                  <h3 className="text-sm font-medium text-gray-400 mb-2">
                    Tax Information
                  </h3>
                  <p className="text-sm text-gray-300">{info.taxInfo}</p>
                </div>
              )}

              {/* Tips */}
              {info.tips.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-400 mb-2">
                    Practical Tips
                  </h3>
                  <ul className="space-y-1">
                    {info.tips.map((tip: string, i: number) => (
                      <li
                        key={i}
                        className="text-sm text-gray-300 flex items-start gap-2"
                      >
                        <span className="text-purple-400 mt-0.5">-</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Resources */}
              {info.resources != null &&
                Array.isArray(info.resources) &&
                (info.resources as Array<{ name: string; url: string; description?: string }>).length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">
                      Resources
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {(info.resources as Array<{ name: string; url: string; description?: string }>).map(
                        (resource, i) => (
                          <a
                            key={i}
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm bg-gray-700 text-purple-400 hover:text-purple-300 px-3 py-1 rounded-full"
                            title={resource.description}
                          >
                            {resource.name}
                          </a>
                        ),
                      )}
                    </div>
                  </div>
                )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
