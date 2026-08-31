export default function HomePage(): React.ReactNode {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-5xl font-bold mb-4">Code Campus</h1>
        <p className="text-xl text-gray-700 mb-8">Learn Python Online</p>
        <a
          href="/login"
          className="inline-block bg-indigo-600 text-white font-medium px-8 py-3 rounded-lg hover:bg-indigo-700"
        >
          Get Started
        </a>
      </div>
    </div>
  );
}
