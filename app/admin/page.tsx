import { Metadata } from "next";

export const metadata: Metadata = {
  title: "School Administration",
  description: "Admin portal for managing classes, terms, teachers, students and results",
};

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-gray-900 p-8">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">
        School Administration
      </h1>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 max-w-md">
        {/* Add Student */}
        <a
          href="/admin/students/add"
          className="btn btn-primary flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Student
        </a>

        {/* Add Teacher */}
        <a
          href="/admin/teachers/add"
          className="btn btn-secondary flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Teacher
        </a>

        {/* Approve Account */}
        <a
          href="/admin/accounts/approve"
          className="btn btn-outline flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Approve Account
        </a>

        {/* Approve Result */}
        <a
          href="/admin/results/approve"
          className="btn btn-outline flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          onClick={(e) => {
            if (!window.confirm('Approve and publish these results, Parents will be notified by email')) {
              e.preventDefault();
            }
          }}
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Approve Result
        </a>
      </div>

      <p className="text-zinc-600 dark:text-zinc-400 mt-6">
        Welcome to the school administration portal. Use the sidebar or navigation to manage
        academic sessions, classes, teachers, students, subjects and results.
      </p>
    </main>
  );
}